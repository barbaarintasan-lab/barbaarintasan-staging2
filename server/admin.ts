import { type Request, type Response, type NextFunction } from "express"
import { db, pool } from "./db"
import {
  parents,
  children,
  childProgress,
  quranLessonProgress,
  childGameScores,
  childRewardBalances,
  enrollments,
  courses,
  childBadges,
  eq,
  and,
  count,
  desc,
  gte,
  sql,
} from "@shared/schema"
import { eq, and, sql, count, desc, gte } from "drizzle-orm"

// Middleware to check if user is admin
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId || !req.session.isAdmin) {
    return res.status(403).json({ error: "Admin access required" })
  }
  next()
}

// Get admin stats
export async function getAdminStats() {
  try {
    const [parentStats, childStats, enrollmentStats] = await Promise.all([
      db.select({ count: count() }).from(parents),
      db.select({ count: count() }).from(children),
      db.select({ count: count() }).from(enrollments),
    ])

    // Get this month's new users
    const thisMonth = new Date()
    thisMonth.setDate(1)
    const [newParents, newChildren] = await Promise.all([
      db
        .select({ count: count() })
        .from(parents)
        .where(gte(parents.createdAt, thisMonth)),
      db
        .select({ count: count() })
        .from(children)
        .where(gte(children.createdAt, thisMonth)),
    ])

    // Get active children (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const [activeChildren] = await db
      .select({ count: count() })
      .from(quranLessonProgress)
      .where(gte(quranLessonProgress.lastAttemptAt, sevenDaysAgo))

    // Get top courses
    const topCourses = await db
      .select({
        courseId: courses.courseId,
        title: courses.title,
        enrollments: count(enrollments.id),
      })
      .from(enrollments)
      .rightJoin(courses, eq(enrollments.courseId, courses.id))
      .groupBy(courses.id, courses.courseId, courses.title)
      .orderBy(desc(count(enrollments.id)))
      .limit(5)

    return {
      totalParents: parentStats[0]?.count || 0,
      totalChildren: childStats[0]?.count || 0,
      totalEnrollments: enrollmentStats[0]?.count || 0,
      activeChildren: activeChildren[0]?.count || 0,
      parentsThisMonth: newParents[0]?.count || 0,
      childrenThisMonth: newChildren[0]?.count || 0,
      averageEngagement: 0, // Calculate based on active vs total
      topCourses: topCourses.map((c) => ({
        courseId: c.courseId,
        title: c.title,
        enrollments: c.enrollments,
      })),
    }
  } catch (error) {
    console.error("Error fetching admin stats:", error)
    throw error
  }
}

// Get parents list with pagination
export async function getAdminParents(
  page: number = 1,
  pageSize: number = 10,
  search: string = ""
) {
  try {
    const offset = (page - 1) * pageSize

    const query = db
      .select({
        id: parents.id,
        name: parents.name,
        email: parents.email,
        createdAt: parents.createdAt,
      })
      .from(parents)

    if (search) {
      // Add search filter if provided
      query.where(
        sql`${parents.name} ILIKE ${'%' + search + '%'} OR ${parents.email} ILIKE ${'%' + search + '%'}`
      )
    }

    const parentsList = await query
      .orderBy(desc(parents.createdAt))
      .limit(pageSize)
      .offset(offset)

    // Get full parent info with counts
    const enrichedParents = await Promise.all(
      parentsList.map(async (p) => {
        const [childrenCount] = await db
          .select({ count: count() })
          .from(children)
          .where(eq(children.parentId, p.id))

        const [enrollmentCount] = await db
          .select({ count: count() })
          .from(enrollments)
          .where(eq(enrollments.parentId, p.id))

        return {
          id: p.id,
          name: p.name,
          email: p.email,
          children_count: childrenCount?.count || 0,
          courses_enrolled: enrollmentCount?.count || 0,
          createdAt: p.createdAt,
        }
      })
    )

    // Get total count
    let totalQuery = db.select({ count: count() }).from(parents)
    if (search) {
      totalQuery = totalQuery.where(
        sql`${parents.name} ILIKE ${'%' + search + '%'} OR ${parents.email} ILIKE ${'%' + search + '%'}`
      )
    }
    const [total] = await totalQuery

    return {
      data: enrichedParents,
      total: total?.count || 0,
    }
  } catch (error) {
    console.error("Error fetching admin parents:", error)
    throw error
  }
}

