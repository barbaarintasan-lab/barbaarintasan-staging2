import type { Express } from "express";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import path from "path";
import fs from "fs";
import multer from "multer";
import { isR2Configured, uploadReceiptToR2 } from "../../r2Storage";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * Register object storage routes for file uploads.
 *
 * This provides example routes for the presigned URL upload flow:
 * 1. POST /api/uploads/request-url - Get a presigned URL for uploading
 * 2. The client then uploads directly to the presigned URL
 *
 * IMPORTANT: These are example routes. Customize based on your use case:
 * - Add authentication middleware for protected uploads
 * - Add file metadata storage (save to database after upload)
 * - Add ACL policies for access control
 */
export function registerObjectStorageRoutes(app: Express): void {
  const objectStorageService = new ObjectStorageService();

  /**
   * Request a presigned URL for file upload.
   *
   * Request body (JSON):
   * {
   *   "name": "filename.jpg",
   *   "size": 12345,
   *   "contentType": "image/jpeg"
   * }
   *
   * Response:
   * {
   *   "uploadURL": "https://storage.googleapis.com/...",
   *   "objectPath": "/objects/uploads/uuid"
   * }
   *
   * IMPORTANT: The client should NOT send the file to this endpoint.
   * Send JSON metadata only, then upload the file directly to uploadURL.
   */
  app.post("/api/uploads/request-url", async (req, res) => {
    try {
      console.log("[UPLOAD] Request received:", req.body);
      const { name, size, contentType } = req.body;

      if (!name) {
        console.log("[UPLOAD] Missing name field");
        return res.status(400).json({
          error: "Missing required field: name",
        });
      }

      console.log("[UPLOAD] Generating upload URL for:", name);
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      console.log("[UPLOAD] Upload URL generated successfully");

      // Extract object path from the presigned URL for later reference
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
      console.log("[UPLOAD] Object path:", objectPath);

      res.json({
        uploadURL,
        objectPath,
        url: objectPath, // For Replit, the objectPath is the URL
        // Echo back the metadata for client convenience
        metadata: { name, size, contentType },
      });
    } catch (error) {
      console.error("[UPLOAD] Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  /**
   * Direct file upload endpoint for Fly.io (when Replit Object Storage is not available).
   * This receives the file directly and returns it as a base64 data URL.
   * For receipt images, this is simpler and more reliable than R2.
   */
  app.post("/api/uploads/direct", upload.single("file"), async (req, res) => {
    try {
      console.log("[UPLOAD-DIRECT] Request received");
      
      if (!req.file) {
        console.log("[UPLOAD-DIRECT] No file provided");
        return res.status(400).json({ error: "No file provided" });
      }

      console.log("[UPLOAD-DIRECT] File:", req.file.originalname, req.file.size, req.file.mimetype);

      // Convert to base64 data URL - simple and reliable
      const base64 = req.file.buffer.toString('base64');
      const dataUrl = `data:${req.file.mimetype};base64,${base64}`;
      const objectPath = `receipt-${Date.now()}-${req.file.originalname}`;

      console.log("[UPLOAD-DIRECT] Converted to base64, size:", base64.length);

      res.json({
        objectPath: objectPath,
        url: dataUrl,
        uploadURL: dataUrl,
        metadata: {
          name: req.file.originalname,
          size: req.file.size,
          contentType: req.file.mimetype
        }
      });
    } catch (error) {
      console.error("[UPLOAD-DIRECT] Error:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  /**
   * Serve uploaded objects.
   *
   * GET /objects/:objectPath(*)
   *
   * This serves files from object storage. For public files, no auth needed.
   * For protected files, add authentication middleware and ACL checks.
   */
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      // Check if running on Fly.io (PRIVATE_OBJECT_DIR not set)
      if (!process.env.PRIVATE_OBJECT_DIR) {
        // Try to get Google Drive URL from mapping
        const objectPath = req.params.objectPath;
        const uuid = objectPath.replace("uploads/", "");
        
        try {
          // On Fly.io, mapping file is at root; locally it's in server/
          let mappingPath = path.join(process.cwd(), "course-image-mapping.json");
          if (!fs.existsSync(mappingPath)) {
            mappingPath = path.join(process.cwd(), "server", "course-image-mapping.json");
          }
          if (fs.existsSync(mappingPath)) {
            const mapping = JSON.parse(fs.readFileSync(mappingPath, "utf-8"));
            const driveFileId = mapping.mappings?.[uuid];
            
            if (driveFileId && driveFileId.length > 0) {
              // Serve from local course-images folder
              const imagePath = path.join(process.cwd(), "attached_assets", "course-images", driveFileId);
              if (fs.existsSync(imagePath)) {
                res.setHeader('Content-Type', 'image/png');
                res.setHeader('Cache-Control', 'public, max-age=86400');
                return res.sendFile(imagePath);
              }
            }
          }
        } catch (e) {
          console.error("Error reading course image mapping:", e);
        }
        
        // Fallback: serve logo image
        const logoPath = path.join(process.cwd(), "attached_assets", "NEW_LOGO-BSU_1_1768990258338.png");
        if (fs.existsSync(logoPath)) {
          res.setHeader("Content-Type", "image/png");
          res.setHeader("Cache-Control", "public, max-age=3600");
          return res.sendFile(logoPath);
        }
        return res.status(404).json({ error: "Image not found" });
      }
      
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      await objectStorageService.downloadObject(objectFile, res, 3600, req);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });

  /**
   * Serve public files from the public folder.
   *
   * GET /public-files/:filename(*)
   *
   * This serves files from the public directory in object storage.
   * No authentication required for public files.
   */
  app.get("/public-files/:filename(*)", async (req, res) => {
    try {
      const filename = req.params.filename;
      if (!filename) {
        return res.status(400).json({ error: "Filename required" });
      }

      const objectFile = await objectStorageService.searchPublicObject(filename);
      if (!objectFile) {
        return res.status(404).json({ error: "File not found" });
      }

      await objectStorageService.downloadObject(objectFile, res, 3600, req);
    } catch (error) {
      console.error("Error serving public file:", error);
      return res.status(500).json({ error: "Failed to serve file" });
    }
  });
}

