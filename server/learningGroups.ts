import { Express, Request, Response } from "express";
import { eq, desc, and, sql, count, isNotNull } from "drizzle-orm";
import { db } from "./db";
import multer from "multer";
import {
  learningGroups,
  groupMembers,
  groupPosts,
  groupPostLikes,
  groupPostComments,
  groupPostReactions,
  parents,
  courses,
  lessonProgress,
  lessons,
  enrollments,
  badges,
  badgeAwards,
  certificates,
  contentProgress,
  parentMessages,
  bedtimeStories,
} from "@shared/schema";
import { uploadToR2, isR2Configured } from "./r2Storage";

const groupAudioUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

async function requireParentAuthMiddleware(req: Request, res: Response, next: Function) {
  if (!req.session.parentId) {
    return res.status(401).json({ error: "Fadlan ku gal akoonkaaga" });
  }
  return next();
}

export function registerLearningGroupRoutes(app: Express) {

  // GET /api/groups - List all groups (public + course groups visible to all but access-controlled)
  app.get("/api/groups", requireParentAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const parentId = req.session.parentId!;
      const { contentType } = req.query;
      
      const conditions: any[] = [];
      if (contentType && typeof contentType === 'string') {
        conditions.push(eq(learningGroups.contentType, contentType));
      }
      
      const allGroups = await db
        .select({
          id: learningGroups.id,
          name: learningGroups.name,
          description: learningGroups.description,
          coverImage: learningGroups.coverImage,
          courseIds: learningGroups.courseIds,
          contentType: learningGroups.contentType,
          contentId: learningGroups.contentId,
          createdBy: learningGroups.createdBy,
          isPublic: learningGroups.isPublic,
          maxMembers: learningGroups.maxMembers,
          memberCount: learningGroups.memberCount,
          createdAt: learningGroups.createdAt,
        })
        .from(learningGroups)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(learningGroups.createdAt));

      const myMemberships = await db
        .select({ groupId: groupMembers.groupId, role: groupMembers.role })
        .from(groupMembers)
        .where(eq(groupMembers.userId, parentId));

      const membershipMap = new Map(myMemberships.map(m => [m.groupId, m.role]));

      const creatorIds = [...new Set(allGroups.map(g => g.createdBy))];
      const creators = creatorIds.length > 0
        ? await db.select({ id: parents.id, name: parents.name, picture: parents.picture })
            .from(parents)
            .where(sql`${parents.id} IN (${sql.join(creatorIds.map(id => sql`${id}`), sql`, `)})`)
        : [];
      const creatorMap = new Map(creators.map(c => [c.id, c]));

      const courseGroupContentIds = allGroups
        .filter(g => g.contentType === 'course' && g.contentId && !g.isPublic)
        .map(g => g.contentId!);
      
      let enrolledCourseIds: string[] = [];
      if (courseGroupContentIds.length > 0) {
        const myEnrollments = await db.select({ courseId: enrollments.courseId })
          .from(enrollments)
          .where(and(
            eq(enrollments.parentId, parentId),
            eq(enrollments.status, 'active'),
            sql`${enrollments.courseId} IN (${sql.join(courseGroupContentIds.map(id => sql`${id}`), sql`, `)})`
          ));
        enrolledCourseIds = myEnrollments.map(e => e.courseId).filter(Boolean) as string[];
      }

      const enriched = allGroups.map(g => {
        let hasAccess = true;
        if (g.contentType === 'course' && !g.isPublic && g.contentId) {
          hasAccess = enrolledCourseIds.includes(g.contentId) || membershipMap.has(g.id);
        }
        return {
          ...g,
          isMember: membershipMap.has(g.id),
          myRole: membershipMap.get(g.id) || null,
          creator: creatorMap.get(g.createdBy) || null,
          hasAccess,
        };
      });

      res.json(enriched);
    } catch (error) {
      console.error("[GROUPS] Error listing groups:", error);
      res.status(500).json({ error: "Failed to list groups" });
    }
  });

  // GET /api/groups/my - List groups the user belongs to
  app.get("/api/groups/my", requireParentAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const parentId = req.session.parentId!;

      const myGroups = await db
        .select({
          id: learningGroups.id,
          name: learningGroups.name,
          description: learningGroups.description,
          coverImage: learningGroups.coverImage,
          courseIds: learningGroups.courseIds,
          memberCount: learningGroups.memberCount,
          createdBy: learningGroups.createdBy,
          createdAt: learningGroups.createdAt,
          role: groupMembers.role,
        })
        .from(groupMembers)
        .innerJoin(learningGroups, eq(groupMembers.groupId, learningGroups.id))
        .where(eq(groupMembers.userId, parentId))
        .orderBy(desc(learningGroups.createdAt));

      res.json(myGroups);
    } catch (error) {
      console.error("[GROUPS] Error listing my groups:", error);
      res.status(500).json({ error: "Failed to list my groups" });
    }
  });

  // POST /api/groups - Create a new group
  app.post("/api/groups", requireParentAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const parentId = req.session.parentId!;
      const { name, description, courseIds, isPublic, coverImage } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: "Magaca guruubka waa lagama maarmaan" });
      }

      const [group] = await db.insert(learningGroups).values({
        name: name.trim(),
        description: description?.trim() || null,
        coverImage: coverImage || null,
        courseIds: courseIds || [],
        createdBy: parentId,
        isPublic: isPublic !== false,
        memberCount: 1,
      }).returning();

      await db.insert(groupMembers).values({
        groupId: group.id,
        userId: parentId,
        role: "admin",
      });

      res.json(group);
    } catch (error) {
      console.error("[GROUPS] Error creating group:", error);
      res.status(500).json({ error: "Failed to create group" });
    }
  });

  // GET /api/groups/:id - Get group details
  app.get("/api/groups/:id", requireParentAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const parentId = req.session.parentId!;
      const groupId = req.params.id;

      const [group] = await db.select().from(learningGroups).where(eq(learningGroups.id, groupId));
      if (!group) {
        return res.status(404).json({ error: "Guruubka lama helin" });
      }

      const [membership] = await db.select()
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, parentId)));

      const members = await db
        .select({
          id: parents.id,
          name: parents.name,
          picture: parents.picture,
          role: groupMembers.role,
          joinedAt: groupMembers.joinedAt,
        })
        .from(groupMembers)
        .innerJoin(parents, eq(groupMembers.userId, parents.id))
        .where(eq(groupMembers.groupId, groupId))
        .orderBy(groupMembers.joinedAt);

      const [creator] = await db
        .select({ id: parents.id, name: parents.name, picture: parents.picture })
        .from(parents)
        .where(eq(parents.id, group.createdBy));

      let courseDetails: any[] = [];
      let effectiveCourseIds: string[] = group.courseIds && group.courseIds.length > 0
        ? group.courseIds
        : (group.contentType === 'course' && group.contentId ? [group.contentId] : []);
      if (effectiveCourseIds.length > 0) {
        courseDetails = await db
          .select({ id: courses.id, title: courses.title, courseId: courses.courseId, imageUrl: courses.imageUrl })
          .from(courses)
          .where(sql`${courses.id} IN (${sql.join(effectiveCourseIds.map(id => sql`${id}`), sql`, `)})`);
      }

      res.json({
        ...group,
        isMember: !!membership,
        myRole: membership?.role || null,
        members,
        creator,
        courses: courseDetails,
      });
    } catch (error) {
      console.error("[GROUPS] Error getting group:", error);
      res.status(500).json({ error: "Failed to get group" });
    }
  });

  // POST /api/groups/:id/join - Join a group
  app.post("/api/groups/:id/join", requireParentAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const parentId = req.session.parentId!;
      const groupId = req.params.id;

      const [group] = await db.select().from(learningGroups).where(eq(learningGroups.id, groupId));
      if (!group) {
        return res.status(404).json({ error: "Guruubka lama helin" });
      }

      if (group.contentType === 'course' && !group.isPublic && group.contentId) {
        const [enrollment] = await db.select({ id: enrollments.id })
          .from(enrollments)
          .where(and(
            eq(enrollments.parentId, parentId),
            eq(enrollments.courseId, group.contentId),
            eq(enrollments.status, 'active')
          ));
        if (!enrollment) {
          return res.status(403).json({ error: "Dadka koorsada qaata ayaa geli kara guruubkan. Fadlan koorsada iibasdo." });
        }
      }

      if (group.maxMembers && group.memberCount >= group.maxMembers) {
        return res.status(400).json({ error: "Guruubku way buuxdahay" });
      }

      const [existing] = await db.select()
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, parentId)));

      if (existing) {
        return res.status(400).json({ error: "Horey ayaad ugu jirtay guruubkan" });
      }

      await db.insert(groupMembers).values({
        groupId,
        userId: parentId,
        role: "member",
      });

      await db.update(learningGroups)
        .set({ memberCount: sql`${learningGroups.memberCount} + 1` })
        .where(eq(learningGroups.id, groupId));

      res.json({ success: true });
    } catch (error) {
      console.error("[GROUPS] Error joining group:", error);
      res.status(500).json({ error: "Failed to join group" });
    }
  });

  // POST /api/groups/:id/leave - Leave a group
  app.post("/api/groups/:id/leave", requireParentAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const parentId = req.session.parentId!;
      const groupId = req.params.id;

      const [group] = await db.select().from(learningGroups).where(eq(learningGroups.id, groupId));
      if (!group) {
        return res.status(404).json({ error: "Guruubka lama helin" });
      }

      if (group.createdBy === parentId) {
        return res.status(400).json({ error: "Aasaasaha guruubka ma ka bixi karo" });
      }

      await db.delete(groupMembers)
        .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, parentId)));

      await db.update(learningGroups)
        .set({ memberCount: sql`GREATEST(${learningGroups.memberCount} - 1, 0)` })
        .where(eq(learningGroups.id, groupId));

      res.json({ success: true });
    } catch (error) {
      console.error("[GROUPS] Error leaving group:", error);
      res.status(500).json({ error: "Failed to leave group" });
    }
  });

  // GET /api/groups/:id/posts - List group posts (paginated)
  app.get("/api/groups/:id/posts", requireParentAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const parentId = req.session.parentId!;
      const groupId = req.params.id;
      const parsedLimit = parseInt(req.query.limit as string);
      const limit = Math.min(Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 5, 50);
      const parsedOffset = parseInt(req.query.offset as string);
      const offset = Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

      const [membership] = await db.select()
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, parentId)));

      if (!membership) {
        return res.status(403).json({ error: "Guruubka kuma jirtid" });
      }

      const [countResult] = await db.select({ count: sql<number>`count(*)::int` })
        .from(groupPosts)
        .where(eq(groupPosts.groupId, groupId));
      const totalCount = countResult?.count || 0;

      const posts = await db
        .select({
          id: groupPosts.id,
          groupId: groupPosts.groupId,
          userId: groupPosts.userId,
          title: groupPosts.title,
          content: groupPosts.content,
          audioUrl: groupPosts.audioUrl,
          imageUrl: groupPosts.imageUrl,
          likeCount: groupPosts.likeCount,
          commentCount: groupPosts.commentCount,
          createdAt: groupPosts.createdAt,
          authorName: parents.name,
          authorPicture: parents.picture,
        })
        .from(groupPosts)
        .innerJoin(parents, eq(groupPosts.userId, parents.id))
        .where(eq(groupPosts.groupId, groupId))
        .orderBy(desc(groupPosts.createdAt))
        .limit(limit)
        .offset(offset);

      const postIds = posts.map(p => p.id);
      let myLikes: string[] = [];
      let allReactions: { postId: string; emoji: string; count: number }[] = [];
      let myReactionsMap: Record<string, string[]> = {};

      if (postIds.length > 0) {
        const likes = await db.select({ postId: groupPostLikes.postId })
          .from(groupPostLikes)
          .where(and(
            sql`${groupPostLikes.postId} IN (${sql.join(postIds.map(id => sql`${id}`), sql`, `)})`,
            eq(groupPostLikes.userId, parentId)
          ));
        myLikes = likes.map(l => l.postId);

        const reactionCounts = await db
          .select({
            postId: groupPostReactions.postId,
            emoji: groupPostReactions.emoji,
            count: count(),
          })
          .from(groupPostReactions)
          .where(sql`${groupPostReactions.postId} IN (${sql.join(postIds.map(id => sql`${id}`), sql`, `)})`)
          .groupBy(groupPostReactions.postId, groupPostReactions.emoji);
        allReactions = reactionCounts.map(r => ({ postId: r.postId, emoji: r.emoji, count: r.count }));

        const myReactions = await db.select({ postId: groupPostReactions.postId, emoji: groupPostReactions.emoji })
          .from(groupPostReactions)
          .where(and(
            sql`${groupPostReactions.postId} IN (${sql.join(postIds.map(id => sql`${id}`), sql`, `)})`,
            eq(groupPostReactions.userId, parentId),
          ));
        for (const r of myReactions) {
          if (!myReactionsMap[r.postId]) myReactionsMap[r.postId] = [];
          myReactionsMap[r.postId].push(r.emoji);
        }
      }

      const enriched = posts.map(p => ({
        ...p,
        isLiked: myLikes.includes(p.id),
        reactions: allReactions.filter(r => r.postId === p.id).map(r => ({ emoji: r.emoji, count: r.count })),
        myReactions: myReactionsMap[p.id] || [],
        author: { id: p.userId, name: p.authorName, picture: p.authorPicture },
      }));

      res.json({ posts: enriched, total: totalCount, hasMore: offset + limit < totalCount });
    } catch (error) {
      console.error("[GROUPS] Error listing posts:", error);
      res.status(500).json({ error: "Failed to list posts" });
    }
  });

  // POST /api/groups/:id/posts - Create a group post
  app.post("/api/groups/:id/posts", requireParentAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const parentId = req.session.parentId!;
      const groupId = req.params.id;

      const [membership] = await db.select()
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, parentId)));

      if (!membership) {
        return res.status(403).json({ error: "Guruubka kuma jirtid" });
      }

      const { content, audioUrl, imageUrl } = req.body;

      if (!content && !audioUrl && !imageUrl) {
        return res.status(400).json({ error: "Post-ku waa in uu leeyahay qoraal, audio ama sawir" });
      }

      const [post] = await db.insert(groupPosts).values({
        groupId,
        userId: parentId,
        content: content?.trim() || null,
        audioUrl: audioUrl || null,
        imageUrl: imageUrl || null,
      }).returning();

      const [author] = await db.select({ id: parents.id, name: parents.name, picture: parents.picture })
        .from(parents).where(eq(parents.id, parentId));

      res.json({ ...post, author, isLiked: false });
    } catch (error) {
      console.error("[GROUPS] Error creating post:", error);
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  // POST /api/groups/posts/:postId/like - Toggle like on a group post
  app.post("/api/groups/posts/:postId/like", requireParentAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const parentId = req.session.parentId!;
      const postId = req.params.postId;

      const [post] = await db.select({ groupId: groupPosts.groupId }).from(groupPosts).where(eq(groupPosts.id, postId));
      if (!post) return res.status(404).json({ error: "Post-ka lama helin" });

      const [membership] = await db.select().from(groupMembers)
        .where(and(eq(groupMembers.groupId, post.groupId), eq(groupMembers.userId, parentId)));
      if (!membership) return res.status(403).json({ error: "Guruubka kuma jirtid" });

      const [existing] = await db.select()
        .from(groupPostLikes)
        .where(and(eq(groupPostLikes.postId, postId), eq(groupPostLikes.userId, parentId)));

      if (existing) {
        await db.delete(groupPostLikes)
          .where(and(eq(groupPostLikes.postId, postId), eq(groupPostLikes.userId, parentId)));
        await db.update(groupPosts)
          .set({ likeCount: sql`GREATEST(${groupPosts.likeCount} - 1, 0)` })
          .where(eq(groupPosts.id, postId));
        res.json({ liked: false });
      } else {
        await db.insert(groupPostLikes).values({ postId, userId: parentId });
        await db.update(groupPosts)
          .set({ likeCount: sql`${groupPosts.likeCount} + 1` })
          .where(eq(groupPosts.id, postId));
        res.json({ liked: true });
      }
    } catch (error) {
      console.error("[GROUPS] Error toggling like:", error);
      res.status(500).json({ error: "Failed to toggle like" });
    }
  });

  // POST /api/groups/posts/:postId/react - Toggle emoji reaction on a group post
  app.post("/api/groups/posts/:postId/react", requireParentAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const parentId = req.session.parentId!;
      const postId = req.params.postId;
      const { emoji } = req.body;

      const VALID_EMOJIS = ["❤️", "👍", "😂", "🤲", "👏", "💡", "🔥", "💪"];
      if (!emoji || !VALID_EMOJIS.includes(emoji)) {
        return res.status(400).json({ error: "Emoji aan la aqoon" });
      }

      const [post] = await db.select({ groupId: groupPosts.groupId }).from(groupPosts).where(eq(groupPosts.id, postId));
      if (!post) return res.status(404).json({ error: "Post-ka lama helin" });

      const [membership] = await db.select().from(groupMembers)
        .where(and(eq(groupMembers.groupId, post.groupId), eq(groupMembers.userId, parentId)));
      if (!membership) return res.status(403).json({ error: "Guruubka kuma jirtid" });

      const [existing] = await db.select()
        .from(groupPostReactions)
        .where(and(
          eq(groupPostReactions.postId, postId),
          eq(groupPostReactions.userId, parentId),
          eq(groupPostReactions.emoji, emoji),
        ));

      if (existing) {
        await db.delete(groupPostReactions)
          .where(and(
            eq(groupPostReactions.postId, postId),
            eq(groupPostReactions.userId, parentId),
            eq(groupPostReactions.emoji, emoji),
          ));
        res.json({ reacted: false, emoji });
      } else {
        await db.insert(groupPostReactions).values({ postId, userId: parentId, emoji });
        res.json({ reacted: true, emoji });
      }
    } catch (error) {
      console.error("[GROUPS] Error toggling reaction:", error);
      res.status(500).json({ error: "Failed to toggle reaction" });
    }
  });

  // GET /api/groups/posts/:postId/reactions - Get reactions for a post
  app.get("/api/groups/posts/:postId/reactions", requireParentAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const parentId = req.session.parentId!;
      const postId = req.params.postId;

      const reactions = await db
        .select({
          emoji: groupPostReactions.emoji,
          count: count(),
        })
        .from(groupPostReactions)
        .where(eq(groupPostReactions.postId, postId))
        .groupBy(groupPostReactions.emoji);

      const myReactions = await db.select({ emoji: groupPostReactions.emoji })
        .from(groupPostReactions)
        .where(and(eq(groupPostReactions.postId, postId), eq(groupPostReactions.userId, parentId)));

      res.json({
        reactions: reactions.map(r => ({ emoji: r.emoji, count: r.count })),
        myReactions: myReactions.map(r => r.emoji),
      });
    } catch (error) {
      console.error("[GROUPS] Error getting reactions:", error);
      res.status(500).json({ error: "Failed to get reactions" });
    }
  });

  // GET /api/groups/posts/:postId/comments - List comments on a group post
  app.get("/api/groups/posts/:postId/comments", requireParentAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const parentId = req.session.parentId!;
      const postId = req.params.postId;

      const [post] = await db.select({ groupId: groupPosts.groupId }).from(groupPosts).where(eq(groupPosts.id, postId));
      if (!post) return res.status(404).json({ error: "Post-ka lama helin" });

      const [membership] = await db.select().from(groupMembers)
        .where(and(eq(groupMembers.groupId, post.groupId), eq(groupMembers.userId, parentId)));
      if (!membership) return res.status(403).json({ error: "Guruubka kuma jirtid" });

      const comments = await db
        .select({
          id: groupPostComments.id,
          postId: groupPostComments.postId,
          userId: groupPostComments.userId,
          content: groupPostComments.content,
          createdAt: groupPostComments.createdAt,
          authorName: parents.name,
          authorPicture: parents.picture,
        })
        .from(groupPostComments)
        .innerJoin(parents, eq(groupPostComments.userId, parents.id))
        .where(eq(groupPostComments.postId, postId))
        .orderBy(groupPostComments.createdAt);

      const enriched = comments.map(c => ({
        ...c,
        author: { id: c.userId, name: c.authorName, picture: c.authorPicture },
      }));

      res.json(enriched);
    } catch (error) {
      console.error("[GROUPS] Error listing comments:", error);
      res.status(500).json({ error: "Failed to list comments" });
    }
  });

  // POST /api/groups/posts/:postId/comments - Add a comment to a group post
  app.post("/api/groups/posts/:postId/comments", requireParentAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const parentId = req.session.parentId!;
      const postId = req.params.postId;
      const { content } = req.body;

      const [post] = await db.select({ groupId: groupPosts.groupId }).from(groupPosts).where(eq(groupPosts.id, postId));
      if (!post) return res.status(404).json({ error: "Post-ka lama helin" });

      const [membership] = await db.select().from(groupMembers)
        .where(and(eq(groupMembers.groupId, post.groupId), eq(groupMembers.userId, parentId)));
      if (!membership) return res.status(403).json({ error: "Guruubka kuma jirtid" });

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "Faalladaada waa lagama maarmaan" });
      }

      const [comment] = await db.insert(groupPostComments).values({
        postId,
        userId: parentId,
        content: content.trim(),
      }).returning();

      await db.update(groupPosts)
        .set({ commentCount: sql`${groupPosts.commentCount} + 1` })
        .where(eq(groupPosts.id, postId));

      const [author] = await db.select({ id: parents.id, name: parents.name, picture: parents.picture })
        .from(parents).where(eq(parents.id, parentId));

      res.json({ ...comment, author });
    } catch (error) {
      console.error("[GROUPS] Error adding comment:", error);
      res.status(500).json({ error: "Failed to add comment" });
    }
  });

  // DELETE /api/groups/posts/:postId - Delete a group post (author or admin only)
  app.delete("/api/groups/posts/:postId", requireParentAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const parentId = req.session.parentId!;
      const postId = req.params.postId;

      const [post] = await db.select().from(groupPosts).where(eq(groupPosts.id, postId));
      if (!post) {
        return res.status(404).json({ error: "Post-ka lama helin" });
      }

      const [membership] = await db.select()
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, post.groupId), eq(groupMembers.userId, parentId)));

      if (post.userId !== parentId && membership?.role !== "admin") {
        return res.status(403).json({ error: "Adigaaga kaliya ama admin-ka ayaa tirtiri kara" });
      }

      await db.delete(groupPosts).where(eq(groupPosts.id, postId));
      res.json({ success: true });
    } catch (error) {
      console.error("[GROUPS] Error deleting post:", error);
      res.status(500).json({ error: "Failed to delete post" });
    }
  });

  // POST /api/groups/:id/posts/audio - Upload audio post to group
  app.post("/api/groups/:id/posts/audio", requireParentAuthMiddleware, groupAudioUpload.single('audio'), async (req: Request, res: Response) => {
    try {
      const parentId = req.session.parentId!;
      const groupId = req.params.id;

      const [membership] = await db.select()
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, parentId)));

      if (!membership) {
        return res.status(403).json({ error: "Guruubka kuma jirtid" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "Audio file waa lagama maarmaan" });
      }

      const content = req.body.content?.trim() || null;
      const title = req.body.title?.trim() || null;
      const timestamp = Date.now();
      const ext = (req.file.mimetype || '').includes('mpeg') || (req.file.mimetype || '').includes('mp3') ? 'mp3' : 'webm';
      const fileName = `group-audio-${timestamp}.${ext}`;

      let audioUrl: string | null = null;

      if (isR2Configured()) {
        const r2Result = await uploadToR2(
          req.file.buffer,
          fileName,
          req.file.mimetype || 'audio/webm',
          'group-audio',
          'dhambaal'
        );
        audioUrl = r2Result.url;
        console.log(`[GROUPS] Audio uploaded to R2: ${audioUrl}`);
      } else {
        return res.status(500).json({ error: "Audio storage not configured" });
      }

      const [post] = await db.insert(groupPosts).values({
        groupId,
        userId: parentId,
        title,
        content,
        audioUrl,
        imageUrl: null,
      }).returning();

      const [author] = await db.select({ id: parents.id, name: parents.name, picture: parents.picture })
        .from(parents).where(eq(parents.id, parentId));

      res.json({ ...post, author, isLiked: false });
    } catch (error) {
      console.error("[GROUPS] Error uploading audio post:", error);
      res.status(500).json({ error: "Failed to upload audio post" });
    }
  });

  // DELETE /api/groups/:id - Delete a group (creator only)
  app.delete("/api/groups/:id", requireParentAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const parentId = req.session.parentId!;
      const groupId = req.params.id;

      const [group] = await db.select().from(learningGroups).where(eq(learningGroups.id, groupId));
      if (!group) {
        return res.status(404).json({ error: "Guruubka lama helin" });
      }

      if (group.createdBy !== parentId) {
        return res.status(403).json({ error: "Aasaasaha guruubka kaliya ayaa tirtiri kara" });
      }

      await db.delete(learningGroups).where(eq(learningGroups.id, groupId));
      res.json({ success: true });
    } catch (error) {
      console.error("[GROUPS] Error deleting group:", error);
      res.status(500).json({ error: "Failed to delete group" });
    }
  });

  // GET /api/groups/:id/progress - Get member progress for group courses
  app.get("/api/groups/:id/progress", requireParentAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const parentId = req.session.parentId!;
      const groupId = req.params.id;

      const [membership] = await db.select()
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, parentId)));

      if (!membership) {
        return res.status(403).json({ error: "Guruubka kuma jirtid" });
      }

      const [group] = await db.select().from(learningGroups).where(eq(learningGroups.id, groupId));
      if (!group) {
        return res.json([]);
      }

      const members = await db.select({ userId: groupMembers.userId, name: parents.name, picture: parents.picture })
        .from(groupMembers)
        .innerJoin(parents, eq(groupMembers.userId, parents.id))
        .where(eq(groupMembers.groupId, groupId));

      const memberIds = members.map(m => m.userId);

      const isContentGroup = group.contentType === 'dhambaal' || group.contentType === 'sheeko';

      let effectiveCourseIds: string[] = [];
      if (!isContentGroup) {
        effectiveCourseIds = group.courseIds && group.courseIds.length > 0
          ? group.courseIds
          : (group.contentType === 'course' && group.contentId ? [group.contentId] : []);
      }

      if (!isContentGroup && effectiveCourseIds.length === 0) {
        return res.json([]);
      }

      let totalContentCount = 0;
      let memberContentProgress: { parentId: string; readCount: number }[] = [];

      if (isContentGroup) {
        const contentType = group.contentType!;
        const table = contentType === 'dhambaal' ? parentMessages : bedtimeStories;
        const [totalResult] = await db.select({ count: count() }).from(table);
        totalContentCount = totalResult?.count || 0;

        const contentProgressData = await db
          .select({
            parentId: contentProgress.parentId,
            cnt: count(),
          })
          .from(contentProgress)
          .where(and(
            sql`${contentProgress.parentId} IN (${sql.join(memberIds.map(id => sql`${id}`), sql`, `)})`,
            eq(contentProgress.contentType, contentType),
          ))
          .groupBy(contentProgress.parentId);

        memberContentProgress = contentProgressData.map(r => ({
          parentId: r.parentId,
          readCount: r.cnt,
        }));
      }

      let progressData: { parentId: string; courseId: string; completed: boolean }[] = [];
      let courseLessonsCount: Record<string, number> = {};

      if (!isContentGroup && effectiveCourseIds.length > 0) {
        progressData = await db
          .select({
            parentId: lessonProgress.parentId,
            courseId: lessonProgress.courseId,
            completed: lessonProgress.completed,
          })
          .from(lessonProgress)
          .where(and(
            sql`${lessonProgress.parentId} IN (${sql.join(memberIds.map(id => sql`${id}`), sql`, `)})`,
            sql`${lessonProgress.courseId} IN (${sql.join(effectiveCourseIds.map(id => sql`${id}`), sql`, `)})`,
            eq(lessonProgress.completed, true),
          ));

        for (const courseId of effectiveCourseIds) {
          const [result] = await db.select({ count: count() }).from(lessons).where(eq(lessons.courseId, courseId));
          courseLessonsCount[courseId] = result?.count || 0;
        }
      }

      const memberBadges = await db
        .select({
          parentId: badgeAwards.parentId,
          badgeName: badges.name,
          badgeDescription: badges.description,
          badgeImage: badges.imageUrl,
          awardedAt: badgeAwards.awardedAt,
        })
        .from(badgeAwards)
        .innerJoin(badges, eq(badgeAwards.badgeId, badges.id))
        .where(sql`${badgeAwards.parentId} IN (${sql.join(memberIds.map(id => sql`${id}`), sql`, `)})`);

      const memberCertificates = await db
        .select({
          parentId: certificates.parentId,
          courseId: certificates.courseId,
          completedAt: certificates.completedAt,
          certificateUrl: certificates.certificateUrl,
        })
        .from(certificates)
        .where(sql`${certificates.parentId} IN (${sql.join(memberIds.map(id => sql`${id}`), sql`, `)})`);

      const memberStreaks = await db
        .select({
          id: parents.id,
          currentStreak: parents.currentStreak,
          longestStreak: parents.longestStreak,
        })
        .from(parents)
        .where(sql`${parents.id} IN (${sql.join(memberIds.map(id => sql`${id}`), sql`, `)})`);

      const memberProgress = members.map(member => {
        let courseProgress: any[] = [];

        if (isContentGroup) {
          const memberData = memberContentProgress.find(m => m.parentId === member.userId);
          const readCount = memberData?.readCount || 0;
          courseProgress = [{
            contentType: group.contentType,
            readCount,
            totalCount: totalContentCount,
            percent: totalContentCount > 0 ? Math.round((readCount / totalContentCount) * 100) : 0,
          }];
        } else {
          courseProgress = effectiveCourseIds.map(courseId => {
            const completedCount = progressData.filter(
              p => p.parentId === member.userId && p.courseId === courseId
            ).length;
            const totalLessons = courseLessonsCount[courseId] || 1;
            return {
              courseId,
              completedLessons: completedCount,
              totalLessons,
              percent: Math.round((completedCount / totalLessons) * 100),
            };
          });
        }

        const myBadges = memberBadges
          .filter(b => b.parentId === member.userId)
          .map(b => ({ name: b.badgeName, description: b.badgeDescription, imageUrl: b.badgeImage }));

        const myCertificates = memberCertificates
          .filter(c => c.parentId === member.userId)
          .map(c => ({ courseId: c.courseId, completedAt: c.completedAt, certificateUrl: c.certificateUrl }));

        const streakInfo = memberStreaks.find(s => s.id === member.userId);

        return {
          userId: member.userId,
          name: member.name,
          picture: member.picture,
          courses: courseProgress,
          contentType: isContentGroup ? group.contentType : null,
          badges: myBadges,
          certificates: myCertificates,
          currentStreak: streakInfo?.currentStreak || 0,
          longestStreak: streakInfo?.longestStreak || 0,
        };
      });

      res.json(memberProgress);
    } catch (error) {
      console.error("[GROUPS] Error getting progress:", error);
      res.status(500).json({ error: "Failed to get progress" });
    }
  });
}