// Get children list with pagination
export async function getAdminChildren(
  page: number = 1,
  pageSize: number = 10,
  search: string = ""
) {
  try {
    const offset = (page - 1) * pageSize

    const query = db
      .select({
        id: children.id,
        name: children.name,
        age: children.age,
        parentId: children.parentId,
        createdAt: children.createdAt,
      })
      .from(children)

    if (search) {
      query.where(
        sql`${children.name} ILIKE ${'%' + search + '%'}`
      )
    }

    const childrenList = await query
      .orderBy(desc(children.createdAt))
      .limit(pageSize)
      .offset(offset)

    // Enrich with parent name and progress
    const enrichedChildren = await Promise.all(
      childrenList.map(async (c) => {
        // Get parent name
        const parentData = await db
          .select({ name: parents.name })
          .from(parents)
          .where(eq(parents.id, c.parentId))
          .limit(1)

        // Get quran progress (completed surahs)
        const completedSurahs = await db
          .select({ count: count() })
          .from(childProgress)
          .where(and(eq(childProgress.childId, c.id), eq(childProgress.completed, true)))

        // Get total game score
        const gameScores = await db
          .select({ totalScore: sql`SUM(${childGameScores.score})` })
          .from(childGameScores)
          .where(eq(childGameScores.childId, c.id))

        // Get last active if available from game scores
        const lastGame = await db
          .select({ completedAt: childGameScores.completedAt })
          .from(childGameScores)
          .where(eq(childGameScores.childId, c.id))
          .orderBy(desc(childGameScores.completedAt))
          .limit(1)

        return {
          id: c.id,
          name: c.name,
          age: c.age,
          parent_name: parentData[0]?.name || "Unknown",
          quran_progress: Math.min((completedSurahs[0]?.count || 0) * 3.33, 100), // 30 surahs = 100%
          total_game_score: gameScores[0]?.totalScore || 0,
          last_active: lastGame[0]?.completedAt || c.createdAt,
        }
      })
    )

    // Get total count
    let countQuery = db.select({ count: count() }).from(children)
    if (search) {
      countQuery = countQuery.where(
        sql`${children.name} ILIKE ${'%' + search + '%'}`
      )
    }
    const [total] = await countQuery

    return {
      data: enrichedChildren,
      total: total?.count || 0,
    }
  } catch (error) {
    console.error("Error fetching admin children:", error)
    throw error
  }
}

// Get child details
export async function getChildDetails(childId: string) {
  try {
    const childData = await db
      .select()
      .from(children)
      .where(eq(children.id, childId))
      .limit(1)

    if (!childData[0]) {
      throw new Error("Child not found")
    }

    const [progress] = await db
      .select({ count: count() })
      .from(childProgress)
      .where(eq(childProgress.childId, childId))

    const [badges] = await db
      .select({ count: count() })
      .from(childBadges) // Assuming this table exists
      .where(eq(childBadges.childId, childId))

    const rewardBalance = await db
      .select()
      .from(childRewardBalances)
      .where(eq(childRewardBalances.childId, childId))
      .limit(1)

    return {
      child: childData[0],
      stats: {
        lessonsCompleted: progress[0]?.count || 0,
        badgesEarned: badges[0]?.count || 0,
        totalCoins: rewardBalance[0]?.totalCoins || 0,
        totalStars: rewardBalance[0]?.totalStars || 0,
      },
    }
  } catch (error) {
    console.error("Error fetching child details:", error)
    throw error
  }
}

// Get analytics data
export async function getAdminAnalytics(days: number = 30) {
  try {
    const analytics: any[] = []

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split("T")[0]

      // Get active users for this date
      const dayStart = new Date(date)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(date)
      dayEnd.setHours(23, 59, 59, 999)

      // Count unique children active on this date
      const [activeUsers] = await db
        .select({ count: count(sql`DISTINCT ${quranLessonProgress.childId}`) })
        .from(quranLessonProgress)
        .where(
          and(
            gte(quranLessonProgress.lastAttemptAt, dayStart),
            sql`${quranLessonProgress.lastAttemptAt} < ${dayEnd}`
          )
        )

      // Count completed lessons
      const [completedLessons] = await db
        .select({ count: count() })
        .from(quranLessonProgress)
        .where(
          and(
            eq(quranLessonProgress.completed, true),
            gte(quranLessonProgress.completedAt, dayStart),
            sql`${quranLessonProgress.completedAt} < ${dayEnd}`
          )
        )

      // Count games played
      const [gamesPlayed] = await db
        .select({ count: count() })
        .from(childGameScores)
        .where(
          and(
            gte(childGameScores.completedAt, dayStart),
            sql`${childGameScores.completedAt} < ${dayEnd}`
          )
        )

      analytics.push({
        date: dateStr,
        active_users: activeUsers[0]?.count || 0,
        completed_lessons: completedLessons[0]?.count || 0,
        games_played: gamesPlayed[0]?.count || 0,
      })
    }

    return analytics
  } catch (error) {
    console.error("Error fetching admin analytics:", error)
    throw error
  }
}
