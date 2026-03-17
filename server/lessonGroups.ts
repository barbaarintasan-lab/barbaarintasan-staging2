import { Express, Request, Response } from "express";
import { eq, desc, and, sql, count } from "drizzle-orm";
import { db } from "./db";
import multer from "multer";
import {
  lessonGroups,
  lessonGroupPosts,
  lessonGroupPostReactions,
  parents,
  lessons,
  enrollments,
  courses,
} from "@shared/schema";
import { uploadToR2 } from "./r2Storage";
import { storage } from "./storage";

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

async function checkLessonAccess(parentId: string, courseId: string): Promise<boolean> {
  const course = await storage.getCourse(courseId);
  if (!course) return false;
  if (course.isFree) return true;

  const parent = await storage.getParent(parentId);
  if (parent?.isAdmin) return true;

  const allAccessCourse = await storage.getCourseByCourseId("all-access");
  if (allAccessCourse) {
    const allEnrollments = await storage.getEnrollmentsByParentId(parentId);
    const allAccessEnrollment = allEnrollments.find(e =>
      e.courseId === allAccessCourse.id &&
      e.status === "active" &&
      (!e.accessEnd || new Date(e.accessEnd) > new Date())
    );
    if (allAccessEnrollment && course.isLive) return true;
  }

  const enrollment = await storage.getActiveEnrollmentByParentAndCourse(parentId, courseId);
  if (!enrollment) {
    const allEnrollments = await storage.getEnrollmentsByParentId(parentId);
    const lifetimeEnrollment = allEnrollments.find(e =>
      e.courseId === courseId && !e.accessEnd && e.status === "active"
    );
    return !!lifetimeEnrollment;
  }
  if (!enrollment.accessEnd) return true;
  if (new Date(enrollment.accessEnd) < new Date()) return false;
  return enrollment.status === "active";
}

async function getOrCreateLessonGroup(lessonId: string): Promise<string> {
  const [existing] = await db.select().from(lessonGroups).where(eq(lessonGroups.lessonId, lessonId));
  if (existing) return existing.id;

  try {
    const [created] = await db.insert(lessonGroups).values({ lessonId }).returning();
    return created.id;
  } catch (err: any) {
    if (err?.code === "23505") {
      const [existing2] = await db.select().from(lessonGroups).where(eq(lessonGroups.lessonId, lessonId));
      if (existing2) return existing2.id;
    }
    throw err;
  }
}

