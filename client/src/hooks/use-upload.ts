import { useState, useCallback } from "react";
import type { UppyFile } from "@uppy/core";

interface UploadMetadata {
  name: string;
  size: number;
  contentType: string;
}

interface UploadResponse {
  uploadURL: string;
  objectPath: string;
  url: string;
  metadata: UploadMetadata;
}

interface UseUploadOptions {
  onSuccess?: (response: UploadResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * React hook for handling file uploads with presigned URLs.
 *
 * This hook implements the two-step presigned URL upload flow:
 * 1. Request a presigned URL from your backend (sends JSON metadata, NOT the file)
 * 2. Upload the file directly to the presigned URL
 *
 * @example
 * ```tsx
 * function FileUploader() {
 *   const { uploadFile, isUploading, error } = useUpload({
 *     onSuccess: (response) => {
 *       console.log("Uploaded to:", response.objectPath);
 *     },
 *   });
 *
 *   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
 *     const file = e.target.files?.[0];
 *     if (file) {
 *       await uploadFile(file);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <input type="file" onChange={handleFileChange} disabled={isUploading} />
 *       {isUploading && <p>Uploading...</p>}
 *       {error && <p>Error: {error.message}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useUpload(options: UseUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);

  /**
   * Request a presigned URL from the backend.
   * IMPORTANT: Send JSON metadata, NOT the file itself.
   */
  const requestUploadUrl = useCallback(
    async (file: File): Promise<UploadResponse> => {
      console.log("[Upload] Requesting upload URL for:", file.name, file.size, file.type);
      
      const response = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type || "application/octet-stream",
        }),
      });

      console.log("[Upload] Response status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[Upload] Error response:", errorData);
        throw new Error(errorData.error || "Failed to get upload URL");
      }

      const data = await response.json();
      console.log("[Upload] Got upload URL successfully");
      return data;
    },
    []
  );

  /**
   * Upload a file directly to the presigned URL.
   */
  const uploadToPresignedUrl = useCallback(
    async (file: File, uploadURL: string): Promise<void> => {
      console.log("[Upload] Uploading file to presigned URL");
      
      const response = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      });

      console.log("[Upload] Upload response status:", response.status);
      
      if (!response.ok) {
        console.error("[Upload] Upload to storage failed:", response.status, response.statusText);
        throw new Error("Failed to upload file to storage");
      }
      
      console.log("[Upload] File uploaded successfully");
    },
    []
  );

  /**
   * Direct upload to server (for Fly.io when presigned URLs don't work).
   */
  const directUpload = useCallback(
    async (file: File): Promise<UploadResponse | null> => {
      console.log("[Upload] Trying direct upload for:", file.name);
      
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/uploads/direct", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      console.log("[Upload] Direct upload response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[Upload] Direct upload error:", errorData);
        throw new Error(errorData.error || "Direct upload failed");
      }

      const data = await response.json();
      console.log("[Upload] Direct upload success:", data.objectPath);
      return data;
    },
    []
  );

  /**
   * Upload a file using the presigned URL flow, with fallback to direct upload.
   *
   * @param file - The file to upload
   * @returns The upload response containing the object path
   */
  const uploadFile = useCallback(
    async (file: File): Promise<UploadResponse | null> => {
      setIsUploading(true);
      setError(null);
      setProgress(0);

      try {
        // Detect if we're on Fly.io (not on replit.dev)
        const isOnFlyIo = !window.location.hostname.includes('replit');
        
        if (isOnFlyIo) {
          // On Fly.io: Always use direct upload (base64) to avoid Object Storage issues
          console.log("[Upload] On Fly.io - using direct upload");
          setProgress(30);
          const directResult = await directUpload(file);
          
          if (directResult) {
            setProgress(100);
            options.onSuccess?.(directResult);
            return directResult;
          }
          throw new Error("Direct upload failed");
        } else {
          // On Replit: Try presigned URL flow first
          setProgress(10);
          try {
            const uploadResponse = await requestUploadUrl(file);
            
            // Step 2: Upload file directly to presigned URL
            setProgress(30);
            await uploadToPresignedUrl(file, uploadResponse.uploadURL);
            
            setProgress(100);
            options.onSuccess?.(uploadResponse);
            return uploadResponse;
          } catch (presignedError) {
            console.log("[Upload] Presigned URL flow failed, trying direct upload:", presignedError);
            
            // Fallback to direct upload
            setProgress(30);
            const directResult = await directUpload(file);
            
            if (directResult) {
              setProgress(100);
              options.onSuccess?.(directResult);
              return directResult;
            }
            throw new Error("Both upload methods failed");
          }
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Upload failed");
        setError(error);
        options.onError?.(error);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [requestUploadUrl, uploadToPresignedUrl, directUpload, options]
  );

  /**
   * Get upload parameters for Uppy's AWS S3 plugin.
   *
   * IMPORTANT: This function receives the UppyFile object from Uppy.
   * Use file.name, file.size, file.type to request per-file presigned URLs.
   *
   * Use this with the ObjectUploader component:
   * ```tsx
   * <ObjectUploader onGetUploadParameters={getUploadParameters}>
   *   Upload
   * </ObjectUploader>
   * ```
   */
  const getUploadParameters = useCallback(
    async (
      file: UppyFile<Record<string, unknown>, Record<string, unknown>>
    ): Promise<{
      method: "PUT";
      url: string;
      headers?: Record<string, string>;
    }> => {
      // Use the actual file properties to request a per-file presigned URL
      const response = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type || "application/octet-stream",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get upload URL");
      }

      const data = await response.json();
      return {
        method: "PUT",
        url: data.uploadURL,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      };
    },
    []
  );

  /**
   * Upload a file to Google Drive via the server API.
   * Returns the web content link URL or null on failure.
   */
  const uploadToGoogleDrive = useCallback(
    async (file: File): Promise<string | null> => {
      setIsUploading(true);
      setError(null);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/uploads/google-drive", {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Google Drive upload failed");
        }
        const data = await response.json();
        return data.url || data.webContentLink || null;
      } catch (err) {
        const uploadError = err instanceof Error ? err : new Error("Upload failed");
        setError(uploadError);
        options.onError?.(uploadError);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [options]
  );

  return {
    uploadFile,
    getUploadParameters,
    uploadToGoogleDrive,
    isUploading,
    uploading: isUploading,
    error,
    progress,
  };
}

