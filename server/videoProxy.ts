import { Router, Request, Response } from "express";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { lessons, enrollments } from "@shared/schema";
import { streamVideoFile } from "./google-drive";

const router = Router();

const MAX_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks for smooth streaming

function extractGoogleDriveFileId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return idMatch ? idMatch[1] : null;
}

function isGoogleDriveUrl(url: string): boolean {
  return url.includes("drive.google.com");
}

router.head("/api/video/stream/:lessonId", async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    const session = req.session as any;

    if (!session?.parentId && !session?.userId) {
      return res.status(401).end();
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

    if (!lesson || !lesson.videoUrl || !isGoogleDriveUrl(lesson.videoUrl)) {
      return res.status(404).end();
    }

    const fileId = extractGoogleDriveFileId(lesson.videoUrl);
    if (!fileId) return res.status(400).end();

    const result = await streamVideoFile(fileId);
    if (!result) return res.status(502).end();

    if (result.stream && typeof (result.stream as any).destroy === 'function') {
      (result.stream as any).destroy();
    }

    res.writeHead(200, {
      "Content-Type": result.mimeType,
      "Content-Length": result.size,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=3600",
    });
    res.end();
  } catch (error: any) {
    console.error("[VideoProxy] HEAD Error:", error.message);
    if (!res.headersSent) res.status(500).end();
  }
});

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
        return res.status(403).json({ error: "Koorsadan kuma qornayn" });
      }
    }

    if (!isGoogleDriveUrl(lesson.videoUrl)) {
      return res.redirect(lesson.videoUrl);
    }

    const fileId = extractGoogleDriveFileId(lesson.videoUrl);
    if (!fileId) {
      return res.status(400).json({ error: "Video URL khaldan" });
    }

    const rangeHeader = req.headers.range;

    if (!rangeHeader) {
      console.log(`[VideoProxy] Initial request (no range) for file: ${fileId}, sending first ${MAX_CHUNK_SIZE} bytes`);
      const result = await streamVideoFile(fileId, `bytes=0-${MAX_CHUNK_SIZE - 1}`);
      
      if (!result) {
        return res.status(502).json({ error: "Video-ga lama heli karo Google Drive-ka" });
      }

      if (result.size > MAX_CHUNK_SIZE) {
        const end = Math.min(MAX_CHUNK_SIZE - 1, result.size - 1);
        res.writeHead(206, {
          "Content-Range": `bytes 0-${end}/${result.size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": end + 1,
          "Content-Type": result.mimeType,
          "Cache-Control": "private, max-age=3600",
          "Content-Disposition": "inline",
          "X-Content-Type-Options": "nosniff",
        });
      } else {
        res.writeHead(200, {
          "Content-Type": result.mimeType,
          "Accept-Ranges": "bytes",
          "Content-Length": result.size,
          "Cache-Control": "private, max-age=3600",
          "Content-Disposition": "inline",
          "X-Content-Type-Options": "nosniff",
        });
      }

      result.stream.pipe(res);
      req.on("close", () => {
        if (result.stream && typeof (result.stream as any).destroy === 'function') {
          (result.stream as any).destroy();
        }
      });
      return;
    }

    console.log(`[VideoProxy] Range request for file: ${fileId}, range: ${rangeHeader}`);
    const result = await streamVideoFile(fileId, rangeHeader);

    if (!result) {
      return res.status(502).json({ error: "Video-ga lama heli karo Google Drive-ka" });
    }

    if (result.isPartial && result.start !== undefined && result.end !== undefined) {
      const chunkSize = result.end - result.start + 1;
      res.writeHead(206, {
        "Content-Range": `bytes ${result.start}-${result.end}/${result.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": result.mimeType,
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      });
    } else {
      const headers: Record<string, any> = {
        "Content-Type": result.mimeType,
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      };
      if (result.size > 0) {
        headers["Content-Length"] = result.size;
      }
      res.writeHead(200, headers);
    }

    result.stream.pipe(res);

    req.on("close", () => {
      if (result.stream && typeof (result.stream as any).destroy === 'function') {
        (result.stream as any).destroy();
      }
    });

  } catch (error: any) {
    console.error("[VideoProxy] Error:", error.message);
    if (!res.headersSent) {
      return res.status(500).json({ error: "Muuqaalka wuu ku guul dareystay" });
    }
  }
});

export { router as videoProxyRouter };