export function registerLessonGroupRoutes(app: Express) {

  // GET /api/lesson-groups/:lessonId/posts - List posts for a lesson's discussion group
  app.get("/api/lesson-groups/:lessonId/posts", requireParentAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const parentId = req.session.parentId!;
      const lessonId = req.params.lessonId;

      const [lesson] = await db.select({ id: lessons.id, courseId: lessons.courseId }).from(lessons).where(eq(lessons.id, lessonId));
      if (!lesson) return res.status(404).json({ error: "Casharka lama helin" });

      const hasAccess = await checkLessonAccess(parentId, lesson.courseId);
      if (!hasAccess) return res.status(403).json({ error: "Koorsadan kuma diiwangalisna" });

      const groupId = await getOrCreateLessonGroup(lessonId);

      const posts = await db
        .select({
          id: lessonGroupPosts.id,
          groupId: lessonGroupPosts.groupId,
          userId: lessonGroupPosts.userId,
          parentPostId: lessonGroupPosts.parentPostId,
          content: lessonGroupPosts.content,
          audioUrl: lessonGroupPosts.audioUrl,
          createdAt: lessonGroupPosts.createdAt,
          authorName: parents.name,
          authorPicture: parents.picture,
        })
        .from(lessonGroupPosts)
        .innerJoin(parents, eq(lessonGroupPosts.userId, parents.id))
        .where(eq(lessonGroupPosts.groupId, groupId))
        .orderBy(desc(lessonGroupPosts.createdAt))
        .limit(200);

      const postIds = posts.map(p => p.id);
      let myReactions: { postId: string; reactionType: string }[] = [];
      let reactionCounts: { postId: string; reactionType: string; count: number }[] = [];

      if (postIds.length > 0) {
        const myReactionsResult = await db.select({
          postId: lessonGroupPostReactions.postId,
          reactionType: lessonGroupPostReactions.reactionType,
        })
          .from(lessonGroupPostReactions)
          .where(and(
            sql`${lessonGroupPostReactions.postId} IN (${sql.join(postIds.map(id => sql`${id}`), sql`, `)})`,
            eq(lessonGroupPostReactions.userId, parentId)
          ));
        myReactions = myReactionsResult;

        const countsResult = await db.select({
          postId: lessonGroupPostReactions.postId,
          reactionType: lessonGroupPostReactions.reactionType,
          count: count(),
        })
          .from(lessonGroupPostReactions)
          .where(sql`${lessonGroupPostReactions.postId} IN (${sql.join(postIds.map(id => sql`${id}`), sql`, `)})`)
          .groupBy(lessonGroupPostReactions.postId, lessonGroupPostReactions.reactionType);
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

      res.json({ groupId, posts: enriched });
    } catch (error) {
      console.error("[LESSON-GROUPS] Error listing posts:", error);
      res.status(500).json({ error: "Failed to list posts" });
    }
  });

  // POST /api/lesson-groups/:lessonId/posts - Create a post (text + optional audio)
  app.post("/api/lesson-groups/:lessonId/posts", requireParentAuthMiddleware, audioUpload.single("audio"), async (req: Request, res: Response) => {
    try {
      const parentId = req.session.parentId!;
      const lessonId = req.params.lessonId;
      const { content, parentPostId } = req.body;

      const [lesson] = await db.select({ id: lessons.id, courseId: lessons.courseId }).from(lessons).where(eq(lessons.id, lessonId));
      if (!lesson) return res.status(404).json({ error: "Casharka lama helin" });

      const hasAccess = await checkLessonAccess(parentId, lesson.courseId);
      if (!hasAccess) return res.status(403).json({ error: "Koorsadan kuma diiwangalisna" });

      if (!content?.trim() && !req.file) {
        return res.status(400).json({ error: "Qoraal ama cod waa lagama maarmaan" });
      }

      const groupId = await getOrCreateLessonGroup(lessonId);

      if (parentPostId) {
        const [parentPost] = await db.select({ id: lessonGroupPosts.id }).from(lessonGroupPosts).where(eq(lessonGroupPosts.id, parentPostId));
        if (!parentPost) return res.status(404).json({ error: "Post-ka aad ka jawaabayso lama helin" });
      }

      let audioUrl: string | null = null;
      if (req.file) {
        try {
          const ext = req.file.mimetype.includes("mp4") ? "mp4" : req.file.mimetype.includes("ogg") ? "ogg" : req.file.mimetype.includes("wav") ? "wav" : "webm";
          const fileName = `lesson-group-${groupId}-${Date.now()}.${ext}`;
          const result = await uploadToR2(req.file.buffer, fileName, req.file.mimetype, "lesson-groups", "dhambaal");
          audioUrl = result.url;
        } catch (uploadErr) {
          console.error("[LESSON-GROUPS] Audio upload failed:", uploadErr);
          return res.status(500).json({ error: "Codka lama upload gareen. Fadlan isku day mar kale." });
        }
      }

      const [post] = await db.insert(lessonGroupPosts).values({
        groupId,
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
      console.error("[LESSON-GROUPS] Error creating post:", error);
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  // POST /api/lesson-groups/posts/:postId/react - Toggle a reaction on a post
  app.post("/api/lesson-groups/posts/:postId/react", requireParentAuthMiddleware, async (req: Request, res: Response) => {
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

      const [post] = await db.select({ id: lessonGroupPosts.id }).from(lessonGroupPosts).where(eq(lessonGroupPosts.id, postId));
      if (!post) return res.status(404).json({ error: "Post-ka lama helin" });

      const [existing] = await db.select()
        .from(lessonGroupPostReactions)
        .where(and(
          eq(lessonGroupPostReactions.postId, postId),
          eq(lessonGroupPostReactions.userId, parentId),
          eq(lessonGroupPostReactions.reactionType, reactionType)
        ));

      if (existing) {
        await db.delete(lessonGroupPostReactions)
          .where(and(
            eq(lessonGroupPostReactions.postId, postId),
            eq(lessonGroupPostReactions.userId, parentId),
            eq(lessonGroupPostReactions.reactionType, reactionType)
          ));
        res.json({ reacted: false, reactionType });
      } else {
        await db.insert(lessonGroupPostReactions).values({
          postId,
          userId: parentId,
          reactionType,
        });
        res.json({ reacted: true, reactionType });
      }
    } catch (error) {
      console.error("[LESSON-GROUPS] Error toggling reaction:", error);
      res.status(500).json({ error: "Failed to toggle reaction" });
    }
  });

  // DELETE /api/lesson-groups/posts/:postId - Delete own post
  app.delete("/api/lesson-groups/posts/:postId", requireParentAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const parentId = req.session.parentId!;
      const postId = req.params.postId;

      const [post] = await db.select().from(lessonGroupPosts).where(eq(lessonGroupPosts.id, postId));
      if (!post) return res.status(404).json({ error: "Post-ka lama helin" });

      if (post.userId !== parentId) {
        const [parent] = await db.select({ isAdmin: parents.isAdmin }).from(parents).where(eq(parents.id, parentId));
        if (!parent?.isAdmin) {
          return res.status(403).json({ error: "Post-kaaga kaliya ayaad tirtiri kartaa" });
        }
      }

      await db.delete(lessonGroupPosts).where(eq(lessonGroupPosts.id, postId));
      res.json({ success: true });
    } catch (error) {
      console.error("[LESSON-GROUPS] Error deleting post:", error);
      res.status(500).json({ error: "Failed to delete post" });
    }
  });

  // GET /api/lesson-groups/:lessonId/stats - Get discussion stats for a lesson
  app.get("/api/lesson-groups/:lessonId/stats", requireParentAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const lessonId = req.params.lessonId;

      const [group] = await db.select().from(lessonGroups).where(eq(lessonGroups.lessonId, lessonId));
      if (!group) return res.json({ postCount: 0, participantCount: 0 });

      const [postCount] = await db.select({ count: count() }).from(lessonGroupPosts).where(eq(lessonGroupPosts.groupId, group.id));
      const participantResult = await db.selectDistinct({ userId: lessonGroupPosts.userId }).from(lessonGroupPosts).where(eq(lessonGroupPosts.groupId, group.id));

      res.json({
        postCount: Number(postCount?.count || 0),
        participantCount: participantResult.length,
      });
    } catch (error) {
      console.error("[LESSON-GROUPS] Error getting stats:", error);
      res.status(500).json({ error: "Failed to get stats" });
    }
  });
}
