import { Express, Request, Response } from "express";
import { eq, desc, and, sql, count } from "drizzle-orm";
import { db } from "./db";
import multer from "multer";
import {
  dhambaalDiscussionPosts,
  dhambaalDiscussionReactions,
  parents,
  parentMessages,
} from "@shared/schema";
import { uploadToR2 } from "./r2Storage";

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error("Audio files only"));
    }
  },
});

async function requireParentAuthMiddleware(req: Request, res: Response, next: Function) {
  if (!req.session.parentId) {
    return res.status(401).json({ error: "Fadlan ku gal akoonkaaga" });
  }
  return next();
}

export function registerDhambaalDiscussionRoutes(app: Express) {

  app.get("/api/dhambaal-discussions/:messageId/posts", requireParentAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const parentId = req.session.parentId!;
      const messageId = req.params.messageId;

      const [message] = await db.select({ id: parentMessages.id }).from(parentMessages).where(eq(parentMessages.id, messageId));
      if (!message) return res.status(404).json({ error: "Maqaalka lama helin" });

      const posts = await db
        .select({
          id: dhambaalDiscussionPosts.id,
          messageId: dhambaalDiscussionPosts.messageId,
          userId: dhambaalDiscussionPosts.userId,
          parentPostId: dhambaalDiscussionPosts.parentPostId,
          content: dhambaalDiscussionPosts.content,
          audioUrl: dhambaalDiscussionPosts.audioUrl,
          createdAt: dhambaalDiscussionPosts.createdAt,
          authorName: parents.name,
          authorPicture: parents.picture,
        })
        .from(dhambaalDiscussionPosts)
        .innerJoin(parents, eq(dhambaalDiscussionPosts.userId, parents.id))
        .where(eq(dhambaalDiscussionPosts.messageId, messageId))
        .orderBy(desc(dhambaalDiscussionPosts.createdAt))
        .limit(200);

      const postIds = posts.map(p => p.id);
      let myReactions: { postId: string; reactionType: string }[] = [];
      let reactionCounts: { postId: string; reactionType: string; count: number }[] = [];

      if (postIds.length > 0) {
        const myReactionsResult = await db.select({
          postId: dhambaalDiscussionReactions.postId,
          reactionType: dhambaalDiscussionReactions.reactionType,
        })
          .from(dhambaalDiscussionReactions)
          .where(and(
            sql`${dhambaalDiscussionReactions.postId} IN (${sql.join(postIds.map(id => sql`${id}`), sql`, `)})`,
            eq(dhambaalDiscussionReactions.userId, parentId)
          ));
        myReactions = myReactionsResult;

        const countsResult = await db.select({
          postId: dhambaalDiscussionReactions.postId,
          reactionType: dhambaalDiscussionReactions.reactionType,
          count: count(),
        })
          .from(dhambaalDiscussionReactions)
          .where(sql`${dhambaalDiscussionReactions.postId} IN (${sql.join(postIds.map(id => sql`${id}`), sql`, `)})`)
          .groupBy(dhambaalDiscussionReactions.postId, dhambaalDiscussionReactions.reactionType);
        reactionCounts = countsResult.map(r => ({ postId: r.postId, reactionType: r.reactionType, count: Number(r.count) }));
      }

      const enriched = posts.map(post => {
        const postReactionCounts: Record<string, number> = {};
        reactionCounts.filter(r => r.postId === post.id).forEach(r => {
          postReactionCounts[r.reactionType] = r.count;
        });
        const postMyReactions = myReactions.filter(r => r.postId === post.id).map(r => r.reactionType);

        return {
          ...post,
          author: { id: post.userId, name: post.authorName, picture: post.authorPicture },
          reactions: postReactionCounts,
          myReactions: postMyReactions,
        };
      });

      res.json({ posts: enriched });
    } catch (error) {
      console.error("[DHAMBAAL-DISCUSSION] Error listing posts:", error);
      res.status(500).json({ error: "Failed to list posts" });
    }
  });

  app.post("/api/dhambaal-discussions/:messageId/posts", requireParentAuthMiddleware, audioUpload.single("audio"), async (req: Request, res: Response) => {
    try {
      const parentId = req.session.parentId!;
      const messageId = req.params.messageId;
      const { content, parentPostId } = req.body;

      const [message] = await db.select({ id: parentMessages.id }).from(parentMessages).where(eq(parentMessages.id, messageId));
      if (!message) return res.status(404).json({ error: "Maqaalka lama helin" });

      if (!content?.trim() && !req.file) {
        return res.status(400).json({ error: "Qoraal ama cod waa lagama maarmaan" });
      }

      if (parentPostId) {
        const [parentPost] = await db.select({ id: dhambaalDiscussionPosts.id }).from(dhambaalDiscussionPosts).where(eq(dhambaalDiscussionPosts.id, parentPostId));
        if (!parentPost) return res.status(404).json({ error: "Post-ka aad ka jawaabayso lama helin" });
      }

      let audioUrl: string | null = null;
      if (req.file) {
        try {
          const ext = req.file.mimetype.includes("mp4") ? "mp4" : req.file.mimetype.includes("ogg") ? "ogg" : req.file.mimetype.includes("wav") ? "wav" : "webm";
          const fileName = `dhambaal-discussion-${messageId}-${Date.now()}.${ext}`;
          const result = await uploadToR2(req.file.buffer, fileName, req.file.mimetype, "dhambaal-discussions", "dhambaal");
          audioUrl = result.url;
        } catch (uploadErr) {
          console.error("[DHAMBAAL-DISCUSSION] Audio upload failed:", uploadErr);
          return res.status(500).json({ error: "Codka lama upload gareen. Fadlan isku day mar kale." });
        }
      }

      const [post] = await db.insert(dhambaalDiscussionPosts).values({
        messageId,
        userId: parentId,
        parentPostId: parentPostId || null,
        content: content?.trim() || null,
        audioUrl,
      }).returning();

      const [author] = await db.select({ id: parents.id, name: parents.name, picture: parents.picture })
        .from(parents).where(eq(parents.id, parentId));

      res.json({
        ...post,
        author,
        reactions: {},
        myReactions: [],
      });
    } catch (error) {
      console.error("[DHAMBAAL-DISCUSSION] Error creating post:", error);
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  app.post("/api/dhambaal-discussions/posts/:postId/react", requireParentAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const parentId = req.session.parentId!;
      const postId = req.params.postId;
      const { reactionType } = req.body;

      if (!reactionType) {
        return res.status(400).json({ error: "Reaction type waa lagama maarmaan" });
      }

      const validReactions = ["❤️", "👍", "😂", "🤲", "👏", "💡"];
      if (!validReactions.includes(reactionType)) {
        return res.status(400).json({ error: "Reaction-ka saxda maaha" });
      }

      const [post] = await db.select({ id: dhambaalDiscussionPosts.id }).from(dhambaalDiscussionPosts).where(eq(dhambaalDiscussionPosts.id, postId));
      if (!post) return res.status(404).json({ error: "Post-ka lama helin" });

      const [existing] = await db.select()
        .from(dhambaalDiscussionReactions)
        .where(and(
          eq(dhambaalDiscussionReactions.postId, postId),
          eq(dhambaalDiscussionReactions.userId, parentId),
          eq(dhambaalDiscussionReactions.reactionType, reactionType)
        ));

      if (existing) {
        await db.delete(dhambaalDiscussionReactions)
          .where(and(
            eq(dhambaalDiscussionReactions.postId, postId),
            eq(dhambaalDiscussionReactions.userId, parentId),
            eq(dhambaalDiscussionReactions.reactionType, reactionType)
          ));
        res.json({ reacted: false, reactionType });
      } else {
        await db.insert(dhambaalDiscussionReactions).values({
          postId,
          userId: parentId,
          reactionType,
        });
        res.json({ reacted: true, reactionType });
      }
    } catch (error) {
      console.error("[DHAMBAAL-DISCUSSION] Error toggling reaction:", error);
      res.status(500).json({ error: "Failed to toggle reaction" });
    }
  });

  app.delete("/api/dhambaal-discussions/posts/:postId", requireParentAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const parentId = req.session.parentId!;
      const postId = req.params.postId;

      const [post] = await db.select().from(dhambaalDiscussionPosts).where(eq(dhambaalDiscussionPosts.id, postId));
      if (!post) return res.status(404).json({ error: "Post-ka lama helin" });

      if (post.userId !== parentId) {
        const [parent] = await db.select({ isAdmin: parents.isAdmin }).from(parents).where(eq(parents.id, parentId));
        if (!parent?.isAdmin) {
          return res.status(403).json({ error: "Post-kaaga kaliya ayaad tirtiri kartaa" });
        }
      }

      await db.delete(dhambaalDiscussionPosts).where(eq(dhambaalDiscussionPosts.id, postId));
      res.json({ success: true });
    } catch (error) {
      console.error("[DHAMBAAL-DISCUSSION] Error deleting post:", error);
      res.status(500).json({ error: "Failed to delete post" });
    }
  });
}
