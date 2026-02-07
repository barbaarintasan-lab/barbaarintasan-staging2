import { Router, Request, Response } from "express";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { lessons, enrollments, parents } from "@shared/schema";
import https from "https";

const router = Router();

function extractGoogleDriveFileId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return idMatch ? idMatch[1] : null;
}

function isGoogleDriveUrl(url: string): boolean {
  return url.includes("drive.google.com");
}

const fileMetaCache = new Map<string, { size: number; mimeType: string; downloadUrl: string; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000;
const MAX_CACHE_SIZE = 100;

function resolveDownloadUrl(fileId: string): Promise<{ downloadUrl: string; size: number }> {
  return new Promise((resolve, reject) => {
    const initialUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;

    const req = https.get(initialUrl, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      if (res.statusCode === 200) {
        const contentLength = parseInt(res.headers["content-length"] || "0", 10);
        res.resume();
        resolve({ downloadUrl: initialUrl, size: contentLength });
      } else if (res.statusCode === 303 || res.statusCode === 302 || res.statusCode === 301) {
        const location = res.headers.location;
        res.resume();
        if (location) {
          resolve({ downloadUrl: location, size: 0 });
        } else {
          reject(new Error("No redirect location"));
        }
      } else {
        res.resume();
        reject(new Error(`Unexpected status: ${res.statusCode}`));
      }
    });
    req.on("error", reject);
    req.end();
  });
}

function getFileSize(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: "HEAD",
      headers: { "User-Agent": "Mozilla/5.0" },
    };
    const req = https.request(options, (res) => {
      const size = parseInt(res.headers["content-length"] || "0", 10);
      res.resume();
      resolve(size);
    });
    req.on("error", reject);
    req.end();
  });
}

function proxyStream(url: string, headers: Record<string, string>, res: Response, responseHeaders: Record<string, any>, statusCode: number, req: Request) {
  const parsedUrl = new URL(url);
  const requestOptions = {
    hostname: parsedUrl.hostname,
    path: parsedUrl.pathname + parsedUrl.search,
    headers: { ...headers, "User-Agent": "Mozilla/5.0" },
  };

  const proxyReq = https.get(requestOptions, (proxyRes) => {
    if (proxyRes.statusCode && proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
      proxyRes.resume();
      proxyStream(proxyRes.headers.location, headers, res, responseHeaders, statusCode, req);
      return;
    }

    if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
      console.error(`[VideoProxy] Upstream error: ${proxyRes.statusCode}`);
      proxyRes.resume();
      if (!res.headersSent) {
        res.status(502).json({ error: "Video source error" });
      }
      return;
    }

    if (!res.headersSent) {
      res.writeHead(statusCode, responseHeaders);
    }
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    console.error("[VideoProxy] Stream error:", err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: "Video stream error" });
    }
  });

  req.on("close", () => {
    proxyReq.destroy();
  });
}

router.get("/api/video/stream/:lessonId", async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    const session = req.session as any;

    if (!session?.parentId && !session?.userId) {
      return res.status(401).json({ error: "Fadlan soo gal" });
    }

    const [lesson] = await db
      .select({
        id: lessons.id,
        videoUrl: lessons.videoUrl,
        courseId: lessons.courseId,
        isFree: lessons.isFree,
      })
      .from(lessons)
      .where(eq(lessons.id, lessonId))
      .limit(1);

    if (!lesson || !lesson.videoUrl) {
      return res.status(404).json({ error: "Casharkan muuqaal ma laha" });
    }

    if (!lesson.isFree && session.parentId) {
      const [enrollment] = await db
        .select()
        .from(enrollments)
        .where(
          and(
            eq(enrollments.parentId, session.parentId),
            eq(enrollments.courseId, lesson.courseId)
          )
        )
        .limit(1);

      if (!enrollment) {
        const [parent] = await db
          .select({ subscriptionStatus: parents.subscriptionStatus })
          .from(parents)
          .where(eq(parents.id, session.parentId))
          .limit(1);

        if (!parent || parent.subscriptionStatus !== "active") {
          return res.status(403).json({ error: "Koorsadan kuma qornayn" });
        }
      }
    }

    if (!isGoogleDriveUrl(lesson.videoUrl)) {
      return res.redirect(lesson.videoUrl);
    }

    const fileId = extractGoogleDriveFileId(lesson.videoUrl);
    if (!fileId) {
      return res.status(400).json({ error: "Video URL khaldan" });
    }

    let downloadUrl: string;
    let fileSize: number;
    const cached = fileMetaCache.get(fileId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      downloadUrl = cached.downloadUrl;
      fileSize = cached.size;
    } else {
      const resolved = await resolveDownloadUrl(fileId);
      downloadUrl = resolved.downloadUrl;
      fileSize = resolved.size;

      if (fileSize === 0) {
        fileSize = await getFileSize(downloadUrl);
      }

      if (fileSize > 0) {
        if (fileMetaCache.size >= MAX_CACHE_SIZE) {
          const oldestKey = fileMetaCache.keys().next().value;
          if (oldestKey) fileMetaCache.delete(oldestKey);
        }
        fileMetaCache.set(fileId, { size: fileSize, mimeType: "video/mp4", downloadUrl, timestamp: Date.now() });
      }
    }

    const contentType = "video/mp4";
    const rangeHeader = req.headers.range;

    if (rangeHeader && fileSize > 0) {
      const rangeMatch = rangeHeader.match(/bytes=(\d*)-(\d*)/);
      if (!rangeMatch) {
        return res.status(416).json({ error: "Invalid range" });
      }

      let start: number;
      let end: number;

      if (rangeMatch[1] === "" && rangeMatch[2] !== "") {
        const suffixLength = parseInt(rangeMatch[2], 10);
        start = Math.max(0, fileSize - suffixLength);
        end = fileSize - 1;
      } else {
        start = parseInt(rangeMatch[1], 10);
        end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : fileSize - 1;
      }

      if (start >= fileSize || end >= fileSize || start > end) {
        res.writeHead(416, { "Content-Range": `bytes */${fileSize}` });
        return res.end();
      }

      const chunkSize = end - start + 1;

      proxyStream(
        downloadUrl,
        { "Range": `bytes=${start}-${end}` },
        res,
        {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize,
          "Content-Type": contentType,
          "Cache-Control": "private, max-age=3600",
          "Content-Disposition": "inline",
          "X-Content-Type-Options": "nosniff",
        },
        206,
        req
      );
    } else {
      const responseHeaders: Record<string, any> = {
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      };
      if (fileSize > 0) {
        responseHeaders["Content-Length"] = fileSize;
      }

      proxyStream(downloadUrl, {}, res, responseHeaders, 200, req);
    }
  } catch (error: any) {
    console.error("[VideoProxy] Error:", error.message);

    if (error.code === 404 || error.status === 404) {
      return res.status(404).json({ error: "Muuqaalka lama helin" });
    }
    if (error.code === 403 || error.status === 403) {
      return res.status(403).json({ error: "Muuqaalka lagama heli karo" });
    }

    if (!res.headersSent) {
      return res.status(500).json({ error: "Muuqaalka wuu ku guul dareystay" });
    }
  }
});

export { router as videoProxyRouter };
