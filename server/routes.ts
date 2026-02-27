import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcrypt";
import webpush from "web-push";
import OpenAI from "openai";
import multer from "multer";
import { initializeWebSocket, broadcastNewMessage, broadcastVoiceRoomUpdate, broadcastMessageStatus, broadcastAppreciation, getOnlineUsers } from "./websocket/presence";
import { insertUserSchema, insertCourseSchema, insertLessonSchema, insertQuizSchema, insertQuizQuestionSchema, insertPaymentSubmissionSchema, insertTestimonialSchema, insertAssignmentSubmissionSchema, insertDailyTipScheduleSchema, insertResourceSchema, insertExpenseSchema, insertBankTransferSchema, receiptFingerprints, commentReactions, parents, pushSubscriptions, pushBroadcastLogs, enrollments, translations, ssoTokens, paymentSubmissions, courses, type Parent, type PushSubscription } from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, sql, inArray } from "drizzle-orm";
import { z } from "zod";
import { registerObjectStorageRoutes, ObjectStorageService, objectStorageClient } from "./replit_integrations/object_storage";
import { generateImageBuffer } from "./replit_integrations/image/client";
import { registerImageRoutes } from "./replit_integrations/image";
import { registerBedtimeStoryRoutes, generateDailyBedtimeStory, clearBedtimeStoriesCache } from "./bedtimeStories";
import { registerParentMessageRoutes, generateAndSaveParentMessage, clearParentMessagesCache } from "./parentMessages";
import { registerParentTipsRoutes, generateAndSaveParentTip } from "./parentTips";
import { createGoogleMeetLink } from "./google-calendar";
import { listMaktabadaFiles, getFileDownloadUrl, deleteDriveFile, listFilesInFolder, getDirectDownloadUrl, listMaktabadaSubfolderFiles } from "./google-drive";
import { uploadToGoogleDrive, getOrCreateSheekoFolder, downloadFromGoogleDrive, listDhambaalFiles, listMaaweelFiles, getFileContent, parseDhambaalContent, parseMaaweelContent } from "./googleDrive";
import { sendEmail, sendPurchaseConfirmationEmail, sendWelcomeEmail, sendPasswordResetEmail, sendPaymentPendingEmail, sendAdminPromotionEmail, sendSubscriptionReminderEmail, sendSubscriptionExpiredEmail } from "./email";
import { registerLearningGroupRoutes } from "./learningGroups";
import { registerLessonGroupRoutes } from "./lessonGroups";
import { registerDhambaalDiscussionRoutes } from "./dhambaalDiscussion";
import { registerBatchApiRoutes } from "./batch-api/routes";
import { isSomaliLanguage, normalizeLanguageCode } from "./utils/translations";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { getParentingHelp, checkRateLimit } from "./ai/parenting-help";
import { checkAiAccess, checkOrStartTrial, activateGold, MEMBERSHIP_ADVICE_SOMALI } from "./ai/access-guard";
import { uploadToR2, isR2Configured, listR2Files } from "./r2Storage";
import { moderateContent } from "./ai/content-moderation";
import { AccessToken } from "livekit-server-sdk";
import { videoProxyRouter } from "./videoProxy";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";

const recordingUpload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }
});

const postImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Sawirka kaliya ayaa la oggol yahay') as any, false);
    }
  }
});

function getOpenAIClient(): OpenAI {
  const replitKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const directKey = process.env.OPENAI_API_KEY;
  
  if (replitKey) {
    return new OpenAI({
      apiKey: replitKey,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }
  
  if (!directKey) {
    console.error("[OpenAI] WARNING: No API key found! Both AI_INTEGRATIONS_OPENAI_API_KEY and OPENAI_API_KEY are missing");
  }
  
  return new OpenAI({
    apiKey: directKey || "missing-key",
  });
}

// Initialize web-push with VAPID keys from environment variables
let pushNotificationsEnabled = false;
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:info@barbaarintasan.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  pushNotificationsEnabled = true;
  console.log('[PUSH] Web push notifications enabled');
} else {
  console.log('[PUSH] VAPID keys not configured - push notifications disabled');
}

const PgSession = connectPgSimple(session);

const apiCache = new Map<string, { data: any; expiry: number }>();
function getCached(key: string, ttlMs: number, fetcher: () => Promise<any>): Promise<any> {
  const cached = apiCache.get(key);
  if (cached && Date.now() < cached.expiry) {
    return Promise.resolve(cached.data);
  }
  return fetcher().then(data => {
    apiCache.set(key, { data, expiry: Date.now() + ttlMs });
    return data;
  });
}

// Health check endpoint for deployment readiness checks
export function registerHealthCheck(app: Express) {
  app.get("/health", (req, res) => {
    res.status(200).send("OK");
  });
  app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // Get golden membership sold count
  app.get("/api/golden-membership-sold-count", async (req, res) => {
    try {
      const submissions = await storage.getAllPaymentSubmissions();
      
      // Count all approved yearly $114 golden memberships
      const goldenCount = submissions.filter((s: any) => 
        s.status === 'approved' && 
        s.planType === 'yearly' &&
        s.amount === 114
      ).length;
      
      res.json({ count: goldenCount });
    } catch (error) {
      res.json({ count: 8 });
    }
  });
}

function normalizeVideoUrl(url: string | null | undefined): string | null {
  if (!url || url.trim() === '') return null;
  
  const trimmedUrl = url.trim();
  
  if (trimmedUrl.startsWith('/public-files/')) {
    return trimmedUrl;
  }
  
  if (trimmedUrl.includes('storage.googleapis.com') && trimmedUrl.includes('replit-objstore')) {
    const match = trimmedUrl.match(/\/(?:public-files|public)\/([^\/\?]+\.mp4)/i);
    if (match) {
      return `/public-files/${match[1]}`;
    }
  }
  
  if (trimmedUrl.startsWith('/objects/uploads/')) {
    console.warn('Warning: Video URL uses /objects/uploads/ path which may not work correctly. Use /public-files/filename.mp4 format instead.');
  }
  
  return trimmedUrl;
}

// Rate limiting for AI Homework Helper - 5 questions per parent per day
const DAILY_QUESTION_LIMIT = 5;
const aiHelperUsage: Map<string, { count: number; date: string }> = new Map();

function checkAiHelperLimit(parentId: string): { allowed: boolean; remaining: number } {
  const today = new Date().toISOString().split('T')[0];
  const usage = aiHelperUsage.get(parentId);
  
  if (!usage || usage.date !== today) {
    aiHelperUsage.set(parentId, { count: 0, date: today });
    return { allowed: true, remaining: DAILY_QUESTION_LIMIT };
  }
  
  if (usage.count >= DAILY_QUESTION_LIMIT) {
    return { allowed: false, remaining: 0 };
  }
  
  return { allowed: true, remaining: DAILY_QUESTION_LIMIT - usage.count };
}

function incrementAiHelperUsage(parentId: string): void {
  const today = new Date().toISOString().split('T')[0];
  const usage = aiHelperUsage.get(parentId);
  
  if (!usage || usage.date !== today) {
    aiHelperUsage.set(parentId, { count: 1, date: today });
  } else {
    usage.count++;
  }
}

// Extend Express session to include userId and parentId
declare module 'express-session' {
  interface SessionData {
    userId: string;
    parentId: string;
    sessionToken: string; // For single-session enforcement
    oauthReturnUrl?: string; // For WordPress redirect after OAuth
  }
}

/**
 * Helper function to apply translations to any entity
 * Fetches translations from the database and applies them to the entity
 */
async function applyTranslations<T extends Record<string, any>>(
  entity: T,
  entityType: string,
  entityId: string,
  language: string,
  fields: string[]
): Promise<T> {
  // If language is Somali or not specified, return original entity
  if (isSomaliLanguage(language)) {
    return entity;
  }

  // Fetch translations for this entity
  const entityTranslations = await db.select()
    .from(translations)
    .where(
      and(
        eq(translations.entityType, entityType),
        eq(translations.entityId, entityId),
        eq(translations.targetLanguage, normalizeLanguageCode(language))
      )
    );

  // Apply translations to the entity
  const translatedEntity: Record<string, any> = { ...entity };
  for (const translation of entityTranslations) {
    if (fields.includes(translation.fieldName)) {
      translatedEntity[translation.fieldName] = translation.translatedText;
    }
  }

  return translatedEntity as T;
}

/**
 * Helper function to apply translations to an array of entities
 */
async function applyTranslationsToArray<T extends Record<string, any> & { id: string }>(
  entities: T[],
  entityType: string,
  language: string,
  fields: string[]
): Promise<T[]> {
  // If language is Somali or not specified, return original entities
  if (isSomaliLanguage(language)) {
    return entities;
  }

  // Return early if no entities
  if (entities.length === 0) {
    return entities;
  }

  // Fetch all translations for these entities in one query
  const entityIds = entities.map(e => e.id);
  const allTranslations = await db.select()
    .from(translations)
    .where(
      and(
        eq(translations.entityType, entityType),
        inArray(translations.entityId, entityIds),
        eq(translations.targetLanguage, normalizeLanguageCode(language))
      )
    );

  // Group translations by entity ID
  const translationsByEntity = new Map<string, typeof allTranslations>();
  for (const translation of allTranslations) {
    if (!translationsByEntity.has(translation.entityId)) {
      translationsByEntity.set(translation.entityId, []);
    }
    translationsByEntity.get(translation.entityId)!.push(translation);
  }

  // Apply translations to each entity
  return entities.map(entity => {
    const entityTranslations = translationsByEntity.get(entity.id) || [];
    const translatedEntity: Record<string, any> = { ...entity };
    
    for (const translation of entityTranslations) {
      if (fields.includes(translation.fieldName)) {
        translatedEntity[translation.fieldName] = translation.translatedText;
      }
    }
    
    return translatedEntity as typeof entity;
  });
}

// Authentication middleware - checks both old admin system and parent admin
async function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Check old admin system (userId)
  if (req.session.userId) {
    return next();
  }
  
  // Check if logged-in parent is an admin
  if (req.session.parentId) {
    const parent = await storage.getParent(req.session.parentId);
    if (parent?.isAdmin) {
      return next();
    }
  }
  
  return res.status(401).json({ error: "Unauthorized" });
}

// Middleware for Sheeko host permission (admins or parents with canHostSheeko)
async function requireSheekoHost(req: Request, res: Response, next: NextFunction) {
  // Check old admin system (userId)
  if (req.session.userId) {
    const user = await storage.getUser(req.session.userId);
    if (user?.isAdmin) {
      return next();
    }
  }
  
  // Check if logged-in parent has canHostSheeko permission
  if (req.session.parentId) {
    const parent = await storage.getParent(req.session.parentId);
    if (parent?.isAdmin || parent?.canHostSheeko) {
      return next();
    }
  }
  
  return res.status(403).json({ 
    error: "Ma haysatid oggolaansho Sheeko in aad abuurto. La xiriir maamulaha.",
    code: "NOT_HOST"
  });
}

// Authentication middleware for parent users (any logged-in parent)
// Also validates single-session enforcement - if session token doesn't match, user is logged out
async function requireParentAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.parentId) {
    return res.status(401).json({ error: "Fadlan soo gal si aad u isticmaasho" });
  }
  
  // Single-session validation: check if this session is still the active one
  const parent = await storage.getParent(req.session.parentId);
  if (!parent) {
    // Parent no longer exists
    req.session.destroy(() => {});
    return res.status(401).json({ error: "Akoonkaaga lama helin" });
  }
  
  // If parent has an activeSessionId set, validate this session
  // Skip single-session check for admin accounts - they can login from multiple devices
  if (parent.activeSessionId && !parent.isAdmin) {
    // If this session has no token or token doesn't match, it's superseded
    if (!req.session.sessionToken || parent.activeSessionId !== req.session.sessionToken) {
      console.log(`[SESSION] Invalidating old session for parent ${parent.id}. Expected: ${parent.activeSessionId?.substring(0, 8)}... Got: ${req.session.sessionToken?.substring(0, 8) || 'none'}...`);
      req.session.destroy(() => {});
      return res.status(401).json({ 
        error: "Waxaad ka soo gashay qalab kale. Fadlan soo gal mar kale.",
        code: "SESSION_SUPERSEDED" 
      });
    }
  }
  
  // Update last active timestamp (throttled to once per 5 minutes to avoid excessive DB writes)
  const now = new Date();
  const lastActive = parent.lastActiveAt ? new Date(parent.lastActiveAt) : null;
  if (!lastActive || (now.getTime() - lastActive.getTime()) > 5 * 60 * 1000) {
    db.update(parents).set({ lastActiveAt: now }).where(eq(parents.id, parent.id)).execute().catch(() => {});
  }
  
  return next();
}

// Check if parent has active subscription for a course
async function checkCourseAccess(parentId: string, courseId: string): Promise<{ hasAccess: boolean; reason?: string }> {
  const course = await storage.getCourse(courseId);
  if (!course) {
    return { hasAccess: false, reason: "Koorsada lama helin" };
  }
  
  if (course.isFree) {
    return { hasAccess: true };
  }
  
  // Check for All-Access subscription first
  const allAccessCourse = await storage.getCourseByCourseId("all-access");
  if (allAccessCourse) {
    const allEnrollments = await storage.getEnrollmentsByParentId(parentId);
    const allAccessEnrollment = allEnrollments.find(e => 
      e.courseId === allAccessCourse.id && 
      e.status === "active" &&
      (!e.accessEnd || new Date(e.accessEnd) > new Date())
    );
    
    // Auto-expire any all-access enrollment that's past its end date
    const expiredAllAccess = allEnrollments.find(e =>
      e.courseId === allAccessCourse.id &&
      e.status === "active" &&
      e.accessEnd && new Date(e.accessEnd) < new Date()
    );
    if (expiredAllAccess) {
      console.log(`[ACCESS] Auto-expiring all-access enrollment ${expiredAllAccess.id} (accessEnd: ${expiredAllAccess.accessEnd})`);
      await storage.updateEnrollmentStatus(expiredAllAccess.id, "expired");
    }
    
    // If user has active All-Access subscription and course is live, grant access
    if (allAccessEnrollment && course.isLive) {
      return { hasAccess: true };
    }
  }
  
  const enrollment = await storage.getActiveEnrollmentByParentAndCourse(parentId, courseId);
  if (!enrollment) {
    // Also check for any enrollment (including expired) that might have lifetime access
    const allEnrollments = await storage.getEnrollmentsByParentId(parentId);
    const lifetimeEnrollment = allEnrollments.find(e => 
      e.courseId === courseId && !e.accessEnd && e.status === "active"
    );
    if (lifetimeEnrollment) {
      return { hasAccess: true };
    }
    return { hasAccess: false, reason: "Fadlan iska diiwaangeli koorsadan si aad u aragto casharada" };
  }
  
  // Null accessEnd means lifetime access
  if (!enrollment.accessEnd) {
    return { hasAccess: true };
  }
  
  if (new Date(enrollment.accessEnd) < new Date()) {
    if (enrollment.status === "active") {
      console.log(`[ACCESS] Auto-expiring enrollment ${enrollment.id} (accessEnd: ${enrollment.accessEnd})`);
      await storage.updateEnrollmentStatus(enrollment.id, "expired");
    }
    return { hasAccess: false, reason: "Diiwaangelintaadii way dhammaatay. Fadlan cusboonaysii si aad u sii waddato" };
  }
  
  if (enrollment.status !== "active") {
    return { hasAccess: false, reason: "Diiwaangelintaadii way dhammaatay. Fadlan cusboonaysii si aad u sii waddato" };
  }
  
  return { hasAccess: true };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Trust proxy for Replit's infrastructure (always enabled for Replit)
  app.set("trust proxy", 1);

  app.get('/download/app-release.aab', (req: Request, res: Response) => {
    const filePath = path.join(process.cwd(), 'app-release.aab');
    if (fs.existsSync(filePath)) {
      res.download(filePath, 'app-release.aab');
    } else {
      res.status(404).send('File not found');
    }
  });

  app.get('/download/app-release.zip', (req: Request, res: Response) => {
    const filePath = path.join(process.cwd(), 'app-release.zip');
    if (fs.existsSync(filePath)) {
      res.download(filePath, 'app-release.zip');
    } else {
      res.status(404).send('File not found');
    }
  });

  app.get('/download/wordpress-plugin.zip', (req: Request, res: Response) => {
    const filePath = path.join(process.cwd(), 'wordpress-plugin.zip');
    if (fs.existsSync(filePath)) {
      res.download(filePath, 'wordpress-plugin.zip');
    } else {
      res.status(404).send('File not found');
    }
  });

  app.get('/download/barbaarintasan-theme.zip', (req: Request, res: Response) => {
    const filePath = path.join(process.cwd(), 'download', 'barbaarintasan-theme.zip');
    if (fs.existsSync(filePath)) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.download(filePath, 'barbaarintasan-theme.zip');
    } else {
      res.status(404).send('File not found');
    }
  });

  app.get('/download/barbaarintasan-theme-v3.zip', (req: Request, res: Response) => {
    const filePath = path.join(process.cwd(), 'download', 'barbaarintasan-theme-v3.zip');
    if (fs.existsSync(filePath)) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.download(filePath, 'barbaarintasan-theme-v3.zip');
    } else {
      res.status(404).send('File not found');
    }
  });

  app.get('/download/barbaarintasan-theme-v4.zip', (req: Request, res: Response) => {
    const filePath = path.join(process.cwd(), 'download', 'barbaarintasan-theme-v4.zip');
    if (fs.existsSync(filePath)) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.download(filePath, 'barbaarintasan-theme-v4.zip');
    } else {
      res.status(404).send('File not found');
    }
  });

  // Session configuration with PostgreSQL store for persistence
  const isProduction = process.env.NODE_ENV === "production";
  
  // In production, SESSION_SECRET must be set for security
  const sessionSecret = process.env.SESSION_SECRET;
  if (isProduction && !sessionSecret) {
    throw new Error("SESSION_SECRET environment variable is required in production");
  }
  
  app.use(
    session({
      store: new PgSession({
        pool: pool as any,
        tableName: "session",
        createTableIfMissing: true,
        pruneSessionInterval: 600,
      }),
      secret: sessionSecret || "barbaarintasan-academy-dev-secret-key",
      resave: false,
      saveUninitialized: false,
      name: "barbaarintasan.sid",
      cookie: {
        secure: isProduction,
        httpOnly: true,
        sameSite: "lax", // CSRF protection - blocks cross-site POST while allowing normal navigation
        maxAge: 1000 * 60 * 60 * 24 * 365, // 365 days - persistent login like Facebook
        path: "/",
      },
    })
  );

  // Ensure default badges exist (non-blocking)
  try {
    await storage.ensureDefaultBadges();
    console.log("[BADGES] Default badges initialized");
  } catch (error) {
    console.error("[BADGES] Failed to initialize default badges:", error);
  }

  // External cron trigger endpoint for daily content generation
  // IMPORTANT: This endpoint returns 200 immediately and runs the job in background
  // because external cron providers (like cron-job.org) have 30-second timeout limits
  // while generateDailyContent() takes ~3-4 minutes to complete
  app.post("/api/cron/daily-content", (req: Request, res: Response) => {
    // Disable daily content generation in staging environment
    if (process.env.STAGING === 'true') {
      console.log("[CRON] Daily content generation disabled in staging environment");
      return res.status(200).json({ 
        status: "skipped", 
        message: "Daily content generation disabled in staging environment" 
      });
    }
    
    const DAILY_CRON_SECRET = process.env.DAILY_CRON_SECRET;
    
    // Validate secret exists
    if (!DAILY_CRON_SECRET) {
      console.error("[CRON] DAILY_CRON_SECRET not configured");
      return res.status(500).json({ error: "Server configuration error" });
    }
    
    // Validate Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("[CRON] Missing or invalid Authorization header");
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const providedSecret = authHeader.substring(7); // Remove "Bearer " prefix
    if (providedSecret !== DAILY_CRON_SECRET) {
      console.log("[CRON] Invalid secret provided");
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    console.log("[CRON] Valid request received - triggering daily content generation");
    
    // Respond immediately (within 1-2 seconds) to avoid cron timeout
    res.status(200).json({ 
      status: "accepted", 
      message: "Daily content generation started in background"
    });
    
    // Run the actual job in background (non-blocking)
    setImmediate(async () => {
      try {
        console.log("[CRON] Starting background job: generateDailyContent()");
        const { generateDailyContent } = await import("../scheduled/dailyContent");
        const result = await generateDailyContent();
        console.log("[CRON] ✅ Daily content generation completed successfully:", result);
      } catch (error) {
        console.error("[CRON] ❌ Daily content generation failed:", error);
      }
    });
  });

  // Manual Telegram notification endpoint for daily content
  app.post("/api/admin/send-telegram-notification", async (req: Request, res: Response) => {
    // Check if user is admin
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Fadlan soo gal" });
    }
    const parent = await storage.getParent(req.session.parentId);
    if (!parent?.isAdmin) {
      return res.status(403).json({ error: "Admin kaliya ayaa diri kara" });
    }

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_GROUP_CHAT_ID = process.env.TELEGRAM_GROUP_CHAT_ID;
    const TELEGRAM_GROUP_CHAT_ID_2 = process.env.TELEGRAM_GROUP_CHAT_ID_2;

    if (!TELEGRAM_BOT_TOKEN) {
      return res.status(500).json({ error: "Telegram bot token not configured" });
    }

    const groupIds = [TELEGRAM_GROUP_CHAT_ID, TELEGRAM_GROUP_CHAT_ID_2].filter(Boolean) as string[];
    if (groupIds.length === 0) {
      return res.status(500).json({ error: "Telegram group chat IDs not configured" });
    }

    // Get today's content status
    const today = new Date().toISOString().split('T')[0];
    const eatTime = new Date().toLocaleString('en-US', { 
      timeZone: 'Africa/Nairobi',
      dateStyle: 'full',
      timeStyle: 'short'
    });

    // Check if today's content exists and is published
    const todayMessage = await storage.getParentMessageByDate(today);
    const todayStory = await storage.getBedtimeStoryByDate(today);

    const dhambaalStatus = todayMessage?.isPublished ? "✅" : "❌";
    const maaweelStatus = todayStory?.isPublished ? "✅" : "❌";
    const baseUrl = "https://appbarbaarintasan.com";

    const telegramMessage = `
✨ 𝐁𝐚𝐫𝐛𝐚𝐚𝐫𝐢𝐧𝐭𝐚𝐬𝐚𝐧 𝐀𝐜𝐚𝐝𝐞𝐦𝐲 ✨

━━━━━━━━━━━━━━━━━━━━━
📝 𝐃𝐡𝐚𝐦𝐛𝐚𝐚𝐥𝐤𝐚 𝐖𝐚𝐚𝐥𝐢𝐝𝐤𝐚: ${dhambaalStatus}
${todayMessage?.title ? `📖 ${todayMessage.title}` : ''}
━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━
🌙 𝐌𝐚𝐚𝐰𝐞𝐞𝐥𝐚𝐝𝐚 𝐂𝐚𝐫𝐮𝐮𝐫𝐭𝐚: ${maaweelStatus}
${todayStory?.titleSomali ? `📖 ${todayStory.titleSomali}` : ''}
━━━━━━━━━━━━━━━━━━━━━

🕐 Saacadda Soomaaliya: ${eatTime}

🎧 𝐇𝐚𝐥𝐤𝐚 𝐤𝐚 𝐃𝐡𝐚𝐠𝐚𝐲𝐬𝐨 𝐦𝐚𝐚𝐧𝐭𝐚:
👉 Dhambaalka: ${baseUrl}/dhambaal
👉 Sheekada: ${baseUrl}/maaweelo

💡 Fadlan booqo App-ka oo soo AKHRISO ama DHAGAYSO, Ilmahaagana Caawa sheekada u akhri.
`.trim();

    let successCount = 0;
    for (const chatId of groupIds) {
      try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: telegramMessage,
          }),
        });
        const result = await response.json();
        if (result.ok) {
          successCount++;
          console.log(`[Telegram] Manual notification sent to group ${chatId}`);
        } else {
          console.error(`[Telegram] Failed to send to ${chatId}:`, result.description);
        }
      } catch (error) {
        console.error(`[Telegram] Error sending to ${chatId}:`, error);
      }
    }

    if (successCount > 0) {
      return res.json({ 
        success: true, 
        message: `Fariinta waxaa loo diray ${successCount}/${groupIds.length} guruub` 
      });
    } else {
      return res.status(500).json({ error: "Fariinta lama diri karin" });
    }
  });

  // Helper function for single-session validation
  async function validateParentSession(req: Request, res: Response): Promise<boolean> {
    if (!req.session.parentId) {
      return true; // Let individual route handlers deal with unauthenticated requests
    }
    
    const parent = await storage.getParent(req.session.parentId);
    if (!parent) {
      req.session.destroy(() => {});
      res.status(401).json({ error: "Akoonkaaga lama helin" });
      return false;
    }
    
    // If parent has an activeSessionId set, validate this session
    // Skip single-session check for admin accounts - they can login from multiple devices
    if (parent.activeSessionId && !parent.isAdmin) {
      if (!req.session.sessionToken || parent.activeSessionId !== req.session.sessionToken) {
        console.log(`[SESSION] Superseded session for parent ${parent.id}`);
        req.session.destroy(() => {});
        res.status(401).json({ 
          error: "Waxaad ka soo gashay qalab kale. Fadlan soo gal mar kale.",
          code: "SESSION_SUPERSEDED" 
        });
        return false;
      }
    }
    
    return true;
  }
  
  // Global middleware for single-session enforcement on parent-authenticated routes
  // Covers all major route prefixes where parentId is used
  const parentAuthPaths = ["/api/parent", "/api/lessons", "/api/milestones", "/api/badges", 
                          "/api/resources", "/api/conversations", "/api/assessment", 
                          "/api/livekit", "/api/quran-reciters", "/api/hadiths",
                          "/api/support", "/api/voice-rooms", "/api/sheeko"];
  
  parentAuthPaths.forEach(path => {
    app.use(path, async (req, res, next) => {
      const isValid = await validateParentSession(req, res);
      if (isValid) {
        next();
      }
      // If not valid, response was already sent by validateParentSession
    });
  });

  // Mushaf page image proxy - fetches from reliable sources and caches
  const mushafPageCache = new Map<number, Buffer>();
  
  app.get("/api/mushaf/page/:pageNum", async (req, res) => {
    try {
      const pageNum = parseInt(req.params.pageNum);
      if (isNaN(pageNum) || pageNum < 1 || pageNum > 604) {
        return res.status(400).json({ error: "Invalid page number. Must be 1-604." });
      }
      
      // Check cache first
      if (mushafPageCache.has(pageNum)) {
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "public, max-age=31536000"); // Cache for 1 year
        return res.send(mushafPageCache.get(pageNum));
      }
      
      // Try multiple sources in order of reliability
      const paddedPage = pageNum.toString().padStart(3, "0");
      const sources = [
        `https://www.mp3quran.net/api/quran_pages_svg/${paddedPage}.svg`,
        `https://surahquran.com/img/page${paddedPage}.png`,
      ];
      
      for (const sourceUrl of sources) {
        try {
          const response = await fetch(sourceUrl);
          if (response.ok) {
            const buffer = Buffer.from(await response.arrayBuffer());
            mushafPageCache.set(pageNum, buffer);
            
            const contentType = sourceUrl.endsWith(".svg") ? "image/svg+xml" : "image/png";
            res.setHeader("Content-Type", contentType);
            res.setHeader("Cache-Control", "public, max-age=31536000");
            return res.send(buffer);
          }
        } catch (err) {
          console.log(`[MUSHAF] Source ${sourceUrl} failed`);
        }
      }
      
      // If all sources fail, return a placeholder
      res.status(503).json({ error: "Mushaf page temporarily unavailable. Please try again later." });
    } catch (error: any) {
      console.error("[MUSHAF] Error:", error);
      res.status(500).json({ error: "Failed to fetch Mushaf page" });
    }
  });

  // Admin: Test email sending (protected)
  app.post("/api/admin/test-email", async (req, res) => {
    try {
      const { email } = req.body;
      if (!req.session.userId) {
        return res.status(401).json({ error: "Admin login required" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin only" });
      }
      
      const testEmail = email || "barbaarintasan@gmail.com";
      console.log(`[TEST-EMAIL] Admin testing email to: ${testEmail}`);
      const result = await sendWelcomeEmail(testEmail, "Test User");
      console.log(`[TEST-EMAIL] Result: ${result ? 'SUCCESS' : 'FAILED'}`);
      res.json({ success: result, message: result ? "Email sent successfully" : "Email failed to send" });
    } catch (error: any) {
      console.error("[TEST-EMAIL] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/test-all-emails", async (req, res) => {
    try {
      const { email } = req.body;
      if (!req.session.userId) {
        return res.status(401).json({ error: "Admin login required" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin only" });
      }
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      console.log(`[TEST-ALL-EMAILS] Sending all email types to: ${email}`);
      const results: { type: string; success: boolean }[] = [];
      
      const r1 = await sendWelcomeEmail(email, "Aqmusse");
      results.push({ type: "Welcome (Ku soo dhawoow)", success: r1 });
      
      const r2 = await sendPurchaseConfirmationEmail(email, "Aqmusse", "Koorsada 0-6 Bilood Jir", "monthly", 30, "0-6-bilood");
      results.push({ type: "Purchase Confirmation (Koorso Iibsi)", success: r2 });
      
      const r3 = await sendPaymentPendingEmail(email, "Aqmusse", "Koorsada 0-6 Bilood Jir", 30);
      results.push({ type: "Payment Pending (Lacag Sugitaan)", success: r3 });
      
      const r4 = await sendSubscriptionReminderEmail(email, "Aqmusse", "Koorsada 0-6 Bilood Jir", 3);
      results.push({ type: "Subscription Reminder 3 days (Xasuusin)", success: r4 });
      
      const r5 = await sendSubscriptionReminderEmail(email, "Aqmusse", "Koorsada 0-6 Bilood Jir", 0, 12);
      results.push({ type: "Subscription Reminder 12hrs (Xasuusin Degdeg)", success: r5 });
      
      const r6 = await sendSubscriptionExpiredEmail(email, "Aqmusse", "Koorsada 0-6 Bilood Jir");
      results.push({ type: "Subscription Expired (Wakhti Dhamaaday)", success: r6 });
      
      const r7 = await sendPasswordResetEmail(email, "Aqmusse", "test-token-123");
      results.push({ type: "Password Reset (Password Cusbooneysii)", success: r7 });
      
      const r8 = await sendAdminPromotionEmail(email, "Aqmusse");
      results.push({ type: "Admin Promotion (Admin Sharaf)", success: r8 });
      
      const successCount = results.filter(r => r.success).length;
      console.log(`[TEST-ALL-EMAILS] Results: ${successCount}/${results.length} sent successfully`);
      
      res.json({ 
        success: successCount > 0, 
        message: `${successCount}/${results.length} email oo la diray`,
        results 
      });
    } catch (error: any) {
      console.error("[TEST-ALL-EMAILS] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Resend welcome email to a parent
  app.post("/api/admin/resend-welcome-email", async (req, res) => {
    try {
      const { parentId } = req.body;
      if (!req.session.userId) {
        return res.status(401).json({ error: "Admin login required" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin only" });
      }
      
      if (!parentId) {
        return res.status(400).json({ error: "parentId is required" });
      }
      
      const parent = await storage.getParent(parentId);
      if (!parent) {
        return res.status(404).json({ error: "Parent not found" });
      }
      
      if (!parent.email) {
        return res.status(400).json({ error: "Parent has no email address" });
      }
      
      console.log(`[RESEND-WELCOME] Sending welcome email to: ${parent.email} (${parent.name})`);
      const result = await sendWelcomeEmail(parent.email, parent.name);
      console.log(`[RESEND-WELCOME] Result: ${result ? 'SUCCESS' : 'FAILED'}`);
      res.json({ 
        success: result, 
        message: result ? `Welcome email sent to ${parent.email}` : "Email failed to send",
        parent: { id: parent.id, name: parent.name, email: parent.email }
      });
    } catch (error: any) {
      console.error("[RESEND-WELCOME] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Generate daily content (Dhambaalka Waalidka + Maaweelada Caruurta)
  app.post("/api/admin/generate-daily-content", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Admin login required" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin only" });
      }

      console.log("[DAILY-CONTENT] Admin triggered daily content generation");
      const results = {
        dhambaal: { success: false, message: "" },
        maaweelada: { success: false, message: "" }
      };

      // Generate Dhambaalka Waalidka (Parent Blog)
      try {
        console.log("[DAILY-CONTENT] Generating Dhambaalka Waalidka...");
        await generateAndSaveParentMessage();
        results.dhambaal = { success: true, message: "Waa la sameeyay" };
        console.log("[DAILY-CONTENT] Dhambaalka Waalidka - SUCCESS");
      } catch (error: any) {
        results.dhambaal = { success: false, message: error.message || "Waa guuldareystay" };
        console.error("[DAILY-CONTENT] Dhambaalka Waalidka - FAILED:", error);
      }

      // Generate Maaweelada Caruurta (Bedtime Story)
      try {
        console.log("[DAILY-CONTENT] Generating Maaweelada Caruurta...");
        await generateDailyBedtimeStory();
        results.maaweelada = { success: true, message: "Waa la sameeyay" };
        console.log("[DAILY-CONTENT] Maaweelada Caruurta - SUCCESS");
      } catch (error: any) {
        results.maaweelada = { success: false, message: error.message || "Waa guuldareystay" };
        console.error("[DAILY-CONTENT] Maaweelada Caruurta - FAILED:", error);
      }

      // Generate Talooyinka Waalidka (Parent Tips by dev stage)
      try {
        console.log("[DAILY-CONTENT] Generating Talooyinka Waalidka...");
        await generateAndSaveParentTip();
        (results as any).parentTips = { success: true, message: "Waa la sameeyay" };
        console.log("[DAILY-CONTENT] Talooyinka Waalidka - SUCCESS");
      } catch (error: any) {
        (results as any).parentTips = { success: false, message: error.message || "Waa guuldareystay" };
        console.error("[DAILY-CONTENT] Talooyinka Waalidka - FAILED:", error);
      }

      const allSuccess = results.dhambaal.success && results.maaweelada.success;
      res.json({
        success: allSuccess,
        results,
        message: allSuccess 
          ? "Content-ka maalinlaha ah waa la sameeyay!" 
          : "Qaar ka mid ah content-ka waa la sameeyay"
      });
    } catch (error: any) {
      console.error("[DAILY-CONTENT] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Generate Dhambaalka Waalidka only
  app.post("/api/admin/generate-dhambaal", async (req, res) => {
    try {
      // Check for parent admin authentication
      const parentId = (req.session as any)?.parentId;
      if (parentId) {
        const parent = await storage.getParent(parentId);
        if (!parent?.isAdmin) {
          return res.status(403).json({ error: "Admin only" });
        }
      } else if (req.session.userId) {
        const user = await storage.getUser(req.session.userId);
        if (!user?.isAdmin) {
          return res.status(403).json({ error: "Admin only" });
        }
      } else {
        return res.status(401).json({ error: "Admin login required" });
      }

      console.log("[DHAMBAAL] Admin triggered Dhambaalka Waalidka generation");
      await generateAndSaveParentMessage();
      console.log("[DHAMBAAL] SUCCESS");
      
      res.json({
        success: true,
        message: "Dhambaalka waa la sameeyay!"
      });
    } catch (error: any) {
      console.error("[DHAMBAAL] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Generate Maaweelada Caruurta only
  app.post("/api/admin/generate-maaweelo", async (req, res) => {
    try {
      // Check for parent admin authentication
      const parentId = (req.session as any)?.parentId;
      if (parentId) {
        const parent = await storage.getParent(parentId);
        if (!parent?.isAdmin) {
          return res.status(403).json({ error: "Admin only" });
        }
      } else if (req.session.userId) {
        const user = await storage.getUser(req.session.userId);
        if (!user?.isAdmin) {
          return res.status(403).json({ error: "Admin only" });
        }
      } else {
        return res.status(401).json({ error: "Admin login required" });
      }

      console.log("[MAAWEELO] Admin triggered Maaweelada Caruurta generation");
      await generateDailyBedtimeStory();
      console.log("[MAAWEELO] SUCCESS");
      
      res.json({
        success: true,
        message: "Sheekada waa la sameeyay!"
      });
    } catch (error: any) {
      console.error("[MAAWEELO] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Generate AI content for production (7 days of history)
  app.post("/api/admin/seed-content", async (req, res) => {
    try {
      // Check for parent admin authentication
      const parentId = (req.session as any)?.parentId;
      if (parentId) {
        const parent = await storage.getParent(parentId);
        if (!parent?.isAdmin) {
          return res.status(403).json({ error: "Admin only" });
        }
      } else if (req.session.userId) {
        const user = await storage.getUser(req.session.userId);
        if (!user?.isAdmin) {
          return res.status(403).json({ error: "Admin only" });
        }
      } else {
        return res.status(401).json({ error: "Admin login required" });
      }

      console.log("[SEED] Admin triggered AI content generation for past 7 days");
      
      // Generate AI content for today and past 6 days (7 total)
      const today = new Date();
      let dhambaalCount = 0;
      let sheekoCount = 0;
      const errors: string[] = [];
      
      // Check existing content first
      const existingMessages = await storage.getAllParentMessages(100);
      const existingStories = await storage.getAllBedtimeStories(100);
      const existingMsgDates = new Set(existingMessages.map(m => m.messageDate));
      const existingStoryDates = new Set(existingStories.map(s => s.storyDate));
      
      for (let daysAgo = 0; daysAgo <= 6; daysAgo++) {
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() - daysAgo);
        const dateString = targetDate.toISOString().split('T')[0];
        
        console.log(`[SEED] Processing ${dateString} (${daysAgo} days ago)...`);
        
        // Generate Dhambaal if doesn't exist
        if (!existingMsgDates.has(dateString)) {
          try {
            await generateAndSaveParentMessage();
            dhambaalCount++;
            console.log(`[SEED] Generated Dhambaal for ${dateString}`);
          } catch (err: any) {
            console.error(`[SEED] Dhambaal ${dateString} error:`, err.message);
            errors.push(`Dhambaal ${dateString}: ${err.message}`);
          }
        } else {
          console.log(`[SEED] Dhambaal ${dateString} - skipped (already exists)`);
        }
        
        // Generate Sheeko if doesn't exist
        if (!existingStoryDates.has(dateString)) {
          try {
            await generateDailyBedtimeStory();
            sheekoCount++;
            console.log(`[SEED] Generated Sheeko for ${dateString}`);
          } catch (err: any) {
            console.error(`[SEED] Sheeko ${dateString} error:`, err.message);
            errors.push(`Sheeko ${dateString}: ${err.message}`);
          }
        } else {
          console.log(`[SEED] Sheeko ${dateString} - skipped (already exists)`);
        }
      }

      console.log(`[SEED] SUCCESS - Generated ${dhambaalCount} Dhambaal and ${sheekoCount} Sheeko`);
      
      // Clear caches so new content is immediately visible
      clearParentMessagesCache();
      clearBedtimeStoriesCache();
      
      res.json({
        success: true,
        message: `AI content waa la sameeyay! ${dhambaalCount} Dhambaal iyo ${sheekoCount} Sheeko cusub`,
        dhambaalCount,
        sheekoCount,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error: any) {
      console.error("[SEED] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Export content data as JSON (for syncing between environments)
  app.get("/api/admin/export-content", async (req, res) => {
    try {
      // Check for parent admin authentication
      const parentId = (req.session as any)?.parentId;
      if (parentId) {
        const parent = await storage.getParent(parentId);
        if (!parent?.isAdmin) {
          return res.status(403).json({ error: "Admin only" });
        }
      } else if (req.session.userId) {
        const user = await storage.getUser(req.session.userId);
        if (!user?.isAdmin) {
          return res.status(403).json({ error: "Admin only" });
        }
      } else {
        return res.status(401).json({ error: "Admin login required" });
      }

      console.log("[EXPORT] Admin exporting content data");
      
      // Fetch ALL content (no limit for full export)
      const parentMessages = await storage.getAllParentMessages(500);
      const bedtimeStories = await storage.getAllBedtimeStories(500);
      
      const exportData = {
        exportedAt: new Date().toISOString(),
        parentMessages: parentMessages.map(msg => ({
          title: msg.title,
          content: msg.content,
          topic: msg.topic,
          keyPoints: msg.keyPoints,
          images: msg.images,
          messageDate: msg.messageDate,
          isPublished: msg.isPublished,
          authorName: msg.authorName
        })),
        bedtimeStories: bedtimeStories.map(story => ({
          title: story.title,
          titleSomali: story.titleSomali,
          content: story.content,
          characterName: story.characterName,
          characterType: story.characterType,
          moralLesson: story.moralLesson,
          ageRange: story.ageRange,
          images: story.images,
          storyDate: story.storyDate,
          isPublished: story.isPublished
        }))
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="bsa-content-export-${new Date().toISOString().split('T')[0]}.json"`);
      res.json(exportData);
      
      console.log(`[EXPORT] Exported ${parentMessages.length} Dhambaal and ${bedtimeStories.length} Sheeko`);
    } catch (error: any) {
      console.error("[EXPORT] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Import content data from JSON
  app.post("/api/admin/import-content", async (req, res) => {
    try {
      // Check for parent admin authentication
      const parentId = (req.session as any)?.parentId;
      if (parentId) {
        const parent = await storage.getParent(parentId);
        if (!parent?.isAdmin) {
          return res.status(403).json({ error: "Admin only" });
        }
      } else if (req.session.userId) {
        const user = await storage.getUser(req.session.userId);
        if (!user?.isAdmin) {
          return res.status(403).json({ error: "Admin only" });
        }
      } else {
        return res.status(401).json({ error: "Admin login required" });
      }

      const { parentMessages, bedtimeStories } = req.body;
      
      if (!parentMessages && !bedtimeStories) {
        return res.status(400).json({ error: "No content data provided" });
      }

      console.log("[IMPORT] Admin importing content data");
      
      // Get ALL existing content to prevent duplicates (no limit)
      const existingMessages = await storage.getAllParentMessages(500);
      const existingStories = await storage.getAllBedtimeStories(500);
      const existingMsgDates = new Set(existingMessages.map(m => m.messageDate));
      const existingStoryDates = new Set(existingStories.map(s => s.storyDate));
      
      let dhambaalCount = 0;
      let sheekoCount = 0;
      let skippedDhambaal = 0;
      let skippedSheeko = 0;
      
      // Import parent messages
      if (parentMessages && Array.isArray(parentMessages)) {
        for (const msg of parentMessages) {
          if (existingMsgDates.has(msg.messageDate)) {
            skippedDhambaal++;
            continue;
          }
          try {
            await storage.createParentMessage({
              title: msg.title,
              content: msg.content,
              topic: msg.topic || "Tarbiyada Caruurta",
              keyPoints: msg.keyPoints || "",
              images: msg.images || [],
              messageDate: msg.messageDate,
              isPublished: msg.isPublished !== false,
              authorName: msg.authorName || "Muuse Siciid Aw-Muuse"
            });
            dhambaalCount++;
          } catch (err) {
            console.error(`[IMPORT] Dhambaal ${msg.messageDate} error:`, err);
          }
        }
      }
      
      // Import bedtime stories
      if (bedtimeStories && Array.isArray(bedtimeStories)) {
        for (const story of bedtimeStories) {
          if (existingStoryDates.has(story.storyDate)) {
            skippedSheeko++;
            continue;
          }
          try {
            await storage.createBedtimeStory({
              title: story.title,
              titleSomali: story.titleSomali,
              content: story.content,
              characterName: story.characterName || "Unknown",
              characterType: story.characterType || "sahabi",
              moralLesson: story.moralLesson || "",
              ageRange: story.ageRange || "3-8",
              images: story.images || [],
              storyDate: story.storyDate,
              isPublished: story.isPublished !== false
            });
            sheekoCount++;
          } catch (err) {
            console.error(`[IMPORT] Sheeko ${story.storyDate} error:`, err);
          }
        }
      }
      
      // Clear caches
      clearParentMessagesCache();
      clearBedtimeStoriesCache();
      
      console.log(`[IMPORT] SUCCESS - Imported ${dhambaalCount} Dhambaal, ${sheekoCount} Sheeko (skipped ${skippedDhambaal}+${skippedSheeko})`);
      
      res.json({
        success: true,
        message: `Waa la soo dejiyay! ${dhambaalCount} Dhambaal iyo ${sheekoCount} Sheeko cusub`,
        dhambaalCount,
        sheekoCount,
        skippedDhambaal,
        skippedSheeko
      });
    } catch (error: any) {
      console.error("[IMPORT] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Generate content with custom prompt
  app.post("/api/admin/generate-content", async (req, res) => {
    try {
      // Check for admin authentication
      const parentId = (req.session as any)?.parentId;
      if (parentId) {
        const parent = await storage.getParent(parentId);
        if (!parent?.isAdmin) {
          return res.status(403).json({ error: "Admin only" });
        }
      } else if (req.session.userId) {
        const user = await storage.getUser(req.session.userId);
        if (!user?.isAdmin) {
          return res.status(403).json({ error: "Admin only" });
        }
      } else {
        return res.status(401).json({ error: "Admin login required" });
      }

      const { type, customPrompt } = req.body;
      
      if (!type || !customPrompt) {
        return res.status(400).json({ error: "Type and customPrompt are required" });
      }

      if (!["dhambaal", "sheeko"].includes(type)) {
        return res.status(400).json({ error: "Type must be 'dhambaal' or 'sheeko'" });
      }

      const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
      if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: "Google Gemini API key not configured" });
      }

      console.log(`[GENERATE] Admin generating ${type} with custom prompt`);

      let prompt: string;
      
      if (type === "dhambaal") {
        prompt = `Waxaad tahay qoraa Soomaaliyeed oo ku xeel dheer waalidnimada iyo tarbiyada caruurta. Qor blog post (dhambaal) waalidka Soomaaliyeed loogu talagalay oo ku saabsan: "${customPrompt}".

Dhambaalku waa inuu:
1. Loo qoro Soomaaliga fasax ah oo waalidku si fudud u fahmi karo
2. Uu yahay 400-600 ereyood
3. Ku salaysan yahay cilmiga casriga ah iyo diinta Islaamka
4. Uu bixiyo talo macquul ah oo waalidku ku dabaqan karo
5. Uu ku jiro tusaalooyin dhab ah oo nolosha laga qaadan karo
6. Uu dhiirri gelin u yahay waalidka
7. Uu ka hadlayo caruurta da'doodu u dhaxayso 0-7 sano

MUHIIM: Marka la sheego Nabiga Muxammad, mar walba ku qor "Nabadgalyo iyo Naxariisi korkiisa ha ahaatee" - ha isticmaalin soo gaabinta sida "scw" ama "PBUH".

MUHIIM: HA KU DARIN bilowga qoraalka salaan sida "Assalamu Calaykum" ama magaca qoraaga. Toos mawduuca u gal.

MUHIIM: Dhamaadka qoraalka ku dar saxiixa sidan:
"Mahadsanidiin!

Muuse Siciid Aw-Muuse
Aasaasaha Barbaarintasan Akademi"

Ka jawaab JSON sax ah:
{
  "title": "Cinwaanka Soomaaliga (6-10 ereyood)",
  "content": "Cutubka 1...\\n\\nCutubka 2...\\n\\nMahadsanidiin!\\n\\nMuuse Siciid Aw-Muuse\\nAasaasaha Barbaarintasan Akademi",
  "keyPoints": "Qodobka 1, Qodobka 2, Qodobka 3"
}`;
      } else {
        prompt = `Waxaad tahay qoraa Soomaaliyeed oo sheekooyin caruurta u qora. Qor sheeko hurdo oo Soomaali ah caruurta da'doodu tahay 3-8 sano oo ku saabsan: "${customPrompt}".

Sheekadu waa inay:
1. Oo dhan loo qoro Soomaaliga
2. U haboon tahay caruurta da'doodu tahay 3-8 sano
3. Tahay 300-400 ereyood
4. Ku jirto cashar wanaagsan oo Islaamka ka yimid
5. Isticmaasho ereyyo Soomaali ah oo fudud oo caruurtu fahmi karaan
6. Noqoto mid xiiso leh oo hurdo ku haboon
7. Ku dhammaato cashar fudud oo waalidku carruurta kala hadli karo

MUHIIM: Marka la sheego Nabiga Muxammad, mar walba ku qor "Nabadgalyo iyo Naxariisi korkiisa ha ahaatee" - ha isticmaalin soo gaabinta sida "scw" ama "PBUH".

MUHIIM: Dhamaadka sheekada ku dar saxiixa sidan:
"Mahadsanidiin!

Muuse Siciid Aw-Muuse
Aasaasaha Barbaarintasan Akademi"

Ka jawaab qaabkan JSON ah:
{
  "title": "Cinwaanka Ingiriisiga",
  "titleSomali": "Cinwaanka Soomaaliga",
  "content": "Sheekada oo dhan Soomaaliga...\\n\\nMahadsanidiin!\\n\\nMuuse Siciid Aw-Muuse\\nAasaasaha Barbaarintasan Akademi",
  "moralLesson": "Casharka sheekada Soomaaliga (1-2 jumlado)",
  "characterName": "Magaca qofka sheekada",
  "characterType": "sahabi ama tabiyin"
}`;
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 8000,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[GENERATE] Gemini API error:", errorText);
        return res.status(500).json({ error: "Failed to generate content" });
      }

      const data = await response.json();
      const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!textContent) {
        return res.status(500).json({ error: "No content generated" });
      }

      // Sanitize JSON - remove bad control characters
      const sanitizeJsonString = (str: string): string => {
        // Remove control characters except \n, \r, \t (which we'll escape)
        return str
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove control chars except \t \n \r
          .replace(/\t/g, "\\t")  // Escape tabs
          .replace(/\n/g, "\\n")  // Escape newlines  
          .replace(/\r/g, "\\r"); // Escape carriage returns
      };
      
      let generatedContent;
      try {
        // Try direct parse first
        generatedContent = JSON.parse(textContent);
      } catch (e) {
        // Try with sanitized text
        try {
          const sanitized = sanitizeJsonString(textContent);
          generatedContent = JSON.parse(sanitized);
        } catch (e2) {
          // Extract JSON from text and sanitize
          const jsonMatch = textContent.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            console.error("[GENERATE] No JSON found in response");
            console.error("[GENERATE] Raw text:", textContent.substring(0, 500));
            return res.status(500).json({ error: "Could not parse generated content" });
          }
          
          try {
            const sanitized = sanitizeJsonString(jsonMatch[0]);
            generatedContent = JSON.parse(sanitized);
          } catch (e3) {
            console.error("[GENERATE] JSON parse error:", e3);
            console.error("[GENERATE] Raw JSON:", jsonMatch[0].substring(0, 500));
            return res.status(500).json({ error: "Failed to parse generated content" });
          }
        }
      }

      console.log(`[GENERATE] Successfully generated ${type} content`);
      
      res.json({
        success: true,
        type,
        content: generatedContent,
        geminiUrl: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
      });
    } catch (error: any) {
      console.error("[GENERATE] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Generate audio with voice selection
  app.post("/api/admin/generate-audio", async (req, res) => {
    try {
      // Check for admin authentication
      const parentId = (req.session as any)?.parentId;
      if (parentId) {
        const parent = await storage.getParent(parentId);
        if (!parent?.isAdmin) {
          return res.status(403).json({ error: "Admin only" });
        }
      } else if (req.session.userId) {
        const user = await storage.getUser(req.session.userId);
        if (!user?.isAdmin) {
          return res.status(403).json({ error: "Admin only" });
        }
      } else {
        return res.status(401).json({ error: "Admin login required" });
      }

      const { text, voiceName } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const voice = voiceName === "ubax" ? "so-SO-UbaxNeural" : "so-SO-MuuseNeural";
      
      const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
      const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION;
      
      if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
        return res.status(500).json({ error: "Azure Speech credentials not configured" });
      }

      console.log(`[AUDIO] Generating audio with voice: ${voice}`);

      // Escape text for SSML
      const escapedText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

      const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='so-SO'>
        <voice name='${voice}'>
          <prosody rate='0.95'>
            ${escapedText}
          </prosody>
        </voice>
      </speak>`;

      const endpoint = `https://${AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;

      const audioResponse = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
          "User-Agent": "BarbaarintasanAcademy",
        },
        body: ssml,
      });

      if (!audioResponse.ok) {
        const errorText = await audioResponse.text();
        console.error("[AUDIO] Azure error:", audioResponse.status, errorText);
        return res.status(500).json({ error: `Azure TTS error: ${audioResponse.status}` });
      }

      const arrayBuffer = await audioResponse.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);
      
      // Return audio as base64
      const audioBase64 = audioBuffer.toString('base64');
      
      console.log(`[AUDIO] Successfully generated audio (${audioBuffer.length} bytes)`);
      
      res.json({
        success: true,
        audioBase64,
        audioSize: audioBuffer.length,
        voice: voiceName === "ubax" ? "Ubax (Naag)" : "Muuse (Lab)",
        azureUrl: `https://${AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`
      });
    } catch (error: any) {
      console.error("[AUDIO] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Upload image to Google Drive
  app.post("/api/admin/upload-image", async (req, res) => {
    try {
      // Check for admin authentication
      const parentId = (req.session as any)?.parentId;
      if (parentId) {
        const parent = await storage.getParent(parentId);
        if (!parent?.isAdmin) {
          return res.status(403).json({ error: "Admin only" });
        }
      } else if (req.session.userId) {
        const user = await storage.getUser(req.session.userId);
        if (!user?.isAdmin) {
          return res.status(403).json({ error: "Admin only" });
        }
      } else {
        return res.status(401).json({ error: "Admin login required" });
      }

      const { imageBase64, fileName, mimeType, type } = req.body;
      
      if (!imageBase64 || !fileName) {
        return res.status(400).json({ error: "Image data and filename are required" });
      }

      // Validate mime type
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (mimeType && !allowedMimeTypes.includes(mimeType)) {
        return res.status(400).json({ error: "Invalid image type. Allowed: JPEG, PNG, GIF, WebP" });
      }

      const imageBuffer = Buffer.from(imageBase64, 'base64');
      
      // Validate size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (imageBuffer.length > maxSize) {
        return res.status(400).json({ error: "Image too large. Maximum size is 5MB" });
      }
      const { uploadImageToGoogleDrive } = await import("./googleDrive");
      
      const imageUrl = await uploadImageToGoogleDrive(
        imageBuffer,
        fileName,
        mimeType || 'image/jpeg',
        type || 'dhambaal'
      );
      
      if (!imageUrl) {
        return res.status(500).json({ error: "Failed to upload image" });
      }

      console.log(`[IMAGE] Uploaded to Google Drive: ${imageUrl}`);
      
      res.json({
        success: true,
        imageUrl
      });
    } catch (error: any) {
      console.error("[IMAGE] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Save content to database and Google Drive
  app.post("/api/admin/save-content", async (req, res) => {
    try {
      // Check for admin authentication
      const parentId = (req.session as any)?.parentId;
      if (parentId) {
        const parent = await storage.getParent(parentId);
        if (!parent?.isAdmin) {
          return res.status(403).json({ error: "Admin only" });
        }
      } else if (req.session.userId) {
        const user = await storage.getUser(req.session.userId);
        if (!user?.isAdmin) {
          return res.status(403).json({ error: "Admin only" });
        }
      } else {
        return res.status(401).json({ error: "Admin login required" });
      }

      const { type, title, titleSomali, content, keyPoints, moralLesson, characterName, characterType, audioBase64, images, isPublished } = req.body;
      
      if (!type || !content) {
        return res.status(400).json({ error: "Type and content are required" });
      }

      const today = new Date().toISOString().split('T')[0];

      console.log(`[SAVE] Saving ${type} content to database`);

      // Store audio as base64 data URL (works on Fly.io without Google Drive)
      let audioUrl: string | null = null;
      if (audioBase64) {
        // Store as data URL for direct playback in browser
        audioUrl = `data:audio/mpeg;base64,${audioBase64}`;
        console.log(`[SAVE] Audio stored as base64 data URL (${Math.round(audioBase64.length / 1024)} KB)`);
      }

      // Use provided images array or empty array
      const imageUrls: string[] = images || [];
      console.log(`[SAVE] Saving with ${imageUrls.length} images`);

      if (type === "dhambaal") {
        const message = await storage.createParentMessage({
          title: title || "Dhambaalka Waalidka",
          content,
          topic: "Tarbiyada Caruurta",
          keyPoints: keyPoints || "",
          images: imageUrls,
          audioUrl: audioUrl,
          messageDate: today,
          isPublished: isPublished !== false,
          authorName: "Muuse Siciid Aw-Muuse",
        });

        // Also save text content to Google Drive for backup
        try {
          const { saveDhambaalToGoogleDrive } = await import("./googleDrive");
          await saveDhambaalToGoogleDrive(title || "Dhambaal", content, today);
        } catch (driveError) {
          console.error("[SAVE] Google Drive text backup error:", driveError);
        }

        clearParentMessagesCache();
        
        res.json({
          success: true,
          id: message.id,
          type: "dhambaal",
          audioUrl: audioUrl,
          message: "Dhambaal waa la kaydiyay!"
        });
      } else {
        const story = await storage.createBedtimeStory({
          title: title || "Bedtime Story",
          titleSomali: titleSomali || title || "Sheeko Hurdo",
          content,
          characterName: characterName || "Unknown",
          characterType: characterType || "sahabi",
          moralLesson: moralLesson || "",
          ageRange: "3-8",
          images: imageUrls,
          audioUrl: audioUrl,
          storyDate: today,
          isPublished: isPublished !== false,
        });

        // Also save text content to Google Drive for backup
        try {
          const { saveMaaweelToGoogleDrive } = await import("./googleDrive");
          await saveMaaweelToGoogleDrive(titleSomali || title || "Sheeko", content, characterName || "", moralLesson || "", today);
        } catch (driveError) {
          console.error("[SAVE] Google Drive text backup error:", driveError);
        }

        clearBedtimeStoriesCache();
        
        res.json({
          success: true,
          id: story.id,
          type: "sheeko",
          audioUrl: audioUrl,
          message: "Sheeko waa la kaydiyay!"
        });
      }
    } catch (error: any) {
      console.error("[SAVE] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(password, user.password);
      
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Clear parent session if exists
      delete req.session.parentId;
      
      req.session.userId = user.id;
      res.json({ success: true, user: { id: user.id, username: user.username, isAdmin: user.isAdmin } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user: { id: user.id, username: user.username, isAdmin: user.isAdmin, picture: user.picture } });
  });

  // Update admin profile (including picture)
  app.patch("/api/admin/profile", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { picture } = req.body;
      const updated = await storage.updateUserPicture(req.session.userId, picture);
      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ user: { id: updated.id, username: updated.username, isAdmin: updated.isAdmin, picture: updated.picture } });
    } catch (error) {
      console.error("Error updating admin profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Logo base64 endpoint for certificates
  app.get("/api/logo-base64", async (req, res) => {
    try {
      const logoPath = path.join(process.cwd(), "attached_assets", "NEW_LOGO-BSU_1_1768990258338.png");
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        const base64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
        res.json({ base64 });
      } else {
        res.status(404).json({ error: "Logo not found" });
      }
    } catch (error) {
      console.error("Error loading logo:", error);
      res.status(500).json({ error: "Failed to load logo" });
    }
  });

  // Signature base64 endpoint for certificates
  app.get("/api/signature-base64", async (req, res) => {
    try {
      const signaturePath = path.join(process.cwd(), "client", "public", "signature.png");
      if (fs.existsSync(signaturePath)) {
        const signatureBuffer = fs.readFileSync(signaturePath);
        const base64 = `data:image/png;base64,${signatureBuffer.toString("base64")}`;
        res.json({ base64 });
      } else {
        res.status(404).json({ error: "Signature not found" });
      }
    } catch (error) {
      console.error("Error loading signature:", error);
      res.status(500).json({ error: "Failed to load signature" });
    }
  });

  app.get("/api/auth/parent/me", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const parent = await storage.getParent(req.session.parentId);
    if (!parent) {
      return res.status(404).json({ error: "Parent not found" });
    }

    // Single-session validation: check if this session is still the active one
    // Skip single-session check for admin accounts - they can login from multiple devices
    if (parent.activeSessionId && !parent.isAdmin) {
      if (!req.session.sessionToken || parent.activeSessionId !== req.session.sessionToken) {
        console.log(`[SESSION] /me check: Session superseded for parent ${parent.id}`);
        req.session.destroy(() => {});
        return res.status(401).json({ 
          error: "Waxaad ka soo gashay qalab kale. Fadlan soo gal mar kale.",
          code: "SESSION_SUPERSEDED" 
        });
      }
    }

    const parentData = parent as any;
    
    // Check if parent has yearly All-Access subscription
    let isYearlySubscriber = false;
    const allAccessCourse = await storage.getCourseByCourseId("all-access");
    if (allAccessCourse) {
      const parentEnrollments = await storage.getEnrollmentsByParentId(parent.id);
      const yearlyEnrollment = parentEnrollments.find(e => 
        e.courseId === allAccessCourse.id && 
        e.planType === "yearly" && 
        e.status === "active" &&
        (!e.accessEnd || new Date(e.accessEnd) > new Date())
      );
      isYearlySubscriber = !!yearlyEnrollment;
    }
    
    res.json({ 
      parent: { 
        id: parent.id, 
        name: parent.name, 
        email: parent.email, 
        picture: parent.picture,
        phone: parent.phone,
        country: parent.country,
        city: parent.city,
        isAdmin: parent.isAdmin,
        canHostSheeko: parent.canHostSheeko,
        telegramOptin: parentData.telegramOptin || false,
        telegramChatId: parentData.telegramChatId || null,
        isYearlySubscriber
      } 
    });
  });

  app.post("/api/auth/parent/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });

  // ======== COMMUNITY TERMS & CONDITIONS (App Store Compliance) ========
  
  // Check if parent has accepted community terms
  app.get("/api/community-terms-status", requireParentAuth, async (req, res) => {
    try {
      const parent = await storage.getParent(req.session.parentId!);
      if (!parent) {
        return res.status(404).json({ error: "Parent not found" });
      }
      res.json({ 
        hasAccepted: parent.hasAcceptedCommunityTerms || false,
        acceptedAt: parent.communityTermsAcceptedAt || null
      });
    } catch (error) {
      console.error("Error checking community terms status:", error);
      res.status(500).json({ error: "Failed to check status" });
    }
  });

  // Accept community terms
  app.post("/api/accept-community-terms", requireParentAuth, async (req, res) => {
    try {
      await storage.acceptCommunityTerms(req.session.parentId!);
      res.json({ success: true, message: "Shuruucda ayaa la aqbalay" });
    } catch (error) {
      console.error("Error accepting community terms:", error);
      res.status(500).json({ error: "Failed to accept terms" });
    }
  });

  // ======== USER BLOCKS (Community Safety) ========
  
  // Block a user
  app.post("/api/block-user/:userId", requireParentAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const blockerId = req.session.parentId!;
      
      if (blockerId === userId) {
        return res.status(400).json({ error: "Ma xiri kartid nafta" });
      }
      
      await storage.blockUser(blockerId, userId);
      res.json({ success: true, message: "User-ka waa la xiray" });
    } catch (error) {
      console.error("Error blocking user:", error);
      res.status(500).json({ error: "Failed to block user" });
    }
  });

  // Unblock a user
  app.delete("/api/block-user/:userId", requireParentAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      await storage.unblockUser(req.session.parentId!, userId);
      res.json({ success: true, message: "User-ka waa la furay" });
    } catch (error) {
      console.error("Error unblocking user:", error);
      res.status(500).json({ error: "Failed to unblock user" });
    }
  });

  // Get blocked users
  app.get("/api/blocked-users", requireParentAuth, async (req, res) => {
    try {
      const blockedUsers = await storage.getBlockedUsers(req.session.parentId!);
      res.json(blockedUsers);
    } catch (error) {
      console.error("Error getting blocked users:", error);
      res.status(500).json({ error: "Failed to get blocked users" });
    }
  });

  // Check if user is blocked
  app.get("/api/is-blocked/:userId", requireParentAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const isBlocked = await storage.isUserBlocked(req.session.parentId!, userId);
      res.json({ isBlocked });
    } catch (error) {
      console.error("Error checking block status:", error);
      res.status(500).json({ error: "Failed to check block status" });
    }
  });

  // Parent email/password registration
  app.post("/api/auth/parent/register", async (req, res) => {
    try {
      const { email, password, name, phone, country, city, inParentingGroup } = req.body;
      
      if (!email || !password || !name) {
        return res.status(400).json({ error: "Email, password, and name are required" });
      }

      if (!phone) {
        return res.status(400).json({ error: "Taleefankaaga waa khasab" });
      }

      if (!country) {
        return res.status(400).json({ error: "Wadanka waa khasab" });
      }

      // Normalize email to lowercase (matches login endpoint behavior)
      const normalizedEmail = email.toLowerCase().trim();

      // Normalize country and city names (capitalize first letter of each word)
      const normalizeText = (text: string) => text ? text.trim().split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ') : '';
      
      const normalizedCountry = normalizeText(country);
      const normalizedCity = city ? normalizeText(city) : '';

      // Check if email already exists
      const existingParent = await storage.getParentByEmail(normalizedEmail);
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      let parent: Parent | undefined;
      
      if (existingParent) {
        // If parent exists but has no password (Google account), allow setting password
        if (existingParent.password) {
          return res.status(400).json({ error: "Email already registered. Please log in instead." });
        }
        // Update the existing Google account with a password
        parent = await storage.updateParentPassword(existingParent.id, hashedPassword);
        if (!parent) {
          return res.status(500).json({ error: "Failed to update account" });
        }
      } else {
        // Create new parent
        parent = await storage.createParent({
          email: normalizedEmail,
          password: hashedPassword,
          name,
          phone: phone || null,
          country: normalizedCountry || null,
          city: normalizedCity || null,
          inParentingGroup: inParentingGroup || false,
        });

        // Send welcome email for new accounts only
        try {
          console.log(`[REGISTRATION] Sending welcome email to: ${parent.email}`);
          const emailSent = await sendWelcomeEmail(parent.email, parent.name);
          console.log(`[REGISTRATION] Welcome email result for ${parent.email}: ${emailSent ? 'SUCCESS' : 'FAILED'}`);
        } catch (emailError) {
          console.error(`[REGISTRATION] Failed to send welcome email to ${parent.email}:`, emailError);
        }

        // Sync new user to WordPress (non-blocking)
        if (parent) {
          const parentRef = parent;
          syncUserToWordPress(parentRef.email, parentRef.name, phone || '', hashedPassword).catch(err => {
            console.error(`[WP-SYNC] Background sync failed for ${parentRef.email}:`, err);
          });
        }
      }

      // Generate unique session token for single-session enforcement
      const sessionToken = crypto.randomUUID();
      
      // Get login metadata for tracking
      const loginIp = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || 'unknown';
      const loginDevice = req.headers['user-agent'] || 'unknown';
      
      // Set active session
      await storage.updateParent(parent.id, {
        activeSessionId: sessionToken,
        lastLoginIp: loginIp,
        lastLoginDevice: loginDevice.substring(0, 500)
      });
      console.log(`[SESSION] Parent ${parent.id} registered. New session: ${sessionToken.substring(0, 8)}... IP: ${loginIp}`);

      // Clear admin session if exists
      delete req.session.userId;
      
      req.session.parentId = parent.id;
      req.session.sessionToken = sessionToken; // Store token in session for validation
      
      // Explicitly save session to ensure persistence before response
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Failed to save session" });
        }
        res.json({ 
          success: true, 
          parent: { 
            id: parent.id, 
            name: parent.name, 
            email: parent.email, 
            picture: parent.picture,
            phone: parent.phone,
            country: parent.country,
            city: parent.city,
            isAdmin: parent.isAdmin,
            canHostSheeko: parent.canHostSheeko 
          } 
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Helper: Verify login credentials against WordPress
  async function verifyWithWordPress(email: string, password: string): Promise<{ verified: boolean; user?: { name: string; phone: string; email: string } }> {
    const apiKey = process.env.WORDPRESS_API_KEY;
    if (!apiKey) {
      console.log('[WP-LOGIN] WORDPRESS_API_KEY not set - skipping WordPress verification');
      return { verified: false };
    }
    
    try {
      const response = await fetch('https://barbaarintasan.com/wp-json/bsa/v1/verify-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({ email, password }),
      });
      
      const result = await response.json() as any;
      
      if (result.verified) {
        console.log(`[WP-LOGIN] WordPress verified user: ${email}`);
        return { verified: true, user: result.user };
      }
      
      console.log(`[WP-LOGIN] WordPress verification failed for: ${email} - ${result.error || 'unknown'}`);
      return { verified: false };
    } catch (error) {
      console.error(`[WP-LOGIN] Error verifying with WordPress: ${email}`, error);
      return { verified: false };
    }
  }

  // Parent email/password login
  app.post("/api/auth/parent/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const normalizedEmail = email.toLowerCase().trim();
      let parent = await storage.getParentByEmail(normalizedEmail);
      
      if (!parent) {
        // User not in app database - try WordPress verification
        const wpVerified = await verifyWithWordPress(normalizedEmail, password);
        if (!wpVerified.verified) {
          return res.status(401).json({ error: "Email ama password-ku khalad yahay" });
        }
        
        // WordPress verified! Auto-create account in app
        const hashedPassword = await bcrypt.hash(password, 10);
        parent = await storage.createParent({
          email: normalizedEmail,
          password: hashedPassword,
          name: wpVerified.user?.name || normalizedEmail.split('@')[0],
          phone: wpVerified.user?.phone || null,
          country: null,
          city: null,
          inParentingGroup: false,
        });
        console.log(`[WP-LOGIN] Auto-created app account for WordPress user: ${normalizedEmail}, id: ${parent.id}`);
      } else {
        if (!parent.password) {
          return res.status(401).json({ error: "Akoonkaan wuxuu ku sameeyay Google. Fadlan Google-ga ku gal." });
        }

        const isValid = await bcrypt.compare(password, parent.password);
        if (!isValid) {
          // Also try WordPress as fallback (user may have changed password on WordPress)
          const wpVerified = await verifyWithWordPress(normalizedEmail, password);
          if (wpVerified.verified) {
            // Update app password to match WordPress
            const hashedPassword = await bcrypt.hash(password, 10);
            await storage.updateParentPassword(parent.id, hashedPassword);
            console.log(`[WP-LOGIN] Updated app password from WordPress for: ${normalizedEmail}`);
          } else {
            return res.status(401).json({ error: "Email ama password-ku khalad yahay" });
          }
        }
      }

      // Generate unique session token for single-session enforcement
      const sessionToken = crypto.randomUUID();
      
      // Get login metadata for tracking
      const loginIp = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || 'unknown';
      const loginDevice = req.headers['user-agent'] || 'unknown';
      
      // Update last login and set active session (invalidates previous sessions)
      await storage.updateParentLastLogin(parent.id);
      await storage.updateParent(parent.id, {
        activeSessionId: sessionToken,
        lastLoginIp: loginIp,
        lastLoginDevice: loginDevice.substring(0, 500) // Limit length
      });
      console.log(`[SESSION] Parent ${parent.id} logged in. New session: ${sessionToken.substring(0, 8)}... IP: ${loginIp}`);

      // Clear admin session if exists
      delete req.session.userId;
      
      req.session.parentId = parent.id;
      req.session.sessionToken = sessionToken; // Store token in session for validation
      
      // Check if parent has yearly All-Access subscription
      let isYearlySubscriber = false;
      const allAccessCourse = await storage.getCourseByCourseId("all-access");
      if (allAccessCourse) {
        const parentEnrollments = await storage.getEnrollmentsByParentId(parent.id);
        const yearlyEnrollment = parentEnrollments.find(e => 
          e.courseId === allAccessCourse.id && 
          e.planType === "yearly" && 
          e.status === "active" &&
          (!e.accessEnd || new Date(e.accessEnd) > new Date())
        );
        isYearlySubscriber = !!yearlyEnrollment;
      }
      
      // Explicitly save session to ensure persistence before response
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Failed to save session" });
        }
        res.json({ 
          success: true, 
          parent: { 
            id: parent.id, 
            name: parent.name, 
            email: parent.email, 
            picture: parent.picture,
            phone: parent.phone,
            country: parent.country,
            city: parent.city,
            isAdmin: parent.isAdmin,
            canHostSheeko: parent.canHostSheeko,
            isYearlySubscriber
          } 
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Google OAuth - Get authorization URL
  app.get("/api/auth/google", (req, res) => {
    try {
      const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
      const redirectUri = process.env.APP_BASE_URL 
        ? `${process.env.APP_BASE_URL}/api/auth/google/callback`
        : `${protocol}://${req.get('host')}/api/auth/google/callback`;
      
      // Store returnUrl in session for external redirect after OAuth
      const returnUrl = req.query.returnUrl as string | undefined;
      if (returnUrl && (returnUrl.startsWith("https://barbaarintasan.com") || returnUrl.startsWith("https://www.barbaarintasan.com"))) {
        req.session.oauthReturnUrl = returnUrl;
      }
      
      const oauth2Client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      );
      
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile'
        ],
        prompt: 'select_account'
      });
      
      res.json({ url: authUrl });
    } catch (error) {
      console.error("Google OAuth URL error:", error);
      res.status(500).json({ error: "Failed to generate Google login URL" });
    }
  });

  // Google OAuth - Callback handler
  app.get("/api/auth/google/callback", async (req, res) => {
    try {
      const { code, error } = req.query;
      
      if (error) {
        console.error("Google OAuth error:", error);
        return res.redirect("/register?error=google_auth_failed");
      }
      
      if (!code || typeof code !== 'string') {
        return res.redirect("/register?error=missing_code");
      }
      
      const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
      const redirectUri = process.env.APP_BASE_URL 
        ? `${process.env.APP_BASE_URL}/api/auth/google/callback`
        : `${protocol}://${req.get('host')}/api/auth/google/callback`;
      
      const oauth2Client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      );
      
      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      
      // Get user info from Google
      const ticket = await oauth2Client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      
      const payload = ticket.getPayload();
      if (!payload) {
        return res.redirect("/register?error=invalid_token");
      }
      
      const { sub: googleId, email, name, picture } = payload;
      
      if (!email) {
        return res.redirect("/register?error=no_email");
      }
      
      // Check if user exists by googleId
      let parent = await storage.getParentByGoogleId(googleId!);
      
      if (!parent) {
        // Check if user exists by email
        parent = await storage.getParentByEmail(email);
        
        if (parent) {
          // Link Google account to existing parent
          await storage.updateParent(parent.id, { googleId: googleId! });
        } else {
          // Create new parent with Google account
          parent = await storage.createParent({
            name: name || email.split('@')[0],
            email,
            googleId: googleId!,
            picture: picture || null,
            password: null // No password for Google-only accounts
          });
        }
      }
      
      // Generate unique session token for single-session enforcement
      const sessionToken = crypto.randomUUID();
      
      // Get login metadata for tracking
      const loginIp = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || 'unknown';
      const loginDevice = req.headers['user-agent'] || 'unknown';
      
      // Update last login, picture, and set active session (invalidates previous sessions)
      await storage.updateParentLastLogin(parent.id);
      const updateData: any = {
        activeSessionId: sessionToken,
        lastLoginIp: loginIp,
        lastLoginDevice: loginDevice.substring(0, 500)
      };
      if (picture && picture !== parent.picture) {
        updateData.picture = picture;
      }
      await storage.updateParent(parent.id, updateData);
      console.log(`[SESSION] Parent ${parent.id} logged in via Google. New session: ${sessionToken.substring(0, 8)}... IP: ${loginIp}`);
      
      // Clear admin session if exists and set parent session
      delete req.session.userId;
      req.session.parentId = parent.id;
      req.session.sessionToken = sessionToken; // Store token in session for validation
      
      // Explicitly save session to ensure persistence before redirect
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.redirect("/register?error=session_failed");
        }
        // Check for external return URL (WordPress redirect)
        const returnUrl = req.session.oauthReturnUrl;
        delete req.session.oauthReturnUrl; // Clear it after use
        
        if (returnUrl && (returnUrl.startsWith("https://barbaarintasan.com") || returnUrl.startsWith("https://www.barbaarintasan.com"))) {
          res.redirect(returnUrl);
        } else {
          res.redirect("/");
        }
      });
    } catch (error) {
      console.error("Google OAuth callback error:", error);
      res.redirect("/register?error=google_auth_failed");
    }
  });

  // Forgot password - send reset email
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const parent = await storage.getParentByEmail(email);
      
      // Always return success to prevent email enumeration attacks
      if (!parent) {
        console.log(`Password reset requested for non-existent email: ${email}`);
        return res.json({ success: true, message: "If the email exists, you will receive a reset link" });
      }

      // Delete any expired tokens for this parent
      await storage.deleteExpiredPasswordResetTokens(parent.id);

      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Save token to database
      await storage.createPasswordResetToken(parent.id, token, expiresAt);

      // Send reset email (uses APP_BASE_URL env var or auto-detects from Replit)
      const emailSent = await sendPasswordResetEmail(email, parent.name, token);
      
      if (!emailSent) {
        console.error(`Failed to send password reset email to ${email}`);
      }

      res.json({ success: true, message: "If the email exists, you will receive a reset link" });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to process request" });
    }
  });

  // Reset password with token
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ error: "Token and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      // Validate token
      const resetToken = await storage.getValidPasswordResetToken(token);
      if (!resetToken) {
        return res.status(400).json({ error: "Invalid or expired reset link" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update password
      await storage.updateParentPassword(resetToken.parentId, hashedPassword);

      // Mark token as used
      await storage.markPasswordResetTokenUsed(token);

      res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Validate reset token (check if token is valid before showing reset form)
  app.get("/api/auth/validate-reset-token/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      const resetToken = await storage.getValidPasswordResetToken(token);
      
      if (!resetToken) {
        return res.status(400).json({ valid: false, error: "Invalid or expired reset link" });
      }

      res.json({ valid: true });
    } catch (error) {
      console.error("Validate token error:", error);
      res.status(500).json({ valid: false, error: "Failed to validate token" });
    }
  });

  app.get("/api/parent/enrollments", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const enrollmentsList = await storage.getEnrollmentsByParentId(req.session.parentId);
      res.json(enrollmentsList);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
      res.status(500).json({ error: "Failed to fetch enrollments" });
    }
  });

  // Enroll in a course (for All-Access subscribers)
  app.post("/api/parent/enroll-course", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { courseId } = req.body;
      if (!courseId) {
        return res.status(400).json({ error: "Course ID is required" });
      }

      // Check if user has All-Access subscription
      const allAccessCourse = await storage.getCourseByCourseId("all-access");
      if (!allAccessCourse) {
        return res.status(400).json({ error: "All-Access course not configured" });
      }

      const enrollments = await storage.getEnrollmentsByParentId(req.session.parentId);
      const now = new Date();
      const allAccessEnrollment = enrollments.find(e => 
        e.courseId === allAccessCourse.id && 
        e.status === "active" &&
        (!e.accessEnd || new Date(e.accessEnd) > now)
      );

      if (!allAccessEnrollment) {
        return res.status(403).json({ error: "All-Access subscription required" });
      }

      // Check if already enrolled in this course
      const existingEnrollment = enrollments.find(e => e.courseId === courseId);
      if (existingEnrollment) {
        return res.status(400).json({ error: "Already enrolled in this course" });
      }

      // Check if course exists and is ready
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }
      if (!course.contentReady) {
        return res.status(400).json({ error: "Course content is not ready yet" });
      }

      // Get parent for phone number
      const parent = await storage.getParent(req.session.parentId);

      // Create enrollment with same access end as All-Access subscription
      const enrollment = await storage.createEnrollment({
        parentId: req.session.parentId,
        customerPhone: parent?.phone || null,
        courseId,
        planType: allAccessEnrollment.planType,
        accessEnd: allAccessEnrollment.accessEnd,
        status: "active",
      });

      console.log(`[ENROLL] Parent ${req.session.parentId} enrolled in course ${courseId} via All-Access`);
      res.json({ success: true, enrollment });
    } catch (error) {
      console.error("Error enrolling in course:", error);
      res.status(500).json({ error: "Failed to enroll in course" });
    }
  });

  // Check subscription status for a specific course
  app.get("/api/parent/subscription-status/:courseId", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { courseId } = req.params;
      const accessCheck = await checkCourseAccess(req.session.parentId, courseId);
      
      const enrollment = await storage.getActiveEnrollmentByParentAndCourse(req.session.parentId, courseId);
      const course = await storage.getCourse(courseId);
      
      // Check if eligible for upgrade (monthly to yearly) - including expired monthly subscriptions
      let eligibleForUpgrade = false;
      let upgradePrice = 0;
      let upgradeMonthsRemaining = 0;
      let upgradeBannerVisible = false;
      let upgradeBannerExpiresAt: Date | undefined = undefined;
      let isExpiredMonthly = false;
      
      // First check active enrollment for upgrade eligibility
      const yearlyPrice = course?.priceYearly || 114;
      let monthlyPaidAmount = 0;
      
      if (enrollment && 
          enrollment.planType === "monthly" && 
          enrollment.status === "active" && 
          enrollment.accessEnd && 
          new Date(enrollment.accessEnd) > new Date()) {
        eligibleForUpgrade = true;
        
        // Get the actual monthly amount this user paid from their payment submission
        if (enrollment.paymentSubmissionId) {
          const paymentSub = await storage.getPaymentSubmission(enrollment.paymentSubmissionId);
          if (paymentSub) {
            monthlyPaidAmount = paymentSub.amount;
          }
        }
        if (!monthlyPaidAmount) {
          monthlyPaidAmount = course?.priceMonthly || 15;
        }
        
        // Dynamic upgrade price: yearly - monthly already paid + $1 adjustment (minimum $1)
        upgradePrice = Math.max(1, yearlyPrice - monthlyPaidAmount + 1);
        
        // Calculate remaining days in current subscription
        const now = new Date();
        const accessEnd = new Date(enrollment.accessEnd);
        const daysRemaining = Math.ceil((accessEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        upgradeMonthsRemaining = Math.ceil(daysRemaining / 30);
        
        // Check if upgrade banner should be visible (3 times per month, 10 days apart, 24h each)
        const bannerStatus = await storage.getUpgradeBannerStatus(enrollment.id);
        upgradeBannerVisible = bannerStatus.shouldShow;
        upgradeBannerExpiresAt = bannerStatus.expiresAt;
      }
      
      // Also check for expired monthly subscriptions that can be upgraded
      if (!eligibleForUpgrade) {
        const allEnrollments = await storage.getEnrollmentsByParentId(req.session.parentId);
        const courseEnrollments = allEnrollments
          .filter(e => e.courseId === courseId)
          .sort((a, b) => new Date(b.accessStart).getTime() - new Date(a.accessStart).getTime());
        
        const latestEnrollment = courseEnrollments[0];
        if (latestEnrollment && 
            latestEnrollment.planType === "monthly" && 
            latestEnrollment.accessEnd && 
            new Date(latestEnrollment.accessEnd) < new Date()) {
          // Expired monthly subscription - still eligible for upgrade
          eligibleForUpgrade = true;
          isExpiredMonthly = true;
          
          // Get actual monthly amount paid
          if (latestEnrollment.paymentSubmissionId) {
            const paymentSub = await storage.getPaymentSubmission(latestEnrollment.paymentSubmissionId);
            if (paymentSub) {
              monthlyPaidAmount = paymentSub.amount;
            }
          }
          if (!monthlyPaidAmount) {
            monthlyPaidAmount = course?.priceMonthly || 15;
          }
          
          // Dynamic upgrade price: yearly - monthly already paid + $1 adjustment (minimum $1)
          upgradePrice = Math.max(1, yearlyPrice - monthlyPaidAmount + 1);
          upgradeMonthsRemaining = 0; // No remaining time
        }
      }
      
      res.json({
        hasAccess: accessCheck.hasAccess,
        reason: accessCheck.reason,
        enrollment: enrollment ? {
          id: enrollment.id,
          planType: enrollment.planType,
          status: enrollment.status,
          accessStart: enrollment.accessStart,
          accessEnd: enrollment.accessEnd,
        } : null,
        course: course ? {
          id: course.id,
          title: course.title,
          priceMonthly: course.priceMonthly,
          priceYearly: course.priceYearly,
          isFree: course.isFree,
        } : null,
        // Upgrade info for monthly subscribers (active or expired)
        upgradeInfo: eligibleForUpgrade ? {
          eligible: true,
          isExpiredMonthly,
          upgradePrice: upgradePrice,
          monthlyPaidAmount: monthlyPaidAmount,
          monthsRemaining: upgradeMonthsRemaining,
          yearlyPrice: yearlyPrice,
          monthlyPrice: course?.priceMonthly || 15,
          totalCost: monthlyPaidAmount + upgradePrice,
          savings: ((course?.priceMonthly || 15) * 12) - (monthlyPaidAmount + upgradePrice),
          bannerVisible: upgradeBannerVisible,
          bannerExpiresAt: upgradeBannerExpiresAt,
        } : null,
      });
    } catch (error) {
      console.error("Error checking subscription status:", error);
      res.status(500).json({ error: "Failed to check subscription status" });
    }
  });

  // Mark upgrade banner as shown (called when banner is displayed)
  app.post("/api/parent/upgrade-banner-shown/:courseId", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { courseId } = req.params;
      const enrollment = await storage.getActiveEnrollmentByParentAndCourse(req.session.parentId, courseId);
      
      if (!enrollment) {
        return res.status(404).json({ error: "Enrollment not found" });
      }
      
      if (enrollment.planType !== "monthly") {
        return res.json({ success: true, message: "Not a monthly subscription" });
      }
      
      await storage.markUpgradeBannerShown(enrollment.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking upgrade banner shown:", error);
      res.status(500).json({ error: "Failed to mark banner shown" });
    }
  });

  // Get all upgrade-eligible enrollments (monthly subscriptions - active or expired)
  app.get("/api/parent/upgrade-eligibility", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const allEnrollments = await storage.getEnrollmentsByParentId(req.session.parentId);
      
      // Find monthly subscriptions that can be upgraded (excludes already-yearly or lifetime)
      const upgradeEligible = [];
      
      // Group enrollments by course to find the latest for each
      const latestEnrollmentsByCourse: Record<string, typeof allEnrollments[0]> = {};
      for (const enrollment of allEnrollments) {
        const courseId = enrollment.courseId;
        const existing = latestEnrollmentsByCourse[courseId];
        if (!existing || new Date(enrollment.accessStart) > new Date(existing.accessStart)) {
          latestEnrollmentsByCourse[courseId] = enrollment;
        }
      }
      
      for (const enrollment of Object.values(latestEnrollmentsByCourse)) {
        // Skip if already upgraded to yearly or lifetime
        if (enrollment.planType === "yearly" || enrollment.planType === "lifetime" || enrollment.planType === "onetime") continue;
        
        // Only show monthly subscriptions
        if (enrollment.planType !== "monthly") continue;
        
        // Get course info
        const course = await storage.getCourse(enrollment.courseId);
        if (!course) continue;
        
        // Calculate remaining time if subscription is active
        const now = new Date();
        const accessEnd = enrollment.accessEnd ? new Date(enrollment.accessEnd) : null;
        const isActive = enrollment.status === "active" && accessEnd && accessEnd > now;
        const daysRemaining = accessEnd ? Math.max(0, Math.ceil((accessEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;
        const isExpired = !isActive && accessEnd && accessEnd < now;
        
        upgradeEligible.push({
          enrollmentId: enrollment.id,
          courseId: course.courseId, // Human-readable courseId for URL routing
          courseDbId: enrollment.courseId, // Database UUID
          courseTitle: course.title,
          courseImageUrl: course.imageUrl,
          planType: enrollment.planType,
          isActive,
          isExpired,
          daysRemaining,
          accessEnd: enrollment.accessEnd,
          // Upgrade pricing
          upgradePrice: 70, // $114 - $15
          yearlyPrice: 114,
          monthlyPrice: 15,
          savings: (15 * 12) - 85, // $360 - $85 = $275 savings
        });
      }
      
      res.json({ eligibleEnrollments: upgradeEligible });
    } catch (error) {
      console.error("Error checking upgrade eligibility:", error);
      res.status(500).json({ error: "Failed to check upgrade eligibility" });
    }
  });

  // Update parent profile (name, picture, phone, country, city)
  app.patch("/api/parent/profile", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { name, picture, phone, country, city, whatsappOptin, whatsappNumber, dailyReminderEnabled, dailyReminderTime } = req.body;
      const updated = await storage.updateParent(req.session.parentId, { 
        name, picture, phone, country, city, whatsappOptin, whatsappNumber,
        dailyReminderEnabled, dailyReminderTime
      });
      if (!updated) {
        return res.status(404).json({ error: "Parent not found" });
      }
      res.json({ parent: updated });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Update daily reminder settings
  app.patch("/api/parent/reminder-settings", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { enabled, time } = req.body;
      const updated = await storage.updateParent(req.session.parentId, { 
        dailyReminderEnabled: enabled,
        dailyReminderTime: time
      });
      if (!updated) {
        return res.status(404).json({ error: "Parent not found" });
      }
      res.json({ success: true, parent: updated });
    } catch (error) {
      console.error("Error updating reminder settings:", error);
      res.status(500).json({ error: "Failed to update reminder settings" });
    }
  });

  // ============================================
  // PARENT NOTIFICATIONS INBOX
  // ============================================

  // Get parent's notifications
  app.get("/api/parent/notifications", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const notifications = await storage.getParentNotifications(req.session.parentId, limit);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Get unread notification count
  app.get("/api/parent/notifications/unread-count", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const count = await storage.getUnreadNotificationCount(req.session.parentId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });

  // Mark a single notification as read
  app.patch("/api/parent/notifications/:id/read", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const notification = await storage.markNotificationRead(req.params.id, req.session.parentId);
      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }
      res.json(notification);
    } catch (error) {
      console.error("Error marking notification read:", error);
      res.status(500).json({ error: "Failed to mark notification read" });
    }
  });

  // Mark all notifications as read
  app.patch("/api/parent/notifications/read-all", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      await storage.markAllNotificationsRead(req.session.parentId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications read:", error);
      res.status(500).json({ error: "Failed to mark all notifications read" });
    }
  });

  // Delete a notification (soft delete)
  app.delete("/api/parent/notifications/:id", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      await storage.deleteNotification(req.params.id, req.session.parentId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ error: "Failed to delete notification" });
    }
  });

  // ========== PRAYER TIMES (Jadwalka Salaadda) ==========

  // Get prayer times from Aladhan API
  app.get("/api/prayer-times", async (req, res) => {
    try {
      const { latitude, longitude, method = 4, school = 1 } = req.query;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ error: "Latitude and longitude are required" });
      }

      const today = new Date();
      const date = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
      
      const response = await fetch(
        `https://api.aladhan.com/v1/timings/${date}?latitude=${latitude}&longitude=${longitude}&method=${method}&school=${school}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch prayer times from Aladhan API");
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error fetching prayer times:", error);
      res.status(500).json({ error: "Failed to fetch prayer times" });
    }
  });

  // Get parent's prayer settings
  app.get("/api/parent/prayer-settings", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const settings = await storage.getParentPrayerSettings(req.session.parentId);
      res.json(settings || null);
    } catch (error) {
      console.error("Error fetching prayer settings:", error);
      res.status(500).json({ error: "Failed to fetch prayer settings" });
    }
  });

  // Update parent's prayer settings
  app.put("/api/parent/prayer-settings", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const settings = await storage.upsertParentPrayerSettings(req.session.parentId, req.body);
      res.json(settings);
    } catch (error) {
      console.error("Error updating prayer settings:", error);
      res.status(500).json({ error: "Failed to update prayer settings" });
    }
  });

  // Get parent's payment history
  app.get("/api/parent/payments", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const parent = await storage.getParent(req.session.parentId);
      if (!parent) {
        return res.status(404).json({ error: "Parent not found" });
      }
      const payments = await storage.getPaymentsByEmail(parent.email);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payment history:", error);
      res.status(500).json({ error: "Failed to fetch payment history" });
    }
  });

  // Get parent's lesson progress
  app.get("/api/parent/progress", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const progress = await storage.getProgressByParentId(req.session.parentId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching progress:", error);
      res.status(500).json({ error: "Failed to fetch progress" });
    }
  });

  // Get parent's lesson progress for a specific course
  app.get("/api/parent/course/:courseId/progress", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { courseId } = req.params;
      const progress = await storage.getAllLessonProgress(req.session.parentId, courseId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching course progress:", error);
      res.status(500).json({ error: "Failed to fetch course progress" });
    }
  });

  // Get parent's learning streak
  app.get("/api/parent/streak", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const streak = await storage.getStreak(req.session.parentId);
      res.json(streak);
    } catch (error) {
      console.error("Error fetching streak:", error);
      res.status(500).json({ error: "Failed to fetch streak" });
    }
  });

  // Get parent's learning activity calendar (days with completed lessons)
  app.get("/api/parent/activity-calendar", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { year, month } = req.query;
      const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
      const targetMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
      
      const activityDays = await storage.getActivityCalendar(req.session.parentId, targetYear, targetMonth);
      res.json({ year: targetYear, month: targetMonth, activityDays });
    } catch (error) {
      console.error("Error fetching activity calendar:", error);
      res.status(500).json({ error: "Failed to fetch activity calendar" });
    }
  });

  // Get parent's weekly progress chart data
  app.get("/api/parent/weekly-progress", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const weeklyData = await storage.getWeeklyProgress(req.session.parentId);
      res.json(weeklyData);
    } catch (error) {
      console.error("Error fetching weekly progress:", error);
      res.status(500).json({ error: "Failed to fetch weekly progress" });
    }
  });

  // Get user conversations with last message and participant info
  app.get("/api/conversations", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const conversationsList = await storage.getConversationsForUser(req.session.parentId);
      res.json(conversationsList);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get messages for a conversation with pagination
  app.get("/api/conversations/:id/messages", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { id } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await storage.getMessagesByConversation(id, limit, offset);
      res.json({
        ...result,
        limit,
        offset,
        hasMore: offset + result.messages.length < result.total,
      });
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Send a new message
  app.post("/api/conversations/:id/messages", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { id } = req.params;
      const { content } = req.body;

      if (!content || typeof content !== "string" || content.trim().length === 0) {
        return res.status(400).json({ error: "Message content is required" });
      }

      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      if (conversation.participant1 !== req.session.parentId && conversation.participant2 !== req.session.parentId) {
        return res.status(403).json({ error: "Not a participant in this conversation" });
      }

      const message = await storage.createMessage(id, req.session.parentId, content.trim());
      
      const recipientId = conversation.participant1 === req.session.parentId 
        ? conversation.participant2 
        : conversation.participant1;
      
      const recipientIds = [recipientId];
      
      broadcastNewMessage(recipientIds, {
        id: message.id,
        conversationId: id,
        senderId: req.session.parentId,
        content: message.content,
        createdAt: message.createdAt,
      });

      // Send push notification to recipient
      if (pushNotificationsEnabled) {
        try {
          const sender = await storage.getParentById(req.session.parentId);
          const senderName = sender?.name?.split(' ')[0] || "Qof";
          const subscriptions = await storage.getPushSubscriptionsByParent(recipientId);
          
          if (subscriptions.length > 0) {
            const notificationPayload = JSON.stringify({
              title: `Fariin cusub: ${senderName}`,
              body: content.trim().substring(0, 100),
              url: "/messenger"
            });

            await Promise.allSettled(
              subscriptions.map(async (sub: PushSubscription) => {
                try {
                  await webpush.sendNotification(
                    {
                      endpoint: sub.endpoint,
                      keys: { p256dh: sub.p256dh, auth: sub.auth },
                    },
                    notificationPayload
                  );
                } catch (err: any) {
                  if (err.statusCode === 410 || err.statusCode === 404) {
                    await storage.deletePushSubscription(sub.parentId, sub.endpoint);
                  }
                }
              })
            );
          }
        } catch (pushError) {
          console.error("[PUSH] Error sending message notification:", pushError);
        }
      }

      res.status(201).json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Create a new conversation (for parents)
  app.post("/api/conversations", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { participantId } = req.body;

      if (!participantId || typeof participantId !== "string") {
        return res.status(400).json({ error: "Participant ID is required" });
      }

      if (participantId === req.session.parentId) {
        return res.status(400).json({ error: "Cannot start conversation with yourself" });
      }

      const targetParent = await storage.getParentById(participantId);
      if (!targetParent) {
        return res.status(404).json({ error: "User not found" });
      }

      const conversation = await storage.createConversation(req.session.parentId, participantId);
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  // Get list of parents for conversation selection
  app.get("/api/parents", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const allParents = await storage.getAllParents();
      const filteredParents = allParents
        .filter((p: any) => p.id !== req.session.parentId)
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          picture: p.picture,
        }));
      res.json(filteredParents);
    } catch (error) {
      console.error("Error fetching parents:", error);
      res.status(500).json({ error: "Failed to fetch parents" });
    }
  });

  // Mark messages as read when fetching
  app.post("/api/conversations/:id/mark-read", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { id } = req.params;
      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      if (conversation.participant1 !== req.session.parentId && conversation.participant2 !== req.session.parentId) {
        return res.status(403).json({ error: "Not a participant in this conversation" });
      }

      await storage.markConversationMessagesAsRead(id, req.session.parentId);
      
      // Broadcast read status to the other participant (sender)
      const senderId = conversation.participant1 === req.session.parentId 
        ? conversation.participant2 
        : conversation.participant1;
      
      broadcastMessageStatus(senderId, {
        messageId: "all",
        conversationId: id,
        status: "read",
        timestamp: new Date().toISOString(),
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ error: "Failed to mark messages as read" });
    }
  });

  // Get unread message count for current user
  app.get("/api/conversations/unread-count", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const count = await storage.getUnreadMessageCount(req.session.parentId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });

  // ============================================
  // PARENT SOCIAL NETWORK (FOLLOW SYSTEM)
  // ============================================

  // Follow a parent
  app.post("/api/parents/:id/follow", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { id: followingId } = req.params;
      
      if (followingId === req.session.parentId) {
        return res.status(400).json({ error: "Naftaada ma follow-garayn kartid" });
      }

      const targetParent = await storage.getParentById(followingId);
      if (!targetParent) {
        return res.status(404).json({ error: "Waalidka lama helin" });
      }

      await storage.followParent(req.session.parentId, followingId);
      
      // Create notification for the followed parent
      await storage.createSocialNotification({
        parentId: followingId,
        type: "new_follower",
        actorId: req.session.parentId,
      });

      res.json({ success: true, message: "Waxaad follow-gareysay" });
    } catch (error) {
      console.error("Error following parent:", error);
      res.status(500).json({ error: "Follow-ka wuu fashilmay" });
    }
  });

  // Unfollow a parent
  app.delete("/api/parents/:id/follow", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { id: followingId } = req.params;
      await storage.unfollowParent(req.session.parentId, followingId);
      res.json({ success: true, message: "Waxaad unfollow-gareysay" });
    } catch (error) {
      console.error("Error unfollowing parent:", error);
      res.status(500).json({ error: "Unfollow-ka wuu fashilmay" });
    }
  });

  // Check if current user follows a parent
  app.get("/api/parents/:id/follow-status", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { id: targetId } = req.params;
      const isFollowing = await storage.isFollowing(req.session.parentId, targetId);
      const isFollowedBy = await storage.isFollowing(targetId, req.session.parentId);
      res.json({ isFollowing, isFollowedBy });
    } catch (error) {
      console.error("Error checking follow status:", error);
      res.status(500).json({ error: "Failed to check follow status" });
    }
  });

  // Get followers of a parent
  app.get("/api/parents/:id/followers", async (req, res) => {
    try {
      const { id: parentId } = req.params;
      const followers = await storage.getFollowers(parentId);
      res.json(followers);
    } catch (error) {
      console.error("Error fetching followers:", error);
      res.status(500).json({ error: "Failed to fetch followers" });
    }
  });

  // Get parents that a parent follows
  app.get("/api/parents/:id/following", async (req, res) => {
    try {
      const { id: parentId } = req.params;
      const following = await storage.getFollowing(parentId);
      res.json(following);
    } catch (error) {
      console.error("Error fetching following:", error);
      res.status(500).json({ error: "Failed to fetch following" });
    }
  });

  // Get follow counts for a parent
  app.get("/api/parents/:id/follow-counts", async (req, res) => {
    try {
      const { id: parentId } = req.params;
      const counts = await storage.getFollowCounts(parentId);
      res.json(counts);
    } catch (error) {
      console.error("Error fetching follow counts:", error);
      res.status(500).json({ error: "Failed to fetch follow counts" });
    }
  });

  // Get parent profile by ID (public)
  app.get("/api/parents/:id/profile", async (req, res) => {
    try {
      const { id: parentId } = req.params;
      const parent = await storage.getParentById(parentId);
      if (!parent) {
        return res.status(404).json({ error: "Waalidka lama helin" });
      }
      
      const counts = await storage.getFollowCounts(parentId);
      
      // Return public profile info (without sensitive data)
      res.json({
        id: parent.id,
        name: parent.name,
        picture: parent.picture,
        createdAt: parent.createdAt,
        followersCount: counts.followersCount,
        followingCount: counts.followingCount,
      });
    } catch (error) {
      console.error("Error fetching parent profile:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // Get social notifications for current user
  app.get("/api/social-notifications", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const notifications = await storage.getSocialNotifications(req.session.parentId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching social notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Mark social notifications as read
  app.post("/api/social-notifications/mark-read", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      await storage.markSocialNotificationsAsRead(req.session.parentId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notifications as read:", error);
      res.status(500).json({ error: "Failed to mark as read" });
    }
  });

  // Get unread social notification count
  app.get("/api/social-notifications/unread-count", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const count = await storage.getUnreadSocialNotificationCount(req.session.parentId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching notification count:", error);
      res.status(500).json({ error: "Failed to fetch count" });
    }
  });

  // ============================================
  // DIRECT MESSAGES API
  // ============================================

  // Get all conversations for current user
  app.get("/api/messages/conversations", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const conversations = await storage.getConversations(req.session.parentId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get messages with a specific parent
  app.get("/api/messages/:partnerId", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { partnerId } = req.params;
      const messages = await storage.getMessagesWithParent(req.session.parentId, partnerId);
      
      // Mark messages from partner as read
      await storage.markMessagesAsRead(req.session.parentId, partnerId);
      
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Send a message to another parent
  app.post("/api/messages/:receiverId", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { receiverId } = req.params;
      const { body } = req.body;

      if (!body || typeof body !== "string" || !body.trim()) {
        return res.status(400).json({ error: "Fariin la'aan" });
      }

      // Prevent self-messaging
      if (receiverId === req.session.parentId) {
        return res.status(400).json({ error: "Ma dir kartid fariin naftaada" });
      }

      // Check receiver exists
      const receiver = await storage.getParentById(receiverId);
      if (!receiver) {
        return res.status(404).json({ error: "Waalidka lama helin" });
      }

      const message = await storage.sendDirectMessage(
        req.session.parentId,
        receiverId,
        body.trim()
      );

      // Create notification for receiver
      await storage.createSocialNotification({
        parentId: receiverId,
        type: "new_message",
        actorId: req.session.parentId,
        referenceId: message.id,
      });

      res.json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // POST /api/messages/:receiverId/voice - Send a voice DM
  const dmAudioUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
  app.post("/api/messages/:receiverId/voice", dmAudioUpload.single("audio"), async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { receiverId } = req.params;

      if (receiverId === req.session.parentId) {
        return res.status(400).json({ error: "Ma dir kartid fariin naftaada" });
      }

      const receiver = await storage.getParentById(receiverId);
      if (!receiver) {
        return res.status(404).json({ error: "Waalidka lama helin" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "Audio file la'aan" });
      }

      const { uploadToR2, isR2Configured } = await import("./r2Storage");
      if (!isR2Configured()) {
        return res.status(500).json({ error: "Cloud storage not configured" });
      }

      const ext = req.file.mimetype.includes("mp3") || req.file.mimetype.includes("mpeg") ? "mp3" : "webm";
      const fileName = `${req.session.parentId}-${Date.now()}.${ext}`;
      const result = await uploadToR2(req.file.buffer, fileName, req.file.mimetype, "dm-voice");
      const audioUrl = result.url;

      const bodyText = req.body?.body?.trim() || "🎤 Fariin cod ah";

      const message = await storage.sendDirectMessage(
        req.session.parentId,
        receiverId,
        bodyText,
        audioUrl,
      );

      await storage.createSocialNotification({
        parentId: receiverId,
        type: "new_message",
        actorId: req.session.parentId,
        referenceId: message.id,
      });

      res.json(message);
    } catch (error) {
      console.error("Error sending voice DM:", error);
      res.status(500).json({ error: "Failed to send voice message" });
    }
  });

  // Get unread message count
  app.get("/api/messages-unread-count", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const count = await storage.getUnreadMessageCount(req.session.parentId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: "Failed to fetch count" });
    }
  });

  // ============================================
  // PARENT SOCIAL FEED POSTS API
  // ============================================

  // Create a new social post
  app.post("/api/social-posts", requireParentAuth, async (req, res) => {
    try {
      const { title, content, visibility = "public", audioUrl } = req.body;

      if (!title && !content && !audioUrl) {
        return res.status(400).json({ error: "Cinwaanka, qoraalka ama audio-ga waa lagama maarmaanka" });
      }

      if (!["public", "followers", "private"].includes(visibility)) {
        return res.status(400).json({ error: "Visibility aan la aqoon" });
      }

      // AI Content Moderation (App Store Compliance)
      const combinedContent = `${title}\n\n${content}`;
      const moderationResult = await moderateContent(combinedContent);
      
      if (moderationResult.isFlagged && moderationResult.confidenceScore >= 0.7) {
        // Log the moderation action for admin review
        console.log(`[AI Moderation] Blocked post from parent ${req.session.parentId}: ${moderationResult.violationType}`);
        
        // Store moderation report for admin review
        try {
          await storage.createAiModerationReport({
            contentType: "social_post",
            contentId: "draft",
            userId: req.session.parentId!,
            originalContent: combinedContent.substring(0, 500),
            violationType: moderationResult.violationType || "unknown",
            confidenceScore: moderationResult.confidenceScore,
            aiExplanation: moderationResult.explanation || null,
            actionTaken: "hidden",
            status: "pending"
          });
        } catch (e) {
          console.error("Error saving moderation report:", e);
        }
        
        return res.status(400).json({ 
          error: "Qoraalkan wuxuu ku xadgudbay shuruucda bulshada. Fadlan bedel qoraalka.",
          moderation: {
            violationType: moderationResult.violationType,
            explanation: "Qoraalkaagu waxa uu ka baxay xadka la oggol yahay. Fadlan iska hubi in uusan ka koobnaan wax aan ku habboonayn bulshada Soomaalida."
          }
        });
      }

      const post = await storage.createParentPost({
        parentId: req.session.parentId!,
        title: (title || "").trim(),
        content: (content || "").trim(),
        visibility,
        audioUrl: audioUrl || null,
      });

      const parent = await storage.getParent(req.session.parentId!);
      
      res.json({
        ...post,
        author: {
          id: parent?.id,
          name: parent?.name,
          picture: parent?.picture,
        },
        images: [],
      });
    } catch (error) {
      console.error("Error creating social post:", error);
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  // List social posts with pagination and optional parentId filter
  app.get("/api/social-posts", async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const cursor = req.query.cursor as string | undefined;
      const parentId = req.query.parentId as string | undefined;

      const posts = await storage.listParentPosts(limit, cursor, parentId);
      
      // Get blocked users list if user is logged in (App Store compliance)
      let blockedUserIds: string[] = [];
      if (req.session.parentId) {
        const blockedUsers = await storage.getBlockedUsers(req.session.parentId);
        blockedUserIds = blockedUsers.map(u => u.id);
        // Also get users who blocked current user
        const blockedByUsers = await storage.getBlockedByUsers(req.session.parentId);
        blockedUserIds = [...blockedUserIds, ...blockedByUsers];
      }
      
      // Get author info and images for each post
      const postsWithDetails = await Promise.all(
        posts.map(async (post) => {
          const [parent, images] = await Promise.all([
            storage.getParent(post.parentId),
            storage.getPostImages(post.id),
          ]);
          return {
            ...post,
            author: {
              id: parent?.id,
              name: parent?.name,
              picture: parent?.picture,
            },
            images,
          };
        })
      );

      // Filter out posts from blocked users
      const filteredPosts = postsWithDetails.filter(post => 
        !blockedUserIds.includes(post.parentId)
      );

      res.json({
        posts: filteredPosts,
        nextCursor: posts.length === limit ? posts[posts.length - 1]?.id : null,
      });
    } catch (error) {
      console.error("Error listing social posts:", error);
      res.status(500).json({ error: "Failed to list posts" });
    }
  });

  // Get latest posts for homepage card
  app.get("/api/social-posts/latest", async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 5, 10);
      const posts = await storage.listLatestParentPosts(limit);
      
      const postsWithDetails = await Promise.all(
        posts.map(async (post) => {
          const [parent, images] = await Promise.all([
            storage.getParent(post.parentId),
            storage.getPostImages(post.id),
          ]);
          return {
            ...post,
            author: {
              id: parent?.id,
              name: parent?.name,
              picture: parent?.picture,
            },
            images,
          };
        })
      );

      res.json(postsWithDetails);
    } catch (error) {
      console.error("Error fetching latest posts:", error);
      res.status(500).json({ error: "Failed to fetch latest posts" });
    }
  });

  // Get single post by ID
  app.get("/api/social-posts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const post = await storage.getParentPostById(id);
      
      if (!post) {
        return res.status(404).json({ error: "Qoraalka lama helin" });
      }

      const [parent, images] = await Promise.all([
        storage.getParent(post.parentId),
        storage.getPostImages(post.id),
      ]);

      res.json({
        ...post,
        author: {
          id: parent?.id,
          name: parent?.name,
          picture: parent?.picture,
        },
        images,
      });
    } catch (error) {
      console.error("Error fetching social post:", error);
      res.status(500).json({ error: "Failed to fetch post" });
    }
  });

  // Delete a post (author or admin only)
  app.delete("/api/social-posts/:id", requireParentAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const post = await storage.getParentPostById(id);
      
      if (!post) {
        return res.status(404).json({ error: "Qoraalka lama helin" });
      }

      const parent = await storage.getParent(req.session.parentId!);
      
      // Only allow author or admin to delete
      if (post.parentId !== req.session.parentId && !parent?.isAdmin) {
        return res.status(403).json({ error: "Ma haysatid oggolaansho" });
      }

      await storage.deleteParentPost(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting social post:", error);
      res.status(500).json({ error: "Failed to delete post" });
    }
  });

  // Update a post (author only)
  app.put("/api/social-posts/:id", requireParentAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { title, content, visibility } = req.body;
      
      const post = await storage.getParentPostById(id);
      
      if (!post) {
        return res.status(404).json({ error: "Qoraalka lama helin" });
      }

      // Only author can edit
      if (post.parentId !== req.session.parentId) {
        return res.status(403).json({ error: "Kaliya qofka qoray ayaa wax ka beddeli kara" });
      }

      if (visibility && !["public", "followers", "private"].includes(visibility)) {
        return res.status(400).json({ error: "Visibility aan la aqoon" });
      }

      const updated = await storage.updateParentPost(id, {
        title: title?.trim(),
        content: content?.trim(),
        visibility,
      });

      if (!updated) {
        return res.status(500).json({ error: "Wax qalad ah ayaa dhacay" });
      }

      const [parent, images] = await Promise.all([
        storage.getParent(post.parentId),
        storage.getPostImages(post.id),
      ]);

      res.json({
        ...updated,
        author: {
          id: parent?.id,
          name: parent?.name,
          picture: parent?.picture,
        },
        images,
      });
    } catch (error) {
      console.error("Error updating social post:", error);
      res.status(500).json({ error: "Failed to update post" });
    }
  });

  // Add image to post
  app.post("/api/social-posts/:id/images", requireParentAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { imageUrl, altText, displayOrder = 0 } = req.body;

      if (!imageUrl) {
        return res.status(400).json({ error: "Sawirka URL-kiisa waa lagama maarmaan" });
      }

      const post = await storage.getParentPostById(id);
      
      if (!post) {
        return res.status(404).json({ error: "Qoraalka lama helin" });
      }

      // Only author can add images
      if (post.parentId !== req.session.parentId) {
        return res.status(403).json({ error: "Kaliya qofka qoray ayaa sawir ku dari kara" });
      }

      const image = await storage.addPostImage({
        postId: id,
        imageUrl,
        altText: altText || null,
        displayOrder: parseInt(displayOrder) || 0,
      });

      res.json(image);
    } catch (error) {
      console.error("Error adding image to post:", error);
      res.status(500).json({ error: "Failed to add image" });
    }
  });

  // Upload image for social post (Google Drive)
  app.post("/api/social-posts/upload-image", requireParentAuth, postImageUpload.single('image'), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "Sawirka lama helin" });
      }

      const timestamp = Date.now();
      const ext = file.originalname.split('.').pop() || 'jpg';
      const fileName = `social_post_${req.session.parentId}_${timestamp}.${ext}`;

      const driveResult = await uploadToGoogleDrive(
        file.buffer,
        fileName,
        file.mimetype,
        await getOrCreateSheekoFolder()
      );

      res.json({ 
        imageUrl: `https://drive.google.com/thumbnail?id=${driveResult.fileId}&sz=w1000`,
        fileId: driveResult.fileId
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ error: "Sawirka lama soo gelin karin" });
    }
  });

  // Upload audio for social post (R2 storage)
  const socialAudioUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
  
  app.post("/api/social-posts/upload-audio", requireParentAuth, socialAudioUpload.single('audio'), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "Audio file waa lagama maarmaan" });
      }

      const allowedMimes = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/x-m4a', 'audio/mp3'];
      if (!allowedMimes.some(m => (file.mimetype || '').includes(m.split('/')[1]))) {
        return res.status(400).json({ error: "Audio format-kan lama taageero" });
      }

      if (!isR2Configured()) {
        return res.status(500).json({ error: "Audio storage not configured" });
      }

      const timestamp = Date.now();
      const ext = (file.mimetype || '').includes('mpeg') || (file.mimetype || '').includes('mp3') ? 'mp3' : 'webm';
      const fileName = `social-audio-${req.session.parentId}_${timestamp}.${ext}`;

      const r2Result = await uploadToR2(
        file.buffer,
        fileName,
        file.mimetype || 'audio/webm',
        'social-audio',
        'dhambaal'
      );

      res.json({ audioUrl: r2Result.url });
    } catch (error) {
      console.error("Error uploading social audio:", error);
      res.status(500).json({ error: "Audio-ga lama soo gelin karin" });
    }
  });

  // ============================================
  // POST REACTIONS API
  // ============================================

  // Get reactions for a post
  app.get("/api/social-posts/:id/reactions", async (req, res) => {
    try {
      const { id } = req.params;
      const parentId = req.session.parentId;
      
      const reactions = parentId 
        ? await storage.getPostReactionsWithParent(id, parentId)
        : await storage.getPostReactions(id);
      
      res.json(reactions);
    } catch (error) {
      console.error("Error fetching reactions:", error);
      res.status(500).json({ error: "Failed to fetch reactions" });
    }
  });

  // Toggle reaction on a post (like, dislike, love, haha, wow, sad, angry)
  app.post("/api/social-posts/:id/reactions", requireParentAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { reactionType } = req.body;
      
      const validReactions = ['like', 'dislike', 'love', 'haha', 'wow', 'sad', 'angry'];
      if (!reactionType || !validReactions.includes(reactionType)) {
        return res.status(400).json({ error: "Reaction-ka aan la aqoon" });
      }

      const result = await storage.togglePostReaction(id, req.session.parentId!, reactionType);
      res.json(result);
    } catch (error) {
      console.error("Error toggling reaction:", error);
      res.status(500).json({ error: "Failed to toggle reaction" });
    }
  });

  // ============================================
  // POST COMMENTS API
  // ============================================

  // Get comments for a post
  app.get("/api/social-posts/:id/comments", async (req, res) => {
    try {
      const { id } = req.params;
      const comments = await storage.getPostComments(id);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // Add comment to a post (supports nested replies via parentCommentId)
  app.post("/api/social-posts/:id/comments", requireParentAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { body, parentCommentId } = req.body;

      if (!body || !body.trim()) {
        return res.status(400).json({ error: "Faallo waa lagama maarmaan" });
      }

      // AI Content Moderation for comments (App Store Compliance)
      const moderationResult = await moderateContent(body);
      
      if (moderationResult.isFlagged && moderationResult.confidenceScore >= 0.7) {
        console.log(`[AI Moderation] Blocked comment from parent ${req.session.parentId} on post ${id}: ${moderationResult.violationType}`);
        
        // Generate a draft comment ID for the moderation report
        const draftCommentId = `draft-comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        try {
          await storage.createAiModerationReport({
            contentType: "post_comment",
            contentId: draftCommentId,
            userId: req.session.parentId!,
            originalContent: body.substring(0, 500),
            violationType: moderationResult.violationType || "unknown",
            confidenceScore: moderationResult.confidenceScore,
            aiExplanation: moderationResult.explanation || null,
            actionTaken: "hidden",
            status: "pending"
          });
        } catch (e) {
          console.error("Error saving moderation report:", e);
        }
        
        return res.status(400).json({ 
          error: "Faalladaani waxay ku xadgubtay shuruucda bulshada.",
          moderation: {
            violationType: moderationResult.violationType
          }
        });
      }

      const comment = await storage.createPostComment({
        postId: id,
        parentId: req.session.parentId!,
        body: body.trim(),
        parentCommentId: parentCommentId || null,
      });

      await storage.incrementCommentCount(id);

      const parent = await storage.getParent(req.session.parentId!);
      res.json({
        ...comment,
        author: {
          id: parent?.id,
          name: parent?.name || 'Waalid',
          picture: parent?.picture,
        },
        replies: [],
      });
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // Upload image for a comment
  app.post("/api/social-posts/:postId/comments/:commentId/images", requireParentAuth, postImageUpload.single('image'), async (req, res) => {
    try {
      const { commentId } = req.params;
      
      if (!req.file) {
        return res.status(400).json({ error: "Sawir ma la soo dirin" });
      }

      const driveResult = await uploadToGoogleDrive(req.file.buffer, req.file.originalname, req.file.mimetype);
      const imageUrl = driveResult.webContentLink;
      
      await storage.addCommentImage({
        commentId,
        imageUrl,
        storageKey: null,
        displayOrder: 0,
      });

      res.json({ imageUrl });
    } catch (error) {
      console.error("Error uploading comment image:", error);
      res.status(500).json({ error: "Failed to upload image" });
    }
  });

  // Update a comment
  app.put("/api/social-posts/:postId/comments/:commentId", requireParentAuth, async (req, res) => {
    try {
      const { commentId } = req.params;
      const { body } = req.body;

      if (!body || !body.trim()) {
        return res.status(400).json({ error: "Faallo waa lagama maarmaan" });
      }

      const updated = await storage.updatePostComment(commentId, req.session.parentId!, body.trim());
      
      if (!updated) {
        return res.status(404).json({ error: "Faallada lama helin ama ma lihid fasax" });
      }

      const parent = await storage.getParent(req.session.parentId!);
      res.json({
        ...updated,
        author: {
          id: parent?.id,
          name: parent?.name || 'Waalid',
          picture: parent?.picture,
        },
      });
    } catch (error) {
      console.error("Error updating comment:", error);
      res.status(500).json({ error: "Failed to update comment" });
    }
  });

  // Delete a comment
  app.delete("/api/social-posts/:postId/comments/:commentId", requireParentAuth, async (req, res) => {
    try {
      const { postId, commentId } = req.params;

      await storage.deletePostComment(commentId, req.session.parentId!);
      await storage.decrementCommentCount(postId);

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  // Get comment reactions
  app.get("/api/social-posts/:postId/comments/:commentId/reactions", async (req, res) => {
    try {
      const { commentId } = req.params;
      const parentId = req.session.parentId;
      const result = await storage.getCommentReactions(commentId, parentId);
      res.json(result);
    } catch (error) {
      console.error("Error getting comment reactions:", error);
      res.status(500).json({ error: "Failed to get comment reactions" });
    }
  });

  // Toggle comment reaction
  app.post("/api/social-posts/:postId/comments/:commentId/reactions", requireParentAuth, async (req, res) => {
    try {
      const { commentId } = req.params;
      const { reactionType } = req.body;

      if (!reactionType) {
        return res.status(400).json({ error: "Reaction type is required" });
      }

      const result = await storage.toggleCommentReaction(commentId, req.session.parentId!, reactionType);
      res.json(result);
    } catch (error) {
      console.error("Error toggling comment reaction:", error);
      res.status(500).json({ error: "Failed to toggle comment reaction" });
    }
  });

  // Generic comment reactions (for bedtime stories and parent messages comments)
  app.get("/api/comments/:commentId/reactions", async (req, res) => {
    try {
      const { commentId } = req.params;
      const parentId = req.session?.parentId;
      // Directly query the commentReactions table for content comments
      const reactions = await db.select({
        reactionType: commentReactions.reactionType,
        count: sql<number>`count(*)::int`,
      })
        .from(commentReactions)
        .where(eq(commentReactions.commentId, commentId))
        .groupBy(commentReactions.reactionType);
      
      const counts: Record<string, number> = { love: 0, like: 0, dislike: 0, sparkle: 0 };
      for (const r of reactions) {
        counts[r.reactionType] = r.count;
      }
      
      let userReaction: string | null = null;
      if (parentId) {
        const [existing] = await db.select({ reactionType: commentReactions.reactionType })
          .from(commentReactions)
          .where(and(
            eq(commentReactions.parentId, parentId),
            eq(commentReactions.commentId, commentId)
          ));
        userReaction = existing?.reactionType || null;
      }
      
      res.json({ counts, userReaction });
    } catch (error) {
      console.error("Error getting comment reactions:", error);
      res.status(500).json({ error: "Failed to get comment reactions" });
    }
  });

  app.post("/api/comments/:commentId/reactions", requireParentAuth, async (req, res) => {
    try {
      const { commentId } = req.params;
      const { reactionType } = req.body;
      if (!reactionType) {
        return res.status(400).json({ error: "Reaction type is required" });
      }
      // Use upsertCommentReaction for content comments (bedtime stories, parent messages)
      const result = await storage.upsertCommentReaction(req.session.parentId!, commentId, reactionType);
      res.json({ success: true, reaction: result });
    } catch (error) {
      console.error("Error toggling comment reaction:", error);
      res.status(500).json({ error: "Failed to toggle comment reaction" });
    }
  });

  app.delete("/api/comments/:commentId/reactions", requireParentAuth, async (req, res) => {
    try {
      const { commentId } = req.params;
      await storage.removeCommentReaction(req.session.parentId!, commentId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing comment reaction:", error);
      res.status(500).json({ error: "Failed to remove comment reaction" });
    }
  });

  // Mark a lesson as complete
  app.post("/api/lessons/:lessonId/complete", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { lessonId } = req.params;
      const lesson = await storage.getLesson(lessonId);
      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }

      // Check if lesson is unlocked
      const unlockStatus = await storage.checkLessonUnlocked(req.session.parentId, lesson);
      if (!unlockStatus.unlocked) {
        return res.status(403).json({ 
          error: "Lesson is locked", 
          reason: unlockStatus.reason,
          unlockDate: unlockStatus.unlockDate
        });
      }

      // Video watch requirement removed - parents can now proceed to next lesson without watching 80% of the video

      const progress = await storage.markLessonComplete(
        req.session.parentId,
        lessonId,
        lesson.courseId
      );
      
      if ('error' in progress) {
        return res.status(403).json({ 
          error: progress.error, 
          code: (progress as any).code || undefined,
          message: progress.error 
        });
      }

      // Update learning streak when lesson is completed
      let streakData = null;
      try {
        streakData = await storage.updateStreak(req.session.parentId);
      } catch (streakError) {
        console.error("Error updating streak:", streakError);
      }

      // Award points for lesson completion (10 points per lesson)
      let pointsAwarded = 0;
      try {
        await storage.addPoints(req.session.parentId, 10, "lesson_complete");
        pointsAwarded = 10;
        
        // Bonus points for streak milestones
        if (streakData?.streakUpdated && streakData.currentStreak > 0) {
          if (streakData.currentStreak === 7) {
            await storage.addPoints(req.session.parentId, 50, "streak_7_days");
            pointsAwarded += 50;
          } else if (streakData.currentStreak === 30) {
            await storage.addPoints(req.session.parentId, 200, "streak_30_days");
            pointsAwarded += 200;
          }
        }
      } catch (pointsError) {
        console.error("Error awarding points:", pointsError);
      }

      // Automatic badge awarding
      const awardedBadges: string[] = [];
      let courseCompleted = false;
      try {
        // Get all badges
        const allBadges = await storage.getBadges();
        
        // Check for first lesson badge
        const firstLessonBadge = allBadges.find(b => b.triggerType === "first_lesson");
        if (firstLessonBadge) {
          const awarded = await storage.awardBadge(req.session.parentId, firstLessonBadge.id);
          if (awarded) awardedBadges.push(firstLessonBadge.name);
        }

        // Check for lessons completed count badge
        const completedCount = await storage.getCompletedLessonsCount(req.session.parentId);
        const lessonsCountBadges = allBadges.filter(b => b.triggerType === "lessons_complete");
        for (const badge of lessonsCountBadges) {
          if (badge.triggerValue && completedCount >= parseInt(badge.triggerValue)) {
            const awarded = await storage.awardBadge(req.session.parentId, badge.id);
            if (awarded) awardedBadges.push(badge.name);
          }
        }

        // Check for course complete badge
        const courseLessons = await storage.getLessonsByCourseId(lesson.courseId);
        const courseProgress = await storage.getProgressByParentId(req.session.parentId);
        const completedLessonsInCourse = courseProgress.filter(
          p => p.courseId === lesson.courseId && p.completed
        ).length;
        
        if (completedLessonsInCourse >= courseLessons.length) {
          courseCompleted = true;
          const courseCompleteBadge = allBadges.find(b => b.triggerType === "course_complete");
          if (courseCompleteBadge) {
            const awarded = await storage.awardBadge(req.session.parentId, courseCompleteBadge.id);
            if (awarded) awardedBadges.push(courseCompleteBadge.name);
          }
        }
      } catch (badgeError) {
        console.error("Error awarding badges:", badgeError);
      }
      
      res.json({ ...progress, awardedBadges, streak: streakData, pointsAwarded, courseCompleted });
    } catch (error) {
      console.error("Error marking lesson complete:", error);
      res.status(500).json({ error: "Failed to mark lesson complete" });
    }
  });

  // Get parent's points
  app.get("/api/parent/points", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const points = await storage.getPoints(req.session.parentId);
      res.json({ points });
    } catch (error) {
      console.error("Error fetching points:", error);
      res.status(500).json({ error: "Failed to fetch points" });
    }
  });

  // Get leaderboard (top parents by points)
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const leaderboard = await storage.getLeaderboard(Math.min(limit, 50));
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  // Check if a lesson is unlocked
  app.get("/api/lessons/:lessonId/unlock-status", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { lessonId } = req.params;
      const lesson = await storage.getLesson(lessonId);
      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }

      const status = await storage.checkLessonUnlocked(req.session.parentId, lesson);
      res.json(status);
    } catch (error) {
      console.error("Error checking lesson unlock:", error);
      res.status(500).json({ error: "Failed to check lesson unlock status" });
    }
  });

  // Update video watch progress
  app.post("/api/lessons/:lessonId/video-progress", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { lessonId } = req.params;
      const { percent } = req.body;
      
      if (typeof percent !== 'number' || percent < 0 || percent > 100) {
        return res.status(400).json({ error: "Invalid percent value" });
      }

      const lesson = await storage.getLesson(lessonId);
      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }

      const progress = await storage.updateVideoProgress(
        req.session.parentId,
        lessonId,
        lesson.courseId,
        Math.round(percent)
      );
      res.json(progress);
    } catch (error) {
      console.error("Error updating video progress:", error);
      res.status(500).json({ error: "Failed to update video progress" });
    }
  });

  // Update last viewed timestamp when lesson is opened
  app.post("/api/lessons/:lessonId/viewed", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { lessonId } = req.params;
      const lesson = await storage.getLesson(lessonId);
      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }

      const progress = await storage.updateLastViewed(
        req.session.parentId,
        lessonId,
        lesson.courseId
      );
      res.json(progress);
    } catch (error) {
      console.error("Error updating last viewed:", error);
      res.status(500).json({ error: "Failed to update last viewed" });
    }
  });

  // Update video playback position for resume
  app.post("/api/lessons/:lessonId/video-position", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { lessonId } = req.params;
      const { position } = req.body;
      
      if (typeof position !== 'number' || position < 0) {
        return res.status(400).json({ error: "Invalid position value" });
      }

      const lesson = await storage.getLesson(lessonId);
      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }

      const progress = await storage.updateVideoPosition(
        req.session.parentId,
        lessonId,
        lesson.courseId,
        Math.round(position)
      );
      res.json(progress);
    } catch (error) {
      console.error("Error updating video position:", error);
      res.status(500).json({ error: "Failed to update video position" });
    }
  });

  // Sync offline progress (for PWA offline mode)
  app.post("/api/lessons/progress/sync", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { lessonId, progress, completed } = req.body;
      
      if (typeof lessonId !== 'number' || lessonId < 1) {
        return res.status(400).json({ error: "Invalid lesson ID" });
      }

      const lesson = await storage.getLesson(lessonId.toString());
      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }

      if (typeof progress === 'number' && progress >= 0 && progress <= 100) {
        await storage.updateVideoProgress(
          req.session.parentId,
          lessonId.toString(),
          lesson.courseId,
          Math.round(progress)
        );
      }

      if (completed === true) {
        await storage.markLessonComplete(req.session.parentId, lesson.id, lesson.courseId);
      }

      res.json({ success: true, synced: true });
    } catch (error) {
      console.error("Error syncing offline progress:", error);
      res.status(500).json({ error: "Failed to sync progress" });
    }
  });

  // Search courses and lessons
  app.get("/api/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.trim().length < 2) {
        return res.json({ courses: [], lessons: [] });
      }
      const results = await storage.searchCoursesAndLessons(query.trim());
      res.json(results);
    } catch (error) {
      console.error("Error searching:", error);
      res.status(500).json({ error: "Failed to search" });
    }
  });

  // Course reviews
  app.get("/api/courses/:courseId/reviews", async (req, res) => {
    try {
      const { courseId } = req.params;
      const course = await storage.getCourseByCourseId(courseId);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }
      const reviews = await storage.getCourseReviews(course.id);
      const rating = await storage.getCourseAverageRating(course.id);
      res.json({ reviews, ...rating });
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  app.post("/api/courses/:courseId/reviews", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { courseId } = req.params;
      const { rating, review } = req.body;
      
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Rating must be between 1 and 5" });
      }

      const course = await storage.getCourseByCourseId(courseId);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      const newReview = await storage.createCourseReview({
        courseId: course.id,
        parentId: req.session.parentId,
        rating,
        review: review || null,
      });
      res.json(newReview);
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(500).json({ error: "Failed to create review" });
    }
  });

  // Push notification endpoints
  app.get("/api/push/vapid-key", (req, res) => {
    if (!pushNotificationsEnabled) {
      return res.json({ enabled: false, publicKey: null });
    }
    res.json({ enabled: true, publicKey: process.env.VAPID_PUBLIC_KEY });
  });

  app.post("/api/push/subscribe", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!pushNotificationsEnabled) {
      return res.json({ success: false, enabled: false, message: "Push notifications not configured on server" });
    }

    try {
      const { endpoint, keys } = req.body;
      
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ error: "Invalid subscription data" });
      }

      await storage.savePushSubscription({
        parentId: req.session.parentId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error saving push subscription:", error);
      res.status(500).json({ error: "Failed to save subscription" });
    }
  });

  // Admin-only: Broadcast push notification with targeting options
  app.post("/api/push/broadcast-all", async (req, res) => {
    const parentId = (req.session as any)?.parentId;
    if (!parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const admin = await storage.getParent(parentId);
    if (!admin?.isAdmin) {
      return res.status(403).json({ error: "Admin only" });
    }

    if (!pushNotificationsEnabled) {
      return res.status(400).json({ error: "Push notifications not configured on server" });
    }

    const broadcastSchema = z.object({
      title: z.string().min(1).max(200).optional(),
      body: z.string().min(1).max(1000).optional(),
      url: z.string().max(500).optional(),
      targetAudience: z.enum(["all", "inactive_24h", "enrolled", "free_users"]).optional(),
    });

    const parsed = broadcastSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request data", details: parsed.error.flatten() });
    }

    const { title, body: bodyText, url, targetAudience } = parsed.data;

    const finalTitle = title?.trim() || "Waan ku xiisannay! 💙";
    const finalBody = bodyText?.trim() || "Waalidiin badan ayaa hadda ku jira BarbaarintaSan, adigana waan kuu baahanahay. Fadlan kusoo noqo app-ka si aad wakhtiga waxbarashada uga faa'iidaysato.";
    const finalUrl = url?.trim() || "/";
    const audience = targetAudience || "all";

    try {
      const parentIds: { id: string; aiPlan: string | null; lastActiveAt: Date | null }[] = await db
        .select({ id: parents.id, aiPlan: parents.aiPlan, lastActiveAt: parents.lastActiveAt })
        .from(parents);

      let targetParentIds: string[];

      if (audience === "inactive_24h") {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        targetParentIds = parentIds.filter(p => !p.lastActiveAt || new Date(p.lastActiveAt) < oneDayAgo).map(p => p.id);
      } else if (audience === "enrolled") {
        const enrolledParentIds = await db.execute(sql`SELECT DISTINCT parent_id FROM enrollments`);
        const enrolledIds = new Set((enrolledParentIds.rows as any[]).map(r => r.parent_id));
        targetParentIds = parentIds.filter(p => enrolledIds.has(p.id)).map(p => p.id);
      } else if (audience === "free_users") {
        targetParentIds = parentIds.filter(p => p.aiPlan === "free" || p.aiPlan === "trial").map(p => p.id);
      } else {
        targetParentIds = parentIds.map(p => p.id);
      }

      const uniqueIds = Array.from(new Set(targetParentIds));
      console.log(`[PUSH BROADCAST] Starting broadcast to ${uniqueIds.length} parents (${audience})`);

      let sentCount = 0;
      let failCount = 0;
      let noSubCount = 0;
      const BATCH_SIZE = 10;
      const payload = JSON.stringify({ title: finalTitle, body: finalBody, url: finalUrl });

      for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
        const batchIds = uniqueIds.slice(i, i + BATCH_SIZE);

        const batchSubs = await db.select().from(pushSubscriptions).where(
          sql`${pushSubscriptions.parentId} IN (${sql.join(batchIds.map(id => sql`${id}`), sql`, `)})`
        );

        const subsByParent = new Map<string, typeof batchSubs>();
        for (const sub of batchSubs) {
          if (!subsByParent.has(sub.parentId)) subsByParent.set(sub.parentId, []);
          subsByParent.get(sub.parentId)!.push(sub);
        }

        const notifPromises = batchIds.map(pid =>
          storage.createParentNotification({
            parentId: pid,
            title: finalTitle,
            body: finalBody,
            type: "engagement",
            payload: JSON.stringify({ url: finalUrl }),
          }).catch(() => {})
        );
        await Promise.all(notifPromises);

        for (const pid of batchIds) {
          const subs = subsByParent.get(pid) || [];
          if (subs.length === 0) { noSubCount++; continue; }

          const pushPromises = subs.map(sub =>
            webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload,
            ).then(() => { sentCount++; }).catch(async (err: any) => {
              if (err.statusCode === 410 || err.statusCode === 404) {
                await storage.deletePushSubscription(pid, sub.endpoint).catch(() => {});
              }
              failCount++;
            })
          );
          await Promise.all(pushPromises);
        }
      }

      const report = {
        totalUsers: uniqueIds.length,
        sentSuccessfully: sentCount,
        failed: failCount,
        noSubscription: noSubCount,
      };

      await db.insert(pushBroadcastLogs).values({
        adminId: parentId,
        title: finalTitle,
        body: finalBody,
        url: finalUrl,
        targetAudience: audience,
        totalTargeted: report.totalUsers,
        sentSuccessfully: report.sentSuccessfully,
        failed: report.failed,
        noSubscription: report.noSubscription,
      });

      console.log(`[PUSH BROADCAST] Admin ${admin.name} broadcast done (${audience}): Total=${report.totalUsers}, Sent=${report.sentSuccessfully}, Failed=${report.failed}, NoSub=${report.noSubscription}`);

      res.json({ success: true, report });
    } catch (error) {
      console.error("[PUSH BROADCAST] Error:", error);
      res.status(500).json({ error: "Failed to send broadcast" });
    }
  });

  // Admin-only: Get broadcast notification history
  app.get("/api/push/broadcast-history", async (req, res) => {
    const parentId = (req.session as any)?.parentId;
    if (!parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const admin = await storage.getParent(parentId);
    if (!admin?.isAdmin) {
      return res.status(403).json({ error: "Admin only" });
    }

    try {
      const logs = await db.select().from(pushBroadcastLogs).orderBy(sql`created_at DESC`).limit(50);
      res.json(logs);
    } catch (error) {
      console.error("[PUSH BROADCAST] Error fetching history:", error);
      res.status(500).json({ error: "Failed to fetch broadcast history" });
    }
  });

  // Admin-only: Get audience stats for targeting
  app.get("/api/push/audience-stats", async (req, res) => {
    const parentId = (req.session as any)?.parentId;
    if (!parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const admin = await storage.getParent(parentId);
    if (!admin?.isAdmin) {
      return res.status(403).json({ error: "Admin only" });
    }

    try {
      const allParents = await db.select().from(parents);
      const allSubscriptions = await db.select().from(pushSubscriptions);
      const subscribedParentIds = new Set(allSubscriptions.map(s => s.parentId));

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const inactiveParents = allParents.filter(p => !p.lastActiveAt || new Date(p.lastActiveAt) < oneDayAgo);

      const enrolledResult = await db.execute(sql`SELECT DISTINCT parent_id FROM enrollments`);
      const enrolledIds = new Set((enrolledResult.rows as any[]).map(r => r.parent_id));
      const enrolledParents = allParents.filter(p => enrolledIds.has(p.id));

      const freeUsers = allParents.filter(p => p.aiPlan === "free" || p.aiPlan === "trial");

      res.json({
        all: { total: allParents.length, withPush: allParents.filter(p => subscribedParentIds.has(p.id)).length },
        inactive_24h: { total: inactiveParents.length, withPush: inactiveParents.filter(p => subscribedParentIds.has(p.id)).length },
        enrolled: { total: enrolledParents.length, withPush: enrolledParents.filter(p => subscribedParentIds.has(p.id)).length },
        free_users: { total: freeUsers.length, withPush: freeUsers.filter(p => subscribedParentIds.has(p.id)).length },
      });
    } catch (error) {
      console.error("[PUSH BROADCAST] Error fetching audience stats:", error);
      res.status(500).json({ error: "Failed to fetch audience stats" });
    }
  });

  app.delete("/api/push/unsubscribe", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { endpoint } = req.body;
      // Delete from database first, then allow frontend to unsubscribe from browser
      await storage.deletePushSubscription(req.session.parentId, endpoint);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing push subscription:", error);
      res.status(500).json({ error: "Failed to remove subscription" });
    }
  });

  // Admin endpoint to get all push subscriptions with parent info
  app.get("/api/push/subscriptions", requireAuth, async (req, res) => {
    try {
      const subscriptions = await storage.getAllPushSubscriptions();
      // Get unique parent IDs and fetch their info
      const parentIds = Array.from(new Set(subscriptions.map(s => s.parentId)));
      const subscribersWithInfo = await Promise.all(
        parentIds.map(async (parentId) => {
          const parent = await storage.getParent(parentId);
          return {
            parentId,
            name: parent?.name || "Unknown",
            email: parent?.email || "",
            picture: parent?.picture || null,
            subscriptionCount: subscriptions.filter(s => s.parentId === parentId).length,
            createdAt: subscriptions.find(s => s.parentId === parentId)?.createdAt
          };
        })
      );
      res.json(subscribersWithInfo);
    } catch (error) {
      console.error("Error fetching push subscriptions:", error);
      res.status(500).json({ error: "Failed to fetch subscriptions" });
    }
  });

  // Admin endpoint to send push notification to all or specific subscribers
  app.post("/api/push/send", requireAuth, async (req, res) => {
    if (!pushNotificationsEnabled) {
      return res.status(503).json({ error: "Push notifications not configured" });
    }

    try {
      const { title, body, url, parentIds } = req.body;
      
      if (!title || !body) {
        return res.status(400).json({ error: "Title and body are required" });
      }

      let subscriptions = await storage.getAllPushSubscriptions();
      
      // Filter to specific parents if parentIds provided
      if (parentIds && Array.isArray(parentIds) && parentIds.length > 0) {
        // Validate that all parentIds are strings
        const validParentIds = parentIds.filter((id: any) => typeof id === 'string');
        if (validParentIds.length > 0) {
          subscriptions = subscriptions.filter(sub => validParentIds.includes(sub.parentId));
        }
      }
      
      // Get unique parent IDs to save notifications
      const uniqueParentIds = Array.from(new Set(subscriptions.map(sub => sub.parentId)));
      
      // Save notifications to inbox for each parent
      for (const parentId of uniqueParentIds) {
        await storage.createParentNotification({
          parentId,
          title,
          body,
          type: "announcement",
          payload: url ? JSON.stringify({ url }) : null,
        });
      }
      
      const results = await Promise.allSettled(
        subscriptions.map(async (sub) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
              },
              JSON.stringify({ title, body, url: url || null })
            );
            return { success: true };
          } catch (err: any) {
            if (err.statusCode === 410 || err.statusCode === 404) {
              await storage.deletePushSubscription(sub.parentId, sub.endpoint);
            }
            return { success: false, error: err.message };
          }
        })
      );

      const sent = results.filter((r) => r.status === 'fulfilled' && (r.value as any).success).length;
      res.json({ sent, total: subscriptions.length, savedToInbox: uniqueParentIds.length });
    } catch (error) {
      console.error("Error sending push notifications:", error);
      res.status(500).json({ error: "Failed to send notifications" });
    }
  });

  // Get course progress with unlock status for all lessons
  app.get("/api/course/:courseId/progress", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { courseId } = req.params;
      const lessons = await storage.getLessonsByCourseId(courseId);
      const progressList = await storage.getAllLessonProgress(req.session.parentId, courseId);
      
      const lessonsWithStatus = await Promise.all(
        lessons.sort((a, b) => a.order - b.order).map(async (lesson) => {
          const progress = progressList.find(p => p.lessonId === lesson.id);
          const unlockStatus = await storage.checkLessonUnlocked(req.session.parentId!, lesson);
          
          return {
            lessonId: lesson.id,
            title: lesson.title,
            order: lesson.order,
            completed: progress?.completed || false,
            videoWatchedPercent: progress?.videoWatchedPercent || 0,
            unlocked: unlockStatus.unlocked,
            unlockReason: unlockStatus.reason,
            unlockDate: unlockStatus.unlockDate,
            videoWatchRequired: lesson.videoWatchRequired,
            hasVideo: !!(lesson.videoUrl && lesson.videoUrl.trim() !== ''),
            isFree: lesson.isFree || false,
          };
        })
      );

      const totalLessons = lessonsWithStatus.length;
      const completedLessons = lessonsWithStatus.filter(l => l.completed).length;
      const allCompleted = totalLessons > 0 && completedLessons === totalLessons;

      res.json({
        lessons: lessonsWithStatus,
        totalLessons,
        completedLessons,
        allCompleted,
        progressPercent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
      });
    } catch (error) {
      console.error("Error fetching course progress:", error);
      res.status(500).json({ error: "Failed to fetch course progress" });
    }
  });

  app.get("/api/course/:courseId/access", async (req, res) => {
    const courseId = req.params.courseId;
    
    // Admin always has access (old admin system)
    if (req.session.userId) {
      const user = await storage.getUser(req.session.userId);
      if (user?.isAdmin) {
        return res.json({ hasAccess: true, isAdmin: true });
      }
    }
    
    // Check if logged-in parent is an admin
    if (req.session.parentId) {
      const parent = await storage.getParent(req.session.parentId);
      if (parent?.isAdmin) {
        return res.json({ hasAccess: true, isAdmin: true });
      }
    }
    
    if (!req.session.parentId) {
      return res.json({ hasAccess: false, reason: "not_authenticated" });
    }

    try {
      const enrollment = await storage.getActiveEnrollmentByParentAndCourse(req.session.parentId, courseId);
      if (enrollment) {
        res.json({ hasAccess: true, enrollment });
      } else {
        res.json({ hasAccess: false, reason: "not_enrolled" });
      }
    } catch (error) {
      console.error("Error checking course access:", error);
      res.status(500).json({ error: "Failed to check access" });
    }
  });

  // Course scheduling status (for 0-6 course with daily/weekly limits)
  app.get("/api/courses/:courseId/scheduling", requireParentAuth, async (req, res) => {
    const { courseId } = req.params;
    try {
      const status = await storage.getSchedulingStatus(req.session.parentId!, courseId);
      res.json(status);
    } catch (error) {
      console.error("Error checking scheduling status:", error);
      res.status(500).json({ error: "Failed to check scheduling status" });
    }
  });

  // Course routes
  app.get("/api/courses", async (req, res) => {
    try {
      const lang = req.query.lang as string;
      const cacheKey = `courses-${lang || 'default'}`;
      const courses = await getCached(cacheKey, 60000, async () => {
        let c = await storage.getAllCourses();
        if (lang) {
          c = await applyTranslationsToArray(c, 'course', lang, ['title', 'description', 'comingSoonMessage']);
        }
        return c;
      });
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      res.json(courses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({ error: "Failed to fetch courses" });
    }
  });

  app.get("/api/courses/:id", async (req, res) => {
    try {
      const lang = req.query.lang as string;
      let course = await storage.getCourseByCourseId(req.params.id);
      
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }
      
      // Apply translations if language is specified
      if (lang) {
        course = await applyTranslations(
          course,
          'course',
          course.id,
          lang,
          ['title', 'description', 'comingSoonMessage']
        );
      }
      
      res.json(course);
    } catch (error) {
      console.error("Error fetching course:", error);
      res.status(500).json({ error: "Failed to fetch course" });
    }
  });

  app.post("/api/courses", requireAuth, async (req, res) => {
    try {
      const courseData = insertCourseSchema.parse(req.body);
      const course = await storage.createCourse(courseData);
      res.status(201).json(course);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid course data", details: error.errors });
      }
      console.error("Error creating course:", error);
      res.status(500).json({ error: "Failed to create course" });
    }
  });

  app.patch("/api/courses/:id", requireAuth, async (req, res) => {
    try {
      const course = await storage.updateCourse(req.params.id, req.body);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }
      res.json(course);
    } catch (error) {
      console.error("Error updating course:", error);
      res.status(500).json({ error: "Failed to update course" });
    }
  });

  app.delete("/api/courses/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteCourse(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting course:", error);
      res.status(500).json({ error: "Failed to delete course" });
    }
  });

  // Module routes
  app.get("/api/modules", async (req, res) => {
    try {
      const lang = req.query.lang as string;
      let modulesList = await storage.getAllModules();
      
      // Apply translations if language is specified
      if (lang) {
        modulesList = await applyTranslationsToArray(
          modulesList,
          'module',
          lang,
          ['title']
        );
      }
      
      res.json(modulesList);
    } catch (error) {
      console.error("Error fetching all modules:", error);
      res.status(500).json({ error: "Failed to fetch modules" });
    }
  });

  app.get("/api/courses/:courseId/modules", async (req, res) => {
    try {
      const lang = req.query.lang as string;
      let modulesList = await storage.getModulesByCourseId(req.params.courseId);
      
      // Apply translations if language is specified
      if (lang) {
        modulesList = await applyTranslationsToArray(
          modulesList,
          'module',
          lang,
          ['title']
        );
      }
      
      res.json(modulesList);
    } catch (error) {
      console.error("Error fetching modules:", error);
      res.status(500).json({ error: "Failed to fetch modules" });
    }
  });

  app.post("/api/modules", requireAuth, async (req, res) => {
    try {
      const moduleData = req.body;
      const module = await storage.createModule(moduleData);
      res.status(201).json(module);
    } catch (error) {
      console.error("Error creating module:", error);
      res.status(500).json({ error: "Failed to create module" });
    }
  });

  app.patch("/api/modules/:id", requireAuth, async (req, res) => {
    try {
      const module = await storage.updateModule(req.params.id, req.body);
      if (!module) {
        return res.status(404).json({ error: "Module not found" });
      }
      res.json(module);
    } catch (error) {
      console.error("Error updating module:", error);
      res.status(500).json({ error: "Failed to update module" });
    }
  });

  app.delete("/api/modules/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteModule(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting module:", error);
      res.status(500).json({ error: "Failed to delete module" });
    }
  });

  // Lesson routes
  app.get("/api/lessons", async (req, res) => {
    try {
      const { courseId, lang } = req.query;
      if (courseId && typeof courseId === "string") {
        let lessons = await storage.getLessonsByCourseId(courseId);
        
        // Apply translations if language is specified
        if (lang && typeof lang === "string") {
          lessons = await applyTranslationsToArray(
            lessons,
            'lesson',
            lang,
            ['title', 'description', 'textContent']
          );
        }
        
        return res.json(lessons);
      }
      let lessons = await storage.getAllLessons();
      
      // Apply translations if language is specified
      if (lang && typeof lang === "string") {
        lessons = await applyTranslationsToArray(
          lessons,
          'lesson',
          lang,
          ['title', 'description', 'textContent']
        );
      }
      
      res.json(lessons);
    } catch (error) {
      console.error("Error fetching lessons:", error);
      res.status(500).json({ error: "Failed to fetch lessons" });
    }
  });

  // Get quizzes for a course (for lesson list)
  app.get("/api/courses/:courseId/quizzes", async (req, res) => {
    try {
      const quizzesList = await storage.getQuizzesByCourseId(req.params.courseId);
      res.json(quizzesList);
    } catch (error) {
      console.error("Error fetching course quizzes:", error);
      res.status(500).json({ error: "Failed to fetch quizzes" });
    }
  });

  // Get assignments for a course (for lesson list)
  app.get("/api/courses/:courseId/assignments", async (req, res) => {
    try {
      const assignmentsList = await storage.getAssignmentsByCourseId(req.params.courseId);
      res.json(assignmentsList);
    } catch (error) {
      console.error("Error fetching course assignments:", error);
      res.status(500).json({ error: "Failed to fetch assignments" });
    }
  });

  // Get single assignment by ID
  app.get("/api/assignments/:id", async (req, res) => {
    try {
      const assignment = await storage.getAssignment(req.params.id);
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      console.error("Error fetching assignment:", error);
      res.status(500).json({ error: "Failed to fetch assignment" });
    }
  });

  // Get lesson manifest for offline download (returns lesson data with asset URLs)
  app.get("/api/lessons/:id/offline-manifest", requireParentAuth, async (req, res) => {
    try {
      const lesson = await storage.getLesson(req.params.id);
      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }
      
      // Check subscription access
      const accessCheck = await checkCourseAccess(req.session.parentId!, lesson.courseId);
      if (!accessCheck.hasAccess) {
        return res.status(403).json({ error: "Subscription required for offline download" });
      }
      
      const course = await storage.getCourse(lesson.courseId);
      
      // Build manifest with all downloadable assets
      const manifest = {
        lesson: {
          id: lesson.id,
          title: lesson.title,
          order: lesson.order,
          lessonType: lesson.lessonType,
          videoUrl: lesson.videoUrl,
          textContent: lesson.textContent,
          courseId: lesson.courseId
        },
        course: {
          id: course?.id,
          name: course?.title,
          description: course?.description,
          thumbnailUrl: course?.imageUrl
        },
        assets: [] as string[]
      };
      
      // Add video URL to assets if it exists and is downloadable
      if (lesson.videoUrl && !lesson.videoUrl.includes('youtube') && !lesson.videoUrl.includes('vimeo')) {
        manifest.assets.push(lesson.videoUrl);
      }
      
      res.json(manifest);
    } catch (error) {
      console.error("Error fetching lesson manifest:", error);
      res.status(500).json({ error: "Failed to fetch lesson manifest" });
    }
  });

  app.get("/api/lessons/:id", async (req, res) => {
    try {
      const lang = req.query.lang as string;
      let lesson = await storage.getLesson(req.params.id);
      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }
      
      // Free lessons are accessible to everyone (including guests)
      // Also allow first 5 lessons (by order) for free trial access
      const isFirstFiveLessons = typeof lesson.order === 'number' && lesson.order < 5;
      if (lesson.isFree || isFirstFiveLessons) {
        if (lang) {
          lesson = await applyTranslations(
            lesson,
            'lesson',
            lesson.id,
            lang,
            ['title', 'description', 'textContent']
          );
        }
        return res.json(lesson);
      }
      
      // Non-free lessons require authentication
      if (!req.session.parentId) {
        return res.status(401).json({ 
          error: "Fadlan soo gal si aad u aragto casharkaan",
          requiresAuth: true
        });
      }
      
      // Check subscription access for the course
      const accessCheck = await checkCourseAccess(req.session.parentId, lesson.courseId);
      if (!accessCheck.hasAccess) {
        const course = await storage.getCourse(lesson.courseId);
        return res.status(403).json({ 
          error: "AccessDenied",
          subscriptionExpired: true,
          courseId: lesson.courseId,
          courseSlug: course?.courseId || null
        });
      }
      
      // Check if lesson is schedule-locked (unlocks on specific date)
      const unlockStatus = await storage.checkLessonUnlocked(req.session.parentId, lesson);
      if (!unlockStatus.unlocked) {
        const course = await storage.getCourse(lesson.courseId);
        return res.status(403).json({
          error: unlockStatus.reason || "Casharkani weli ma furan yahay",
          code: "SCHEDULE_LOCKED",
          unlockDate: unlockStatus.unlockDate,
          courseSlug: course?.courseId || null
        });
      }
      
      // Prerequisite check removed - parents can now access any lesson without completing previous ones
      
      // Apply translations if language is specified
      if (lang) {
        lesson = await applyTranslations(
          lesson,
          'lesson',
          lesson.id,
          lang,
          ['title', 'description', 'textContent']
        );
      }
      
      res.json(lesson);
    } catch (error) {
      console.error("Error fetching lesson:", error);
      res.status(500).json({ error: "Failed to fetch lesson" });
    }
  });

  app.post("/api/lessons", requireAuth, async (req, res) => {
    try {
      const { quizData, ...lessonBody } = req.body;
      if (lessonBody.videoUrl) {
        lessonBody.videoUrl = normalizeVideoUrl(lessonBody.videoUrl);
      }
      
      // If quiz data is provided, store questions in textContent as JSON
      if (quizData && (quizData.questions?.length > 0 || quizData.openEndedQuestions?.length > 0)) {
        lessonBody.textContent = JSON.stringify({
          questions: quizData.questions || [],
          openEndedQuestions: quizData.openEndedQuestions || []
        });
        console.log(`Quiz lesson created with ${quizData.questions?.length || 0} MC questions and ${quizData.openEndedQuestions?.length || 0} open-ended questions`);
      }
      
      const lessonData = insertLessonSchema.parse(lessonBody);
      const lesson = await storage.createLesson(lessonData);
      
      // Auto-create calendar event for live lessons (check both isLive flag and lessonType)
      const isLiveLesson = lesson.isLive || lesson.lessonType === "live";
      if (isLiveLesson && lesson.liveDate) {
        try {
          // Parse liveDate (format: "17.1.2026 oo Sabti ah" or "17.1.2026 14:00")
          const dateMatch = lesson.liveDate.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})\s*(\d{1,2})?:?(\d{2})?/);
          if (dateMatch) {
            const [, day, month, year, hour, minute] = dateMatch;
            const scheduledAt = new Date(
              parseInt(year),
              parseInt(month) - 1,
              parseInt(day),
              hour ? parseInt(hour) : 10,
              minute ? parseInt(minute) : 0
            );
            
            await storage.createLiveEvent({
              title: lesson.title,
              description: `Casharka Live: ${lesson.title}`,
              eventType: "webinar",
              courseId: lesson.courseId,
              lessonId: lesson.id,
              scheduledAt,
              duration: 60,
              meetingUrl: lesson.liveUrl || undefined,
              isPublished: true,
            });
            console.log(`Auto-created calendar event for live lesson: ${lesson.title}`);
          }
        } catch (eventError) {
          console.error("Error creating calendar event for live lesson:", eventError);
        }
      }
      
      res.status(201).json(lesson);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid lesson data", details: error.errors });
      }
      console.error("Error creating lesson:", error);
      res.status(500).json({ error: "Failed to create lesson" });
    }
  });

  app.patch("/api/lessons/:id", requireAuth, async (req, res) => {
    try {
      const { quizData, ...updateData } = req.body;
      if (updateData.videoUrl !== undefined) {
        updateData.videoUrl = normalizeVideoUrl(updateData.videoUrl);
      }
      
      // If quiz data is provided, store questions in textContent as JSON
      if (quizData && (quizData.questions?.length > 0 || quizData.openEndedQuestions?.length > 0)) {
        updateData.textContent = JSON.stringify({
          questions: quizData.questions || [],
          openEndedQuestions: quizData.openEndedQuestions || []
        });
        console.log(`Quiz lesson updated with ${quizData.questions?.length || 0} MC questions and ${quizData.openEndedQuestions?.length || 0} open-ended questions`);
      }
      
      const lesson = await storage.updateLesson(req.params.id, updateData);
      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }

      // Sync calendar event for live lessons
      const isLiveLesson = lesson.isLive || lesson.lessonType === "live";
      const existingEvent = await storage.getLiveEventByLessonId(lesson.id);
      
      if (isLiveLesson && lesson.liveDate) {
        try {
          const dateMatch = lesson.liveDate.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})\s*(\d{1,2})?:?(\d{2})?/);
          if (dateMatch) {
            const [, day, month, year, hour, minute] = dateMatch;
            const scheduledAt = new Date(
              parseInt(year),
              parseInt(month) - 1,
              parseInt(day),
              hour ? parseInt(hour) : 10,
              minute ? parseInt(minute) : 0
            );
            
            if (existingEvent) {
              // Update existing calendar event
              await storage.updateLiveEvent(existingEvent.id, {
                title: lesson.title,
                scheduledAt,
                meetingUrl: lesson.liveUrl || undefined,
              });
              console.log(`Updated calendar event for live lesson: ${lesson.title}`);
            } else {
              // Create new calendar event
              await storage.createLiveEvent({
                title: lesson.title,
                description: `Casharka Live: ${lesson.title}`,
                eventType: "webinar",
                courseId: lesson.courseId,
                lessonId: lesson.id,
                scheduledAt,
                duration: 60,
                meetingUrl: lesson.liveUrl || undefined,
                isPublished: true,
              });
              console.log(`Created calendar event for live lesson: ${lesson.title}`);
            }
          }
        } catch (eventError) {
          console.error("Error syncing calendar event:", eventError);
        }
      } else if (existingEvent) {
        // Lesson is no longer live, remove the calendar event
        await storage.deleteLiveEventByLessonId(lesson.id);
        console.log(`Removed calendar event for lesson: ${lesson.title}`);
      }

      res.json(lesson);
    } catch (error) {
      console.error("Error updating lesson:", error);
      res.status(500).json({ error: "Failed to update lesson" });
    }
  });

  app.delete("/api/lessons/:id", requireAuth, async (req, res) => {
    try {
      // Delete associated calendar event if it exists
      await storage.deleteLiveEventByLessonId(req.params.id);
      await storage.deleteLesson(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting lesson:", error);
      res.status(500).json({ error: "Failed to delete lesson" });
    }
  });

  // Reorder lessons within a course
  app.patch("/api/courses/:courseId/lessons/reorder", requireAuth, async (req, res) => {
    try {
      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds)) {
        return res.status(400).json({ error: "orderedIds must be an array" });
      }
      await storage.reorderLessons(req.params.courseId, orderedIds);
      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering lessons:", error);
      res.status(500).json({ error: "Failed to reorder lessons" });
    }
  });

  // Quiz routes
  app.get("/api/quizzes/:lessonId", async (req, res) => {
    try {
      const quizzes = await storage.getQuizzesByLessonId(req.params.lessonId);
      res.json(quizzes);
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      res.status(500).json({ error: "Failed to fetch quizzes" });
    }
  });

  app.get("/api/quiz/:id", async (req, res) => {
    try {
      const lang = req.query.lang as string;
      const quiz = await storage.getQuiz(req.params.id);
      if (!quiz) {
        return res.status(404).json({ error: "Quiz not found" });
      }
      let questions = await storage.getQuizQuestions(req.params.id);
      
      // Apply translations if language is specified
      if (lang) {
        questions = await applyTranslationsToArray(
          questions,
          'quiz_question',
          lang,
          ['question', 'options', 'explanation']
        );
      }
      
      res.json({ ...quiz, questions });
    } catch (error) {
      console.error("Error fetching quiz:", error);
      res.status(500).json({ error: "Failed to fetch quiz" });
    }
  });

  app.post("/api/quizzes", requireAuth, async (req, res) => {
    try {
      const quizData = insertQuizSchema.parse(req.body);
      const quiz = await storage.createQuiz(quizData);
      res.status(201).json(quiz);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid quiz data", details: error.errors });
      }
      console.error("Error creating quiz:", error);
      res.status(500).json({ error: "Failed to create quiz" });
    }
  });

  app.delete("/api/quizzes/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteQuiz(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting quiz:", error);
      res.status(500).json({ error: "Failed to delete quiz" });
    }
  });

  // Quiz Question routes
  app.post("/api/quiz-questions", requireAuth, async (req, res) => {
    try {
      const questionData = insertQuizQuestionSchema.parse(req.body);
      const question = await storage.createQuizQuestion(questionData);
      res.status(201).json(question);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid question data", details: error.errors });
      }
      console.error("Error creating question:", error);
      res.status(500).json({ error: "Failed to create question" });
    }
  });

  app.delete("/api/quiz-questions/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteQuizQuestion(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting question:", error);
      res.status(500).json({ error: "Failed to delete question" });
    }
  });

  // Get receipt validation attempts for a parent/course combo (server-side tracking)
  app.get("/api/receipt-attempts/:courseId", async (req, res) => {
    try {
      const parentId = req.session?.parentId;
      if (!parentId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const attempt = await storage.getReceiptAttempts(parentId, req.params.courseId);
      return res.json({ 
        attemptCount: attempt?.attemptCount || 0,
        lastAttemptAt: attempt?.lastAttemptAt || null
      });
    } catch (error) {
      console.error("Error fetching receipt attempts:", error);
      return res.json({ attemptCount: 0, lastAttemptAt: null });
    }
  });

  // Receipt validation endpoint using AI Vision (requires parent auth)
  app.post("/api/validate-receipt", requireParentAuth, async (req, res) => {
    try {
      const { screenshotUrl, courseId, paymentMethodId, customerName, customerPhone, customerEmail, planType } = req.body;
      
      if (!screenshotUrl) {
        return res.status(400).json({ 
          valid: false, 
          error: "Sawirka rasiidka ma jiro" 
        });
      }
      
      if (!courseId) {
        return res.status(400).json({ 
          valid: false, 
          error: "Course ID ma jiro" 
        });
      }
      
      // Check if we have payment details for auto-approval
      const canAutoApprove = paymentMethodId && customerName && customerPhone && planType;
      
      // DUPLICATE CHECK: Check if this exact screenshot URL was already used in a payment submission
      const existingSubmissionWithSameScreenshot = await db.select().from(paymentSubmissions)
        .where(and(
          eq(paymentSubmissions.screenshotUrl, screenshotUrl),
          inArray(paymentSubmissions.status, ["approved", "pending"])
        ))
        .limit(1);
      
      if (existingSubmissionWithSameScreenshot.length > 0) {
        console.log(`[RECEIPT] DUPLICATE SCREENSHOT detected! Same image already used in submission: ${existingSubmissionWithSameScreenshot[0].id}`);
        return res.json({
          valid: false,
          autoApproved: false,
          error: "Rasiidkan hore ayaa la isticmaalay. Fadlan soo dir rasiid cusub oo kale."
        });
      }
      
      // Get server-side attempt count (PERSISTED across page refreshes)
      const parentId = req.session.parentId!;
      const attemptRecord = await storage.getReceiptAttempts(parentId, courseId);
      const serverAttemptCount = attemptRecord?.attemptCount || 0;
      
      // Increment attempt count BEFORE validation (so this attempt counts)
      const currentAttempt = serverAttemptCount + 1;
      await storage.incrementReceiptAttempts(parentId, courseId);
      
      // Manual review mode (4th+ attempt) - accept receipt for admin review instead of blocking
      const isManualReviewMode = currentAttempt >= 4;

      console.log("[RECEIPT] Validating receipt:", screenshotUrl?.substring(0, 100));

      let imageBase64: string;
      
      // Check if it's already a base64 data URL
      if (screenshotUrl.startsWith('data:')) {
        // Extract base64 from data URL
        const matches = screenshotUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (matches && matches[2]) {
          imageBase64 = matches[2];
          console.log("[RECEIPT] Using base64 data URL, size:", imageBase64.length);
        } else {
          console.error("[RECEIPT] Invalid data URL format");
          return res.json({ 
            valid: false, 
            error: "Sawirka ma la heli karo. Fadlan isku day mar kale."
          });
        }
      } else {
        // Fetch the image from object storage and convert to base64
        try {
          const { ObjectStorageService } = await import("./replit_integrations/object_storage/objectStorage");
          const objectStorageService = new ObjectStorageService();
          const objectFile = await objectStorageService.getObjectEntityFile(screenshotUrl);
          const [buffer] = await objectFile.download();
          imageBase64 = buffer.toString("base64");
          console.log("[RECEIPT] Image fetched from storage, size:", buffer.length);
        } catch (fetchError) {
          console.error("[RECEIPT] Failed to fetch image:", fetchError);
          return res.json({ 
            valid: false, 
            error: "Sawirka ma la heli karo. Fadlan isku day mar kale."
          });
        }
      }

      const OpenAI = (await import("openai")).default;
      const openai = process.env.AI_INTEGRATIONS_OPENAI_API_KEY
        ? new OpenAI({ apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY, baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL })
        : new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Use OpenAI Vision to analyze the receipt with base64 image
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a STRICT receipt validation assistant for Barbaarintasan Academy (Somali education platform). Your job is to verify if an image is a REAL mobile money payment receipt.

⚠️ CRITICAL - AUTOMATIC REJECTION (is_valid_receipt = false, confidence = 0):
You MUST IMMEDIATELY REJECT and set is_valid_receipt=false if ANY of these are true:
1. Image shows a person's face, child, baby, selfie, or any human photo
2. Image is a random photo, screenshot of something else, meme, or non-financial content
3. Image does NOT show a mobile money app interface (EVC Plus, Zaad, E-Dahab, Sahal) or remittance receipt (Taaj, Dahabshiil, Amal, Kaah, or other xawilaad services)
4. Image has no visible monetary amount ($, USD, or numbers with currency)
5. Image has no transaction reference number (Tix:, Ref:, ID:, RID:)
6. Image looks edited, photoshopped, or artificially created
7. Image is blurry or unreadable

✅ VALID RECEIPT MUST HAVE ALL OF THESE:
1. Mobile money app UI visible (EVC Plus green, Zaad blue, E-Dahab, Sahal) OR remittance/xawilaad receipt (Taaj Services, Dahabshiil, Amal, Kaah with RID/reference number)
2. Clear monetary amount in USD (like $15, $70, $114)
3. Transaction reference number (Tix: XXXXXXXXX or similar code)
4. Date of transaction visible - ALWAYS convert to DD/MM/YYYY format:
   * "07-Jan-2026" → "07/01/2026"
   * "15-Feb-2026" → "15/02/2026"
   * Month abbreviations: Jan=01, Feb=02, Mar=03, Apr=04, May=05, Jun=06, Jul=07, Aug=08, Sep=09, Oct=10, Nov=11, Dec=12
5. Recipient name visible

PAYMENT SYSTEMS TO RECOGNIZE:
- EVC Plus: Green interface, "Hormuud", "Transfer", "Payment", "EVC"
- Zaad: Blue interface, "ZAAD SERVICES", "Telesom", "Tix:" for reference
- E-Dahab: "Somtel" branding
- Sahal: Mobile money service, similar to EVC/Zaad
- Xawilaad/Remittance: Taaj Services, Dahabshiil, Amal, Kaah - uses RID for reference, shows sender/receiver details, "Remittance Receipt"
- "ayaad u dirtay" = "you sent to" in Somali

RECIPIENT VALIDATION:
The payment MUST be sent to the academy owner. Valid recipient names include:
- "MUSSE SAID AWMUSSE" or "Musse Said Aw-Musse"
- "MUSE SAID" or "MUUSE SICIID" or similar variations
- Any name containing: MUSSE, MUSE, MUUSE, SICIID, AWMUSSE
- Phone number: 0907790584 or 907790584

AMOUNT VALIDATION:
- Monthly plan: $15 (or close to it)
- Yearly plan: $114 (or close to it)  
- One-time plan: $70 (or close to it)

EXTRACTIONS REQUIRED:
1. Reference number (Tix: XXXXXXXXX) - CRITICAL, must extract
2. Recipient name - Check if contains MUSSE/MUSE
3. Amount in USD
4. Date - "Tar" means "Date" in Somali. ALWAYS convert to DD/MM/YYYY format:
   - "07-Jan-2026" → "07/01/2026"
   - "15-Feb-2026" → "15/02/2026"
   - Month abbreviations: Jan=01, Feb=02, Mar=03, Apr=04, May=05, Jun=06, Jul=07, Aug=08, Sep=09, Oct=10, Nov=11, Dec=12
5. Time if visible
6. Sender name and phone

IMPORTANT: Set is_mobile_money_ui=true for BOTH:
- Mobile money apps (EVC Plus, Zaad, E-Dahab, Sahal)
- Remittance/xawilaad receipts (Taaj Services, Dahabshiil, Amal, Kaah)

Respond in JSON format:
{
  "is_valid_receipt": boolean,
  "is_mobile_money_ui": boolean (true for mobile money OR xawilaad/remittance),
  "is_remittance_receipt": boolean (true if Taaj, Dahabshiil, Amal, Kaah, or other xawilaad),
  "has_amount": boolean,
  "has_reference": boolean,
  "is_human_photo": boolean,
  "confidence": number (0-100),
  "detected_amount": "the amount shown if any",
  "detected_date": "the date shown (format: DD/MM/YYYY or YYYY-MM-DD)",
  "detected_time": "the time shown (format: HH:MM:SS)",
  "reference_number": "the transaction ID/Tix code or RID",
  "recipient_name": "the name of who received the money",
  "recipient_valid": boolean,
  "sender_name": "the name of who sent the money",
  "sender_phone": "the phone number of the sender (digits only)",
  "rejection_reason": "Why rejected (if invalid)",
  "reason_so": "Brief reason in Somali language"
}`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "IMPORTANT: First check if this is a REAL payment receipt. If you see a person's face, child, random photo, or anything that is NOT a payment receipt - REJECT IT IMMEDIATELY with is_valid_receipt=false and confidence=0. Only approve if you see a genuine payment receipt from: EVC Plus, Zaad, E-Dahab, Sahal (mobile money) OR Taaj Services, Dahabshiil, Amal, Kaah (xawilaad/remittance) with amount, reference number (RID/Tix), and recipient."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 400,
        response_format: { type: "json_object" }
      });

      const aiResponse = response.choices[0]?.message?.content;
      console.log("[RECEIPT] AI Response:", aiResponse);

      if (!aiResponse) {
        return res.json({ 
          valid: false, 
          error: "Ma suurtogelin in la hubiyo sawirka. Fadlan isku day mar kale."
        });
      }

      const result = JSON.parse(aiResponse);
      
      // STRICT VALIDATION - Check multiple conditions
      // 1. Must be a mobile money UI (not a random photo)
      // 2. Must have amount visible
      // 3. Must have reference number
      // 4. Must NOT be a human photo (face, child, selfie)
      // 5. Confidence must be 85% or higher
      
      const isMobileMoneyUI = result.is_mobile_money_ui === true || result.is_remittance_receipt === true;
      const hasAmount = result.has_amount === true;
      const hasReference = result.has_reference === true;
      const isHumanPhoto = result.is_human_photo === true;
      
      // Reject immediately if it's a human photo
      if (isHumanPhoto) {
        console.log("[RECEIPT] REJECTED - Human photo detected (not a receipt)");
        return res.json({
          valid: false,
          error: "Sawirkaagu ma aha rasiid. Waxaad soo dirtay sawir qof (caruur/selfie). Fadlan soo dir sawirka rasiidka lacag bixinta.",
          details: result
        });
      }
      
      // Reject if no mobile money UI visible
      if (!isMobileMoneyUI) {
        console.log("[RECEIPT] REJECTED - Not a mobile money interface");
        return res.json({
          valid: false,
          error: "Sawirkaagu ma aha rasiid lacag bixin (EVC, Zaad, E-Dahab, Sahal, ama xawilaad sida Taaj/Dahabshiil). Fadlan soo dir screenshot-ka rasiidka.",
          details: result
        });
      }
      
      // Reject if no amount visible
      if (!hasAmount) {
        console.log("[RECEIPT] REJECTED - No amount visible in receipt");
        return res.json({
          valid: false,
          error: "Lacagta lama arko sawirka. Fadlan soo dir sawir cad oo lacagta lagu arko.",
          details: result
        });
      }
      
      // Reject if no reference number
      if (!hasReference) {
        console.log("[RECEIPT] REJECTED - No reference number visible");
        return res.json({
          valid: false,
          error: "Reference number-ka (Tix:) lama arko sawirka. Fadlan soo dir sawir buuxa.",
          details: result
        });
      }
      
      // Be strict - require 85% confidence (raised from 70%)
      const isValid = result.is_valid_receipt === true && result.confidence >= 85;
      const highConfidence = result.confidence >= 95;

      // Check if receipt date is within 3 days (reject receipts older than 3 days or future dates)
      const isReceiptDateValid = (detectedDate: string | null): { valid: boolean; daysOld: number | null; isFuture?: boolean } => {
        if (!detectedDate) {
          return { valid: false, daysOld: null };
        }
        
        // Clean up the date string - remove any non-date text
        const cleanedDate = detectedDate.trim();
        
        // Try to parse the detected date in various formats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let receiptDate: Date | null = null;
        
        // FIRST: Try DD/MM/YYYY or D/M/YYYY format (most common in Somalia/Europe)
        // This must come BEFORE standard Date parsing to avoid US date interpretation
        const ddmmyyyy = cleanedDate.match(/(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})/);
        if (ddmmyyyy) {
          const [, day, month, year] = ddmmyyyy;
          const dayNum = parseInt(day);
          const monthNum = parseInt(month);
          const yearNum = parseInt(year);
          
          // Validate: day 1-31, month 1-12
          if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 2020) {
            receiptDate = new Date(yearNum, monthNum - 1, dayNum);
          }
        }
        
        // SECOND: Try YYYY-MM-DD format (ISO format)
        if (!receiptDate) {
          const iso = cleanedDate.match(/(\d{4})[\/\.\-](\d{1,2})[\/\.\-](\d{1,2})/);
          if (iso) {
            const [, year, month, day] = iso;
            receiptDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          }
        }
        
        // THIRD: Try DD-Mon-YYYY format (like "07-Jan-2026")
        if (!receiptDate) {
          const monthNames: Record<string, number> = {
            'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
            'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
          };
          const textMatch = cleanedDate.match(/(\d{1,2})[\/\-\.]([a-zA-Z]{3})[\/\-\.](\d{4})/i);
          if (textMatch) {
            const [, day, monthStr, year] = textMatch;
            const monthIndex = monthNames[monthStr.toLowerCase()];
            if (monthIndex !== undefined) {
              receiptDate = new Date(parseInt(year), monthIndex, parseInt(day));
              console.log(`[RECEIPT] Parsed ${cleanedDate} as DD-Mon-YYYY: ${receiptDate}`);
            }
          }
        }
        
        // FOURTH: Try text format like "Jan 7 2026" or "7 Jan 2026" via JS Date parser
        if (!receiptDate) {
          const parsed = new Date(cleanedDate);
          if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2020) {
            receiptDate = parsed;
          }
        }
        
        if (!receiptDate || isNaN(receiptDate.getTime())) {
          console.log("[RECEIPT] Could not parse date:", detectedDate);
          return { valid: false, daysOld: null };
        }
        
        receiptDate.setHours(0, 0, 0, 0);
        const diffTime = today.getTime() - receiptDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        console.log("[RECEIPT] Date validation - Receipt date:", receiptDate, "Days old:", diffDays);
        
        // Reject future dates (negative diffDays)
        if (diffDays < 0) {
          console.log("[RECEIPT] Rejected - future date detected");
          return { valid: false, daysOld: diffDays, isFuture: true };
        }
        
        // Accept receipts that are at most 7 days old (0-7 days)
        // Reject if 8+ days old
        return { valid: diffDays <= 7, daysOld: diffDays };
      };

      // Helper to normalize reference number for comparison
      const normalizeReference = (ref: string | null): string | null => {
        if (!ref) return null;
        return ref.replace(/[\s\-\.]/g, '').toUpperCase();
      };
      
      // Helper to normalize date to YYYY-MM-DD format
      const normalizeDateToISO = (dateStr: string | null): string | null => {
        if (!dateStr) return null;
        const cleanedDate = dateStr.trim();
        
        // Try DD/MM/YYYY
        const ddmmyyyy = cleanedDate.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
        if (ddmmyyyy) {
          const [, day, month, year] = ddmmyyyy;
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        // Try YYYY-MM-DD
        const iso = cleanedDate.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
        if (iso) {
          const [, year, month, day] = iso;
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        // Try text format
        const parsed = new Date(cleanedDate);
        if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2020) {
          return parsed.toISOString().split('T')[0];
        }
        
        return null;
      };
      
      // Extract amount in cents for fingerprinting
      const extractAmountCents = (amountStr: string | null): number | null => {
        if (!amountStr) return null;
        const match = amountStr.match(/(\d+(?:\.\d+)?)/);
        if (match) {
          return Math.round(parseFloat(match[1]) * 100);
        }
        return null;
      };

      if (isValid) {
        // If high confidence (90%+) and we have payment details, auto-approve
        if (highConfidence && canAutoApprove) {
          // Check receipt date before auto-approving
          const dateCheck = isReceiptDateValid(result.detected_date);
          if (!dateCheck.valid) {
            console.log("[RECEIPT] Rejected - receipt date invalid:", dateCheck.daysOld, "days, isFuture:", dateCheck.isFuture);
            let errorMessage: string;
            if (dateCheck.daysOld === null) {
              errorMessage = "Taariikhda rasiidka lama aqrin karo. Fadlan soo dir sawir cusub.";
            } else if (dateCheck.isFuture) {
              errorMessage = "Taariikhda rasiidka waa mid mustaqbalka ah. Fadlan soo dir rasiid sax ah.";
            } else {
              errorMessage = `Rasiidkan waa mid qadiim ah (${dateCheck.daysOld} maalmood ka hor). Fadlan soo dir rasiid cusub oo aan ka weynayn 7 maalmood.`;
            }
            return res.json({
              valid: false,
              autoApproved: false,
              error: errorMessage,
              details: result
            });
          }
          
          // Check for duplicate receipt
          const normalizedRef = normalizeReference(result.reference_number);
          const normalizedDate = normalizeDateToISO(result.detected_date);
          const amountCents = extractAmountCents(result.detected_amount);
          const normalizedTime = result.detected_time || null;
          const normalizedSenderPhone = result.sender_phone ? result.sender_phone.replace(/\D/g, '') : null;
          
          console.log(`[RECEIPT] Checking for duplicates - Ref: ${normalizedRef}, Date: ${normalizedDate}, Time: ${normalizedTime}, Amount: ${amountCents}, SenderPhone: ${normalizedSenderPhone}`);
          
          const duplicateReceipt = await storage.findDuplicateReceipt(
            normalizedRef, 
            normalizedDate, 
            amountCents, 
            normalizedTime, 
            normalizedSenderPhone
          );
          if (duplicateReceipt) {
            console.log(`[RECEIPT] Duplicate detected! Existing fingerprint: Ref=${duplicateReceipt.normalizedReference}, Date=${duplicateReceipt.transactionDate}, Time=${duplicateReceipt.transactionTime}, Amount=${duplicateReceipt.amountCents}, SenderPhone=${duplicateReceipt.senderPhone}`);
            return res.json({ 
              valid: false, 
              autoApproved: false, 
              error: "Rasiidkan hore ayaa la isticmaalay. Fadlan soo dir rasiid cusub oo kale." 
            });
          }
          
          // Check recipient name validation
          if (result.recipient_valid === false) {
            console.log("[RECEIPT] Rejected - recipient invalid:", result.recipient_name);
            return res.json({
              valid: false,
              autoApproved: false,
              error: "Lacagta waxaa loo diray qof kale oo aan ahayn Barbaarintasan Academy. Fadlan u dir lacagta MUSSE SAID AWMUSSE (0907790584).",
              details: result
            });
          }
          
          // Check amount matches plan type - dynamically calculate upgrade price
          const courseForPricing = await storage.getCourse(courseId);
          const expectedAmounts: Record<string, number> = { 
            monthly: courseForPricing?.priceMonthly || 15, 
            yearly: courseForPricing?.priceYearly || 114, 
            onetime: 70 
          };
          const expectedAmount = expectedAmounts[planType];
          
          // Calculate dynamic upgrade price if user has existing monthly enrollment
          let dynamicUpgradePrice = 0;
          const existingForPricing = await storage.getEnrollmentByPhoneAndCourse(customerPhone, courseId);
          if (existingForPricing && existingForPricing.planType === "monthly" && planType === "yearly") {
            let monthlyPaid = courseForPricing?.priceMonthly || 15;
            if (existingForPricing.paymentSubmissionId) {
              const prevPayment = await storage.getPaymentSubmission(existingForPricing.paymentSubmissionId);
              if (prevPayment) monthlyPaid = prevPayment.amount;
            }
            dynamicUpgradePrice = (courseForPricing?.priceYearly || 114) - monthlyPaid + 1;
          }
          
          if (expectedAmount && amountCents) {
            const detectedAmountDollars = amountCents / 100;
            const tolerance = 5; // Allow $5 tolerance
            const isValidAmount = Math.abs(detectedAmountDollars - expectedAmount) <= tolerance ||
              (planType === "yearly" && dynamicUpgradePrice > 0 && Math.abs(detectedAmountDollars - dynamicUpgradePrice) <= tolerance);
            if (!isValidAmount) {
              const upgradeNote = dynamicUpgradePrice > 0 ? ` (ama $${dynamicUpgradePrice} upgrade)` : "";
              console.log(`[RECEIPT] Amount mismatch! Expected: $${expectedAmount}${upgradeNote}, Detected: $${detectedAmountDollars}`);
              return res.json({
                valid: false,
                autoApproved: false,
                error: `Lacagta rasiidka ($${detectedAmountDollars}) kuma habboona qorshaha aad dooratay ($${expectedAmount}${upgradeNote}). Fadlan hubi lacagta saxda ah.`,
                details: result
              });
            }
          }
          
          console.log("[RECEIPT] High confidence validation passed:", result.confidence);
          
          // Check for existing enrollment
          const existingEnrollment = await storage.getEnrollmentByPhoneAndCourse(customerPhone, courseId);
          let isRenewal = false;
          let existingAccessEndDate: Date | null = null;
          
          if (existingEnrollment && existingEnrollment.status === "active") {
            // Check if it's lifetime access - don't allow renewal
            if (!existingEnrollment.accessEnd) {
              return res.json({
                valid: true,
                readyToPurchase: false,
                message: "Koorsadan weligaa ayaa laguu furay oo uma baahnid cusboonayn. Mahadsanid!",
                details: result
              });
            }
            // This is a renewal
            isRenewal = true;
            existingAccessEndDate = new Date(existingEnrollment.accessEnd);
          }
          
          // Check if this is an UPGRADE from monthly to yearly
          const isUpgradeFromMonthly = isRenewal && 
            existingEnrollment?.planType === "monthly" && 
            planType === "yearly";
          
          // Use the AI-detected amount from the receipt (already validated above)
          // If no amount detected, use default based on plan type
          const planAmounts: Record<string, number> = { monthly: 15, yearly: 114, onetime: 70 };
          const detectedAmount = amountCents ? amountCents / 100 : (planAmounts[planType] || 114);
          const amount = Math.round(detectedAmount); // Round to nearest dollar
          
          // For $114 yearly subscriptions: AUTO-APPROVE and grant All-Access immediately
          if (planType === "yearly" && amount >= 109 && amount <= 119) {
            console.log(`[RECEIPT] Auto-approving $114 yearly subscription for ${customerPhone}`);
            
            // Create approved payment submission
            const submission = await storage.createPaymentSubmission({
              courseId,
              paymentMethodId,
              customerName,
              customerPhone,
              customerEmail: customerEmail || null,
              planType,
              screenshotUrl,
              amount,
              isRenewal,
              existingAccessEnd: existingAccessEndDate,
              notes: `AI AUTO-APPROVED (${result.confidence}% confidence). Xubin Dahabi - All Access.`
            });
            
            // Immediately approve the submission
            await storage.updatePaymentSubmission(submission.id, { status: "approved" });
            
            // Calculate access end date (1 year from now or from existing end date)
            let baseDate = new Date();
            if (isRenewal && existingAccessEndDate && existingAccessEndDate > baseDate) {
              baseDate = existingAccessEndDate;
            }
            const accessEnd = new Date(baseDate);
            accessEnd.setFullYear(accessEnd.getFullYear() + 1);
            
            // Grant All-Access: Enroll in ALL live courses
            const allCourses = await storage.getAllCourses();
            const liveCourses = allCourses.filter((c: any) => c.isLive);
            
            for (const course of liveCourses) {
              const existingCourseEnrollment = await storage.getEnrollmentByPhoneAndCourse(customerPhone, course.id);
              if (existingCourseEnrollment) {
                await storage.renewEnrollment(existingCourseEnrollment.id, "yearly", accessEnd, submission.id, customerPhone);
              } else {
                await storage.createEnrollment({
                  courseId: course.id,
                  parentId: parentId,
                  customerPhone,
                  planType: "yearly",
                  status: "active",
                  accessEnd,
                });
              }
            }
            
            console.log(`[RECEIPT] Xubin Dahabi granted! ${liveCourses.length} courses until ${accessEnd}`);
            
            // Save receipt fingerprint as APPROVED
            await storage.createReceiptFingerprint({
              parentId,
              paymentSubmissionId: submission.id,
              normalizedReference: normalizedRef,
              transactionDate: normalizedDate,
              transactionTime: result.detected_time || null,
              amountCents,
              senderName: result.sender_name || null,
              senderPhone: normalizedSenderPhone,
              paymentMethodId,
              status: "approved"
            });
            
            // Reset receipt attempts on success
            await storage.resetReceiptAttempts(parentId, courseId);
            
            // Send confirmation email
            if (customerEmail) {
              sendPurchaseConfirmationEmail(
                customerEmail,
                customerName,
                "Xubin Dahabi - Dhammaan Koorsooyin",
                "yearly",
                amount
              ).catch(console.error);
            }
            
            return res.json({
              valid: true,
              autoApproved: true,
              message: "🎉 Hambalyo! Waxaad noqotay Xubin Dahabi! Dhammaan koorsooyinka waa laguu furay sanad!",
              details: result
            });
          }
          
          // For other plans: Create PENDING payment submission (user must confirm to complete purchase)
          const submission = await storage.createPaymentSubmission({
            courseId,
            paymentMethodId,
            customerName,
            customerPhone,
            customerEmail: customerEmail || null,
            planType,
            screenshotUrl,
            amount,
            isRenewal,
            existingAccessEnd: existingAccessEndDate,
            notes: `AI Validated (${result.confidence}% confidence). Amount: ${result.detected_amount}, Date: ${result.detected_date}${isRenewal ? ' [RENEWAL]' : ''}${isUpgradeFromMonthly ? ' [UPGRADE]' : ''} - Awaiting confirmation`
          });
          
          // Save receipt fingerprint as PENDING to block reuse during confirmation window
          await storage.createReceiptFingerprint({
            parentId: null,
            paymentSubmissionId: submission.id,
            normalizedReference: normalizedRef,
            transactionDate: normalizedDate,
            transactionTime: result.detected_time || null,
            amountCents,
            senderName: result.sender_name || null,
            senderPhone: normalizedSenderPhone,
            paymentMethodId,
            status: "pending"
          });
          
          console.log(`[RECEIPT] Validation passed, pending confirmation. SubmissionId: ${submission.id}`);
          
          // Return validation success with submissionId - user must confirm to complete purchase
          return res.json({
            valid: true,
            readyToPurchase: true,
            submissionId: submission.id,
            message: "Rasiidkaaga waa la hubiyey! Hadda riix 'Iibso Koorsada' si aad u furto koorsada.",
            details: result
          });
        }
        
        // Low confidence or missing details - needs manual review
        return res.json({
          valid: true,
          readyToPurchase: false,
          message: "Sawirka rasiidka waa la aqbalay! Admin ayaa eegi doona.",
          details: result
        });
      } else {
        // Validation failed - check if we should use manual review mode (4th+ attempt)
        if (isManualReviewMode && canAutoApprove) {
          console.log(`[RECEIPT] Manual review mode activated (attempt ${currentAttempt}). Saving for admin review.`);
          
          // Extract receipt details for fingerprinting
          const normalizedRef = result.reference_number ? result.reference_number.replace(/[\s\-\.]/g, '').toUpperCase() : null;
          const normalizedDate = result.detected_date ? result.detected_date.trim() : null;
          const normalizedTime = result.detected_time || null;
          const normalizedSenderPhone = result.sender_phone ? result.sender_phone.replace(/\D/g, '') : null;
          const amountMatch = result.detected_amount ? result.detected_amount.match(/(\d+(?:\.\d+)?)/) : null;
          const amountCents = amountMatch ? Math.round(parseFloat(amountMatch[1]) * 100) : null;
          
          // Check for duplicate receipt BEFORE creating submission (even in manual review mode)
          const duplicateReceipt = await storage.findDuplicateReceipt(
            normalizedRef, 
            normalizedDate, 
            amountCents, 
            normalizedTime, 
            normalizedSenderPhone
          );
          if (duplicateReceipt) {
            console.log(`[RECEIPT] Manual review blocked - duplicate detected: ${duplicateReceipt.id}`);
            return res.json({ 
              valid: false, 
              autoApproved: false, 
              error: "Rasiidkan hore ayaa la isticmaalay. Fadlan soo dir rasiid cusub oo kale." 
            });
          }
          
          // Create payment submission for manual admin review
          const planAmounts: Record<string, number> = { monthly: 15, yearly: 114, onetime: 70 };
          const amount = planAmounts[planType] || 114;
          
          const submission = await storage.createPaymentSubmission({
            courseId,
            paymentMethodId,
            customerName,
            customerPhone,
            customerEmail: customerEmail || null,
            planType,
            screenshotUrl,
            amount,
            isRenewal: false,
            existingAccessEnd: null,
            notes: `[MANUAL REVIEW REQUIRED - Attempt ${currentAttempt}] AI flagged as suspicious: ${result.reason_so || 'Low confidence'}. Awaiting admin verification.`
          });
          
          // Save receipt fingerprint as PENDING to block reuse by other parents
          await storage.createReceiptFingerprint({
            parentId: null,
            paymentSubmissionId: submission.id,
            normalizedReference: normalizedRef,
            transactionDate: normalizedDate,
            transactionTime: normalizedTime,
            amountCents,
            senderName: result.sender_name || null,
            senderPhone: normalizedSenderPhone,
            paymentMethodId,
            status: "pending"
          });
          
          console.log(`[RECEIPT] Created manual review submission: ${submission.id} with fingerprint`);
          
          // Send email to customer about manual review
          if (customerEmail) {
            const course = await storage.getCourse(courseId);
            const { sendEmail } = await import("./email");
            
            sendEmail({
              to: customerEmail,
              subject: `📩 Lacag bixintaada waa la helay - ${course?.title || "Koorsada"}`,
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f9ff; margin: 0; padding: 30px 15px; }
                    .container { max-width: 550px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 40px 30px; text-align: center; }
                    .header h1 { margin: 0 0 10px; font-size: 24px; }
                    .content { padding: 35px 30px; }
                    .info-box { background: #eff6ff; border-radius: 16px; padding: 25px; margin: 25px 0; border: 2px solid #bfdbfe; }
                    .whatsapp-box { background: #f0fdf4; border-radius: 16px; padding: 25px; margin: 25px 0; border: 2px solid #bbf7d0; text-align: center; }
                    .whatsapp-link { display: inline-block; background: #22c55e; color: white; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; margin-top: 10px; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1>📩 Lacag bixintaada waa la helay!</h1>
                      <p style="margin: 0; opacity: 0.9;">${customerName}</p>
                    </div>
                    <div class="content">
                      <div class="info-box">
                        <p style="margin: 0 0 15px; font-size: 16px;">Waxaan helnay rasiidkaaga koorsada <strong>${course?.title || "Barbaarintasan Academy"}</strong>.</p>
                        <p style="margin: 0; font-size: 16px; color: #1d4ed8;">Koorsada waxaa laguu furi doonaa kadib markii la xaqiijiyo lacag bixinta.</p>
                      </div>
                      
                      <div class="whatsapp-box">
                        <p style="margin: 0 0 10px; font-size: 14px; color: #16a34a;">Haddii koorsada aan laguu furin 1 saac gudaheeda, fadlan nala soo xiriir:</p>
                        <a href="https://wa.me/252907790584" class="whatsapp-link">📱 WhatsApp: +252907790584</a>
                        <p style="margin: 15px 0 0; font-size: 12px; color: #666;">Rasiidkaaga ku dir WhatsApp-ka, waxaana lagugu caawin doonaa si degdeg ah.</p>
                      </div>
                      
                      <p style="text-align: center; color: #888; font-size: 12px; margin-top: 30px;">Mahadsanid,<br><strong>Barbaarintasan Academy</strong></p>
                    </div>
                  </div>
                </body>
                </html>
              `
            }).catch(err => console.error("[RECEIPT] Manual review email failed:", err));
          }
          
          return res.json({
            valid: true,
            manualReview: true,
            autoApproved: false,
            message: "Rasiidkaaga waa la keydiyey! Koorsada waa la furi doonaa kadib markii Admin-ka uu xaqiijiyo. Haddii aan laguu furin 1 saac gudaheeda, nala soo xiriir WhatsApp: +252907790584",
            details: result
          });
        }
        
        // Normal failed validation - return error
        return res.json({
          valid: false,
          autoApproved: false,
          error: result.reason_so || "Sawirkaan rasiid lacag bixin ma aha. Fadlan soo geli sawir rasiid ah oo leh lacag iyo taariikh.",
          details: result
        });
      }

    } catch (error: any) {
      console.error("[RECEIPT] Validation error:", error);
      // On error, reject to be safe
      return res.json({ 
        valid: false, 
        error: "Wax khalad ah ayaa dhacay. Fadlan isku day mar kale."
      });
    }
  });

  // Payment Method routes (public)
  app.get("/api/payment-methods", async (req, res) => {
    try {
      const methods = await storage.getActivePaymentMethods();
      res.json(methods);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      res.status(500).json({ error: "Failed to fetch payment methods" });
    }
  });

  // Confirm Receipt Purchase - finalizes enrollment after receipt validation
  app.post("/api/confirm-receipt-purchase", requireParentAuth, async (req, res) => {
    try {
      const parent = await storage.getParent(req.session.parentId!);
      if (!parent) {
        return res.status(401).json({ error: "Parent not found" });
      }
      const { submissionId } = req.body;
      
      if (!submissionId) {
        return res.status(400).json({ error: "submissionId waa loo baahan yahay" });
      }
      
      // Get the pending submission
      const submission = await storage.getPaymentSubmission(submissionId);
      if (!submission) {
        return res.status(404).json({ error: "Lacag bixintaas lama helin. Fadlan isku day mar kale." });
      }
      
      // SECURITY: Verify the submission belongs to the logged-in parent
      const ownershipValid = 
        (submission.customerPhone && submission.customerPhone === parent.phone) ||
        (submission.customerEmail && submission.customerEmail === parent.email);
      
      if (!ownershipValid) {
        console.log(`[CONFIRM] Ownership check failed. Submission phone: ${submission.customerPhone}, Parent phone: ${parent.phone}`);
        return res.status(403).json({ error: "Ma lagu fasaxin inaad xaqiijiso lacag bixintaan." });
      }
      
      // Check if already approved (idempotent)
      if (submission.status === "approved") {
        return res.json({
          success: true,
          alreadyApproved: true,
          message: "Koorsadaada horeba waa la furay!"
        });
      }
      
      // Check if submission is pending (not rejected)
      if (submission.status === "rejected") {
        return res.status(400).json({ error: "Lacag bixintaan waa la diiday. Fadlan soo dir rasiid cusub." });
      }
      
      const { courseId, customerPhone, customerEmail, customerName, planType, paymentMethodId } = submission;
      
      // Check for existing enrollment to determine if renewal
      const existingEnrollment = await storage.getEnrollmentByPhoneAndCourse(customerPhone, courseId);
      let isRenewal = false;
      let existingAccessEndDate: Date | null = null;
      
      if (existingEnrollment && existingEnrollment.status === "active") {
        if (!existingEnrollment.accessEnd) {
          // Lifetime access - shouldn't reach here but handle gracefully
          return res.json({
            success: true,
            message: "Koorsadan weligaa ayaa laguu furay!"
          });
        }
        isRenewal = true;
        existingAccessEndDate = new Date(existingEnrollment.accessEnd);
      }
      
      // Check if this is an UPGRADE from monthly to yearly
      const isUpgradeFromMonthly = isRenewal && 
        existingEnrollment?.planType === "monthly" && 
        planType === "yearly";
      
      // Determine upgrade payment - dynamic based on actual monthly paid
      const courseForConfirm = await storage.getCourse(courseId);
      const yearlyPriceConfirm = courseForConfirm?.priceYearly || 114;
      let dynamicUpgradePriceConfirm = 0;
      if (isUpgradeFromMonthly && existingEnrollment) {
        let prevMonthlyPaid = courseForConfirm?.priceMonthly || 15;
        if (existingEnrollment.paymentSubmissionId) {
          const prevPay = await storage.getPaymentSubmission(existingEnrollment.paymentSubmissionId);
          if (prevPay) prevMonthlyPaid = prevPay.amount;
        }
        dynamicUpgradePriceConfirm = Math.max(1, yearlyPriceConfirm - prevMonthlyPaid + 1);
      }
      const upgradeTolerance = 10;
      const isUpgradePayment = isUpgradeFromMonthly && dynamicUpgradePriceConfirm > 0 &&
        Math.abs(submission.amount - dynamicUpgradePriceConfirm) <= upgradeTolerance;
      
      if (isUpgradeFromMonthly) {
        console.log(`[CONFIRM] Upgrade check: amount=$${submission.amount}, yearlyPrice=$${yearlyPriceConfirm}, expectedUpgrade=$${dynamicUpgradePriceConfirm}, isUpgrade=${isUpgradePayment}`);
      }
      
      // Calculate access end date
      let baseDate = new Date();
      if (isRenewal && existingAccessEndDate && existingAccessEndDate > baseDate) {
        baseDate = existingAccessEndDate;
      }
      
      let accessEnd: Date | null = null;
      if (planType === "monthly") {
        accessEnd = new Date(baseDate);
        accessEnd.setMonth(accessEnd.getMonth() + 1);
      } else if (planType === "yearly") {
        accessEnd = new Date(baseDate);
        if (isUpgradePayment) {
          accessEnd.setMonth(accessEnd.getMonth() + 11);
          console.log(`[CONFIRM] Monthly to Yearly upgrade. Adding 11 months from ${baseDate} to ${accessEnd}`);
        } else {
          accessEnd.setFullYear(accessEnd.getFullYear() + 1);
        }
      } else if (planType === "onetime") {
        accessEnd = new Date(baseDate);
        accessEnd.setMonth(accessEnd.getMonth() + 6);
      }
      
      // Find parent by email
      let parentId: string | null = null;
      if (customerEmail) {
        const parent = await storage.getParentByEmail(customerEmail);
        if (parent) {
          parentId = parent.id;
        }
      }
      
      // Create or renew enrollment
      if (isRenewal && existingEnrollment) {
        await storage.renewEnrollment(existingEnrollment.id, planType, accessEnd, submissionId, customerPhone);
        console.log("[CONFIRM] Renewed enrollment for:", customerPhone, "extended to:", accessEnd);
      } else {
        await storage.createEnrollment({
          courseId,
          parentId,
          customerPhone,
          planType,
          status: "active",
          accessEnd: accessEnd
        });
        console.log("[CONFIRM] Created enrollment for:", customerPhone);
      }
      
      // Update submission to approved
      await storage.updatePaymentSubmission(submissionId, { 
        status: "approved",
        notes: (submission.notes || "") + " - User confirmed purchase"
      });
      
      // Update fingerprint to approved
      const fingerprints = await db.select().from(receiptFingerprints)
        .where(eq(receiptFingerprints.paymentSubmissionId, submissionId));
      if (fingerprints.length > 0) {
        await db.update(receiptFingerprints)
          .set({ status: "approved", parentId })
          .where(eq(receiptFingerprints.paymentSubmissionId, submissionId));
      }
      
      console.log(`[CONFIRM] Purchase confirmed. SubmissionId: ${submissionId}`);
      
      // Reset receipt validation attempts on successful enrollment
      if (parent.id && courseId) {
        await storage.resetReceiptAttempts(parent.id, courseId);
        console.log(`[CONFIRM] Reset receipt attempts for parent ${parent.id}, course ${courseId}`);
      }
      
      // Send confirmation email
      if (customerEmail) {
        const course = await storage.getCourse(courseId);
        const planLabels: Record<string, string> = { onetime: "Hal Mar ($70)", monthly: "Bille ($15)", yearly: "Sanad ($114)" };
        const formatDate = (date: Date) => {
          const day = date.getDate();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        };
        const accessEndText = accessEnd ? formatDate(accessEnd) : "Weligaa";
        const isMonthly = planType === "monthly";
        
        sendEmail({
          to: customerEmail,
          subject: `🎉 Hambalyo! Koorsada "${course?.title}" ayaa laguu furay!`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0fdf4; margin: 0; padding: 30px 15px; }
                .container { max-width: 550px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #22c55e, #10b981); color: white; padding: 40px 30px; text-align: center; }
                .header h1 { margin: 0 0 10px; font-size: 26px; }
                .content { padding: 35px 30px; }
                .info-box { background: #f0fdf4; border-radius: 16px; padding: 25px; margin: 25px 0; border: 2px solid #bbf7d0; }
                .info-row { margin: 12px 0; display: flex; justify-content: space-between; }
                .label { color: #6b7280; font-size: 14px; }
                .value { font-weight: 700; color: #1f2937; font-size: 15px; }
                .cta-button { display: inline-block; background: #3b82f6; color: white; padding: 18px 40px; border-radius: 14px; text-decoration: none; font-weight: 700; font-size: 17px; }
                .footer { background: #f8fafc; padding: 25px; text-align: center; color: #64748b; font-size: 13px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Hambalyo ${customerName}!</h1>
                  <p>Koorsadaada waa la furay!</p>
                </div>
                <div class="content">
                  <p><strong>Asalaamu Caleykum,</strong><br><br>
                  Rasiidkaaga waa la hubiyey oo <strong>"${course?.title}"</strong> ayaa hadda laguu furay.</p>
                  
                  <div class="info-box">
                    <div class="info-row">
                      <span class="label">📚 Koorsada:</span>
                      <span class="value">${course?.title}</span>
                    </div>
                    <div class="info-row">
                      <span class="label">💳 Nooca:</span>
                      <span class="value">${planLabels[planType] || planType}</span>
                    </div>
                    <div class="info-row">
                      <span class="label">📅 ${accessEnd ? 'Waxay dhacaysaa:' : 'Mudada:'}</span>
                      <span class="value">${accessEndText}</span>
                    </div>
                  </div>
                  
                  ${isMonthly ? `<p style="background: #fef3c7; padding: 15px; border-radius: 10px; color: #92400e;">⚠️ <strong>Ogow:</strong> Koorsadaadu waxay kaa dhacaysaa ${accessEndText}.</p>` : ''}
                  
                  <p style="text-align: center; margin-top: 30px;">
                    <a href="https://appbarbaarintasan.com/profile" class="cta-button">📚 Bilow Koorsada</a>
                  </p>
                </div>
                <div class="footer">
                  <p>Barbaarintasan Academy - Waxbarashada Waalidnimada</p>
                </div>
              </div>
            </body>
            </html>
          `
        }).catch(err => console.error("[CONFIRM] Failed to send confirmation email:", err));
      }
      
      return res.json({
        success: true,
        message: "Hambalyo! Koorsadaada waa la furay!",
        accessEnd: accessEnd?.toISOString() || null
      });
      
    } catch (error: any) {
      console.error("[CONFIRM] Error:", error);
      return res.status(500).json({ error: "Wax khalad ah ayaa dhacay. Fadlan isku day mar kale." });
    }
  });

  // Payment Submission routes
  app.post("/api/payment-submissions", async (req, res) => {
    try {
      const submissionData = insertPaymentSubmissionSchema.parse(req.body);
      
      // ========== AI RECEIPT VALIDATION (REQUIRED) ==========
      // Check if screenshot is provided and validate it with AI
      if (submissionData.screenshotUrl) {
        console.log("[PAYMENT] Validating receipt before submission...");
        
        try {
          let imageBase64: string;
          
          // Check if it's already a base64 data URL
          if (submissionData.screenshotUrl.startsWith('data:')) {
            const matches = submissionData.screenshotUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (matches && matches[2]) {
              imageBase64 = matches[2];
              console.log("[PAYMENT] Using base64 data URL, size:", imageBase64.length);
            } else {
              console.error("[PAYMENT] Invalid data URL format");
              return res.status(400).json({ 
                error: "Sawirka ma la heli karo. Fadlan isku day mar kale."
              });
            }
          } else {
            // Fetch image from object storage
            try {
              const { ObjectStorageService } = await import("./replit_integrations/object_storage/objectStorage");
              const objectStorageService = new ObjectStorageService();
              const objectFile = await objectStorageService.getObjectEntityFile(submissionData.screenshotUrl);
              const [buffer] = await objectFile.download();
              imageBase64 = buffer.toString("base64");
              console.log("[PAYMENT] Image fetched from storage, size:", buffer.length);
            } catch (fetchError) {
              console.error("[PAYMENT] Failed to fetch image:", fetchError);
              return res.status(400).json({ 
                error: "Sawirka ma la heli karo. Fadlan isku day mar kale."
              });
            }
          }
          
          const OpenAI = (await import("openai")).default;
          const openai = process.env.AI_INTEGRATIONS_OPENAI_API_KEY
            ? new OpenAI({ apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY, baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL })
            : new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: `You are a STRICT receipt validation assistant. Your job is to verify if an image is a REAL mobile money payment receipt.

⚠️ CRITICAL - AUTOMATIC REJECTION (is_valid_receipt = false, confidence = 0):
You MUST IMMEDIATELY REJECT if ANY of these are true:
1. Image shows a person's face, child, baby, selfie, or any human photo
2. Image is a random photo, screenshot of something else, meme, or non-financial content
3. Image does NOT show a mobile money app interface (EVC Plus, Zaad, E-Dahab, Sahal) or remittance receipt (Taaj, Dahabshiil, Amal, Kaah, or other xawilaad services)
4. Image has no visible monetary amount ($, USD, or numbers with currency)
5. Image has no transaction reference number (Tix:, Ref:, ID:, RID:)
6. Image looks edited, photoshopped, or artificially created
7. Image is blurry or unreadable

✅ VALID RECEIPT MUST HAVE ALL OF THESE:
1. Mobile money app UI visible (EVC Plus green, Zaad blue, E-Dahab, Sahal) OR remittance/xawilaad receipt (Taaj, Dahabshiil, Amal, Kaah)
2. Clear monetary amount in USD (like $15, $70, $114)
3. Transaction reference number (Tix: XXXXXXXXX or similar)
4. Date of transaction visible

CRITICAL DATE CHECK:
- "Tar" means "Date" in Somali
- Extract the date and ALWAYS convert to DD/MM/YYYY format:
  * "07-Jan-2026" → "07/01/2026"
  * "15-Feb-2026" → "15/02/2026"
  * Month abbreviations: Jan=01, Feb=02, Mar=03, Apr=04, May=05, Jun=06, Jul=07, Aug=08, Sep=09, Oct=10, Nov=11, Dec=12
- Receipts OLDER than 7 days must be REJECTED (is_valid_receipt = false)
- Today's date is: ${new Date().toISOString().split('T')[0]}

IMPORTANT: Set is_mobile_money_ui=true for BOTH:
- Mobile money apps (EVC Plus, Zaad, E-Dahab, Sahal)
- Remittance/xawilaad receipts (Taaj Services, Dahabshiil, Amal, Kaah)

Return JSON:
{
  "is_valid_receipt": boolean,
  "is_mobile_money_ui": boolean (true for mobile money OR xawilaad/remittance),
  "is_remittance_receipt": boolean (true if Taaj, Dahabshiil, Amal, Kaah, or other xawilaad),
  "has_amount": boolean,
  "has_reference": boolean,
  "is_human_photo": boolean,
  "confidence": number (0-100),
  "detected_date": "the date shown (format: DD/MM/YYYY)",
  "is_date_too_old": boolean (true if receipt is older than 7 days),
  "rejection_reason": "Why rejected if invalid",
  "reason_so": "Somali language reason"
}`
              },
              {
                role: "user",
                content: [
                  { type: "text", text: "IMPORTANT: If this is NOT a payment receipt (shows a person, child, random photo), REJECT with is_valid_receipt=false, confidence=0. Approve genuine receipts from: EVC Plus, Zaad, E-Dahab, Sahal (mobile money) OR Taaj, Dahabshiil, Amal, Kaah (xawilaad/remittance)." },
                  { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } }
                ]
              }
            ],
            max_tokens: 300,
            response_format: { type: "json_object" }
          });
          
          const aiResponse = response.choices[0]?.message?.content;
          console.log("[PAYMENT] AI Validation Response:", aiResponse);
          
          if (aiResponse) {
            const result = JSON.parse(aiResponse);
            
            // Reject if it's a human photo
            if (result.is_human_photo === true) {
              console.log("[PAYMENT] REJECTED - Human photo detected");
              return res.status(400).json({
                error: "Sawirkaagu ma aha rasiid. Waxaad soo dirtay sawir qof (caruur/selfie). Fadlan soo dir sawirka rasiidka lacag bixinta.",
                code: "INVALID_RECEIPT"
              });
            }
            
            // Reject if no mobile money UI and not a remittance receipt
            const isValidPaymentType = result.is_mobile_money_ui === true || result.is_remittance_receipt === true;
            if (!isValidPaymentType) {
              console.log("[PAYMENT] REJECTED - Not a mobile money or remittance receipt");
              return res.status(400).json({
                error: "Sawirkaagu ma aha rasiid lacag bixin (EVC, Zaad, E-Dahab, Sahal, ama xawilaad sida Taaj/Dahabshiil). Fadlan soo dir screenshot-ka rasiidka.",
                code: "INVALID_RECEIPT"
              });
            }
            
            // Reject if no amount visible
            if (result.has_amount !== true) {
              console.log("[PAYMENT] REJECTED - No amount visible");
              return res.status(400).json({
                error: "Lacagta lama arko sawirka. Fadlan soo dir sawir cad oo lacagta lagu arko.",
                code: "INVALID_RECEIPT"
              });
            }
            
            // Reject if no reference number
            if (result.has_reference !== true) {
              console.log("[PAYMENT] REJECTED - No reference number");
              return res.status(400).json({
                error: "Reference number-ka (Tix:) lama arko sawirka. Fadlan soo dir sawir buuxa.",
                code: "INVALID_RECEIPT"
              });
            }
            
            // Reject if confidence too low (less than 85%)
            if (result.confidence < 85 || result.is_valid_receipt !== true) {
              console.log("[PAYMENT] REJECTED - Low confidence or invalid:", result.confidence);
              return res.status(400).json({
                error: result.reason_so || "Sawirka rasiidku cad ma aha. Fadlan soo dir sawir cad oo buuxa.",
                code: "INVALID_RECEIPT"
              });
            }
            
            // Reject if receipt date is too old (more than 7 days)
            if (result.is_date_too_old === true) {
              console.log("[PAYMENT] REJECTED - Receipt date too old:", result.detected_date);
              return res.status(400).json({
                error: `Rasiidkan waa mid qadiim ah (${result.detected_date}). Fadlan soo dir rasiid cusub oo aan ka weynayn 7 maalmood.`,
                code: "RECEIPT_TOO_OLD"
              });
            }
            
            // Additional server-side date validation as backup
            if (result.detected_date) {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              
              // Parse DD/MM/YYYY format
              const dateMatch = result.detected_date.match(/(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})/);
              if (dateMatch) {
                const [, day, month, year] = dateMatch;
                const receiptDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                receiptDate.setHours(0, 0, 0, 0);
                
                const diffTime = today.getTime() - receiptDate.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                
                console.log("[PAYMENT] Server date validation - Receipt:", result.detected_date, "Days old:", diffDays);
                
                if (diffDays > 7) {
                  console.log("[PAYMENT] REJECTED by server - Receipt is", diffDays, "days old");
                  return res.status(400).json({
                    error: `Rasiidkan waa mid qadiim ah (${diffDays} maalmood ka hor). Fadlan soo dir rasiid cusub oo aan ka weynayn 7 maalmood.`,
                    code: "RECEIPT_TOO_OLD"
                  });
                }
                
                if (diffDays < 0) {
                  console.log("[PAYMENT] REJECTED - Future date detected");
                  return res.status(400).json({
                    error: "Taariikhda rasiidka waa mid mustaqbalka ah. Fadlan soo dir rasiid sax ah.",
                    code: "FUTURE_DATE"
                  });
                }
              }
            }
            
            console.log("[PAYMENT] Receipt validated successfully, confidence:", result.confidence);
          }
        } catch (aiError) {
          console.error("[PAYMENT] AI validation error:", aiError);
          // On AI error, allow submission but flag for manual review
          console.log("[PAYMENT] AI validation failed, proceeding with manual review flag");
        }
      }
      // ========== END AI RECEIPT VALIDATION ==========
      
      // Check if user already has an active enrollment for this course
      const existingEnrollment = await storage.getEnrollmentByPhoneAndCourse(
        submissionData.customerPhone,
        submissionData.courseId
      );
      
      // Allow renewals - if user has active enrollment, mark this as a renewal
      let isRenewal = false;
      let existingAccessEnd: Date | null = null;
      
      if (existingEnrollment && existingEnrollment.status === "active") {
        // This is a renewal - allow it and store existing access end date
        isRenewal = true;
        existingAccessEnd = existingEnrollment.accessEnd ? new Date(existingEnrollment.accessEnd) : null;
        
        // For lifetime (onetime) enrollments, don't allow renewal
        if (!existingEnrollment.accessEnd) {
          return res.status(400).json({ 
            error: "Koorsadan weligaa ayaa laguu furay oo uma baahnid cusboonayn. Mahadsanid!",
            code: "LIFETIME_ACCESS"
          });
        }
      }
      
      // Create submission with renewal info (passed AI validation)
      const submission = await storage.createPaymentSubmission({
        ...submissionData,
        isRenewal,
        existingAccessEnd
      });
      
      // Send email notification to admin
      const course = await storage.getCourse(submission.courseId);
      const paymentMethod = submission.paymentMethodId ? await storage.getPaymentMethod(submission.paymentMethodId) : undefined;
      const planLabels: Record<string, string> = { onetime: "Hal Mar ($70)", monthly: "Bille ($15)", yearly: "Sanad ($114)" };
      
      const adminEmail = process.env.SMTP_EMAIL;
      if (adminEmail) {
        sendEmail({
          to: adminEmail,
          subject: `🔔 Lacag Bixin Cusub - ${submission.customerName}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"><style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #f97316; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .info-box { background: #fff; border-left: 4px solid #f97316; padding: 15px; margin: 15px 0; border-radius: 0 8px 8px 0; }
            </style></head>
            <body>
              <div class="container">
                <div class="header"><h1>🔔 Lacag Bixin Cusub!</h1></div>
                <div class="content">
                  <div class="info-box">
                    <p><strong>Macmiil:</strong> ${submission.customerName}</p>
                    <p><strong>Tel:</strong> ${submission.customerPhone}</p>
                    <p><strong>Email:</strong> ${submission.customerEmail || 'Ma jirto'}</p>
                    <p><strong>Koorso:</strong> ${course?.title || 'Unknown'}</p>
                    <p><strong>Qorshe:</strong> ${planLabels[submission.planType] || submission.planType}</p>
                    <p><strong>Lacag:</strong> $${submission.amount}</p>
                    <p><strong>Hab:</strong> ${paymentMethod?.name || 'Unknown'}</p>
                    <p><strong>Reference:</strong> ${submission.referenceCode || 'Ma jirto'}</p>
                  </div>
                  <p style="text-align: center; margin-top: 20px;">
                    <a href="https://barbaarintasan-academy.replit.app/admin" style="display: inline-block; background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                      Gal Admin Panel
                    </a>
                  </p>
                </div>
              </div>
            </body>
            </html>
          `
        }).catch(console.error);
      }
      
      // Send confirmation email to customer that payment is pending review
      if (submission.customerEmail && course) {
        sendPaymentPendingEmail(
          submission.customerEmail,
          submission.customerName,
          course.title,
          submission.amount
        ).catch(console.error);
      }
      
      res.status(201).json(submission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid submission data", details: error.errors });
      }
      console.error("Error creating payment submission:", error);
      res.status(500).json({ error: "Failed to submit payment" });
    }
  });

  // Admin: Get all payment submissions
  app.get("/api/payment-submissions", requireAuth, async (req, res) => {
    try {
      const submissions = await storage.getAllPaymentSubmissions();
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching payment submissions:", error);
      res.status(500).json({ error: "Failed to fetch payment submissions" });
    }
  });

  // Admin: Approve or reject payment
  app.patch("/api/payment-submissions/:id", requireAuth, async (req, res) => {
    try {
      const { status } = req.body;
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const submission = await storage.getPaymentSubmission(req.params.id);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      const updated = await storage.updatePaymentSubmissionStatus(req.params.id, status, req.session.userId!);

      // If approved, create or renew enrollment
      if (status === "approved" && updated) {
        // Calculate access end date based on plan
        // Monthly=$15 → 1 bil, Yearly/Dahabi=$114 → 12 bilood, Onetime=$70 → 6 bilood
        let accessEnd: Date | null = null;
        if (updated.planType === "monthly") {
          accessEnd = new Date();
          accessEnd.setMonth(accessEnd.getMonth() + 1);
        } else if (updated.planType === "yearly") {
          accessEnd = new Date();
          accessEnd.setFullYear(accessEnd.getFullYear() + 1);
        } else if (updated.planType === "onetime") {
          accessEnd = new Date();
          accessEnd.setMonth(accessEnd.getMonth() + 6);
        }

        // Try to find parent by email to link enrollment
        let parentId: string | null = null;
        if (updated.customerEmail) {
          const parent = await storage.getParentByEmail(updated.customerEmail);
          if (parent) {
            parentId = parent.id;
          }
        }

        // Check if parent already has an enrollment for this course (renewal case)
        let existingEnrollment = null;
        if (parentId) {
          existingEnrollment = await storage.getEnrollmentByParentAndCourse(parentId, updated.courseId);
        }
        if (!existingEnrollment && updated.customerPhone) {
          existingEnrollment = await storage.getEnrollmentByPhoneAndCourse(updated.customerPhone, updated.courseId);
        }

        if (existingEnrollment) {
          // Renewal: Extend from the later of existing accessEnd or now (preserves pre-paid time)
          let renewalBaseDate = new Date();
          if (existingEnrollment.accessEnd && new Date(existingEnrollment.accessEnd) > renewalBaseDate) {
            renewalBaseDate = new Date(existingEnrollment.accessEnd);
          }
          
          // Check if this is an UPGRADE from monthly to yearly
          const isUpgradeFromMonthly = 
            existingEnrollment.planType === "monthly" && 
            updated.planType === "yearly";
          
          // Calculate dynamic upgrade price based on what was previously paid
          let expectedUpgradeAmount = 0;
          if (isUpgradeFromMonthly) {
            let monthlyPaid = 15;
            if (existingEnrollment.paymentSubmissionId) {
              const prevPayment = await storage.getPaymentSubmission(existingEnrollment.paymentSubmissionId);
              if (prevPayment) monthlyPaid = prevPayment.amount;
            }
            const courseForUpgrade = await storage.getCourse(updated.courseId);
            const yearlyFull = courseForUpgrade?.priceYearly || 114;
            expectedUpgradeAmount = Math.max(1, yearlyFull - monthlyPaid + 1);
            console.log(`[UPGRADE] Monthly->Yearly: monthlyPaid=$${monthlyPaid}, yearlyFull=$${yearlyFull}, expectedUpgrade=$${expectedUpgradeAmount}, actualAmount=$${updated.amount}`);
          }
          
          // Apply upgrade extension (11 months) if amount matches expected upgrade price (within tolerance)
          const approvalUpgradeTolerance = 10;
          const applyUpgradeExtension = isUpgradeFromMonthly && 
            expectedUpgradeAmount > 0 &&
            Math.abs(updated.amount - expectedUpgradeAmount) <= approvalUpgradeTolerance;
          
          // Calculate new accessEnd based on plan and renewal base date
          let newAccessEnd: Date | null = null;
          if (updated.planType === "monthly") {
            newAccessEnd = new Date(renewalBaseDate);
            newAccessEnd.setMonth(newAccessEnd.getMonth() + 1);
          } else if (updated.planType === "yearly") {
            newAccessEnd = new Date(renewalBaseDate);
            if (applyUpgradeExtension) {
              // UPGRADE: Add 11 months (total = existing time + 11 months = ~12 months)
              newAccessEnd.setMonth(newAccessEnd.getMonth() + 11);
              console.log(`[UPGRADE] Monthly to Yearly upgrade detected. Adding 11 months from ${renewalBaseDate} to ${newAccessEnd}`);
            } else {
              // Normal yearly renewal: add 1 year
              newAccessEnd.setFullYear(newAccessEnd.getFullYear() + 1);
            }
          }
          // "onetime" = null = lifetime access
          
          await storage.renewEnrollment(existingEnrollment.id, updated.planType, newAccessEnd, updated.id, updated.customerPhone);
          console.log(`Renewed enrollment ${existingEnrollment.id} for course ${updated.courseId}, extended to ${newAccessEnd}, linked to payment ${updated.id}`);
          
          // For yearly plans: also grant access to ALL other courses
          if (updated.planType === "yearly" && parentId) {
            const allCourses = await storage.getAllCourses();
            const liveCourses = allCourses.filter((c: any) => c.isLive && c.id !== updated.courseId);
            
            for (const course of liveCourses) {
              const courseEnrollment = await storage.getEnrollmentByParentAndCourse(parentId, course.id);
              if (courseEnrollment) {
                // Extend existing enrollment
                await storage.renewEnrollment(courseEnrollment.id, updated.planType, newAccessEnd);
              } else {
                // Create new enrollment for this course
                await storage.createEnrollment({
                  customerPhone: updated.customerPhone,
                  parentId,
                  courseId: course.id,
                  planType: updated.planType,
                  accessEnd: newAccessEnd,
                  status: "active",
                });
              }
            }
            console.log(`Yearly plan approved: granted access to ${liveCourses.length} additional courses until ${newAccessEnd}`);
          }
        } else {
          // New enrollment
          await storage.createEnrollment({
            customerPhone: updated.customerPhone,
            parentId,
            courseId: updated.courseId,
            planType: updated.planType,
            accessEnd,
            status: "active",
            paymentSubmissionId: updated.id,
          });
          console.log(`Created new enrollment for course ${updated.courseId}`);
          
          // For yearly plans: also grant access to ALL other courses
          if (updated.planType === "yearly" && parentId) {
            const allCourses = await storage.getAllCourses();
            const liveCourses = allCourses.filter((c: any) => c.isLive && c.id !== updated.courseId);
            
            for (const course of liveCourses) {
              const courseEnrollment = await storage.getEnrollmentByParentAndCourse(parentId, course.id);
              if (!courseEnrollment) {
                await storage.createEnrollment({
                  customerPhone: updated.customerPhone,
                  parentId,
                  courseId: course.id,
                  planType: updated.planType,
                  accessEnd,
                  status: "active",
                });
              }
            }
            console.log(`Yearly plan approved: granted access to ${liveCourses.length} additional courses`);
          }
        }

        // Send purchase confirmation email
        if (updated.customerEmail) {
          const course = await storage.getCourse(updated.courseId);
          const courseName = course?.title || "Koorsada";
          const courseSlug = course?.courseId || undefined;
          const emailSent = await sendPurchaseConfirmationEmail(
            updated.customerEmail,
            updated.customerName,
            courseName,
            updated.planType,
            updated.amount,
            courseSlug
          );
          if (emailSent) {
            console.log(`Purchase confirmation email sent to ${updated.customerEmail}`);
          } else {
            console.error(`Failed to send purchase confirmation email to ${updated.customerEmail}`);
          }
        }
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating payment submission:", error);
      res.status(500).json({ error: "Failed to update payment submission" });
    }
  });

  // Admin: Edit payment submission (notes, status)
  app.patch("/api/admin/payment-submissions/:id/edit", requireAuth, async (req, res) => {
    try {
      const { status, notes } = req.body;
      
      const submission = await storage.getPaymentSubmission(req.params.id);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      // If status is changing to rejected and it was approved, we may need to revoke enrollment
      if (status === "refunded" && submission.status === "approved") {
        // Find and cancel any related enrollments
        const enrollment = await storage.getEnrollmentByPhoneAndCourse(submission.customerPhone, submission.courseId);
        if (enrollment) {
          await storage.updateEnrollmentStatus(enrollment.id, "cancelled");
        }
      }

      const updated = await storage.updatePaymentSubmission(req.params.id, {
        status: status || submission.status,
        notes,
        reviewedBy: req.session.userId!
      });

      res.json(updated);
    } catch (error) {
      console.error("Error editing payment submission:", error);
      res.status(500).json({ error: "Failed to edit payment submission" });
    }
  });

  // Admin: Delete any payment submission
  app.delete("/api/admin/payment-submissions/:id", requireAuth, async (req, res) => {
    try {
      const submission = await storage.getPaymentSubmission(req.params.id);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      // If the payment was approved, also delete the enrollment
      if (submission.status === "approved") {
        const enrollment = await storage.getEnrollmentByPhoneAndCourse(submission.customerPhone, submission.courseId);
        if (enrollment) {
          await storage.deleteEnrollment(enrollment.id);
          console.log(`Deleted enrollment ${enrollment.id} for parent ${submission.customerPhone}`);
        }
      }

      await storage.deletePaymentSubmission(req.params.id);
      res.json({ success: true, message: "Payment submission deleted" });
    } catch (error) {
      console.error("Error deleting payment submission:", error);
      res.status(500).json({ error: "Failed to delete payment submission" });
    }
  });

  // ===== SUBSCRIPTION RENEWAL (Non-Course-Specific) =====
  
  // Validate receipt for subscription renewal (no course ID required)
  app.post("/api/validate-receipt-subscription", requireParentAuth, async (req, res) => {
    try {
      const { screenshotUrl, paymentMethodId, customerName, customerPhone, customerEmail, planType } = req.body;
      const parentId = req.session.parentId!;
      
      if (!screenshotUrl) {
        return res.json({ valid: false, error: "Screenshot URL is required" });
      }
      
      // DUPLICATE CHECK: Check if this exact screenshot URL was already used
      const existingSubWithScreenshot = await db.select().from(paymentSubmissions)
        .where(and(
          eq(paymentSubmissions.screenshotUrl, screenshotUrl),
          inArray(paymentSubmissions.status, ["approved", "pending"])
        ))
        .limit(1);
      
      if (existingSubWithScreenshot.length > 0) {
        console.log(`[RECEIPT-SUB] DUPLICATE SCREENSHOT detected! Same image in submission: ${existingSubWithScreenshot[0].id}`);
        return res.json({
          valid: false,
          autoApproved: false,
          error: "Rasiidkan hore ayaa la isticmaalay. Fadlan soo dir rasiid cusub oo kale."
        });
      }
      
      // Get parent info
      const parent = await storage.getParent(parentId);
      if (!parent) {
        return res.status(404).json({ error: "Parent not found" });
      }
      
      // Check if parent has any paid enrollment
      const parentEnrollments = await storage.getEnrollmentsByParentId(parentId);
      const paidEnrollment = parentEnrollments.find((e: any) => 
        e.planType === "monthly" || e.planType === "yearly"
      );
      
      if (!paidEnrollment) {
        return res.status(403).json({ 
          error: "Kaliya waalidka horey lacag u bixiyey ayaa isticmaali kara boggan"
        });
      }
      
      let imageBase64: string;
      
      // Check if it's already a base64 data URL
      if (screenshotUrl.startsWith('data:')) {
        const matches = screenshotUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (matches && matches[2]) {
          imageBase64 = matches[2];
          console.log("[RECEIPT-COURSE] Using base64 data URL, size:", imageBase64.length);
        } else {
          console.error("[RECEIPT-COURSE] Invalid data URL format");
          return res.json({ valid: false, error: "Sawirka ma la heli karo. Fadlan isku day mar kale." });
        }
      } else {
        // Fetch image from object storage
        try {
          const { ObjectStorageService } = await import("./replit_integrations/object_storage/objectStorage");
          const objectStorageService = new ObjectStorageService();
          const objectFile = await objectStorageService.getObjectEntityFile(screenshotUrl);
          const [buffer] = await objectFile.download();
          imageBase64 = buffer.toString("base64");
        } catch (error) {
          console.error("[RECEIPT-COURSE] Failed to download image:", error);
          return res.json({ valid: false, error: "Sawirka ma la heli karo. Fadlan isku day mar kale." });
        }
      }
      
      const OpenAI = (await import("openai")).default;
      const openai = process.env.AI_INTEGRATIONS_OPENAI_API_KEY
        ? new OpenAI({ apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY, baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL })
        : new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a STRICT receipt validation assistant for Barbaarintasan Academy (Somali education platform). Your job is to verify if an image is a REAL mobile money payment receipt.

⚠️ CRITICAL - AUTOMATIC REJECTION (is_receipt = false, confidence = 0):
You MUST IMMEDIATELY REJECT and set is_receipt=false if ANY of these are true:
1. Image shows a person's face, child, baby, selfie, or any human photo
2. Image is a random photo, screenshot of something else, meme, or non-financial content
3. Image does NOT show a mobile money app interface (EVC Plus, Zaad, E-Dahab, Sahal) or remittance receipt (Taaj, Dahabshiil, Amal, Kaah, or other xawilaad services)
4. Image has no visible monetary amount ($, USD, or numbers with currency)
5. Image has no transaction reference number (Tix:, Ref:, ID:, RID:)
6. Image looks edited, photoshopped, or artificially created
7. Image is blurry or unreadable

✅ VALID RECEIPT MUST HAVE ALL OF THESE:
1. Mobile money app UI visible (EVC Plus green, Zaad blue, E-Dahab, Sahal) OR remittance/xawilaad receipt (Taaj Services, Dahabshiil, Amal, Kaah with RID/reference number)
2. Clear monetary amount in USD (like $15, $70, $114)
3. Transaction reference number (Tix: XXXXXXXXX or similar code)
4. Date of transaction visible - ALWAYS convert to DD/MM/YYYY format:
   * "07-Jan-2026" → "07/01/2026"
   * "15-Feb-2026" → "15/02/2026"
   * Month abbreviations: Jan=01, Feb=02, Mar=03, Apr=04, May=05, Jun=06, Jul=07, Aug=08, Sep=09, Oct=10, Nov=11, Dec=12
5. Recipient name visible

PAYMENT SYSTEMS TO RECOGNIZE:
- EVC Plus: Green interface, "Hormuud", "Transfer", "Payment", "EVC"
- Zaad: Blue interface, "ZAAD SERVICES", "Telesom", "Tix:" for reference
- E-Dahab: "Somtel" branding
- Sahal: Mobile money service, similar to EVC/Zaad
- Xawilaad/Remittance: Taaj Services, Dahabshiil, Amal, Kaah - uses RID for reference, shows sender/receiver details, "Remittance Receipt"
- "ayaad u dirtay" = "you sent to" in Somali

RECIPIENT VALIDATION:
The payment MUST be sent to the academy owner. Valid recipient names include:
- "MUSSE SAID AWMUSSE" or "Musse Said Aw-Musse"
- "MUSE SAID" or "MUUSE SICIID" or similar variations
- Any name containing: MUSSE, MUSE, MUUSE, SICIID, AWMUSSE
- Phone number: 0907790584 or 907790584

AMOUNT VALIDATION:
- Monthly plan: $15 (or close to it)
- Yearly plan: $114 (or close to it)  
- One-time plan: $70 (or close to it)

IMPORTANT: Set is_mobile_money_ui=true for BOTH:
- Mobile money apps (EVC Plus, Zaad, E-Dahab, Sahal)
- Remittance/xawilaad receipts (Taaj Services, Dahabshiil, Amal, Kaah)

Return a JSON object with:
{
  "is_receipt": boolean,
  "is_mobile_money_ui": boolean (true for mobile money OR xawilaad/remittance),
  "is_remittance_receipt": boolean (true if Taaj, Dahabshiil, Amal, Kaah, or other xawilaad),
  "has_amount": boolean,
  "has_reference": boolean,
  "is_human_photo": boolean,
  "confidence": number (0-100),
  "detected_amount": string or null,
  "detected_date": string or null (format: DD/MM/YYYY or YYYY-MM-DD),
  "detected_time": string or null,
  "reference_number": string or null (Tix code or RID),
  "recipient_name": string or null,
  "recipient_valid": boolean,
  "sender_name": string or null,
  "sender_phone": string or null,
  "rejection_reason": string if rejected,
  "reason_so": string in Somali
}`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "IMPORTANT: First check if this is a REAL payment receipt. If you see a person's face, child, random photo, or anything that is NOT a payment receipt - REJECT IT IMMEDIATELY with is_receipt=false and confidence=0. Only approve if you see a genuine payment receipt from: EVC Plus, Zaad, E-Dahab, Sahal (mobile money) OR Taaj Services, Dahabshiil, Amal, Kaah (xawilaad/remittance) with amount, reference number (RID/Tix), and recipient." },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
            ]
          }
        ],
        max_tokens: 500,
        response_format: { type: "json_object" }
      });
      
      const content = response.choices[0]?.message?.content || "";
      let result: any;
      try {
        result = JSON.parse(content);
      } catch {
        result = { is_receipt: false };
      }
      
      // STRICT VALIDATION for subscription receipts
      const isMobileMoneyUI = result.is_mobile_money_ui === true || result.is_remittance_receipt === true;
      const hasAmount = result.has_amount === true;
      const hasReference = result.has_reference === true;
      const isHumanPhoto = result.is_human_photo === true;
      
      // Reject immediately if it's a human photo
      if (isHumanPhoto) {
        console.log("[SUBSCRIPTION RECEIPT] REJECTED - Human photo detected");
        return res.json({
          valid: false,
          error: "Sawirkaagu ma aha rasiid. Waxaad soo dirtay sawir qof (caruur/selfie). Fadlan soo dir sawirka rasiidka lacag bixinta.",
          details: result
        });
      }
      
      // Reject if no mobile money UI
      if (!isMobileMoneyUI) {
        console.log("[SUBSCRIPTION RECEIPT] REJECTED - Not a mobile money interface");
        return res.json({
          valid: false,
          error: "Sawirkaagu ma aha rasiid lacag bixin (EVC, Zaad, E-Dahab, Sahal, ama xawilaad sida Taaj/Dahabshiil). Fadlan soo dir screenshot-ka rasiidka.",
          details: result
        });
      }
      
      // Reject if no amount
      if (!hasAmount) {
        console.log("[SUBSCRIPTION RECEIPT] REJECTED - No amount visible");
        return res.json({
          valid: false,
          error: "Lacagta lama arko sawirka. Fadlan soo dir sawir cad oo lacagta lagu arko.",
          details: result
        });
      }
      
      // Reject if no reference
      if (!hasReference) {
        console.log("[SUBSCRIPTION RECEIPT] REJECTED - No reference number");
        return res.json({
          valid: false,
          error: "Reference number-ka (Tix:) lama arko sawirka. Fadlan soo dir sawir buuxa.",
          details: result
        });
      }
      
      // Require 85% confidence (raised from implicit lower threshold)
      const isValid = result.is_receipt === true && result.confidence >= 85;
      const highConfidence = result.confidence >= 95;
      const canAutoApprove = paymentMethodId && customerName && customerPhone && planType;
      
      // Date validation helper
      const isReceiptDateValid = (detectedDate: string | null): { valid: boolean; daysOld: number | null; isFuture?: boolean } => {
        if (!detectedDate) return { valid: false, daysOld: null };
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let receiptDate: Date | null = null;
        const cleanedDate = detectedDate.trim();
        
        // Try DD/MM/YYYY first (Somali standard)
        const ddmmyyyy = cleanedDate.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
        if (ddmmyyyy) {
          const [, day, month, year] = ddmmyyyy;
          receiptDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
        
        // Try YYYY-MM-DD
        if (!receiptDate) {
          const iso = cleanedDate.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
          if (iso) {
            const [, year, month, day] = iso;
            receiptDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          }
        }
        
        // Try DD-Mon-YYYY format (like "07-Jan-2026")
        if (!receiptDate) {
          const monthNames: Record<string, number> = {
            'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
            'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
          };
          const textMatch = cleanedDate.match(/^(\d{1,2})[\/\-\.]([a-zA-Z]{3})[\/\-\.](\d{4})/i);
          if (textMatch) {
            const [, day, monthStr, year] = textMatch;
            const monthIndex = monthNames[monthStr.toLowerCase()];
            if (monthIndex !== undefined) {
              receiptDate = new Date(parseInt(year), monthIndex, parseInt(day));
              console.log(`[DATE] Parsed ${cleanedDate} as DD-Mon-YYYY: ${receiptDate}`);
            }
          }
        }
        
        // Try text format via JS Date parser
        if (!receiptDate) {
          const parsed = new Date(cleanedDate);
          if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2020) {
            receiptDate = parsed;
          }
        }
        
        if (!receiptDate || isNaN(receiptDate.getTime())) {
          console.log(`[DATE] Failed to parse date: ${cleanedDate}`);
          return { valid: false, daysOld: null };
        }
        
        receiptDate.setHours(0, 0, 0, 0);
        const diffTime = today.getTime() - receiptDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
          return { valid: false, daysOld: diffDays, isFuture: true };
        }
        
        // Accept receipts that are at most 7 days old (0-7 days)
        return { valid: diffDays <= 7, daysOld: diffDays };
      };
      
      // Helper to normalize reference number for comparison
      const normalizeReference = (ref: string | null): string | null => {
        if (!ref) return null;
        return ref.replace(/[\s\-\.]/g, '').toUpperCase();
      };
      
      // Helper to normalize date to YYYY-MM-DD format
      const normalizeDateToISO = (dateStr: string | null): string | null => {
        if (!dateStr) return null;
        const cleanedDate = dateStr.trim();
        
        // Try DD/MM/YYYY
        const ddmmyyyy = cleanedDate.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
        if (ddmmyyyy) {
          const [, day, month, year] = ddmmyyyy;
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        // Try YYYY-MM-DD
        const iso = cleanedDate.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
        if (iso) {
          const [, year, month, day] = iso;
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        // Try text format like "07-Jan-2026"
        const parsed = new Date(cleanedDate);
        if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2020) {
          return parsed.toISOString().split('T')[0];
        }
        
        return null;
      };
      
      // Extract amount in cents for fingerprinting
      const extractAmountCents = (amountStr: string | null): number | null => {
        if (!amountStr) return null;
        const match = amountStr.match(/(\d+(?:\.\d+)?)/);
        if (match) {
          return Math.round(parseFloat(match[1]) * 100);
        }
        return null;
      };
      
      if (isValid && highConfidence && canAutoApprove) {
        // Check receipt date
        const dateCheck = isReceiptDateValid(result.detected_date);
        if (!dateCheck.valid) {
          let errorMessage: string;
          if (dateCheck.daysOld === null) {
            errorMessage = "Taariikhda rasiidka lama aqrin karo. Fadlan soo dir sawir cusub.";
          } else if (dateCheck.isFuture) {
            errorMessage = "Taariikhda rasiidka waa mid mustaqbalka ah. Fadlan soo dir rasiid sax ah.";
          } else {
            errorMessage = `Rasiidkan waa mid qadiim ah (${dateCheck.daysOld} maalmood ka hor). Fadlan soo dir rasiid cusub oo aan ka weynayn 7 maalmood.`;
          }
          return res.json({ valid: false, autoApproved: false, error: errorMessage });
        }
        
        // Check for duplicate receipt
        const normalizedRef = normalizeReference(result.reference_number);
        const normalizedDate = normalizeDateToISO(result.detected_date);
        const amountCents = extractAmountCents(result.detected_amount);
        const normalizedTime = result.detected_time || null;
        const normalizedSenderPhone = result.sender_phone ? result.sender_phone.replace(/\D/g, '') : null;
        
        const duplicateReceipt = await storage.findDuplicateReceipt(
          normalizedRef, 
          normalizedDate, 
          amountCents, 
          normalizedTime, 
          normalizedSenderPhone
        );
        if (duplicateReceipt) {
          console.log(`[RECEIPT] Duplicate detected! Reference: ${normalizedRef}, Date: ${normalizedDate}, Time: ${normalizedTime}`);
          return res.json({ 
            valid: false, 
            autoApproved: false, 
            error: "Rasiidkan hore ayaa la isticmaalay. Fadlan soo dir rasiid cusub oo kale." 
          });
        }
        
        // Check recipient name validation
        if (result.recipient_valid === false) {
          console.log("[RECEIPT] Rejected - recipient invalid:", result.recipient_name);
          return res.json({
            valid: false,
            autoApproved: false,
            error: "Lacagta waxaa loo diray qof kale oo aan ahayn Barbaarintasan Academy. Fadlan u dir lacagta MUSSE SAID AWMUSSE (0907790584)."
          });
        }
        
        // Check amount matches plan type
        const expectedAmountsCheck: Record<string, number> = { monthly: 15, yearly: 114 };
        const expectedAmountCheck = expectedAmountsCheck[planType];
        if (expectedAmountCheck && amountCents) {
          const detectedAmountDollars = amountCents / 100;
          const tolerance = 5; // Allow $5 tolerance
          if (Math.abs(detectedAmountDollars - expectedAmountCheck) > tolerance) {
            console.log(`[RECEIPT] Amount mismatch! Expected: $${expectedAmountCheck}, Detected: $${detectedAmountDollars}`);
            return res.json({
              valid: false,
              autoApproved: false,
              error: `Lacagta rasiidka ($${detectedAmountDollars}) kuma habboona qorshaha aad dooratay ($${expectedAmountCheck}). Fadlan hubi lacagta saxda ah.`
            });
          }
        }
        
        // Auto-approve: Create payment submission and extend enrollments
        const planAmounts: Record<string, number> = { monthly: 15, yearly: 114 };
        const amount = planAmounts[planType] || 114;
        
        // Get all courses for yearly plan
        const allCourses = await storage.getAllCourses();
        const liveCourses = allCourses.filter((c: any) => c.isLive);
        
        // Calculate new access end date
        let baseDate = new Date();
        
        // For yearly plans, extend all existing enrollments or create new ones for all courses
        if (planType === "yearly") {
          // Find latest accessEnd from any enrollment
          for (const enrollment of parentEnrollments) {
            if (enrollment.accessEnd && new Date(enrollment.accessEnd) > baseDate) {
              baseDate = new Date(enrollment.accessEnd);
            }
          }
          
          const newAccessEnd = new Date(baseDate);
          newAccessEnd.setFullYear(newAccessEnd.getFullYear() + 1);
          
          // Create enrollments for ALL live courses
          for (const course of liveCourses) {
            const existingEnrollment = parentEnrollments.find((e: any) => e.courseId === course.id);
            
            if (existingEnrollment) {
              // Extend existing enrollment
              await storage.renewEnrollment(existingEnrollment.id, planType, newAccessEnd);
            } else {
              // Create new enrollment for this course
              await storage.createEnrollment({
                courseId: course.id,
                parentId,
                customerPhone: parent.phone || "",
                planType,
                status: "active",
                accessEnd: newAccessEnd
              });
            }
          }
          
          console.log(`[SUBSCRIPTION] Yearly renewal: ${parent.email} now has access to all ${liveCourses.length} courses until ${newAccessEnd}`);
          
        } else {
          // Monthly: Only extend existing enrollments (not create new ones)
          for (const enrollment of parentEnrollments) {
            if ((enrollment.planType === "monthly" || enrollment.planType === "yearly") && enrollment.status === "active") {
              // Find the latest accessEnd for this enrollment
              let enrollmentBase = new Date();
              if (enrollment.accessEnd && new Date(enrollment.accessEnd) > enrollmentBase) {
                enrollmentBase = new Date(enrollment.accessEnd);
              }
              
              const newAccessEnd = new Date(enrollmentBase);
              newAccessEnd.setMonth(newAccessEnd.getMonth() + 1);
              
              await storage.renewEnrollment(enrollment.id, planType, newAccessEnd);
            }
          }
          
          console.log(`[SUBSCRIPTION] Monthly renewal for ${parent.email}`);
        }
        
        // Create payment submission record
        const submission = await storage.createPaymentSubmission({
          courseId: paidEnrollment.courseId, // Use first enrollment's course for record
          paymentMethodId,
          customerName,
          customerPhone,
          customerEmail: customerEmail || null,
          planType,
          screenshotUrl,
          amount,
          isRenewal: true,
          notes: `AI Auto-Approved Subscription Renewal (${result.confidence}% confidence). Plan: ${planType}`
        });
        
        await storage.updatePaymentSubmission(submission.id, { status: "approved" });
        
        // Save receipt fingerprint to prevent future duplicate use
        await storage.createReceiptFingerprint({
          parentId,
          paymentSubmissionId: submission.id,
          normalizedReference: normalizedRef,
          transactionDate: normalizedDate,
          transactionTime: result.detected_time || null,
          amountCents,
          senderName: result.sender_name || null,
          senderPhone: normalizedSenderPhone,
          paymentMethodId: paymentMethodId,
          status: "approved"
        });
        
        console.log(`[RECEIPT] Fingerprint saved: ref=${normalizedRef}, date=${normalizedDate}, time=${normalizedTime}, sender=${normalizedSenderPhone}, amount=${amountCents}`);
        
        return res.json({
          valid: true,
          autoApproved: true,
          message: planType === "yearly" 
            ? `Hambalyo! Dhammaan koorsooyin ayaa laguu furay sanad!`
            : `Hambalyo! Koorsadaada waa loo kordhiyey bil!`
        });
      }
      
      if (!isValid) {
        return res.json({
          valid: false,
          error: result.reason_so || "Sawirkaan rasiid lacag bixin ma aha. Fadlan soo geli sawir rasiid ah."
        });
      }
      
      // For non-auto-approved valid receipts, still check the date
      const dateCheck = isReceiptDateValid(result.detected_date);
      if (!dateCheck.valid) {
        let errorMessage: string;
        if (dateCheck.daysOld === null) {
          errorMessage = "Taariikhda rasiidka lama aqrin karo. Fadlan soo dir sawir cusub.";
        } else if (dateCheck.isFuture) {
          errorMessage = "Taariikhda rasiidka waa mid mustaqbalka ah. Fadlan soo dir rasiid sax ah.";
        } else {
          errorMessage = `Rasiidkan waa mid qadiim ah (${dateCheck.daysOld} maalmood ka hor). Fadlan soo dir rasiid cusub oo aan ka weynayn 7 maalmood.`;
        }
        return res.json({ valid: false, autoApproved: false, error: errorMessage });
      }
      
      return res.json({ valid: true, autoApproved: false, message: "Sawirka rasiidka waa la aqbalay!" });
      
    } catch (error: any) {
      console.error("[SUBSCRIPTION RECEIPT] Validation error:", error);
      return res.json({ valid: false, error: "Wax khalad ah ayaa dhacay. Fadlan isku day mar kale." });
    }
  });
  
  // Submit subscription renewal payment (manual approval path)
  app.post("/api/subscription-renewal", requireParentAuth, async (req, res) => {
    try {
      const { customerName, customerPhone, customerEmail, paymentMethodId, planType, amount, screenshotUrl } = req.body;
      const parentId = req.session.parentId!;
      
      // Validate required fields
      if (!customerName || !customerPhone || !paymentMethodId || !planType || !screenshotUrl) {
        return res.status(400).json({ error: "Waxaa lagaa rabaa: magaca, telefoonka, habka lacag bixinta, qorshaha, iyo sawirka" });
      }
      
      // Check if parent has any paid enrollment
      const parentEnrollments = await storage.getEnrollmentsByParentId(parentId);
      const paidEnrollment = parentEnrollments.find((e: any) => 
        e.planType === "monthly" || e.planType === "yearly"
      );
      
      if (!paidEnrollment) {
        return res.status(403).json({ 
          error: "Kaliya waalidka horey lacag u bixiyey ayaa isticmaali kara boggan"
        });
      }
      
      // Create payment submission (will be reviewed by admin)
      const submission = await storage.createPaymentSubmission({
        courseId: paidEnrollment.courseId, // Use first enrollment's course for record
        paymentMethodId,
        customerName,
        customerPhone,
        customerEmail: customerEmail || null,
        planType,
        screenshotUrl,
        amount: amount || (planType === "yearly" ? 114 : 30),
        isRenewal: true,
        notes: `Subscription Renewal Request. Plan: ${planType}. Yearly = ALL courses access.`
      });
      
      // Notify admin via email
      const adminEmail = process.env.SMTP_EMAIL;
      if (adminEmail) {
        sendEmail({
          to: adminEmail,
          subject: `🔔 Cusboonayn Subscription - ${customerName}`,
          html: `
            <div style="font-family: Arial; padding: 20px; background: #f9fafb;">
              <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px;">
                <h2 style="color: #22c55e;">📢 Cusboonayn Subscription</h2>
                <p><strong>Waalid:</strong> ${customerName}</p>
                <p><strong>Tel:</strong> ${customerPhone}</p>
                <p><strong>Email:</strong> ${customerEmail || 'Ma jirto'}</p>
                <p><strong>Qorshe:</strong> ${planType === 'yearly' ? 'Sanad ($114) - DHAMMAAN KOORSOOYIN' : 'Bille ($15)'}</p>
                <p style="text-align: center; margin-top: 20px;">
                  <a href="https://appbarbaarintasan.com/admin" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Gal Admin</a>
                </p>
              </div>
            </div>
          `
        }).catch(console.error);
      }
      
      res.status(201).json(submission);
      
    } catch (error: any) {
      console.error("[SUBSCRIPTION RENEWAL] Error:", error);
      res.status(500).json({ error: "Wax khalad ah ayaa dhacay. Fadlan isku day mar kale." });
    }
  });

  // ===== EXPENSE MANAGEMENT (Xisaab) =====
  
  // Admin: Get all expenses
  app.get("/api/admin/expenses", requireAuth, async (req, res) => {
    try {
      const allExpenses = await storage.getAllExpenses();
      res.json(allExpenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  // Admin: Create new expense
  app.post("/api/admin/expenses", requireAuth, async (req, res) => {
    try {
      // Convert date string to Date object if needed
      const body = { ...req.body };
      if (body.date && typeof body.date === 'string') {
        body.date = new Date(body.date);
      }
      const expenseData = insertExpenseSchema.parse(body);
      const expense = await storage.createExpense(expenseData);
      res.json(expense);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid expense data", details: error.errors });
      }
      console.error("Error creating expense:", error);
      res.status(500).json({ error: "Failed to create expense" });
    }
  });

  // Admin: Update expense
  app.patch("/api/admin/expenses/:id", requireAuth, async (req, res) => {
    try {
      // Convert date string to Date object if needed
      const body = { ...req.body };
      if (body.date && typeof body.date === 'string') {
        body.date = new Date(body.date);
      }
      const expense = await storage.updateExpense(req.params.id, body);
      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      console.error("Error updating expense:", error);
      res.status(500).json({ error: "Failed to update expense" });
    }
  });

  // Admin: Delete expense
  app.delete("/api/admin/expenses/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteExpense(req.params.id);
      res.json({ success: true, message: "Expense deleted" });
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ error: "Failed to delete expense" });
    }
  });

  // Admin: Get finance summary (income, expenses, balance)
  app.get("/api/admin/finance-summary", requireAuth, async (req, res) => {
    try {
      const { month, year } = req.query;
      
      // Default to current month if not specified
      const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
      const targetMonth = month ? parseInt(month as string) - 1 : new Date().getMonth();
      
      const startDate = new Date(targetYear, targetMonth, 1);
      const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);
      
      // Get approved payments for the period
      const payments = await storage.getApprovedPaymentsByDateRange(startDate, endDate);
      const totalIncome = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      // Get expenses for the period
      const expensesList = await storage.getExpensesByDateRange(startDate, endDate);
      const totalExpenses = expensesList.reduce((sum, e) => sum + e.amount, 0);
      
      // Calculate balance
      const balance = totalIncome - totalExpenses;
      
      // Get all-time totals
      const allPayments = await storage.getAllPaymentSubmissions();
      const approvedPayments = allPayments.filter(p => p.status === "approved");
      const allTimeIncome = approvedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      const allExpenses = await storage.getAllExpenses();
      const allTimeExpenses = allExpenses.reduce((sum, e) => sum + e.amount, 0);
      
      const allTimeBalance = allTimeIncome - allTimeExpenses;
      
      res.json({
        period: {
          month: targetMonth + 1,
          year: targetYear,
          startDate,
          endDate
        },
        monthly: {
          income: totalIncome,
          expenses: totalExpenses,
          balance,
          paymentCount: payments.length,
          expenseCount: expensesList.length
        },
        allTime: {
          income: allTimeIncome,
          expenses: allTimeExpenses,
          balance: allTimeBalance
        },
        recentPayments: payments.slice(0, 10),
        recentExpenses: expensesList.slice(0, 10)
      });
    } catch (error) {
      console.error("Error fetching finance summary:", error);
      res.status(500).json({ error: "Failed to fetch finance summary" });
    }
  });

  // ============================================
  // BANK BALANCE TRACKING (Salaam Bank - Admin Accounting)
  // ============================================

  // Admin: Get all bank transfers and total bank balance
  app.get("/api/admin/bank-balance", requireAuth, async (req, res) => {
    try {
      const transfers = await storage.getAllBankTransfers();
      const totalBalance = await storage.getBankBalance();
      res.json({ transfers, totalBalance });
    } catch (error) {
      console.error("Error fetching bank balance:", error);
      res.status(500).json({ error: "Failed to fetch bank balance" });
    }
  });

  // Admin: Add a bank transfer entry
  app.post("/api/admin/bank-transfers", requireAuth, async (req, res) => {
    try {
      const validatedData = insertBankTransferSchema.parse(req.body);
      const transfer = await storage.createBankTransfer(validatedData);
      res.json(transfer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data: " + error.message });
      }
      console.error("Error creating bank transfer:", error);
      res.status(500).json({ error: "Failed to create bank transfer" });
    }
  });

  // Admin: Delete a bank transfer entry
  app.delete("/api/admin/bank-transfers/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteBankTransfer(req.params.id);
      res.json({ success: true, message: "Bank transfer deleted" });
    } catch (error) {
      console.error("Error deleting bank transfer:", error);
      res.status(500).json({ error: "Failed to delete bank transfer" });
    }
  });

  // ==================== ADMIN COURSE MANAGEMENT ====================
  
  // Admin: Get all courses
  app.get("/api/admin/courses", requireAuth, async (req, res) => {
    try {
      const allCourses = await storage.getAllCourses();
      res.json(allCourses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({ error: "Failed to fetch courses" });
    }
  });

  // Admin: Create a new course
  app.post("/api/admin/courses", requireAuth, async (req, res) => {
    try {
      const { title, courseId, description, category, imageUrl, priceOneTime, priceMonthly, priceYearly, isLive, isFree, contentReady, comingSoonMessage, order, ageRange } = req.body;
      
      if (!title || !courseId || !category) {
        return res.status(400).json({ error: "Title, courseId, and category are required" });
      }
      
      const newCourse = await storage.createCourse({
        title,
        courseId,
        description: description || null,
        category,
        imageUrl: imageUrl || null,
        priceOneTime: priceOneTime || null,
        priceMonthly: priceMonthly || null,
        priceYearly: priceYearly || null,
        isLive: isLive || false,
        isFree: isFree || false,
        contentReady: contentReady || false,
        comingSoonMessage: comingSoonMessage || null,
        order: order || 0,
        ageRange: ageRange || null,
        duration: null,
      });
      
      res.json(newCourse);
    } catch (error) {
      console.error("Error creating course:", error);
      res.status(500).json({ error: "Failed to create course" });
    }
  });

  // Admin: Update a course
  app.patch("/api/admin/courses/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const updatedCourse = await storage.updateCourse(id, updateData);
      if (!updatedCourse) {
        return res.status(404).json({ error: "Course not found" });
      }
      
      res.json(updatedCourse);
    } catch (error) {
      console.error("Error updating course:", error);
      res.status(500).json({ error: "Failed to update course" });
    }
  });

  // Admin: Delete a course
  app.delete("/api/admin/courses/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCourse(id);
      res.json({ success: true, message: "Course deleted" });
    } catch (error) {
      console.error("Error deleting course:", error);
      res.status(500).json({ error: "Failed to delete course" });
    }
  });

  // Admin: Get lesson accessibility report - shows which lessons are free/accessible
  app.get("/api/admin/lesson-accessibility-report", requireAuth, async (req, res) => {
    try {
      const courses = await storage.getAllCourses();
      const report = [];

      for (const course of courses) {
        const lessons = await storage.getLessonsByCourseId(course.id);
        const totalLessons = lessons.length;
        const freeLessons = lessons.filter(l => l.isFree).length;
        const accessibilityPercentage = totalLessons > 0 ? Math.round((freeLessons / totalLessons) * 100) : 0;

        report.push({
          courseId: course.id,
          courseTitle: course.title,
          courseCourseId: course.courseId,
          isCourseFreee: course.isFree,
          totalLessons,
          freeLessons,
          paidLessons: totalLessons - freeLessons,
          accessibilityPercentage,
          lessons: lessons.map(l => ({
            id: l.id,
            title: l.title,
            order: l.order,
            isFree: l.isFree,
            lessonType: l.lessonType,
            unlockType: l.unlockType
          }))
        });
      }

      // Sort by accessibility percentage (most accessible first)
      report.sort((a, b) => b.accessibilityPercentage - a.accessibilityPercentage);

      res.json({
        summary: {
          totalCourses: courses.length,
          freeCoursesCount: courses.filter(c => c.isFree).length,
          totalLessonsAcrossAll: report.reduce((sum, r) => sum + r.totalLessons, 0),
          freeLessonsAcrossAll: report.reduce((sum, r) => sum + r.freeLessons, 0),
        },
        courses: report
      });
    } catch (error) {
      console.error("Error generating lesson accessibility report:", error);
      res.status(500).json({ error: "Failed to generate accessibility report" });
    }
  });

  // ==================== END ADMIN COURSE MANAGEMENT ====================

  // Upload all course images to R2 (protected by cron secret)
  app.post("/api/cron/upload-course-images-to-r2", async (req, res) => {
    const secret = req.headers['x-cron-secret'] || req.query.secret;
    if (secret !== process.env.DAILY_CRON_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
      if (!isR2Configured()) {
        return res.status(500).json({ error: "R2 storage not configured" });
      }
      
      const allCourses = await storage.getAllCourses();
      const results: { courseId: string; title: string; oldUrl: string; newUrl: string }[] = [];
      const uploadErrors: { courseId: string; error: string }[] = [];
      
      for (const course of allCourses) {
        if (!course.imageUrl || !course.imageUrl.startsWith('/course-images/')) {
          continue;
        }
        
        try {
          let actualPath = path.join(process.cwd(), 'dist', 'public', course.imageUrl);
          if (!fs.existsSync(actualPath)) {
            actualPath = path.join(process.cwd(), 'client', 'public', course.imageUrl);
          }
          
          if (!fs.existsSync(actualPath)) {
            uploadErrors.push({ courseId: course.id, error: `File not found: ${course.imageUrl}` });
            continue;
          }
          
          const fileBuffer = fs.readFileSync(actualPath);
          const fileName = path.basename(course.imageUrl);
          
          const { url } = await uploadToR2(fileBuffer, fileName, 'image/png', 'course-images', 'sawirada');
          await storage.updateCourse(course.id, { imageUrl: url });
          
          results.push({ courseId: course.id, title: course.title, oldUrl: course.imageUrl, newUrl: url });
          console.log(`[R2] Uploaded: ${course.title} -> ${url}`);
        } catch (error: any) {
          uploadErrors.push({ courseId: course.id, error: error.message });
        }
      }
      
      res.json({ success: true, uploaded: results.length, errors: uploadErrors.length, results, uploadErrors });
    } catch (error: any) {
      console.error("Error uploading course images to R2:", error);
      res.status(500).json({ error: "Failed to upload course images", details: error.message, stack: error.stack?.substring(0, 500) });
    }
  });

  // Admin: Upload all course images to R2 and update database
  app.post("/api/admin/upload-course-images-to-r2", requireAuth, async (req, res) => {
    try {
      if (!isR2Configured()) {
        return res.status(500).json({ error: "R2 storage not configured" });
      }
      
      const courses = await storage.getAllCourses();
      const results: { courseId: string; title: string; oldUrl: string; newUrl: string }[] = [];
      const errors: { courseId: string; error: string }[] = [];
      
      for (const course of courses) {
        // Skip if already using R2 URL or external URL
        if (!course.imageUrl || !course.imageUrl.startsWith('/course-images/')) {
          continue;
        }
        
        try {
          const imagePath = path.join(process.cwd(), 'client', 'public', course.imageUrl);
          
          // Check if file exists (in production it might be in dist/public)
          let actualPath = imagePath;
          if (!fs.existsSync(imagePath)) {
            actualPath = path.join(process.cwd(), 'dist', 'public', course.imageUrl);
          }
          
          if (!fs.existsSync(actualPath)) {
            errors.push({ courseId: course.id, error: `File not found: ${course.imageUrl}` });
            continue;
          }
          
          const fileBuffer = fs.readFileSync(actualPath);
          const fileName = path.basename(course.imageUrl);
          
          const { url } = await uploadToR2(
            fileBuffer,
            fileName,
            'image/png',
            'course-images',
            'dhambaal'
          );
          
          // Update course in database with new R2 URL
          await storage.updateCourse(course.id, { imageUrl: url });
          
          results.push({
            courseId: course.id,
            title: course.title,
            oldUrl: course.imageUrl,
            newUrl: url
          });
          
          console.log(`[R2] Uploaded course image: ${course.title} -> ${url}`);
        } catch (error: any) {
          errors.push({ courseId: course.id, error: error.message });
        }
      }
      
      res.json({
        success: true,
        uploaded: results.length,
        errorCount: errors.length,
        results,
        errors: errors
      });
    } catch (error) {
      console.error("Error uploading course images to R2:", error);
      res.status(500).json({ error: "Failed to upload course images" });
    }
  });

  // Admin: Get all parents with optional country filter
  app.get("/api/admin/parents", requireAuth, async (req, res) => {
    try {
      const { country, inGroup } = req.query;
      let parentsList = await storage.getAllParents();
      
      // Filter by country if specified
      if (country && typeof country === 'string' && country !== 'all') {
        parentsList = parentsList.filter(p => p.country === country);
      }
      
      // Filter by parenting group membership if specified
      if (inGroup === 'true') {
        parentsList = parentsList.filter(p => (p as any).inParentingGroup === true);
      }
      
      res.json(parentsList);
    } catch (error) {
      console.error("Error fetching parents:", error);
      res.status(500).json({ error: "Failed to fetch parents" });
    }
  });

  // Educator Dashboard: Get all parents with their progress stats
  app.get("/api/admin/parent-progress", requireAuth, async (req, res) => {
    try {
      const progressData = await storage.getAllParentsWithProgress();
      res.json(progressData);
    } catch (error) {
      console.error("Error fetching parent progress:", error);
      res.status(500).json({ error: "Failed to fetch parent progress" });
    }
  });

  // Admin: Update payment submission amount (for fixing incorrect amounts)
  app.patch("/api/admin/payments/:id/amount", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { amount, reason } = req.body;
      if (!amount || typeof amount !== "number" || amount < 1 || amount > 500) {
        return res.status(400).json({ error: "Invalid amount (must be $1-$500)" });
      }
      const existing = await storage.getPaymentSubmission(id);
      if (!existing) {
        return res.status(404).json({ error: "Payment not found" });
      }
      const adminParent = await storage.getParent(req.session.parentId!);
      const auditNote = `Amount corrected from $${existing.amount} to $${amount} by ${adminParent?.name || "admin"} on ${new Date().toISOString()}${reason ? ` - Reason: ${reason}` : ""}`;
      const existingNotes = existing.notes ? existing.notes + "\n" : "";
      await storage.updatePaymentSubmission(id, { notes: existingNotes + auditNote });
      await db.update(paymentSubmissions).set({ amount }).where(eq(paymentSubmissions.id, id));
      console.log(`[ADMIN] Payment ${id} amount updated: $${existing.amount} -> $${amount}`);
      res.json({ success: true, oldAmount: existing.amount, newAmount: amount });
    } catch (error) {
      console.error("Error updating payment amount:", error);
      res.status(500).json({ error: "Failed to update amount" });
    }
  });

  // Admin: Manually trigger subscription expiration check
  app.post("/api/admin/expire-subscriptions", requireAuth, async (req, res) => {
    try {
      const { expireSubscriptions } = await import("./cron");
      const result = await expireSubscriptions();
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("Error running manual expiration:", error);
      res.status(500).json({ error: "Failed to run expiration check" });
    }
  });

  // Admin: Delete parent account
  app.delete("/api/admin/parents/:id", requireAuth, async (req, res) => {
    try {
      const parent = await storage.getParent(req.params.id);
      if (!parent) {
        return res.status(404).json({ error: "Parent not found" });
      }

      await storage.deleteParent(req.params.id);
      res.json({ success: true, message: "Parent deleted successfully" });
    } catch (error) {
      console.error("Error deleting parent:", error);
      res.status(500).json({ error: "Failed to delete parent" });
    }
  });

  // Admin: Set parent admin status
  app.patch("/api/admin/parents/:id/admin", requireAuth, async (req, res) => {
    try {
      const { isAdmin } = req.body;
      if (typeof isAdmin !== "boolean") {
        return res.status(400).json({ error: "isAdmin boolean is required" });
      }

      const parent = await storage.getParent(req.params.id);
      if (!parent) {
        return res.status(404).json({ error: "Parent not found" });
      }

      const updatedParent = await storage.setParentAdmin(req.params.id, isAdmin);
      console.log(`[ADMIN] Parent ${parent.email} admin status changed to: ${isAdmin}`);

      // Send email notification when promoting to admin
      if (isAdmin && !parent.isAdmin) {
        try {
          console.log(`[ADMIN] Sending admin promotion email to: ${parent.email}`);
          await sendAdminPromotionEmail(parent.email, parent.name);
          console.log(`[ADMIN] Admin promotion email sent to: ${parent.email}`);
        } catch (emailError) {
          console.error(`[ADMIN] Failed to send admin promotion email:`, emailError);
        }
      }

      res.json({ success: true, parent: updatedParent });
    } catch (error) {
      console.error("Error updating parent admin status:", error);
      res.status(500).json({ error: "Failed to update admin status" });
    }
  });

  // Admin: Set parent host status for Sheeko
  app.patch("/api/admin/parents/:id/host", requireAuth, async (req, res) => {
    try {
      const { canHostSheeko } = req.body;
      if (typeof canHostSheeko !== "boolean") {
        return res.status(400).json({ error: "canHostSheeko boolean is required" });
      }

      const parent = await storage.getParent(req.params.id);
      if (!parent) {
        return res.status(404).json({ error: "Parent not found" });
      }

      const updatedParent = await storage.setParentHostStatus(req.params.id, canHostSheeko);
      console.log(`[ADMIN] Parent ${parent.email} host status changed to: ${canHostSheeko}`);

      res.json({ success: true, parent: updatedParent });
    } catch (error) {
      console.error("Error updating parent host status:", error);
      res.status(500).json({ error: "Failed to update host status" });
    }
  });

  // Admin: Get all approved hosts
  app.get("/api/admin/hosts", requireAuth, async (req, res) => {
    try {
      const hosts = await storage.getApprovedHosts();
      res.json(hosts);
    } catch (error) {
      console.error("Error fetching approved hosts:", error);
      res.status(500).json({ error: "Failed to fetch approved hosts" });
    }
  });

  // Admin: Get all enrollments
  app.get("/api/admin/enrollments", requireAuth, async (req, res) => {
    try {
      const enrollmentsList = await storage.getAllEnrollments();
      res.json(enrollmentsList);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
      res.status(500).json({ error: "Failed to fetch enrollments" });
    }
  });

  // Admin: Create manual enrollment (grant course access)
  app.post("/api/admin/enrollments", requireAuth, async (req, res) => {
    try {
      const { parentId, courseId, planType, accessEnd } = req.body;

      if (!parentId || !courseId || !planType) {
        return res.status(400).json({ error: "parentId, courseId, and planType are required" });
      }

      // Check if parent exists
      const parent = await storage.getParent(parentId);
      if (!parent) {
        return res.status(404).json({ error: "Parent not found" });
      }

      // Check if course exists
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      // Check for existing active enrollment
      const existingEnrollment = await storage.getActiveEnrollmentByParentAndCourse(parentId, courseId);
      if (existingEnrollment) {
        return res.status(400).json({ error: "Parent already has active enrollment for this course" });
      }

      const enrollment = await storage.createEnrollment({
        parentId,
        courseId,
        planType,
        accessEnd: accessEnd ? new Date(accessEnd) : null,
        status: "active",
        customerPhone: parent.phone || "",
      });

      res.status(201).json(enrollment);
    } catch (error) {
      console.error("Error creating enrollment:", error);
      res.status(500).json({ error: "Failed to create enrollment" });
    }
  });

  // Admin: Delete enrollment (revoke course access)
  app.delete("/api/admin/enrollments/:id", requireAuth, async (req, res) => {
    try {
      const enrollment = await storage.getEnrollment(req.params.id);
      if (!enrollment) {
        return res.status(404).json({ error: "Enrollment not found" });
      }

      let userEmail = '';
      if (enrollment.parentId) {
        const parent = await storage.getParent(enrollment.parentId);
        if (parent?.email) {
          userEmail = parent.email;
        }
      }

      await storage.deleteEnrollment(req.params.id);

      if (userEmail) {
        syncEnrollmentDeleteToWordPress(userEmail, enrollment.courseId).catch(err => {
          console.error('[WP-SYNC] Error syncing enrollment delete:', err);
        });
      }

      res.json({ success: true, message: "Enrollment deleted successfully" });
    } catch (error) {
      console.error("Error deleting enrollment:", error);
      res.status(500).json({ error: "Failed to delete enrollment" });
    }
  });

  // Admin: Update enrollment status
  app.patch("/api/admin/enrollments/:id", requireAuth, async (req, res) => {
    try {
      const { status } = req.body;
      
      if (!["active", "cancelled", "expired"].includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be active, cancelled, or expired" });
      }

      const enrollment = await storage.getEnrollment(req.params.id);
      if (!enrollment) {
        return res.status(404).json({ error: "Enrollment not found" });
      }

      await storage.updateEnrollmentStatus(req.params.id, status);
      const updated = await storage.getEnrollment(req.params.id);
      res.json(updated);
    } catch (error) {
      console.error("Error updating enrollment:", error);
      res.status(500).json({ error: "Failed to update enrollment" });
    }
  });

  // Admin: Create Google Meet link for live lesson
  app.post("/api/admin/create-meet-link", requireAuth, async (req, res) => {
    try {
      const { title, description, startDateTime, durationMinutes } = req.body;
      
      if (!title || !startDateTime) {
        return res.status(400).json({ error: "Title and start date/time are required" });
      }

      const result = await createGoogleMeetLink(
        title,
        description || "",
        startDateTime,
        durationMinutes || 60
      );

      res.json({
        success: true,
        meetLink: result.meetLink,
        eventId: result.eventId,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("Error creating Google Meet link:", errorMsg);
      
      if (errorMsg.includes("X_REPLIT_TOKEN") || errorMsg.includes("not connected")) {
        res.status(500).json({ error: "Google Calendar connector not available in this environment. Please enter the Meet link manually." });
      } else {
        res.status(500).json({ error: `Failed to create Google Meet link: ${errorMsg}` });
      }
    }
  });

  // Google OAuth flow - unified for Calendar and Drive
  const { google: googleapis } = await import('googleapis');
  const googleOAuth2Client = new googleapis.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.APP_URL || 'https://appbarbaarintasan.com'}/oauth/callback`
  );

  app.get("/api/google/auth", requireAuth, (req: Request, res: Response) => {
    const url = googleOAuth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["https://www.googleapis.com/auth/calendar"],
    });
    res.redirect(url);
  });

  app.get("/admin/setup-drive", requireAuth, (req: Request, res: Response) => {
    const url = googleOAuth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      login_hint: "info@visitnordicfi.com",
      scope: ["https://www.googleapis.com/auth/drive.readonly"],
    });
    res.redirect(url);
  });

  app.get("/oauth/callback", async (req: Request, res: Response) => {
    try {
      const { code, scope } = req.query;
      if (!code) {
        return res.status(400).send("No authorization code provided");
      }
      const { tokens } = await googleOAuth2Client.getToken(code as string);
      const scopeStr = (scope as string) || '';
      const isDrive = scopeStr.includes('drive');
      const label = isDrive ? 'Google Drive' : 'Google Calendar';
      const envVar = isDrive ? 'GOOGLE_DRIVE_REFRESH_TOKEN' : 'GOOGLE_CALENDAR_REFRESH_TOKEN';
      console.log(`[${label}] ===== REFRESH TOKEN =====`);
      console.log(`[${label}] refresh_token:`, tokens.refresh_token);
      console.log(`[${label}] scope:`, scopeStr);
      console.log(`[${label}] ================================`);
      res.send(`
        <html>
          <body style="font-family: sans-serif; padding: 40px; text-align: center;">
            <h1 style="color: green;">${label} Connected!</h1>
            <p>Save as <code>${envVar}</code></p>
            <pre style="background: #f0f0f0; padding: 20px; border-radius: 8px; word-break: break-all; max-width: 600px; margin: 0 auto;">${tokens.refresh_token || 'No refresh token returned'}</pre>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("[OAuth] callback error:", error);
      res.status(500).send("Failed to complete OAuth flow. Check server logs.");
    }
  });

  // Public: Get published testimonials
  app.get("/api/testimonials", async (req, res) => {
    try {
      const lang = req.query.lang as string;
      let testimonialsList = await storage.getPublishedTestimonials();
      if (lang) {
        testimonialsList = await applyTranslationsToArray(testimonialsList, 'testimonial', lang, ['message', 'name', 'courseTag']);
      }
      res.json(testimonialsList);
    } catch (error) {
      console.error("Error fetching testimonials:", error);
      res.status(500).json({ error: "Failed to fetch testimonials" });
    }
  });

  // Admin: Get all testimonials
  app.get("/api/admin/testimonials", requireAuth, async (req, res) => {
    try {
      const testimonialsList = await storage.getAllTestimonials();
      res.json(testimonialsList);
    } catch (error) {
      console.error("Error fetching testimonials:", error);
      res.status(500).json({ error: "Failed to fetch testimonials" });
    }
  });

  // Admin: Create testimonial
  app.post("/api/admin/testimonials", requireAuth, async (req, res) => {
    try {
      const validated = insertTestimonialSchema.parse(req.body);
      const testimonial = await storage.createTestimonial(validated);
      res.json(testimonial);
    } catch (error) {
      console.error("Error creating testimonial:", error);
      res.status(500).json({ error: "Failed to create testimonial" });
    }
  });

  // Admin: Update testimonial
  app.patch("/api/admin/testimonials/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const testimonial = await storage.updateTestimonial(id, req.body);
      if (!testimonial) {
        return res.status(404).json({ error: "Testimonial not found" });
      }
      res.json(testimonial);
    } catch (error) {
      console.error("Error updating testimonial:", error);
      res.status(500).json({ error: "Failed to update testimonial" });
    }
  });

  // Admin: Delete testimonial
  app.delete("/api/admin/testimonials/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteTestimonial(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting testimonial:", error);
      res.status(500).json({ error: "Failed to delete testimonial" });
    }
  });

  // Testimonial Reactions - Get all reactions for all testimonials
  app.get("/api/testimonial-reactions", async (req, res) => {
    try {
      const parentId = req.session?.parentId || null;
      const reactions = await storage.getAllTestimonialReactions(parentId || undefined);
      res.json(reactions);
    } catch (error) {
      console.error("Error fetching testimonial reactions:", error);
      res.status(500).json({ error: "Failed to fetch reactions" });
    }
  });

  // Testimonial Reactions - Toggle reaction
  app.post("/api/testimonials/:id/reactions", requireParentAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { reactionType } = req.body;
      const parentId = req.session!.parentId!;
      
      if (!reactionType || !['thumbsup', 'heart', 'clap', 'pray'].includes(reactionType)) {
        return res.status(400).json({ error: "Invalid reaction type" });
      }
      
      const result = await storage.toggleTestimonialReaction(id, parentId, reactionType);
      const updatedReactions = await storage.getTestimonialReactions(id, parentId);
      res.json({ ...result, reactions: updatedReactions });
    } catch (error) {
      console.error("Error toggling testimonial reaction:", error);
      res.status(500).json({ error: "Failed to toggle reaction" });
    }
  });

  // Admin: Create conversation for testing
  app.post("/api/admin/conversations", requireAuth, async (req, res) => {
    try {
      const { participant1, participant2 } = req.body;

      if (!participant1 || !participant2) {
        return res.status(400).json({ error: "Both participant1 and participant2 are required" });
      }

      if (participant1 === participant2) {
        return res.status(400).json({ error: "Participants must be different" });
      }

      const parent1 = await storage.getParentById(participant1);
      const parent2 = await storage.getParentById(participant2);

      if (!parent1 || !parent2) {
        return res.status(400).json({ error: "One or both parent IDs are invalid" });
      }

      const conversation = await storage.createConversation(participant1, participant2);
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  // Public: Get all telegram referrals (parent feedback)
  app.get("/api/telegram-referrals", async (req, res) => {
    try {
      const referrals = await storage.getAllTelegramReferrals();
      res.json(referrals);
    } catch (error) {
      console.error("Error fetching telegram referrals:", error);
      res.status(500).json({ error: "Failed to fetch referrals" });
    }
  });

  // Admin: Create telegram referral (parent feedback)
  app.post("/api/admin/telegram-referrals", requireAuth, async (req, res) => {
    try {
      const { parentName, telegramUsername, telegramGroupName, notes } = req.body;
      if (!parentName) {
        return res.status(400).json({ error: "Magaca waalidka waa lagama maarmaan" });
      }
      const referral = await storage.createTelegramReferral({
        parentName,
        telegramUsername: telegramUsername || null,
        telegramGroupName: telegramGroupName || null,
        notes: notes || null,
        createdBy: req.session.userId || null,
      });
      res.json(referral);
    } catch (error) {
      console.error("Error creating telegram referral:", error);
      res.status(500).json({ error: "Failed to create referral" });
    }
  });

  // Admin: Delete telegram referral
  app.delete("/api/admin/telegram-referrals/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteTelegramReferral(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting telegram referral:", error);
      res.status(500).json({ error: "Failed to delete referral" });
    }
  });

  // ========== ANNOUNCEMENTS ROUTES (Ogeeysiisyada) ==========

  // Public: Get active announcements for home page
  app.get("/api/announcements", async (req, res) => {
    try {
      const lang = req.query.lang as string;
      let announcementsList = await storage.getActiveAnnouncements();
      if (lang) {
        announcementsList = await applyTranslationsToArray(announcementsList, 'announcement', lang, ['title', 'content']);
      }
      res.json(announcementsList);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      res.status(500).json({ error: "Failed to fetch announcements" });
    }
  });

  // Admin: Get all announcements
  app.get("/api/admin/announcements", requireAuth, async (req, res) => {
    try {
      const announcementsList = await storage.getAllAnnouncements();
      res.json(announcementsList);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      res.status(500).json({ error: "Failed to fetch announcements" });
    }
  });

  // Admin: Create announcement
  app.post("/api/admin/announcements", requireAuth, async (req, res) => {
    try {
      const { title, content, isActive, order } = req.body;
      if (!content) {
        return res.status(400).json({ error: "Qoraalka waa lagama maarmaan" });
      }
      const announcement = await storage.createAnnouncement({
        title: title || null,
        content,
        isActive: isActive !== undefined ? isActive : true,
        order: order || 0,
      });
      res.json(announcement);
    } catch (error) {
      console.error("Error creating announcement:", error);
      res.status(500).json({ error: "Failed to create announcement" });
    }
  });

  // Admin: Update announcement
  app.patch("/api/admin/announcements/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { title, content, isActive, order } = req.body;
      const announcement = await storage.updateAnnouncement(id, {
        title,
        content,
        isActive,
        order,
      });
      if (!announcement) {
        return res.status(404).json({ error: "Announcement not found" });
      }
      res.json(announcement);
    } catch (error) {
      console.error("Error updating announcement:", error);
      res.status(500).json({ error: "Failed to update announcement" });
    }
  });

  // Admin: Delete announcement
  app.delete("/api/admin/announcements/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAnnouncement(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting announcement:", error);
      res.status(500).json({ error: "Failed to delete announcement" });
    }
  });

  // ========== PRICING PLANS ROUTES ==========

  // Public: Get active pricing plans
  app.get("/api/pricing-plans", async (req, res) => {
    try {
      const plans = await storage.getActivePricingPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching pricing plans:", error);
      res.status(500).json({ error: "Failed to fetch pricing plans" });
    }
  });

  // Admin: Get all pricing plans
  app.get("/api/admin/pricing-plans", requireAuth, async (req, res) => {
    try {
      const plans = await storage.getAllPricingPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching pricing plans:", error);
      res.status(500).json({ error: "Failed to fetch pricing plans" });
    }
  });

  // Admin: Update pricing plan
  app.patch("/api/admin/pricing-plans/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, priceUsd, isActive } = req.body;
      
      const updated = await storage.updatePricingPlan(id, {
        name,
        description,
        priceUsd,
        isActive,
      });
      
      if (!updated) {
        return res.status(404).json({ error: "Pricing plan not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating pricing plan:", error);
      res.status(500).json({ error: "Failed to update pricing plan" });
    }
  });

  // ========== HOMEPAGE SECTIONS ROUTES ==========

  // Public: Get visible homepage sections (ordered)
  app.get("/api/homepage-sections", async (req, res) => {
    try {
      const lang = req.query.lang as string;
      const cacheKey = `homepage-sections-${lang || 'default'}`;
      const sections = await getCached(cacheKey, 120000, async () => {
        let s = await storage.getVisibleHomepageSections();
        if (lang) {
          s = await applyTranslationsToArray(s, 'homepage_section', lang, ['title']);
        }
        return s;
      });
      res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
      res.json(sections);
    } catch (error) {
      console.error("Error fetching homepage sections:", error);
      res.status(500).json({ error: "Failed to fetch homepage sections" });
    }
  });

  // Admin: Get all homepage sections
  app.get("/api/admin/homepage-sections", requireAuth, async (req, res) => {
    try {
      const sections = await storage.getAllHomepageSections();
      res.json(sections);
    } catch (error) {
      console.error("Error fetching homepage sections:", error);
      res.status(500).json({ error: "Failed to fetch homepage sections" });
    }
  });

  // Admin: Update homepage section visibility
  app.patch("/api/admin/homepage-sections/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { isVisible, title } = req.body;
      const section = await storage.updateHomepageSection(id, { isVisible, title });
      if (!section) {
        return res.status(404).json({ error: "Section not found" });
      }
      res.json(section);
    } catch (error) {
      console.error("Error updating homepage section:", error);
      res.status(500).json({ error: "Failed to update homepage section" });
    }
  });

  // Admin: Reorder homepage sections
  app.post("/api/admin/homepage-sections/reorder", requireAuth, async (req, res) => {
    try {
      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds)) {
        return res.status(400).json({ error: "orderedIds must be an array" });
      }
      await storage.reorderHomepageSections(orderedIds);
      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering homepage sections:", error);
      res.status(500).json({ error: "Failed to reorder homepage sections" });
    }
  });

  // ========== PARENT COMMUNITY SETTINGS ROUTES ==========
  
  // Public: Get parent community settings (for the feed banner)
  app.get("/api/parent-community-settings", async (req, res) => {
    try {
      const settings = await storage.getAllParentCommunitySettings();
      const settingsMap: Record<string, string | null> = {};
      settings.forEach(s => {
        settingsMap[s.settingKey] = s.settingValue;
      });
      res.json(settingsMap);
    } catch (error) {
      console.error("Error fetching parent community settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Admin: Update parent community settings
  app.put("/api/admin/parent-community-settings", requireAuth, async (req, res) => {
    try {
      const { bannerImageUrl, bannerTitle, bannerSubtitle, courseAdsIds, adMessage } = req.body;
      
      const updates = [
        { settingKey: "banner_image_url", settingValue: bannerImageUrl },
        { settingKey: "banner_title", settingValue: bannerTitle },
        { settingKey: "banner_subtitle", settingValue: bannerSubtitle },
        { settingKey: "course_ads_ids", settingValue: courseAdsIds },
        { settingKey: "ad_message", settingValue: adMessage },
      ];
      
      for (const update of updates) {
        if (update.settingValue !== undefined) {
          await storage.upsertParentCommunitySetting(update.settingKey, update.settingValue);
        }
      }
      
      const allSettings = await storage.getAllParentCommunitySettings();
      const settingsMap: Record<string, string | null> = {};
      allSettings.forEach(s => {
        settingsMap[s.settingKey] = s.settingValue;
      });
      res.json(settingsMap);
    } catch (error) {
      console.error("Error updating parent community settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // ========== ASSESSMENT INSIGHTS ADMIN ROUTES ==========
  
  // Admin: Get all assessment insights
  app.get("/api/admin/assessment-insights", requireAuth, async (req, res) => {
    try {
      const insights = await storage.getAllAiInsights();
      res.json(insights);
    } catch (error) {
      console.error("Error fetching assessment insights:", error);
      res.status(500).json({ error: "Failed to fetch assessment insights" });
    }
  });

  // Admin: Update assessment insight
  app.patch("/api/admin/assessment-insights/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { strengths, needsImprovement, focusAreas, summary, parentingStyle, parentingTips } = req.body;
      
      const insight = await storage.updateAiInsights(id, {
        strengths,
        needsImprovement,
        focusAreas,
        summary,
        parentingStyle,
        parentingTips,
      });
      
      if (!insight) {
        return res.status(404).json({ error: "Insight not found" });
      }
      
      res.json(insight);
    } catch (error) {
      console.error("Error updating assessment insight:", error);
      res.status(500).json({ error: "Failed to update insight" });
    }
  });

  // ========== AI GENERATED TIPS ROUTES ==========
  
  // Admin: Get all AI generated tips
  app.get("/api/admin/ai-tips", requireAuth, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const tips = status 
        ? await storage.getAiGeneratedTipsByStatus(status)
        : await storage.getAllAiGeneratedTips();
      res.json(tips);
    } catch (error) {
      console.error("Error fetching AI tips:", error);
      res.status(500).json({ error: "Failed to fetch AI tips" });
    }
  });

  // Admin: Update AI tip (approve/reject/edit)
  app.patch("/api/admin/ai-tips/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, correctedContent, adminNotes, publishDate, title } = req.body;
      
      const tip = await storage.updateAiGeneratedTip(id, {
        status,
        correctedContent,
        adminNotes,
        publishDate,
        title,
        reviewedBy: req.session.userId,
      });
      
      if (!tip) {
        return res.status(404).json({ error: "AI tip not found" });
      }
      
      res.json(tip);
    } catch (error) {
      console.error("Error updating AI tip:", error);
      res.status(500).json({ error: "Failed to update AI tip" });
    }
  });

  // Public: Get today's approved AI tip
  app.get("/api/ai-tips/today", async (req, res) => {
    try {
      const lang = req.query.lang as string;
      let tip = await storage.getApprovedTipForToday();
      if (tip && lang) {
        tip = await applyTranslations(tip, 'ai_tip', tip.id, lang, ['title', 'content', 'correctedContent']);
      }
      res.json(tip || null);
    } catch (error) {
      console.error("Error fetching today's AI tip:", error);
      res.status(500).json({ error: "Failed to fetch today's tip" });
    }
  });

  app.post("/api/admin/ai-tips/:id/generate-audio", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const tip = await storage.getAiGeneratedTip(id);
      if (!tip) {
        return res.status(404).json({ error: "AI tip not found" });
      }

      const textFromBody = req.body?.text;
      const textToSpeak = textFromBody || tip.correctedContent || tip.content;
      
      console.log(`[AI-TIP-AUDIO] Generating audio for tip ${id}, text length: ${textToSpeak.length}`);
      
      const { generateAndUploadAudio } = await import("./tts");
      const AZURE_VOICE_UBAX = "so-SO-UbaxNeural";
      
      const timestamp = Date.now();
      const audioUrl = await generateAndUploadAudio(
        textToSpeak,
        `talo-${id}-${timestamp}`,
        "tts-audio/talooyinka",
        { azureVoice: AZURE_VOICE_UBAX },
        'dhambaal'
      );

      console.log(`[AI-TIP-AUDIO] Audio generated successfully: ${audioUrl}`);
      const updated = await storage.updateAiGeneratedTip(id, { audioUrl });
      
      res.json({ success: true, audioUrl });
    } catch (error) {
      console.error("Error generating AI tip audio:", error);
      res.status(500).json({ error: "Failed to generate audio" });
    }
  });

  // Admin: Manually trigger AI tip generation
  app.post("/api/admin/ai-tips/generate", requireAuth, async (req, res) => {
    try {
      const { generateAiParentingTip } = await import("./cron");
      await generateAiParentingTip();
      res.json({ success: true, message: "AI tip generation triggered" });
    } catch (error) {
      console.error("Error triggering AI tip generation:", error);
      res.status(500).json({ error: "Failed to generate AI tip" });
    }
  });

  // Admin: Get AI tip settings (prompt + pause)
  app.get("/api/admin/ai-tips/settings", requireAuth, async (req, res) => {
    try {
      const { getAiTipSettings } = await import("./cron");
      res.json(getAiTipSettings());
    } catch (error) {
      console.error("Error fetching AI tip settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Admin: Update AI tip settings (prompt + pause)
  app.put("/api/admin/ai-tips/settings", requireAuth, async (req, res) => {
    try {
      const { saveAiTipSettings } = await import("./cron");
      const { prompt, pauseUntil } = req.body;
      const updated = saveAiTipSettings({ prompt, pauseUntil });
      res.json(updated);
    } catch (error) {
      console.error("Error saving AI tip settings:", error);
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  // Admin: Manually trigger AI flashcard generation
  app.post("/api/admin/flashcards/generate", requireAuth, async (req, res) => {
    try {
      const { generateAiFlashcards } = await import("./cron");
      generateAiFlashcards();
      res.json({ success: true, message: "AI flashcard generation started in background" });
    } catch (error) {
      console.error("Error triggering AI flashcard generation:", error);
      res.status(500).json({ error: "Failed to generate AI flashcards" });
    }
  });

  // ========== LESSON AI GENERATION & AUDIO ROUTES ==========

  // Admin: Generate lesson audio (Ubax or Muuse voice)
  app.post("/api/admin/lessons/:id/generate-audio", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { voiceName, text } = req.body;

      const lesson = await storage.getLesson(id);
      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }

      const textToSpeak = text || lesson.textContent || lesson.description;
      if (!textToSpeak) {
        return res.status(400).json({ error: "No text content to generate audio from" });
      }

      const voice = voiceName === "ubax" ? "so-SO-UbaxNeural" : "so-SO-MuuseNeural";
      console.log(`[LESSON-AUDIO] Generating audio for lesson ${id} with voice ${voice}, text length: ${textToSpeak.length}`);

      const { generateAndUploadAudio } = await import("./tts");
      const timestamp = Date.now();
      const audioUrl = await generateAndUploadAudio(
        textToSpeak,
        `lesson-${id}-${timestamp}`,
        "tts-audio/casharada",
        { azureVoice: voice },
        'dhambaal'
      );

      console.log(`[LESSON-AUDIO] Audio generated: ${audioUrl}`);
      await storage.updateLesson(id, { audioUrl, voiceName: voiceName || "muuse" });

      res.json({ success: true, audioUrl });
    } catch (error) {
      console.error("Error generating lesson audio:", error);
      res.status(500).json({ error: "Failed to generate audio" });
    }
  });

  // Admin: AI Generate lesson text content
  app.post("/api/admin/lessons/ai-generate", requireAuth, async (req, res) => {
    try {
      const { topic, courseTitle, moduleTitle, customPrompt } = req.body;

      if (!topic) {
        return res.status(400).json({ error: "Topic is required" });
      }

      const openaiApiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
      const openaiBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

      if (!openaiApiKey) {
        return res.status(500).json({ error: "OpenAI API key not configured" });
      }

      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({
        apiKey: openaiApiKey,
        baseURL: openaiBaseUrl,
      });

      // Load custom prompt from settings or use default
      let promptTemplate: string;
      if (customPrompt) {
        promptTemplate = customPrompt;
      } else {
        const { getAiLessonSettings } = await import("./cron");
        const settings = getAiLessonSettings();
        promptTemplate = settings.prompt;
      }

      const prompt = promptTemplate
        .replace(/\{topic\}/g, topic)
        .replace(/\{courseTitle\}/g, courseTitle || "")
        .replace(/\{moduleTitle\}/g, moduleTitle || "");

      console.log(`[AI-LESSON] Generating lesson content for: ${topic}`);

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        return res.status(500).json({ error: "No content generated" });
      }

      console.log(`[AI-LESSON] Generated ${content.length} chars of lesson content`);
      res.json({ success: true, content, title: topic });
    } catch (error) {
      console.error("Error generating AI lesson:", error);
      res.status(500).json({ error: "Failed to generate lesson content" });
    }
  });

  // Admin: Get AI lesson settings
  app.get("/api/admin/ai-lessons/settings", requireAuth, async (req, res) => {
    try {
      const { getAiLessonSettings } = await import("./cron");
      res.json(getAiLessonSettings());
    } catch (error) {
      console.error("Error fetching AI lesson settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Admin: Update AI lesson settings
  app.put("/api/admin/ai-lessons/settings", requireAuth, async (req, res) => {
    try {
      const { saveAiLessonSettings } = await import("./cron");
      const { prompt } = req.body;
      const updated = saveAiLessonSettings({ prompt });
      res.json(updated);
    } catch (error) {
      console.error("Error saving AI lesson settings:", error);
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  // Admin: AI Generate video for lesson (Veo 3)
  app.post("/api/admin/lessons/:id/generate-video", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { prompt } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Video prompt is required" });
      }

      const lesson = await storage.getLesson(id);
      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }

      // Use Veo API key for video generation
      const veoApiKey = process.env.GOOGLE_VEO_API_KEY;
      if (!veoApiKey) {
        console.error("[AI-VIDEO] GOOGLE_VEO_API_KEY not configured in environment variables");
        return res.status(500).json({ error: "Veo API key not configured" });
      }

      console.log(`[AI-VIDEO] Starting video generation for lesson ${id}`);
      console.log(`[AI-VIDEO] Original prompt: ${prompt.substring(0, 100)}...`);

      // Convert Somali lesson text to English visual description for Veo
      const openai = getOpenAIClient();
      let videoPrompt = prompt;
      try {
        const translateRes = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are a video prompt expert. Convert the following Somali parenting lesson text into a concise English visual description suitable for AI video generation (Veo). 
Focus on describing:
- Visual scenes (what should be shown: people, settings, actions)
- Cinematography (camera angles, lighting, mood)
- Style (warm, educational, family-friendly)
Keep it under 200 words. Do NOT include any text overlays or subtitles in the description.
Make it a warm, realistic scene showing Somali family life and parenting.`
            },
            { role: "user", content: prompt }
          ],
          max_tokens: 300,
          temperature: 0.7,
        });
        videoPrompt = translateRes.choices[0]?.message?.content || prompt;
        console.log(`[AI-VIDEO] Translated prompt: ${videoPrompt.substring(0, 200)}...`);
      } catch (err) {
        console.error("[AI-VIDEO] Failed to translate prompt, using original:", err);
      }

      // Start video generation using Veo API (predictLongRunning endpoint)
      const veoModel = "veo-3.1-generate-preview";
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${veoModel}:predictLongRunning`,
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-goog-api-key": veoApiKey,
          },
          body: JSON.stringify({
            instances: [{ prompt: videoPrompt }],
            parameters: {
              aspectRatio: "16:9",
              durationSeconds: 8,
              resolution: "1080p",
            },
          }),
        }
      );

      console.log("[AI-VIDEO] Response status:", response.status, response.statusText);
      const responseText = await response.text();
      console.log("[AI-VIDEO] Response body:", responseText.substring(0, 1000));

      if (!response.ok) {
        console.error("[AI-VIDEO] Gemini Veo error:", response.status, responseText);
        let errorMsg = "Video generation failed";
        try {
          const parsed = JSON.parse(responseText);
          errorMsg = parsed?.error?.message || errorMsg;
          // Log detailed error for debugging
          if (parsed?.error) {
            console.error("[AI-VIDEO] Detailed error:", JSON.stringify(parsed.error, null, 2));
          }
        } catch { 
          errorMsg = responseText.substring(0, 200) || errorMsg;
        }
        return res.status(500).json({ error: errorMsg });
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        return res.status(500).json({ error: "Invalid response from Veo API" });
      }
      console.log("[AI-VIDEO] Video generation started:", data.name);

      res.json({ success: true, operationName: data.name, message: "Video generation started - this may take 1-2 minutes" });
    } catch (error) {
      console.error("Error generating video:", error);
      res.status(500).json({ error: "Failed to generate video" });
    }
  });

  // Admin: Check video generation status (operationName contains slashes, use wildcard)
  // When video is done, automatically downloads from Gemini and uploads to R2 for permanent storage
  app.get("/api/admin/lessons/video-status/*", requireAuth, async (req, res) => {
    try {
      const veoApiKey = process.env.GOOGLE_VEO_API_KEY;
      if (!veoApiKey) {
        return res.status(500).json({ error: "Veo API key not configured" });
      }

      const operationName = req.params[0];
      console.log("[AI-VIDEO] Polling operation:", operationName);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${operationName}`,
        {
          headers: { "x-goog-api-key": veoApiKey },
        }
      );

      if (!response.ok) {
        return res.status(500).json({ error: "Failed to check status" });
      }

      const data = await response.json();
      
      // If video generation is done, download from Gemini and upload to R2 for permanent storage
      if (data.done && data.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri) {
        const videoUri = data.response.generateVideoResponse.generatedSamples[0].video.uri;
        console.log("[AI-VIDEO] Video ready, downloading from Gemini:", videoUri);
        
        try {
          // Download video from Gemini (requires API key)
          const downloadUrl = videoUri.includes('?') ? `${videoUri}&key=${veoApiKey}` : `${videoUri}?key=${veoApiKey}`;
          const videoResponse = await fetch(downloadUrl);
          
          if (videoResponse.ok) {
            const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
            console.log(`[AI-VIDEO] Downloaded video: ${(videoBuffer.length / 1024 / 1024).toFixed(1)} MB`);
            
            // Upload to R2 for permanent storage
            const { uploadToR2, isR2Configured } = await import('./r2Storage');
            if (isR2Configured()) {
              const fileName = `veo-${Date.now()}.mp4`;
              const { url } = await uploadToR2(videoBuffer, fileName, 'video/mp4', 'lesson-videos', 'dhambaal');
              console.log(`[AI-VIDEO] Uploaded to R2: ${url}`);
              
              // Return R2 URL instead of Gemini temporary URL
              data._r2VideoUrl = url;
            } else {
              console.warn("[AI-VIDEO] R2 not configured, video will use temporary Gemini URL");
            }
          } else {
            console.error("[AI-VIDEO] Failed to download video from Gemini:", videoResponse.status);
          }
        } catch (dlError) {
          console.error("[AI-VIDEO] Error downloading/uploading video:", dlError);
        }
      }
      
      res.json(data);
    } catch (error) {
      console.error("Error checking video status:", error);
      res.status(500).json({ error: "Failed to check video status" });
    }
  });

  // Admin: Re-upload a video from external URL to R2 (fix temporary Gemini URLs)
  app.post("/api/admin/lessons/:id/reupload-video", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const lesson = await storage.getLesson(id);
      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }
      
      const videoUrl = lesson.videoUrl;
      if (!videoUrl) {
        return res.status(400).json({ error: "Lesson has no video URL" });
      }
      
      console.log(`[AI-VIDEO] Re-uploading video for lesson ${id}: ${videoUrl.substring(0, 80)}...`);
      
      // Download the video
      const veoApiKey = process.env.GOOGLE_VEO_API_KEY;
      let downloadUrl = videoUrl;
      if (videoUrl.includes('generativelanguage.googleapis.com') && veoApiKey) {
        downloadUrl = videoUrl.includes('?') ? `${videoUrl}&key=${veoApiKey}` : `${videoUrl}?key=${veoApiKey}`;
      }
      
      const videoResponse = await fetch(downloadUrl);
      if (!videoResponse.ok) {
        return res.status(400).json({ error: `Failed to download video: ${videoResponse.status} ${videoResponse.statusText}` });
      }
      
      const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
      console.log(`[AI-VIDEO] Downloaded: ${(videoBuffer.length / 1024 / 1024).toFixed(1)} MB`);
      
      const { uploadToR2, isR2Configured } = await import('./r2Storage');
      if (!isR2Configured()) {
        return res.status(500).json({ error: "R2 storage not configured" });
      }
      
      const fileName = `veo-lesson-${id}-${Date.now()}.mp4`;
      const { url } = await uploadToR2(videoBuffer, fileName, 'video/mp4', 'lesson-videos', 'dhambaal');
      console.log(`[AI-VIDEO] Uploaded to R2: ${url}`);
      
      // Update lesson with R2 URL
      await storage.updateLesson(id, { videoUrl: url });
      console.log(`[AI-VIDEO] Lesson ${id} video URL updated to R2`);
      
      res.json({ success: true, url, message: "Video re-uploaded to permanent storage" });
    } catch (error: any) {
      console.error("Error re-uploading video:", error);
      res.status(500).json({ error: error.message || "Failed to re-upload video" });
    }
  });

  // ========== APPOINTMENT BOOKING ROUTES ==========

  // Parent: Get my appointments
  app.get("/api/parent/appointments", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const appointmentsList = await storage.getAppointmentsByParent(req.session.parentId);
      res.json(appointmentsList);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });

  // Parent: Create appointment request
  app.post("/api/parent/appointments", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { appointmentDate, appointmentTime, topic, duration } = req.body;
      
      if (!appointmentDate || !appointmentTime) {
        return res.status(400).json({ error: "Date and time are required" });
      }

      const appointment = await storage.createAppointment({
        parentId: req.session.parentId,
        appointmentDate,
        appointmentTime,
        topic: topic || null,
        duration: duration || 30,
        teacherName: "Ustaad Musse Said",
      });
      
      res.status(201).json(appointment);
    } catch (error) {
      console.error("Error creating appointment:", error);
      res.status(500).json({ error: "Failed to create appointment" });
    }
  });

  // Admin: Get all appointments
  app.get("/api/admin/appointments", requireAuth, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const appointmentsList = status
        ? await storage.getAppointmentsByStatus(status)
        : await storage.getAllAppointments();
      res.json(appointmentsList);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });

  // Admin: Update appointment (approve/reject/cancel/edit time/add meeting link)
  app.patch("/api/admin/appointments/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, meetingLink, adminNotes, appointmentDate, appointmentTime } = req.body;
      
      const appointment = await storage.updateAppointment(id, {
        status,
        meetingLink,
        adminNotes,
        appointmentDate,
        appointmentTime,
      });
      
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      res.json(appointment);
    } catch (error) {
      console.error("Error updating appointment:", error);
      res.status(500).json({ error: "Failed to update appointment" });
    }
  });

  // Admin: Get all availability slots
  app.get("/api/admin/availability", requireAuth, async (req, res) => {
    try {
      const slots = await storage.getAllAvailabilitySlots();
      res.json(slots);
    } catch (error) {
      console.error("Error fetching availability slots:", error);
      res.status(500).json({ error: "Failed to fetch availability slots" });
    }
  });

  // Admin: Create availability slot
  app.post("/api/admin/availability", requireAuth, async (req, res) => {
    try {
      const { dayOfWeek, startTime, endTime } = req.body;
      
      if (dayOfWeek === undefined || !startTime || !endTime) {
        return res.status(400).json({ error: "Day, start time, and end time are required" });
      }
      
      const slot = await storage.createAvailabilitySlot({
        dayOfWeek,
        startTime,
        endTime,
        isActive: true,
      });
      
      res.status(201).json(slot);
    } catch (error) {
      console.error("Error creating availability slot:", error);
      res.status(500).json({ error: "Failed to create availability slot" });
    }
  });

  // Admin: Delete availability slot
  app.delete("/api/admin/availability/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAvailabilitySlot(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting availability slot:", error);
      res.status(500).json({ error: "Failed to delete availability slot" });
    }
  });

  // Admin: Toggle availability slot active/inactive
  app.patch("/api/admin/availability/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      
      const slot = await storage.toggleAvailabilitySlot(id, isActive);
      
      if (!slot) {
        return res.status(404).json({ error: "Slot not found" });
      }
      
      res.json(slot);
    } catch (error) {
      console.error("Error updating availability slot:", error);
      res.status(500).json({ error: "Failed to update availability slot" });
    }
  });

  // Admin: Get all calendar availability dates
  app.get("/api/admin/calendar-availability", requireAuth, async (req, res) => {
    try {
      const availability = await storage.getAllCalendarAvailability();
      res.json(availability);
    } catch (error) {
      console.error("Error fetching calendar availability:", error);
      res.status(500).json({ error: "Failed to fetch calendar availability" });
    }
  });

  // Admin: Set calendar availability for a specific date
  app.post("/api/admin/calendar-availability", requireAuth, async (req, res) => {
    try {
      const { date, isAvailable, startTime, endTime, notes } = req.body;
      
      if (!date) {
        return res.status(400).json({ error: "Date is required" });
      }
      
      const availability = await storage.setCalendarAvailability({
        date,
        isAvailable: isAvailable !== false,
        startTime: startTime || "09:00",
        endTime: endTime || "17:00",
        notes: notes || null,
      });
      
      res.status(201).json(availability);
    } catch (error) {
      console.error("Error setting calendar availability:", error);
      res.status(500).json({ error: "Failed to set calendar availability" });
    }
  });

  // Admin: Delete calendar availability for a specific date
  app.delete("/api/admin/calendar-availability/:date", requireAuth, async (req, res) => {
    try {
      const { date } = req.params;
      await storage.deleteCalendarAvailability(date);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting calendar availability:", error);
      res.status(500).json({ error: "Failed to delete calendar availability" });
    }
  });

  // Public: Get available dates for booking (next 60 days)
  app.get("/api/available-dates", async (req, res) => {
    try {
      const today = new Date();
      const fromDate = today.toISOString().split('T')[0];
      const toDate = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const availableDates = await storage.getAvailableDates(fromDate, toDate);
      res.json(availableDates);
    } catch (error) {
      console.error("Error fetching available dates:", error);
      res.status(500).json({ error: "Failed to fetch available dates" });
    }
  });

  // Public: Get available time slots for a specific date (checks admin's availability)
  app.get("/api/availability/:date", async (req, res) => {
    try {
      const { date } = req.params;
      const dateObj = new Date(date);
      const dayOfWeek = dateObj.getDay(); // 0=Sunday, 1=Monday, etc.
      
      // Get admin's availability for this day of week
      const slots = await storage.getAvailabilitySlotsByDay(dayOfWeek);
      
      // Get existing appointments for this date to exclude booked times
      const appointments = await storage.getAllAppointments();
      const bookedTimes = appointments
        .filter(apt => apt.appointmentDate === date && apt.status !== 'rejected' && apt.status !== 'cancelled')
        .map(apt => apt.appointmentTime);
      
      // Filter out booked times
      const availableTimes = slots
        .map(slot => slot.startTime)
        .filter(time => !bookedTimes.includes(time));
      
      res.json(availableTimes);
    } catch (error) {
      console.error("Error fetching available times:", error);
      res.status(500).json({ error: "Failed to fetch available times" });
    }
  });

  // Admin: Get all quizzes with lesson and course info
  app.get("/api/admin/quizzes", requireAuth, async (req, res) => {
    try {
      const quizzesList = await storage.getAllQuizzesWithDetails();
      res.json(quizzesList);
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      res.status(500).json({ error: "Failed to fetch quizzes" });
    }
  });

  // Admin: Delete quiz
  app.delete("/api/admin/quizzes/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteQuiz(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting quiz:", error);
      res.status(500).json({ error: "Failed to delete quiz" });
    }
  });

  // Admin: Get all assignments with lesson and course info
  app.get("/api/admin/assignments", requireAuth, async (req, res) => {
    try {
      const assignmentsList = await storage.getAllAssignmentsWithDetails();
      res.json(assignmentsList);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      res.status(500).json({ error: "Failed to fetch assignments" });
    }
  });

  // Admin: Create assignment
  app.post("/api/admin/assignments", requireAuth, async (req, res) => {
    try {
      const { lessonId, title, description } = req.body;
      const assignment = await storage.createAssignment({
        lessonId,
        title,
        description,
        order: 0,
      });
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error creating assignment:", error);
      res.status(500).json({ error: "Failed to create assignment" });
    }
  });

  // Admin: Delete assignment
  app.delete("/api/admin/assignments/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAssignment(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting quiz:", error);
      res.status(500).json({ error: "Failed to delete quiz" });
    }
  });

  // Admin: Get all assignment submissions
  app.get("/api/admin/assignment-submissions", requireAuth, async (req, res) => {
    try {
      const submissions = await storage.getAllAssignmentSubmissionsWithDetails();
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching assignment submissions:", error);
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  // Parent: Submit assignment
  app.post("/api/assignment-submissions", async (req, res) => {
    try {
      const { assignmentId, parentId, content } = req.body;
      if (!assignmentId || !parentId || !content) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const submission = await storage.createAssignmentSubmission({
        assignmentId,
        parentId,
        content,
      });
      res.status(201).json(submission);
    } catch (error) {
      console.error("Error creating assignment submission:", error);
      res.status(500).json({ error: "Failed to submit assignment" });
    }
  });

  // Get assignment submissions for a parent
  app.get("/api/assignment-submissions", async (req, res) => {
    try {
      const { assignmentId, parentId } = req.query;
      if (!assignmentId || !parentId) {
        return res.status(400).json({ error: "Missing required query params" });
      }
      const submissions = await storage.getAssignmentSubmissionsByParentAndAssignment(
        parentId as string, 
        assignmentId as string
      );
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching assignment submissions:", error);
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  // Admin: Update assignment submission status
  app.patch("/api/admin/assignment-submissions/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, feedback } = req.body;
      const updated = await storage.updateAssignmentSubmission(id, {
        status,
        feedback,
        reviewedAt: new Date(),
      });
      if (!updated) {
        return res.status(404).json({ error: "Submission not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating assignment submission:", error);
      res.status(500).json({ error: "Failed to update submission" });
    }
  });

  // Parent: Submit testimonial (requires parent session)
  app.post("/api/parent/testimonials", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Fadlan ku gal akoonkaaga" });
      }

      const parent = await storage.getParent(req.session.parentId);
      if (!parent) {
        return res.status(401).json({ error: "Parent not found" });
      }

      const { name, location, courseTag, profileImage, rating, message } = req.body;

      if (!name || !message || !rating) {
        return res.status(400).json({ error: "Magaca, xiddigaha, iyo faalladdu waa lagama maarmaan" });
      }

      const parsedRating = parseInt(rating);
      if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
        return res.status(400).json({ error: "Xiddigaha waa inay u dhexeeyaan 1-5" });
      }

      const testimonial = await storage.createTestimonial({
        name,
        location: location || null,
        courseTag: courseTag || null,
        profileImage: profileImage || null,
        parentId: parent.id,
        rating: parsedRating,
        message,
        isPublished: true,
        order: 0,
      });

      res.json(testimonial);
    } catch (error) {
      console.error("Error submitting testimonial:", error);
      res.status(500).json({ error: "Khalad ayaa dhacay" });
    }
  });

  // Stats: Get parent count (for homepage stats)
  app.get("/api/stats/parents", async (req, res) => {
    try {
      const data = await getCached('stats-parents', 120000, async () => {
        const count = await storage.getParentCount();
        return { count };
      });
      res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
      res.json(data);
    } catch (error) {
      res.json({ count: 0 });
    }
  });

  app.get("/api/stats/telegram-members", async (req, res) => {
    try {
      const data = await getCached('stats-telegram', 300000, async () => {
        const { getTelegramGroupMemberCount } = await import("./telegram");
        const count = await getTelegramGroupMemberCount();
        return { count: count || 9905 };
      });
      res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=1800');
      res.json(data);
    } catch (error) {
      console.error("Error fetching Telegram member count:", error);
      res.json({ count: 9905 });
    }
  });

  // Personalized Course Recommendations
  app.get("/api/recommendations", async (req, res) => {
    try {
      const allCourses = await storage.getAllCourses();
      
      if (!req.session.parentId) {
        // For non-logged-in users, return popular courses
        const popularCourses = allCourses
          .filter(c => c.isLive)
          .sort((a, b) => a.order - b.order)
          .slice(0, 4);
        return res.json({ 
          recommendations: popularCourses,
          reason: "popular"
        });
      }

      const enrollments = await storage.getEnrollmentsByParentId(req.session.parentId);
      const progress = await storage.getProgressByParentId(req.session.parentId);
      
      const enrolledCourseIds = new Set(enrollments.map(e => e.courseId));
      const enrolledCourses = allCourses.filter(c => enrolledCourseIds.has(c.id));
      
      // Get categories user is interested in
      const userCategories = new Set(enrolledCourses.map(c => c.category));
      
      // Age-based course progression mapping
      const ageProgression: Record<string, string> = {
        "0-6": "6-12",
        "6-12": "1-2",
        "1-2": "2-4",
        "2-4": "4-7",
      };
      
      // Find next courses in sequence
      const nextInSequence: typeof allCourses = [];
      enrolledCourses.forEach(course => {
        const nextCourseId = ageProgression[course.courseId];
        if (nextCourseId) {
          const nextCourse = allCourses.find(c => c.courseId === nextCourseId && !enrolledCourseIds.has(c.id));
          if (nextCourse) {
            nextInSequence.push(nextCourse);
          }
        }
      });
      
      // Find similar category courses not enrolled
      const similarCategoryCourses = allCourses.filter(c => 
        userCategories.has(c.category) && 
        !enrolledCourseIds.has(c.id) &&
        c.isLive
      );
      
      // If user has general courses, recommend special courses and vice versa
      const complementaryCourses = allCourses.filter(c =>
        !userCategories.has(c.category) &&
        !enrolledCourseIds.has(c.id) &&
        c.isLive
      );
      
      // Build recommendations with priority
      const recommendations: typeof allCourses = [];
      const addedIds = new Set<string>();
      
      // Priority 1: Next courses in age sequence
      nextInSequence.forEach(course => {
        if (!addedIds.has(course.id) && recommendations.length < 4) {
          recommendations.push(course);
          addedIds.add(course.id);
        }
      });
      
      // Priority 2: Same category courses
      similarCategoryCourses.forEach(course => {
        if (!addedIds.has(course.id) && recommendations.length < 4) {
          recommendations.push(course);
          addedIds.add(course.id);
        }
      });
      
      // Priority 3: Complementary (different category) courses
      complementaryCourses.forEach(course => {
        if (!addedIds.has(course.id) && recommendations.length < 4) {
          recommendations.push(course);
          addedIds.add(course.id);
        }
      });
      
      // If still no recommendations, show popular courses they haven't enrolled in
      if (recommendations.length === 0) {
        const notEnrolled = allCourses
          .filter(c => !enrolledCourseIds.has(c.id) && c.isLive)
          .sort((a, b) => a.order - b.order)
          .slice(0, 4);
        return res.json({ 
          recommendations: notEnrolled,
          reason: "discover"
        });
      }
      
      res.json({ 
        recommendations,
        reason: enrollments.length > 0 ? "personalized" : "popular"
      });
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ error: "Failed to get recommendations" });
    }
  });

  // Support Messages: Get parent's messages
  app.get("/api/support/messages", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Fadlan ku gal akoonkaaga" });
      }
      const messages = await storage.getSupportMessagesByParentId(req.session.parentId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching support messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Support Messages: Get guest messages by sessionId
  app.get("/api/support/messages/guest", async (req, res) => {
    try {
      const { sessionId } = req.query;
      if (!sessionId || typeof sessionId !== 'string') {
        return res.json([]);
      }
      const messages = await storage.getSupportMessagesBySessionId(sessionId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching guest support messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Support Messages: Send message (supports both authenticated parents and guests)
  app.post("/api/support/messages", async (req, res) => {
    try {
      const { message, sessionId, guestName, guestEmail, guestPhone, guestLocation } = req.body;
      if (!message?.trim()) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Check if authenticated parent
      if (req.session.parentId) {
        const newMessage = await storage.createSupportMessage({
          parentId: req.session.parentId,
          message: message.trim(),
          isFromAdmin: false,
        });
        return res.json(newMessage);
      }

      // Guest user - require sessionId and guestName
      if (!sessionId || !guestName?.trim()) {
        return res.status(400).json({ error: "SessionId and name are required for guests" });
      }

      const newMessage = await storage.createSupportMessage({
        sessionId,
        guestName: guestName.trim(),
        guestEmail: guestEmail?.trim() || null,
        guestPhone: guestPhone?.trim() || null,
        guestLocation: guestLocation?.trim() || null,
        message: message.trim(),
        isFromAdmin: false,
      });
      res.json(newMessage);
    } catch (error) {
      console.error("Error sending support message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Admin: Get all support conversations
  app.get("/api/admin/support/conversations", requireAuth, async (req, res) => {
    try {
      const conversations = await storage.getSupportConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching support conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Admin: Get all support messages
  app.get("/api/admin/support/messages", requireAuth, async (req, res) => {
    try {
      const messages = await storage.getAllSupportMessages();
      res.json(messages);
    } catch (error) {
      console.error("Error fetching all support messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Admin: Reply to support message (supports parentId or sessionId)
  app.post("/api/admin/support/reply", requireAuth, async (req, res) => {
    try {
      console.log("[CHAT] Admin reply request:", JSON.stringify(req.body));
      const { message, parentId, sessionId } = req.body;
      if (!message?.trim()) {
        return res.status(400).json({ error: "Message is required" });
      }
      if (!parentId && !sessionId) {
        console.log("[CHAT] Error: Neither parentId nor sessionId provided");
        return res.status(400).json({ error: "ParentId or sessionId is required" });
      }

      const newMessage = await storage.createSupportMessage({
        parentId: parentId || null,
        sessionId: sessionId || null,
        message: message.trim(),
        isFromAdmin: true,
      });
      
      // Mark messages as read
      await storage.markMessagesAsRead(parentId, sessionId);
      
      res.json(newMessage);
    } catch (error) {
      console.error("Error sending admin reply:", error);
      res.status(500).json({ error: "Failed to send reply" });
    }
  });

  // Keep old route for backwards compatibility
  app.post("/api/admin/support/reply/:parentId", requireAuth, async (req, res) => {
    try {
      const { parentId } = req.params;
      const { message } = req.body;
      if (!message?.trim()) {
        return res.status(400).json({ error: "Message is required" });
      }
      const newMessage = await storage.createSupportMessage({
        parentId,
        message: message.trim(),
        isFromAdmin: true,
      });
      res.json(newMessage);
    } catch (error) {
      console.error("Error sending admin reply:", error);
      res.status(500).json({ error: "Failed to send reply" });
    }
  });

  // Register object storage routes for video uploads
  registerObjectStorageRoutes(app);
  
  // Register image generation routes (Gemini API)
  registerImageRoutes(app);
  
  // Register bedtime story routes (Maaweelada Caruurta)
  registerBedtimeStoryRoutes(app);

  // Register parent message routes (Dhambaalka Waalidka)
  registerParentMessageRoutes(app);

  // Register parent tips routes (Talooyinka Waalidka)
  registerParentTipsRoutes(app);

  // Register learning groups routes (Guruubada Waxbarashada)
  registerLearningGroupRoutes(app);

  // Register lesson discussion group routes (Aan ka wada hadalo Casharkan)
  registerLessonGroupRoutes(app);

  // Register dhambaal discussion routes (Wadahadal Dhambaalka)
  registerDhambaalDiscussionRoutes(app);

  // Register OpenAI Batch API routes (Bulk Translation & Content Generation)
  registerBatchApiRoutes(app);

  // Register video proxy routes (Google Drive video streaming)
  app.use(videoProxyRouter);

  // ==========================================
  // Content Import from Google Drive
  // ==========================================
  
  // List content files from Google Drive for import
  app.get("/api/admin/import/list", async (req, res) => {
    try {
      const isAdmin = (req.session as any)?.isAdmin;
      if (!isAdmin) {
        return res.status(401).json({ message: "Admin-ka kaliya ayaa geli kara" });
      }
      
      const dhambaalFiles = await listDhambaalFiles();
      const maaweelFiles = await listMaaweelFiles();
      
      res.json({
        dhambaal: dhambaalFiles,
        maaweelo: maaweelFiles
      });
    } catch (error) {
      console.error("[IMPORT] Error listing files:", error);
      res.status(500).json({ message: "Khalad ayaa dhacay" });
    }
  });
  
  // Import all content from Google Drive
  app.post("/api/admin/import/all", async (req, res) => {
    try {
      const isAdmin = (req.session as any)?.isAdmin;
      if (!isAdmin) {
        return res.status(401).json({ message: "Admin-ka kaliya ayaa geli kara" });
      }
      
      let imported = { dhambaal: 0, maaweelo: 0, skipped: 0, errors: [] as string[] };
      
      // Get existing content to avoid duplicates
      const existingDhambaal = await storage.getParentMessages();
      const existingMaaweelo = await storage.getBedtimeStories();
      
      const existingDhambaalTitles = new Set(existingDhambaal.map(d => d.title?.toLowerCase().trim()));
      const existingMaaweelTitles = new Set(existingMaaweelo.map(m => m.titleSomali?.toLowerCase().trim()));
      
      // Import dhambaal
      const dhambaalFiles = await listDhambaalFiles();
      for (const file of dhambaalFiles) {
        try {
          const content = await getFileContent(file.id);
          if (!content) continue;
          
          const parsed = parseDhambaalContent(content, file.name);
          if (!parsed) continue;
          
          // Check for duplicate
          if (existingDhambaalTitles.has(parsed.title.toLowerCase().trim())) {
            imported.skipped++;
            continue;
          }
          
          // Create new parent message
          await storage.createParentMessage({
            title: parsed.title,
            content: parsed.body,
            messageDate: parsed.date,
            audioUrl: null,
            images: [],
            topic: 'general'
          });
          
          imported.dhambaal++;
          existingDhambaalTitles.add(parsed.title.toLowerCase().trim());
        } catch (err) {
          imported.errors.push(`Dhambaal: ${file.name}`);
        }
      }
      
      // Import maaweelo
      const maaweelFiles = await listMaaweelFiles();
      for (const file of maaweelFiles) {
        try {
          const content = await getFileContent(file.id);
          if (!content) continue;
          
          const parsed = parseMaaweelContent(content, file.name);
          if (!parsed) continue;
          
          // Check for duplicate
          if (existingMaaweelTitles.has(parsed.title.toLowerCase().trim())) {
            imported.skipped++;
            continue;
          }
          
          // Create new bedtime story
          await storage.createBedtimeStory({
            title: parsed.title,
            titleSomali: parsed.title,
            content: parsed.body,
            characterName: parsed.characterName || 'Qof aan la aqoon',
            characterType: 'human',
            moralLesson: parsed.moralLesson || '',
            storyDate: parsed.date,
            audioUrl: null,
            images: []
          });
          
          imported.maaweelo++;
          existingMaaweelTitles.add(parsed.title.toLowerCase().trim());
        } catch (err) {
          imported.errors.push(`Maaweelo: ${file.name}`);
        }
      }
      
      // Clear caches
      clearParentMessagesCache();
      clearBedtimeStoriesCache();
      
      res.json({
        success: true,
        message: `Imported: ${imported.dhambaal} dhambaal, ${imported.maaweelo} maaweelo. Skipped: ${imported.skipped}`,
        imported
      });
    } catch (error) {
      console.error("[IMPORT] Error importing:", error);
      res.status(500).json({ message: "Khalad ayaa dhacay import-ga" });
    }
  });

  // Handle OPTIONS preflight for video proxy
  app.options("/api/video-proxy", (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.status(204).end();
  });

  // HEAD request for video proxy (mobile browsers check this first)
  app.head("/api/video-proxy", async (req, res) => {
    try {
      const videoUrl = req.query.url as string;
      
      if (!videoUrl) {
        return res.status(400).end();
      }

      if (!videoUrl.includes("barbaarintasan.com")) {
        return res.status(403).end();
      }

      const response = await fetch(videoUrl, { method: 'HEAD' });
      
      if (!response.ok) {
        return res.status(response.status).end();
      }

      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      const acceptRanges = response.headers.get('accept-ranges');
      const lastModified = response.headers.get('last-modified');

      if (contentType) res.setHeader('Content-Type', contentType);
      if (contentLength) res.setHeader('Content-Length', contentLength);
      if (lastModified) res.setHeader('Last-Modified', lastModified);
      res.setHeader('Accept-Ranges', acceptRanges || 'bytes');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Range');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      
      res.status(200).end();
    } catch (error) {
      console.error("Video proxy HEAD error:", error);
      res.status(500).end();
    }
  });

  // Video proxy endpoint to handle CORS and Range headers for external videos
  app.get("/api/video-proxy", async (req, res) => {
    try {
      const videoUrl = req.query.url as string;
      
      if (!videoUrl) {
        return res.status(400).json({ error: "Video URL is required" });
      }

      // Only allow videos from barbaarintasan.com domain
      if (!videoUrl.includes("barbaarintasan.com")) {
        return res.status(403).json({ error: "Only barbaarintasan.com videos are allowed" });
      }

      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      };

      // Forward Range header for partial content requests
      if (req.headers.range) {
        headers['Range'] = req.headers.range;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(videoUrl, { 
        headers,
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok && response.status !== 206) {
        return res.status(response.status).json({ error: "Failed to fetch video" });
      }

      // Forward relevant headers
      res.status(response.status);
      
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      const contentRange = response.headers.get('content-range');
      const acceptRanges = response.headers.get('accept-ranges');

      if (contentType) res.setHeader('Content-Type', contentType);
      if (contentLength) res.setHeader('Content-Length', contentLength);
      if (contentRange) res.setHeader('Content-Range', contentRange);
      res.setHeader('Accept-Ranges', acceptRanges || 'bytes');
      
      // Enable CORS and caching for mobile browsers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Range');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
      res.setHeader('Cache-Control', 'public, max-age=3600');

      // Stream the response body directly without buffering
      if (response.body) {
        const { Readable } = await import('stream');
        const readable = Readable.fromWeb(response.body as any);
        readable.pipe(res);
        
        // Handle client disconnect
        req.on('close', () => {
          readable.destroy();
        });
      } else {
        res.end();
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error("Video proxy timeout");
        return res.status(504).json({ error: "Video fetch timeout" });
      }
      console.error("Video proxy error:", error);
      res.status(500).json({ error: "Failed to proxy video" });
    }
  });

  // Assignment Submission routes
  // Get my assignment submission for a lesson
  app.get("/api/lessons/:lessonId/my-assignment", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }
      const submission = await storage.getAssignmentSubmissionByParentAndLesson(
        req.session.parentId,
        req.params.lessonId
      );
      res.json(submission || null);
    } catch (error) {
      console.error("Error fetching assignment submission:", error);
      res.status(500).json({ error: "Failed to fetch submission" });
    }
  });

  // Submit assignment
  app.post("/api/lessons/:lessonId/assignment", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Fadlan ku gal akoonkaaga" });
      }
      const { content } = req.body;
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "Assignment content is required" });
      }
      
      // Find the assignment for this lesson
      const assignments = await storage.getAssignmentsByLessonId(req.params.lessonId);
      if (!assignments || assignments.length === 0) {
        return res.status(404).json({ error: "No assignment found for this lesson" });
      }
      const assignment = assignments[0];
      
      // Check if already submitted
      const existing = await storage.getAssignmentSubmissionByParentAndLesson(
        req.session.parentId,
        req.params.lessonId
      );
      
      if (existing) {
        // Update existing submission
        const updated = await storage.updateAssignmentSubmission(existing.id, {
          content: content.trim(),
          status: "pending",
          submittedAt: new Date(),
        });
        return res.json(updated);
      }
      
      const submission = await storage.createAssignmentSubmission({
        assignmentId: assignment.id,
        parentId: req.session.parentId,
        content: content.trim(),
      });
      res.json(submission);
    } catch (error) {
      console.error("Error submitting assignment:", error);
      res.status(500).json({ error: "Failed to submit assignment" });
    }
  });

  // Admin: Get all assignment submissions
  app.get("/api/admin/assignments", requireAuth, async (req, res) => {
    try {
      const submissions = await storage.getAllAssignmentSubmissions();
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      res.status(500).json({ error: "Failed to fetch assignments" });
    }
  });

  // Admin: Review assignment
  app.patch("/api/admin/assignments/:id", requireAuth, async (req, res) => {
    try {
      const { status, feedback } = req.body;
      const updated = await storage.updateAssignmentSubmission(req.params.id, {
        status,
        feedback,
        reviewedAt: new Date(),
      });
      if (!updated) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating assignment:", error);
      res.status(500).json({ error: "Failed to update assignment" });
    }
  });

  // ===============================================
  // NEW FEATURES: Daily Tips, Milestones, Badges, Resources, Community
  // ===============================================

  // Get daily tip (based on schedule first, then fallback to day of year)
  app.get("/api/daily-tip", async (req, res) => {
    try {
      const { ageRange } = req.query;
      
      // Get current date in YYYY-MM-DD format
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      // Calculate week number (ISO week)
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const days = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
      const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
      
      // First try to get a scheduled tip for today
      let tip = await storage.getScheduledTipForDate(today);
      
      // If no day schedule, try week schedule
      if (!tip) {
        tip = await storage.getScheduledTipForWeek(weekNumber);
      }
      
      // If no scheduled tip, fallback to original behavior
      if (!tip) {
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
        tip = await storage.getDailyTip(ageRange as string | undefined, dayOfYear) || null;
      }
      
      res.json(tip);
    } catch (error) {
      console.error("Error fetching daily tip:", error);
      res.status(500).json({ error: "Failed to fetch daily tip" });
    }
  });

  // Get all milestones (optionally by age range)
  app.get("/api/milestones", async (req, res) => {
    try {
      const { ageRange } = req.query;
      const milestones = await storage.getMilestones(ageRange as string | undefined);
      res.json(milestones);
    } catch (error) {
      console.error("Error fetching milestones:", error);
      res.status(500).json({ error: "Failed to fetch milestones" });
    }
  });

  // Get milestone progress for logged-in parent
  app.get("/api/milestones/progress", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }
      const progress = await storage.getMilestoneProgress(req.session.parentId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching milestone progress:", error);
      res.status(500).json({ error: "Failed to fetch progress" });
    }
  });

  // Toggle milestone completion
  app.post("/api/milestones/:milestoneId/toggle", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }
      const { notes } = req.body;
      const progress = await storage.toggleMilestoneProgress(
        req.session.parentId,
        req.params.milestoneId,
        notes
      );
      res.json(progress);
    } catch (error) {
      console.error("Error toggling milestone:", error);
      res.status(500).json({ error: "Failed to update milestone" });
    }
  });

  // ===============================================
  // ADMIN: Daily Tips CRUD
  // ===============================================
  app.get("/api/admin/daily-tips", requireAuth, async (req, res) => {
    try {
      const tips = await storage.getAllDailyTips();
      res.json(tips);
    } catch (error) {
      console.error("Error fetching daily tips:", error);
      res.status(500).json({ error: "Failed to fetch tips" });
    }
  });

  app.post("/api/admin/daily-tips", requireAuth, async (req, res) => {
    try {
      const { ageRange, title, content, category, order } = req.body;
      const tip = await storage.createDailyTip({ ageRange, title, content, category, order: order || 0 });
      res.json(tip);
    } catch (error) {
      console.error("Error creating daily tip:", error);
      res.status(500).json({ error: "Failed to create tip" });
    }
  });

  app.patch("/api/admin/daily-tips/:id", requireAuth, async (req, res) => {
    try {
      const { ageRange, title, content, category, order } = req.body;
      const tip = await storage.updateDailyTip(req.params.id, { ageRange, title, content, category, order });
      if (!tip) {
        return res.status(404).json({ error: "Tip not found" });
      }
      res.json(tip);
    } catch (error) {
      console.error("Error updating daily tip:", error);
      res.status(500).json({ error: "Failed to update tip" });
    }
  });

  app.delete("/api/admin/daily-tips/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteDailyTip(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting daily tip:", error);
      res.status(500).json({ error: "Failed to delete tip" });
    }
  });

  // ===============================================
  // ADMIN: Daily Tip Schedules CRUD
  // ===============================================
  app.get("/api/admin/tip-schedules", requireAuth, async (req, res) => {
    try {
      const schedules = await storage.getAllDailyTipSchedules();
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching tip schedules:", error);
      res.status(500).json({ error: "Failed to fetch schedules" });
    }
  });

  app.get("/api/admin/tip-schedules/tip/:tipId", requireAuth, async (req, res) => {
    try {
      const schedules = await storage.getDailyTipSchedulesByTipId(req.params.tipId);
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching schedules for tip:", error);
      res.status(500).json({ error: "Failed to fetch schedules" });
    }
  });

  app.post("/api/admin/tip-schedules", requireAuth, async (req, res) => {
    try {
      const { tipId, scheduleType, scheduledDate, weekNumber, courseId, priority, isActive } = req.body;
      
      // Validation
      if (!tipId || typeof tipId !== 'string') {
        return res.status(400).json({ error: "tipId is required and must be a string" });
      }
      if (!scheduleType || !['day', 'week'].includes(scheduleType)) {
        return res.status(400).json({ error: "scheduleType must be 'day' or 'week'" });
      }
      if (scheduleType === 'day' && !scheduledDate) {
        return res.status(400).json({ error: "scheduledDate is required for day schedule" });
      }
      if (scheduleType === 'week') {
        const weekNum = parseInt(weekNumber);
        if (isNaN(weekNum) || weekNum < 1 || weekNum > 52) {
          return res.status(400).json({ error: "weekNumber must be between 1 and 52" });
        }
      }
      
      const schedule = await storage.createDailyTipSchedule({
        tipId,
        scheduleType,
        scheduledDate: scheduleType === 'day' ? scheduledDate : null,
        weekNumber: scheduleType === 'week' ? parseInt(weekNumber) : null,
        courseId: courseId || null,
        priority: parseInt(priority) || 0,
        isActive: isActive !== false
      });
      res.json(schedule);
    } catch (error) {
      console.error("Error creating tip schedule:", error);
      res.status(500).json({ error: "Failed to create schedule" });
    }
  });

  app.patch("/api/admin/tip-schedules/:id", requireAuth, async (req, res) => {
    try {
      const { tipId, scheduleType, scheduledDate, weekNumber, courseId, priority, isActive } = req.body;
      
      // Validation for partial updates
      if (scheduleType && !['day', 'week'].includes(scheduleType)) {
        return res.status(400).json({ error: "scheduleType must be 'day' or 'week'" });
      }
      if (weekNumber !== undefined && weekNumber !== null) {
        const weekNum = parseInt(weekNumber);
        if (isNaN(weekNum) || weekNum < 1 || weekNum > 52) {
          return res.status(400).json({ error: "weekNumber must be between 1 and 52" });
        }
      }
      
      const updateData: any = {};
      if (tipId !== undefined) updateData.tipId = tipId;
      if (scheduleType !== undefined) updateData.scheduleType = scheduleType;
      if (scheduledDate !== undefined) updateData.scheduledDate = scheduledDate;
      if (weekNumber !== undefined) updateData.weekNumber = weekNumber !== null ? parseInt(weekNumber) : null;
      if (courseId !== undefined) updateData.courseId = courseId;
      if (priority !== undefined) updateData.priority = parseInt(priority) || 0;
      if (isActive !== undefined) updateData.isActive = isActive;
      
      const schedule = await storage.updateDailyTipSchedule(req.params.id, updateData);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      res.json(schedule);
    } catch (error) {
      console.error("Error updating tip schedule:", error);
      res.status(500).json({ error: "Failed to update schedule" });
    }
  });

  app.delete("/api/admin/tip-schedules/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteDailyTipSchedule(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting tip schedule:", error);
      res.status(500).json({ error: "Failed to delete schedule" });
    }
  });

  // ===============================================
  // ADMIN: Milestones CRUD
  // ===============================================
  app.get("/api/admin/milestones", requireAuth, async (req, res) => {
    try {
      const milestones = await storage.getAllMilestones();
      res.json(milestones);
    } catch (error) {
      console.error("Error fetching milestones:", error);
      res.status(500).json({ error: "Failed to fetch milestones" });
    }
  });

  app.post("/api/admin/milestones", requireAuth, async (req, res) => {
    try {
      const { ageRange, title, description, category, order } = req.body;
      const milestone = await storage.createMilestone({ ageRange, title, description, category, order: order || 0 });
      res.json(milestone);
    } catch (error) {
      console.error("Error creating milestone:", error);
      res.status(500).json({ error: "Failed to create milestone" });
    }
  });

  app.patch("/api/admin/milestones/:id", requireAuth, async (req, res) => {
    try {
      const { ageRange, title, description, category, order } = req.body;
      const milestone = await storage.updateMilestone(req.params.id, { ageRange, title, description, category, order });
      if (!milestone) {
        return res.status(404).json({ error: "Milestone not found" });
      }
      res.json(milestone);
    } catch (error) {
      console.error("Error updating milestone:", error);
      res.status(500).json({ error: "Failed to update milestone" });
    }
  });

  app.delete("/api/admin/milestones/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteMilestone(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting milestone:", error);
      res.status(500).json({ error: "Failed to delete milestone" });
    }
  });

  // ===============================================
  // ADMIN: Lesson AI Images (Sawiro AI)
  // ===============================================
  
  // Get all images for a lesson
  app.get("/api/lessons/:lessonId/images", async (req, res) => {
    try {
      const images = await storage.getLessonImages(req.params.lessonId);
      res.json(images);
    } catch (error) {
      console.error("Error fetching lesson images:", error);
      res.status(500).json({ error: "Failed to fetch images" });
    }
  });

  // Generate AI images for a lesson (Admin only)
  app.post("/api/admin/lessons/:lessonId/generate-images", requireAuth, async (req, res) => {
    try {
      const { lessonId } = req.params;
      const { count = 3 } = req.body;
      
      // Get the lesson to extract content for image prompts
      const lesson = await storage.getLesson(lessonId);
      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }

      // Get existing images count to set order
      const existingImages = await storage.getLessonImages(lessonId);
      let startOrder = existingImages.length;

      // Extract key topics from lesson content for prompts
      const lessonContent = lesson.textContent || lesson.title;
      const contentSnippet = lessonContent.substring(0, 500);

      // Generate culturally appropriate Somali family image prompts - REALISTIC PHOTOS
      const openai = getOpenAIClient();
      const promptResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a culturally-sensitive educational content creator for Somali families. Generate image prompts for REALISTIC PHOTOGRAPHS (not cartoons or illustrations) about parenting and child development.

IMPORTANT REQUIREMENTS:
- Generate prompts for REALISTIC, PHOTOREALISTIC images - NOT cartoons, NOT illustrations
- Feature Somali family members: aabe (father), hooyo (mother), carruur (children)
- CLOTHING (VERY IMPORTANT - follow exactly):
  * Father/Aabe at home: wears MACAWIS (traditional Somali wrap around waist) OR regular casual pants/trousers with t-shirt. NEVER white thobe/khamiis (that's for mosque/formal occasions only)
  * Father outside/formal: may wear qamiis (long shirt) with koofi (cap)
  * Mother/Hooyo: always wears hijab/jilbaab, modest clothing, may wear dirac (traditional dress) or modern modest clothing
  * Children: casual everyday clothing appropriate for activities
- Each image MUST be DIFFERENT - vary the scene, activity, angle, lighting, and composition
- Family-friendly, modest scenes with natural lighting
- Warm, nurturing family interactions in realistic home settings
- Professional photography style
- Focus on the specific lesson content provided

Generate ${count} unique and DISTINCTLY DIFFERENT image prompts as JSON array with objects having "prompt" (detailed prompt for realistic photo generation with specific scene description) and "caption" (short Somali description of the image, 5-10 words).`
          },
          {
            role: "user",
            content: `Create ${count} realistic photo prompts for this parenting lesson:\n\nTitle: ${lesson.title}\n\nContent: ${contentSnippet}`
          }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 2000
      });

      const promptsText = promptResponse.choices[0]?.message?.content || '{"prompts":[]}';
      let prompts: { prompt: string; caption: string }[] = [];
      try {
        const parsed = JSON.parse(promptsText);
        prompts = parsed.prompts || parsed.images || [];
      } catch (e) {
        console.error("Failed to parse AI response:", promptsText);
        return res.status(500).json({ error: "Failed to generate prompts" });
      }

      if (!prompts.length) {
        return res.status(500).json({ error: "No prompts generated" });
      }

      // Generate images and save them
      const generatedImages = [];
      for (let i = 0; i < Math.min(prompts.length, count); i++) {
        try {
          const { prompt, caption } = prompts[i];
          
          // Enhance prompt with Somali family context - realistic photo style with culturally appropriate clothing
          const enhancedPrompt = `${prompt}. Realistic photograph of a Somali family. Father: if at home wears macawis or casual pants (NOT white khamiis/thobe), if outdoor/formal may wear qamiis with koofi. Mother wears hijab and modest clothing. Natural lighting, warm family scene, professional photography style, photorealistic, high quality.`;
          
          // Generate the image
          const imageBuffer = await generateImageBuffer(enhancedPrompt, "1024x1024");
          
          // Convert to base64 data URL for storage
          const base64Image = imageBuffer.toString("base64");
          const imageUrl = `data:image/png;base64,${base64Image}`;
          
          // Save to database
          const savedImage = await storage.createLessonImage({
            lessonId,
            imageUrl,
            prompt: enhancedPrompt,
            caption: caption || null,
            order: startOrder + i
          });
          
          generatedImages.push(savedImage);
        } catch (imgError) {
          console.error(`Error generating image ${i + 1}:`, imgError);
          // Continue with remaining images
        }
      }

      res.json({
        success: true,
        generated: generatedImages.length,
        images: generatedImages
      });
    } catch (error) {
      console.error("Error generating lesson images:", error);
      res.status(500).json({ error: "Failed to generate images" });
    }
  });

  // Delete a lesson image (Admin only)
  app.delete("/api/admin/lesson-images/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteLessonImage(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting lesson image:", error);
      res.status(500).json({ error: "Failed to delete image" });
    }
  });

  // Get all badges
  app.get("/api/badges", async (req, res) => {
    try {
      const badges = await storage.getBadges();
      res.json(badges);
    } catch (error) {
      console.error("Error fetching badges:", error);
      res.status(500).json({ error: "Failed to fetch badges" });
    }
  });

  // Get badges earned by logged-in parent
  app.get("/api/badges/earned", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }
      const badges = await storage.getEarnedBadges(req.session.parentId);
      res.json(badges);
    } catch (error) {
      console.error("Error fetching earned badges:", error);
      res.status(500).json({ error: "Failed to fetch badges" });
    }
  });

  // ============================================
  // CONTENT PROGRESS (DHAMBAAL & SHEEKO TRACKING)
  // ============================================

  app.post("/api/content-progress", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const { contentType, contentId } = req.body;
      if (!contentType || !contentId) {
        return res.status(400).json({ error: "contentType and contentId required" });
      }
      if (!['dhambaal', 'sheeko'].includes(contentType)) {
        return res.status(400).json({ error: "contentType must be 'dhambaal' or 'sheeko'" });
      }
      if (contentType === 'dhambaal') {
        const msg = await storage.getParentMessage(contentId);
        if (!msg) return res.status(404).json({ error: "Dhambaalkan lama helin" });
      } else {
        const story = await storage.getBedtimeStory(contentId);
        if (!story) return res.status(404).json({ error: "Sheekadan lama helin" });
      }

      const progress = await storage.markContentComplete(req.session.parentId, contentType, contentId);

      const awardedBadges: string[] = [];
      try {
        const summary = await storage.getContentProgressSummary(req.session.parentId);
        const count = contentType === 'dhambaal' ? summary.dhambaalCount : summary.sheekoCount;
        const allBadges = await storage.getBadges();
        const triggerType = contentType === 'dhambaal' ? 'dhambaal_read' : 'sheeko_read';
        const contentBadges = allBadges.filter(b => b.triggerType === triggerType);
        for (const badge of contentBadges) {
          if (badge.triggerValue && count >= parseInt(badge.triggerValue)) {
            const awarded = await storage.awardBadge(req.session.parentId, badge.id);
            if (awarded) awardedBadges.push(badge.name);
          }
        }
      } catch (badgeError) {
        console.error("Error awarding content badges:", badgeError);
      }

      res.json({ progress, awardedBadges });
    } catch (error) {
      console.error("Error marking content progress:", error);
      res.status(500).json({ error: "Failed to mark content progress" });
    }
  });

  app.get("/api/content-progress", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const contentType = req.query.type as string;
      if (!contentType || !['dhambaal', 'sheeko'].includes(contentType)) {
        return res.status(400).json({ error: "type query param must be 'dhambaal' or 'sheeko'" });
      }
      const progress = await storage.getContentProgress(req.session.parentId, contentType);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching content progress:", error);
      res.status(500).json({ error: "Failed to fetch content progress" });
    }
  });

  app.get("/api/content-progress/summary", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const summary = await storage.getContentProgressSummary(req.session.parentId);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching content progress summary:", error);
      res.status(500).json({ error: "Failed to fetch content progress summary" });
    }
  });

  // Get resources (optionally by category or age range) - requires parent login
  app.get("/api/resources", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Fadlan gal akoonkaaga si aad u hesho Maktabadda" });
      }
      const { category, ageRange } = req.query;
      const resources = await storage.getResources(category as string | undefined, ageRange as string | undefined);
      res.json(resources);
    } catch (error) {
      console.error("Error fetching resources:", error);
      res.status(500).json({ error: "Failed to fetch resources" });
    }
  });

  // Increment resource download count - requires parent login
  app.post("/api/resources/:id/download", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }
      const resource = await storage.incrementResourceDownload(req.params.id);
      res.json(resource);
    } catch (error) {
      console.error("Error tracking download:", error);
      res.status(500).json({ error: "Failed to track download" });
    }
  });

  // Admin: Get all resources (including unpublished)
  app.get("/api/resources/admin", requireAuth, async (req, res) => {
    try {
      const resources = await storage.getAllResourcesAdmin();
      res.json(resources);
    } catch (error) {
      console.error("Error fetching admin resources:", error);
      res.status(500).json({ error: "Failed to fetch resources" });
    }
  });

  // Admin: Create a new resource
  app.post("/api/resources", requireAuth, async (req, res) => {
    try {
      const validatedData = insertResourceSchema.parse(req.body);
      const resource = await storage.createResource(validatedData);
      res.json(resource);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error creating resource:", error);
      res.status(500).json({ error: "Failed to create resource" });
    }
  });

  // Admin: Delete a resource
  app.delete("/api/resources/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteResource(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting resource:", error);
      res.status(500).json({ error: "Failed to delete resource" });
    }
  });

  // ============================================
  // QURAN RECITERS (Maktabada - Sheikhs)
  // ============================================

  // Get active Quran reciters (for frontend)
  app.get("/api/quran-reciters", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Fadlan gal akoonkaaga" });
      }
      const reciters = await storage.getActiveQuranReciters();
      res.json(reciters);
    } catch (error) {
      console.error("Error fetching quran reciters:", error);
      res.status(500).json({ error: "Failed to fetch reciters" });
    }
  });

  // Admin: Get all Quran reciters
  app.get("/api/quran-reciters/admin", requireAuth, async (req, res) => {
    try {
      const reciters = await storage.getAllQuranReciters();
      res.json(reciters);
    } catch (error) {
      console.error("Error fetching admin quran reciters:", error);
      res.status(500).json({ error: "Failed to fetch reciters" });
    }
  });

  // Admin: Create a new Quran reciter
  app.post("/api/quran-reciters", requireAuth, async (req, res) => {
    try {
      const reciter = await storage.createQuranReciter(req.body);
      res.json(reciter);
    } catch (error) {
      console.error("Error creating quran reciter:", error);
      res.status(500).json({ error: "Failed to create reciter" });
    }
  });

  // Admin: Update a Quran reciter
  app.patch("/api/quran-reciters/:id", requireAuth, async (req, res) => {
    try {
      const reciter = await storage.updateQuranReciter(req.params.id, req.body);
      res.json(reciter);
    } catch (error) {
      console.error("Error updating quran reciter:", error);
      res.status(500).json({ error: "Failed to update reciter" });
    }
  });

  // Admin: Delete a Quran reciter
  app.delete("/api/quran-reciters/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteQuranReciter(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting quran reciter:", error);
      res.status(500).json({ error: "Failed to delete reciter" });
    }
  });

  // ============================================
  // HADITHS (40 Xadiis - Library Section)
  // ============================================

  // Get active hadiths (for frontend)
  app.get("/api/hadiths", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Fadlan gal akoonkaaga" });
      }
      const hadithsList = await storage.getActiveHadiths();
      res.json(hadithsList);
    } catch (error) {
      console.error("Error fetching hadiths:", error);
      res.status(500).json({ error: "Failed to fetch hadiths" });
    }
  });

  // Admin: Get all hadiths
  app.get("/api/hadiths/admin", requireAuth, async (req, res) => {
    try {
      const hadithsList = await storage.getAllHadiths();
      res.json(hadithsList);
    } catch (error) {
      console.error("Error fetching admin hadiths:", error);
      res.status(500).json({ error: "Failed to fetch hadiths" });
    }
  });

  // Admin: Create a new hadith
  app.post("/api/hadiths", requireAuth, async (req, res) => {
    try {
      const hadith = await storage.createHadith(req.body);
      res.json(hadith);
    } catch (error) {
      console.error("Error creating hadith:", error);
      res.status(500).json({ error: "Failed to create hadith" });
    }
  });

  // Admin: Update a hadith
  app.patch("/api/hadiths/:id", requireAuth, async (req, res) => {
    try {
      const hadith = await storage.updateHadith(req.params.id, req.body);
      res.json(hadith);
    } catch (error) {
      console.error("Error updating hadith:", error);
      res.status(500).json({ error: "Failed to update hadith" });
    }
  });

  // Admin: Delete a hadith
  app.delete("/api/hadiths/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteHadith(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting hadith:", error);
      res.status(500).json({ error: "Failed to delete hadith" });
    }
  });

  // ============================================
  // BSAv.1 SHEEKO - VOICE SPACES
  // ============================================

  // Get ICE servers configuration for WebRTC
  // Returns STUN servers and TURN credentials if configured
  // Supports Cloudflare TURN (preferred) or Metered.ca TURN service
  app.get("/api/ice-servers", async (req, res) => {
    try {
      const iceServers: RTCIceServer[] = [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ];

      // Option 1: Cloudflare TURN (1TB free/month - best option)
      const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
      const cfKeyId = process.env.CLOUDFLARE_TURN_KEY_ID;
      const cfApiToken = process.env.CLOUDFLARE_API_TOKEN;

      if (cfKeyId && cfApiToken) {
        try {
          // Generate short-lived credentials from Cloudflare Realtime API
          // Note: This uses rtc.live.cloudflare.com, not api.cloudflare.com
          const cfResponse = await fetch(
            `https://rtc.live.cloudflare.com/v1/turn/keys/${cfKeyId}/credentials/generate`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${cfApiToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ ttl: 86400 }) // 24 hours
            }
          );

          if (cfResponse.ok) {
            const cfData = await cfResponse.json() as { iceServers?: { urls: string[]; username: string; credential: string } };
            if (cfData.iceServers) {
              // Add Cloudflare TURN servers from response
              iceServers.push({
                urls: cfData.iceServers.urls.filter(url => !url.includes(':53')), // Filter out port 53 (blocked by browsers)
                username: cfData.iceServers.username,
                credential: cfData.iceServers.credential,
              });
              console.log('[ICE] Cloudflare TURN credentials generated');
            }
          } else {
            console.warn('[ICE] Cloudflare TURN credential generation failed:', await cfResponse.text());
          }
        } catch (cfError) {
          console.warn('[ICE] Cloudflare TURN error:', cfError);
        }
      }
      
      // Option 2: Metered.ca TURN service (domain + secret key)
      const meteredDomain = process.env.METERED_DOMAIN;
      const meteredSecretKey = process.env.METERED_SECRET_KEY;

      if (meteredDomain && meteredSecretKey) {
        try {
          // First, create a temporary TURN credential with the secret key
          const createResponse = await fetch(
            `https://${meteredDomain}/api/v1/turn/credential?secretKey=${meteredSecretKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                expiryInSeconds: 86400, // 24 hours
                label: `sheeko-${Date.now()}`
              })
            }
          );
          
          if (createResponse.ok) {
            const credential = await createResponse.json() as {
              apiKey: string;
              username: string;
              password: string;
            };
            
            // Now fetch ICE servers using the credential's API key
            const iceResponse = await fetch(
              `https://${meteredDomain}/api/v1/turn/credentials?apiKey=${credential.apiKey}`
            );
            
            if (iceResponse.ok) {
              const meteredServers = await iceResponse.json() as Array<{
                urls: string | string[];
                username: string;
                credential: string;
              }>;
              
              // Add all Metered TURN servers
              for (const server of meteredServers) {
                iceServers.push(server);
              }
              console.log('[ICE] Metered.ca TURN credentials created:', meteredServers.length, 'servers');
            }
          } else {
            console.warn('[ICE] Metered.ca credential creation failed:', await createResponse.text());
          }
        } catch (meteredError) {
          console.warn('[ICE] Metered.ca TURN error:', meteredError);
        }
      }
      
      // Option 3: Static TURN server (fallback)
      const turnServerHost = process.env.TURN_SERVER_URL;
      const turnUsername = process.env.TURN_USERNAME;
      const turnCredential = process.env.TURN_CREDENTIAL;

      if (turnServerHost && turnUsername && turnCredential) {
        // Add comprehensive TURN configuration for maximum compatibility
        iceServers.push({
          urls: `turn:${turnServerHost}?transport=udp`,
          username: turnUsername,
          credential: turnCredential,
        });
        
        iceServers.push({
          urls: `turn:${turnServerHost}?transport=tcp`,
          username: turnUsername,
          credential: turnCredential,
        });
        
        const turnsHost = turnServerHost.replace(':80', ':443').replace(':3478', ':443');
        iceServers.push({
          urls: `turns:${turnsHost}?transport=tcp`,
          username: turnUsername,
          credential: turnCredential,
        });
        
        console.log('[ICE] Static TURN servers configured with host:', turnServerHost);
      }
      
      // Log which TURN is being used
      const hasTurn = iceServers.some(s => 
        Array.isArray(s.urls) 
          ? s.urls.some(u => u.startsWith('turn'))
          : String(s.urls).startsWith('turn')
      );
      if (!hasTurn) {
        console.log('[ICE] No TURN servers configured - using STUN only (may have connectivity issues)');
      }

      res.json({ iceServers });
    } catch (error) {
      console.error("Error getting ICE servers:", error);
      res.status(500).json({ error: "Failed to get ICE servers" });
    }
  });

  // LiveKit token generation for Sheeko voice rooms (SFU - supports 70+ participants)
  app.post("/api/livekit/token", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Fadlan gal akoonkaaga" });
      }

      const { roomId } = req.body;
      if (!roomId) {
        return res.status(400).json({ error: "Room ID required" });
      }

      // Verify LiveKit configuration
      const apiKey = process.env.LIVEKIT_API_KEY;
      const apiSecret = process.env.LIVEKIT_API_SECRET;
      const livekitUrl = process.env.LIVEKIT_URL;

      if (!apiKey || !apiSecret || !livekitUrl) {
        console.error("[LiveKit] Missing configuration:", { apiKey: !!apiKey, apiSecret: !!apiSecret, livekitUrl: !!livekitUrl });
        return res.status(500).json({ error: "LiveKit not configured" });
      }

      // Get parent info for identity
      const parent = await storage.getParent(req.session.parentId);
      if (!parent) {
        return res.status(401).json({ error: "Parent not found" });
      }

      // Check if room exists and is active
      const room = await storage.getVoiceRoom(roomId);
      if (!room) {
        return res.status(404).json({ error: "Qolku ma jiro" });
      }
      if (room.status === 'ended') {
        return res.status(400).json({ error: "Qolku wuu dhamaaday" });
      }

      // Get participant record to determine actual role (targeted query, not full scan)
      const myParticipant = await storage.getVoiceParticipant(roomId, req.session.parentId);
      const participantRole = myParticipant?.role || 'listener';

      // Determine permissions based on role from database
      const isHost = room.hostId === req.session.parentId;
      const canPublish = isHost || participantRole === 'speaker' || participantRole === 'co-host';

      // Create LiveKit access token
      const token = new AccessToken(apiKey, apiSecret, {
        identity: req.session.parentId,
        name: parent.name || "Parent",
        ttl: "4h", // 4 hour token validity
      });

      // Add room grant with permissions
      token.addGrant({
        room: `sheeko-${roomId}`,
        roomJoin: true,
        canPublish: canPublish,
        canSubscribe: true,
        canPublishData: true, // For chat/reactions
      });

      const jwt = await token.toJwt();

      console.log(`[LiveKit] Token generated for ${parent.name} in room ${roomId}, role: ${participantRole}, canPublish: ${canPublish}`);

      res.json({ 
        token: jwt, 
        url: livekitUrl,
        roomName: `sheeko-${roomId}`,
        canPublish
      });
    } catch (error) {
      console.error("[LiveKit] Token generation error:", error);
      res.status(500).json({ error: "Failed to generate LiveKit token" });
    }
  });

  // Get all live/scheduled voice rooms with participant counts
  app.get("/api/voice-rooms", async (req, res) => {
    try {
      const rooms = await storage.getVoiceRooms();
      // Add participant counts and host info to each room
      const roomsWithCounts = await Promise.all(
        rooms.map(async (room) => {
          const [participants, host] = await Promise.all([
            storage.getVoiceRoomParticipants(room.id),
            storage.getParentById(room.hostId)
          ]);
          return {
            ...room,
            host: host ? {
              id: host.id,
              name: host.name,
              picture: host.picture
            } : null,
            participantCount: participants.length,
            speakerCount: participants.filter(p => p.role === 'speaker' || p.role === 'co-host').length,
          };
        })
      );
      res.json(roomsWithCounts);
    } catch (error) {
      console.error("Error fetching voice rooms:", error);
      res.status(500).json({ error: "Failed to fetch voice rooms" });
    }
  });

  // Get a specific voice room with participants
  app.get("/api/voice-rooms/:id", async (req, res) => {
    try {
      const room = await storage.getVoiceRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }
      const participants = await storage.getVoiceRoomParticipants(req.params.id);
      res.json({ ...room, participants });
    } catch (error) {
      console.error("Error fetching voice room:", error);
      res.status(500).json({ error: "Failed to fetch voice room" });
    }
  });

  // Get voice room participants only
  app.get("/api/voice-rooms/:id/participants", async (req, res) => {
    try {
      const participants = await storage.getVoiceRoomParticipants(req.params.id);
      res.json(participants);
    } catch (error) {
      console.error("Error fetching voice room participants:", error);
      res.status(500).json({ error: "Failed to fetch participants" });
    }
  });

  // Create a new voice room (requires canHostSheeko permission or admin)
  app.post("/api/voice-rooms", requireSheekoHost, async (req, res) => {
    try {
      const { title, description, scheduledAt, maxSpeakers, isRecorded, notifyParents } = req.body;
      // hostId must be a parentId (FK to parents table)
      // Admin users who want to create rooms should also be logged in as a parent
      const hostId = req.session.parentId;
      if (!hostId) {
        return res.status(400).json({ 
          error: "Sheeko in aad abuurto waxaad u baahan tahay akoon waalid. Fadlan log in akoonkaaga waalid.",
          code: "PARENT_REQUIRED"
        });
      }
      
      const room = await storage.createVoiceRoom({
        title,
        description,
        hostId,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        maxSpeakers: maxSpeakers || 5,
        isRecorded: isRecorded || false,
        status: scheduledAt ? "scheduled" : "live",
      });

      // Send push notifications to all subscribers about the new voice room (only if notifyParents is true)
      if (pushNotificationsEnabled && notifyParents === true) {
        try {
          const subscriptions = await storage.getAllPushSubscriptions();
          const notificationPayload = JSON.stringify({
            title: "Kulan & Sheeko - " + room.title,
            body: room.description || "Qol cusub ayaa la furay! Ku biir hadda.",
            url: "/sheeko/" + room.id
          });

          const results = await Promise.allSettled(
            subscriptions.map(async (sub) => {
              try {
                await webpush.sendNotification(
                  {
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth },
                  },
                  notificationPayload
                );
                return { success: true };
              } catch (err: any) {
                if (err.statusCode === 410 || err.statusCode === 404) {
                  await storage.deletePushSubscription(sub.parentId, sub.endpoint);
                }
                return { success: false, error: err.message };
              }
            })
          );

          const sent = results.filter((r) => r.status === 'fulfilled' && (r.value as any).success).length;
          const failed = results.length - sent;
          if (failed > 0) {
            console.log(`[PUSH] Voice room notification: sent ${sent}, failed ${failed}`);
          }
        } catch (pushError) {
          console.error("[PUSH] Error sending voice room notifications:", pushError);
          // Don't fail the request if push notifications fail
        }
      }

      res.json(room);
    } catch (error) {
      console.error("Error creating voice room:", error);
      res.status(500).json({ error: "Failed to create voice room" });
    }
  });

  // Admin: Start a scheduled room (make it live)
  app.post("/api/voice-rooms/:id/start", requireAuth, async (req, res) => {
    try {
      const room = await storage.updateVoiceRoom(req.params.id, {
        status: "live",
        startedAt: new Date(),
      });
      res.json(room);
    } catch (error) {
      console.error("Error starting voice room:", error);
      res.status(500).json({ error: "Failed to start voice room" });
    }
  });

  // End a voice room (host, admin co-host, or any admin from admin panel)
  app.post("/api/voice-rooms/:id/end", async (req, res) => {
    try {
      // Must be logged in as parent
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Fadlan gal akoonkaaga" });
      }
      
      // Verify requester is the host
      const room = await storage.getVoiceRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ error: "Qolku ma jiro" });
      }
      
      // Check if user is the host OR an admin (admins can end any room from admin panel)
      const parent = await storage.getParent(req.session.parentId);
      const isMainAdmin = parent?.isAdmin === true;
      const participants = await storage.getVoiceRoomParticipants(req.params.id);
      const userParticipant = participants.find(p => p.parentId === req.session.parentId);
      const isAdminCoHost = isMainAdmin && userParticipant?.role === 'co-host';
      
      // Allow: host, admin co-host, or any admin (for ending from admin panel)
      if (room.hostId !== req.session.parentId && !isAdminCoHost && !isMainAdmin) {
        return res.status(403).json({ error: "Kaliya host-ka ama admin-ka ayaa joojin kara qolka" });
      }
      
      const updatedRoom = await storage.updateVoiceRoom(req.params.id, {
        status: "ended",
        endedAt: new Date(),
      });
      
      // Broadcast room-ended event to all participants so they disconnect
      if (updatedRoom) {
        broadcastVoiceRoomUpdate({ ...updatedRoom, participants, event: 'room-ended' });
      }
      
      res.json(updatedRoom);
    } catch (error) {
      console.error("Error ending voice room:", error);
      res.status(500).json({ error: "Failed to end voice room" });
    }
  });

  // Join a voice room as participant
  app.post("/api/voice-rooms/:id/join", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Fadlan gal akoonkaaga" });
      }
      
      // Check if user is banned from this room
      const isBanned = await storage.isParentBannedFromRoom(req.params.id, req.session.parentId);
      if (isBanned) {
        return res.status(403).json({ error: "Waxaad ka mamnuuctay qolkan. Ma biiri kartid.", banned: true });
      }
      
      // Check if room is still live
      const room = await storage.getVoiceRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ error: "Qolku ma jiro" });
      }
      if (room.status === 'ended') {
        return res.status(400).json({ error: "Qolku wuu dhamaaday" });
      }
      
      const { isHidden, fromAdmin } = req.body;
      
      // Check if user is a main admin joining from admin panel
      const parent = await storage.getParent(req.session.parentId);
      const isMainAdmin = parent?.isAdmin === true;
      
      // If main admin joining from admin panel, give them co-host role (bypasses speaker limit)
      let role = "listener";
      if (fromAdmin === true && isMainAdmin) {
        role = "co-host";
      }
      
      const participant = await storage.joinVoiceRoom(req.params.id, req.session.parentId, isHidden === true, role);
      // Broadcast participant joined to room (only if not hidden)
      const participants = await storage.getVoiceRoomParticipants(req.params.id);
      if (room && !participant.isHidden) {
        broadcastVoiceRoomUpdate({ ...room, participants, event: 'participant-joined', parentId: req.session.parentId });
      }
      res.json(participant);
    } catch (error) {
      console.error("Error joining voice room:", error);
      res.status(500).json({ error: "Failed to join voice room" });
    }
  });

  // Leave a voice room
  app.post("/api/voice-rooms/:id/leave", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }
      await storage.leaveVoiceRoom(req.params.id, req.session.parentId);
      // Broadcast participant left to room
      const room = await storage.getVoiceRoom(req.params.id);
      const participants = await storage.getVoiceRoomParticipants(req.params.id);
      if (room) {
        broadcastVoiceRoomUpdate({ ...room, participants, event: 'participant-left', parentId: req.session.parentId });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error leaving voice room:", error);
      res.status(500).json({ error: "Failed to leave voice room" });
    }
  });

  // Raise/lower hand in voice room
  app.post("/api/voice-rooms/:id/hand", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }
      const { raised } = req.body;
      const participant = await storage.updateVoiceParticipant(
        req.params.id,
        req.session.parentId,
        { handRaised: raised, handRaisedAt: raised ? new Date() : null }
      );
      // Broadcast hand status change
      const room = await storage.getVoiceRoom(req.params.id);
      const participants = await storage.getVoiceRoomParticipants(req.params.id);
      if (room) {
        broadcastVoiceRoomUpdate({ ...room, participants, event: raised ? 'hand-raised' : 'hand-lowered', parentId: req.session.parentId });
      }
      res.json(participant);
    } catch (error) {
      console.error("Error updating hand status:", error);
      res.status(500).json({ error: "Failed to update hand status" });
    }
  });

  // Admin: Change participant role (make speaker, remove speaker)
  const MAX_SPEAKERS = 10;
  
  app.post("/api/voice-rooms/:id/role", requireAuth, async (req, res) => {
    try {
      const { parentId, role } = req.body;
      
      // Check speaker limit when promoting to speaker or co-host
      if (role === 'speaker' || role === 'co-host') {
        const room = await storage.getVoiceRoom(req.params.id);
        if (!room) {
          return res.status(404).json({ error: "Voice room not found" });
        }
        
        const allParticipants = await storage.getVoiceRoomParticipants(req.params.id);
        // Count current speakers: host + speakers + co-hosts (excluding the person being promoted)
        const currentSpeakerCount = allParticipants.filter(p => 
          p.parentId === room.hostId || p.role === 'speaker' || p.role === 'co-host'
        ).filter(p => p.parentId !== parentId).length;
        
        if (currentSpeakerCount >= MAX_SPEAKERS) {
          return res.status(400).json({ 
            error: "Speaker limit reached",
            message: "Hadlayaasha ugu badnaan 10 ayaa la ogol yahay. Fadlan sug ilaa mid ka tago."
          });
        }
      }
      
      // When demoting to listener, force mute and clear hand
      const updateData: any = { role, handRaised: false };
      if (role === 'listener') {
        updateData.isMuted = true; // Force mute when demoted
      }
      
      const participant = await storage.updateVoiceParticipant(
        req.params.id,
        parentId,
        updateData
      );
      
      // Broadcast specific event based on role change type
      const room = await storage.getVoiceRoom(req.params.id);
      const participants = await storage.getVoiceRoomParticipants(req.params.id);
      if (room) {
        // Use specific event types for better frontend handling
        const eventType = role === 'listener' ? 'speaker-demoted' : 
                          (role === 'speaker' || role === 'co-host') ? 'speaker-added' : 'role-changed';
        broadcastVoiceRoomUpdate({ 
          ...room, 
          participants, 
          event: eventType, 
          targetParentId: parentId, 
          newRole: role,
          forceMute: role === 'listener' // Signal to client to stop audio publishing
        });
      }
      res.json(participant);
    } catch (error) {
      console.error("Error updating participant role:", error);
      res.status(500).json({ error: "Failed to update role" });
    }
  });

  // Mute/Unmute a participant (self, host, or co-host)
  app.post("/api/voice-rooms/:id/mute", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }
      const { parentId, muted } = req.body;
      if (!parentId || typeof muted !== 'boolean') {
        return res.status(400).json({ error: "parentId and muted are required" });
      }
      
      const room = await storage.getVoiceRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ error: "Voice room not found" });
      }
      
      // Check if requester is host, co-host, or muting/unmuting themselves
      const allParticipants = await storage.getVoiceRoomParticipants(req.params.id);
      const requesterParticipant = allParticipants.find(p => p.parentId === req.session.parentId);
      const isHost = req.session.parentId === room.hostId;
      const isCoHost = requesterParticipant?.role === 'co-host';
      const isSelf = parentId === req.session.parentId;
      
      // Allow self-mute/unmute, or host/co-host can mute/unmute anyone
      if (!isSelf && !isHost && !isCoHost) {
        return res.status(403).json({ error: "Only host or co-host can mute/unmute other participants" });
      }
      
      const participant = await storage.updateVoiceParticipant(
        req.params.id,
        parentId,
        { isMuted: muted }
      );
      
      const participants = await storage.getVoiceRoomParticipants(req.params.id);
      broadcastVoiceRoomUpdate({ ...room, participants, event: muted ? 'participant-muted' : 'participant-unmuted', targetParentId: parentId });
      
      res.json(participant);
    } catch (error) {
      console.error("Error muting/unmuting participant:", error);
      res.status(500).json({ error: "Failed to mute/unmute participant" });
    }
  });

  // Kick a participant from voice room (host or co-host only)
  app.post("/api/voice-rooms/:id/kick", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }
      const { parentId } = req.body;
      if (!parentId) {
        return res.status(400).json({ error: "parentId is required" });
      }
      
      const room = await storage.getVoiceRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ error: "Voice room not found" });
      }
      
      // Check if requester is host or co-host
      const allParticipants = await storage.getVoiceRoomParticipants(req.params.id);
      const requesterParticipant = allParticipants.find(p => p.parentId === req.session.parentId);
      const isHost = req.session.parentId === room.hostId;
      const isCoHost = requesterParticipant?.role === 'co-host';
      
      if (!isHost && !isCoHost) {
        return res.status(403).json({ error: "Only host or co-host can kick participants" });
      }
      
      // Cannot kick the host
      if (parentId === room.hostId) {
        return res.status(400).json({ error: "Cannot kick the room host" });
      }
      
      await storage.leaveVoiceRoom(req.params.id, parentId);
      
      const participants = await storage.getVoiceRoomParticipants(req.params.id);
      broadcastVoiceRoomUpdate({ ...room, participants, event: 'participant-kicked', targetParentId: parentId });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error kicking participant:", error);
      res.status(500).json({ error: "Failed to kick participant" });
    }
  });

  // Ban a participant from voice room (host or co-host only)
  app.post("/api/voice-rooms/:id/ban", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }
      const { parentId, reason } = req.body;
      if (!parentId) {
        return res.status(400).json({ error: "parentId is required" });
      }
      
      const room = await storage.getVoiceRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ error: "Voice room not found" });
      }
      
      // Check if requester is host or co-host
      const allParticipants = await storage.getVoiceRoomParticipants(req.params.id);
      const requesterParticipant = allParticipants.find(p => p.parentId === req.session.parentId);
      const isHost = req.session.parentId === room.hostId;
      const isCoHost = requesterParticipant?.role === 'co-host';
      
      if (!isHost && !isCoHost) {
        return res.status(403).json({ error: "Only host or co-host can ban participants" });
      }
      
      // Cannot ban the host
      if (parentId === room.hostId) {
        return res.status(400).json({ error: "Cannot ban the room host" });
      }
      
      // Ban the user
      await storage.banFromVoiceRoom(req.params.id, parentId, req.session.parentId, reason);
      
      // Also kick them from the room
      await storage.leaveVoiceRoom(req.params.id, parentId);
      
      const participants = await storage.getVoiceRoomParticipants(req.params.id);
      broadcastVoiceRoomUpdate({ ...room, participants, event: 'participant-banned', targetParentId: parentId });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error banning participant:", error);
      res.status(500).json({ error: "Failed to ban participant" });
    }
  });

  // Unban a participant from voice room (host only)
  app.post("/api/voice-rooms/:id/unban", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }
      const { parentId } = req.body;
      if (!parentId) {
        return res.status(400).json({ error: "parentId is required" });
      }
      
      const room = await storage.getVoiceRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ error: "Voice room not found" });
      }
      
      // Only host can unban
      if (req.session.parentId !== room.hostId) {
        return res.status(403).json({ error: "Only host can unban participants" });
      }
      
      await storage.unbanFromVoiceRoom(req.params.id, parentId);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error unbanning participant:", error);
      res.status(500).json({ error: "Failed to unban participant" });
    }
  });

  // Get banned users for a voice room (host or co-host only)
  app.get("/api/voice-rooms/:id/bans", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }
      
      const room = await storage.getVoiceRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ error: "Voice room not found" });
      }
      
      // Check if requester is host or co-host
      const allParticipants = await storage.getVoiceRoomParticipants(req.params.id);
      const requesterParticipant = allParticipants.find(p => p.parentId === req.session.parentId);
      const isHost = req.session.parentId === room.hostId;
      const isCoHost = requesterParticipant?.role === 'co-host';
      
      if (!isHost && !isCoHost) {
        return res.status(403).json({ error: "Only host or co-host can view bans" });
      }
      
      const bans = await storage.getVoiceRoomBans(req.params.id);
      res.json(bans);
    } catch (error) {
      console.error("Error fetching bans:", error);
      res.status(500).json({ error: "Failed to fetch bans" });
    }
  });

  // Delete a message from voice room chat (host or co-host only)
  app.delete("/api/voice-rooms/:id/messages/:messageId", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }
      
      const room = await storage.getVoiceRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ error: "Voice room not found" });
      }
      
      // Check if requester is host or co-host
      const allParticipants = await storage.getVoiceRoomParticipants(req.params.id);
      const requesterParticipant = allParticipants.find(p => p.parentId === req.session.parentId);
      const isHost = req.session.parentId === room.hostId;
      const isCoHost = requesterParticipant?.role === 'co-host';
      
      if (!isHost && !isCoHost) {
        return res.status(403).json({ error: "Only host or co-host can delete messages" });
      }
      
      await storage.deleteVoiceRoomMessage(req.params.messageId);
      
      broadcastVoiceRoomUpdate({ ...room, event: 'message-deleted', messageId: req.params.messageId });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting message:", error);
      res.status(500).json({ error: "Failed to delete message" });
    }
  });

  // Pin a message in voice room (host or co-host only)
  app.post("/api/voice-rooms/:id/pin/:messageId", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }
      
      const room = await storage.getVoiceRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ error: "Voice room not found" });
      }
      
      const allParticipants = await storage.getVoiceRoomParticipants(req.params.id);
      const requesterParticipant = allParticipants.find(p => p.parentId === req.session.parentId);
      const isHost = req.session.parentId === room.hostId;
      const isCoHost = requesterParticipant?.role === 'co-host';
      
      if (!isHost && !isCoHost) {
        return res.status(403).json({ error: "Only host or co-host can pin messages" });
      }
      
      await storage.pinVoiceRoomMessage(req.params.id, req.params.messageId);
      
      const message = await storage.getVoiceRoomMessage(req.params.messageId);
      broadcastVoiceRoomUpdate({ 
        ...room, 
        event: 'message-pinned', 
        pinnedMessageId: req.params.messageId,
        pinnedMessage: message
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error pinning message:", error);
      res.status(500).json({ error: "Failed to pin message" });
    }
  });

  // Unpin message in voice room (host or co-host only)
  app.delete("/api/voice-rooms/:id/pin", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }
      
      const room = await storage.getVoiceRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ error: "Voice room not found" });
      }
      
      const allParticipants = await storage.getVoiceRoomParticipants(req.params.id);
      const requesterParticipant = allParticipants.find(p => p.parentId === req.session.parentId);
      const isHost = req.session.parentId === room.hostId;
      const isCoHost = requesterParticipant?.role === 'co-host';
      
      if (!isHost && !isCoHost) {
        return res.status(403).json({ error: "Only host or co-host can unpin messages" });
      }
      
      await storage.unpinVoiceRoomMessage(req.params.id);
      
      broadcastVoiceRoomUpdate({ 
        ...room, 
        event: 'message-unpinned',
        pinnedMessageId: null
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error unpinning message:", error);
      res.status(500).json({ error: "Failed to unpin message" });
    }
  });

  // ============================================
  // HOST FOLLOW SYSTEM
  // ============================================

  // Follow a host
  app.post("/api/hosts/:hostId/follow", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }
      
      const hostId = req.params.hostId;
      
      // Can't follow yourself
      if (hostId === req.session.parentId) {
        return res.status(400).json({ error: "Cannot follow yourself" });
      }
      
      // Check if host exists and is a valid Sheeko host
      const host = await storage.getParent(hostId);
      if (!host) {
        return res.status(404).json({ error: "Host not found" });
      }
      
      const follow = await storage.followHost(req.session.parentId, hostId);
      const followerCount = await storage.getHostFollowerCount(hostId);
      
      res.json({ success: true, follow, followerCount });
    } catch (error) {
      console.error("Error following host:", error);
      res.status(500).json({ error: "Failed to follow host" });
    }
  });

  // Unfollow a host
  app.delete("/api/hosts/:hostId/follow", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }
      
      await storage.unfollowHost(req.session.parentId, req.params.hostId);
      const followerCount = await storage.getHostFollowerCount(req.params.hostId);
      
      res.json({ success: true, followerCount });
    } catch (error) {
      console.error("Error unfollowing host:", error);
      res.status(500).json({ error: "Failed to unfollow host" });
    }
  });

  // Check if current user is following a host (only returns own follow status)
  app.get("/api/hosts/:hostId/following", async (req, res) => {
    try {
      const followerCount = await storage.getHostFollowerCount(req.params.hostId);
      
      // Only return own follow status, not anyone else's
      if (!req.session.parentId) {
        return res.json({ isFollowing: false, followerCount });
      }
      
      const isFollowing = await storage.isFollowingHost(req.session.parentId, req.params.hostId);
      
      res.json({ isFollowing, followerCount });
    } catch (error) {
      console.error("Error checking follow status:", error);
      res.status(500).json({ error: "Failed to check follow status" });
    }
  });

  // Get host follower count
  app.get("/api/hosts/:hostId/followers", async (req, res) => {
    try {
      const followerCount = await storage.getHostFollowerCount(req.params.hostId);
      res.json({ followerCount });
    } catch (error) {
      console.error("Error getting follower count:", error);
      res.status(500).json({ error: "Failed to get follower count" });
    }
  });

  // Get hosts the current user follows
  app.get("/api/my-following", requireParentAuth, async (req, res) => {
    try {
      const hosts = await storage.getFollowingHosts(req.session.parentId!);
      res.json(hosts);
    } catch (error) {
      console.error("Error getting following hosts:", error);
      res.status(500).json({ error: "Failed to get following hosts" });
    }
  });

  // ============================================
  // SHEEKO USER-TO-USER FOLLOW SYSTEM
  // ============================================

  // Follow a user in Sheeko (uses unified parent_follows system)
  app.post("/api/sheeko/users/:userId/follow", requireParentAuth, async (req, res) => {
    try {
      const userId = req.params.userId;
      
      if (userId === req.session.parentId) {
        return res.status(400).json({ error: "Cannot follow yourself" });
      }
      
      const user = await storage.getParent(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Use unified parent_follows system
      await storage.followParent(req.session.parentId!, userId);
      const counts = await storage.getFollowCounts(userId);
      
      // Create notification for the followed user
      await storage.createSocialNotification({
        parentId: userId,
        type: "new_follower",
        actorId: req.session.parentId!,
      });
      
      res.json({ success: true, followerCount: counts.followersCount });
    } catch (error) {
      console.error("Error following user:", error);
      res.status(500).json({ error: "Failed to follow user" });
    }
  });

  // Unfollow a user in Sheeko (uses unified parent_follows system)
  app.delete("/api/sheeko/users/:userId/follow", requireParentAuth, async (req, res) => {
    try {
      await storage.unfollowParent(req.session.parentId!, req.params.userId);
      const counts = await storage.getFollowCounts(req.params.userId);
      
      res.json({ success: true, followerCount: counts.followersCount });
    } catch (error) {
      console.error("Error unfollowing user:", error);
      res.status(500).json({ error: "Failed to unfollow user" });
    }
  });

  // Check if current user is following another user in Sheeko (uses unified system)
  app.get("/api/sheeko/users/:userId/following", async (req, res) => {
    try {
      const userId = req.params.userId;
      const counts = await storage.getFollowCounts(userId);
      
      if (!req.session.parentId) {
        return res.json({ isFollowing: false, followerCount: counts.followersCount, followingCount: counts.followingCount });
      }
      
      const isFollowing = await storage.isFollowing(req.session.parentId, userId);
      
      res.json({ isFollowing, followerCount: counts.followersCount, followingCount: counts.followingCount });
    } catch (error) {
      console.error("Error checking follow status:", error);
      res.status(500).json({ error: "Failed to check follow status" });
    }
  });

  // Get user's followers in Sheeko (uses unified system)
  app.get("/api/sheeko/users/:userId/followers", async (req, res) => {
    try {
      const followers = await storage.getFollowers(req.params.userId);
      res.json(followers);
    } catch (error) {
      console.error("Error getting followers:", error);
      res.status(500).json({ error: "Failed to get followers" });
    }
  });

  // Get users the specified user is following in Sheeko (uses unified system)
  app.get("/api/sheeko/users/:userId/following-list", async (req, res) => {
    try {
      const following = await storage.getFollowing(req.params.userId);
      res.json(following);
    } catch (error) {
      console.error("Error getting following list:", error);
      res.status(500).json({ error: "Failed to get following list" });
    }
  });

  // Get current user's followers (uses unified system)
  app.get("/api/sheeko/my-followers", requireParentAuth, async (req, res) => {
    try {
      const followers = await storage.getFollowers(req.session.parentId!);
      res.json(followers);
    } catch (error) {
      console.error("Error getting followers:", error);
      res.status(500).json({ error: "Failed to get followers" });
    }
  });

  // Get users the current user is following (uses unified system)
  app.get("/api/sheeko/my-following", requireParentAuth, async (req, res) => {
    try {
      const following = await storage.getFollowing(req.session.parentId!);
      res.json(following);
    } catch (error) {
      console.error("Error getting following list:", error);
      res.status(500).json({ error: "Failed to get following list" });
    }
  });

  // ============================================
  // SHEEKO APPRECIATION POINTS
  // ============================================

  // Give appreciation (emoji points) to a speaker
  app.post("/api/sheeko/appreciate", requireParentAuth, async (req, res) => {
    try {
      const { receiverId, roomId, emojiType } = req.body;
      const giverId = req.session.parentId!;
      
      if (!receiverId || !emojiType) {
        return res.status(400).json({ error: "receiverId and emojiType are required" });
      }
      
      if (receiverId === giverId) {
        return res.status(400).json({ error: "Cannot appreciate yourself" });
      }
      
      // Validate emoji type
      if (!['heart', 'clap'].includes(emojiType)) {
        return res.status(400).json({ error: "Invalid emojiType. Must be 'heart' or 'clap'" });
      }
      
      // Points are calculated server-side in storage layer
      const appreciation = await storage.giveSheekoAppreciation({
        giverId,
        receiverId,
        roomId: roomId || null,
        emojiType,
      });
      
      // Get updated total points for the receiver
      const totalPoints = await storage.getSheekoTotalPoints(receiverId);
      
      // Broadcast appreciation to all room participants for real-time display
      if (roomId) {
        const giver = await storage.getParentById(giverId);
        const points = emojiType === 'heart' ? 10 : 5;
        broadcastAppreciation(roomId, receiverId, points, emojiType, giver?.name || undefined);
      }
      
      res.json({ success: true, appreciation, totalPoints });
    } catch (error) {
      console.error("Error giving appreciation:", error);
      res.status(500).json({ error: "Failed to give appreciation" });
    }
  });

  // Get total appreciation points for a user
  app.get("/api/sheeko/users/:userId/points", async (req, res) => {
    try {
      const userId = req.params.userId;
      const totalPoints = await storage.getSheekoTotalPoints(userId);
      const breakdown = await storage.getSheekoPointsBreakdown(userId);
      
      res.json({ totalPoints, breakdown });
    } catch (error) {
      console.error("Error getting points:", error);
      res.status(500).json({ error: "Failed to get points" });
    }
  });

  // ============================================
  // VOICE RECORDINGS (Google Drive - More Reliable)
  // ============================================

  app.post("/api/voice-recordings/upload", recordingUpload.single('audio'), async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "Audio file is required" });
      }

      const { roomId, title, description, duration, participantCount } = req.body;
      
      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safeTitle = title.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 50) || 'Untitled';
      const ext = (file.mimetype || 'audio/webm').includes('mpeg') || (file.mimetype || '').includes('mp3') ? 'mp3' : 'webm';
      const fileName = `Sheeko-${safeTitle}-${timestamp}.${ext}`;

      let driveFileId: string | null = null;
      let driveUrl: string | null = null;
      let r2Url: string | null = null;

      if (isR2Configured()) {
        console.log('[VOICE-UPLOAD] Uploading to R2:', fileName, 'Size:', file.buffer.length, 'bytes');
        const r2Result = await uploadToR2(
          file.buffer,
          fileName,
          file.mimetype || 'audio/webm',
          'Maktabada',
          'dhambaal'
        );
        r2Url = r2Result.url;
        driveUrl = r2Result.url;
        console.log('[VOICE-UPLOAD] R2 upload success:', r2Result.url);
      } else {
        console.log('[VOICE-UPLOAD] R2 not configured, uploading to Google Drive:', fileName);
        const folderId = await getOrCreateSheekoFolder();
        const driveResult = await uploadToGoogleDrive(
          file.buffer,
          fileName,
          file.mimetype || 'audio/webm',
          folderId
        );
        driveFileId = driveResult.fileId;
        driveUrl = driveResult.webViewLink;
        console.log('[VOICE-UPLOAD] Google Drive upload success:', driveResult.fileId);
      }

      const recording = await storage.createVoiceRecording({
        roomId: roomId || null,
        title,
        description: description || null,
        hostId: req.session.parentId,
        driveFileId,
        driveUrl,
        objectPath: r2Url,
        duration: parseInt(duration) || null,
        fileSize: file.size,
        isPublished: false,
        participantCount: parseInt(participantCount) || null,
        recordedAt: new Date(),
      });

      res.json(recording);
    } catch (error) {
      console.error("Error uploading voice recording:", error);
      res.status(500).json({ error: "Failed to upload recording" });
    }
  });

  // Get all voice recordings (published ones for Maktabada)
  app.get("/api/voice-recordings", async (req, res) => {
    try {
      const publishedOnly = req.query.published !== 'false';
      const recordings = await storage.getVoiceRecordings(publishedOnly);
      res.json(recordings);
    } catch (error) {
      console.error("Error fetching voice recordings:", error);
      res.status(500).json({ error: "Failed to fetch recordings" });
    }
  });

  // Get single voice recording
  app.get("/api/voice-recordings/:id", async (req, res) => {
    try {
      const recording = await storage.getVoiceRecording(req.params.id);
      if (!recording) {
        return res.status(404).json({ error: "Recording not found" });
      }
      res.json(recording);
    } catch (error) {
      console.error("Error fetching voice recording:", error);
      res.status(500).json({ error: "Failed to fetch recording" });
    }
  });

  // Stream audio from Object Storage or Google Drive (backwards compatible) with range support
  const audioCache = new Map<string, Buffer>();
  
  app.get("/api/voice-recordings/:id/stream", async (req, res) => {
    try {
      const recording = await storage.getVoiceRecording(req.params.id);
      if (!recording) {
        return res.status(404).json({ error: "Recording not found" });
      }

      const cacheKey = `audio_${recording.id}`;
      let audioBuffer = audioCache.get(cacheKey);
      
      if (!audioBuffer) {
        if (recording.objectPath && recording.objectPath.startsWith('https://')) {
          return res.redirect(recording.objectPath);
        } else if (recording.objectPath) {
          try {
            const pathWithoutLeadingSlash = recording.objectPath.startsWith('/') 
              ? recording.objectPath.slice(1) 
              : recording.objectPath;
            const pathParts = pathWithoutLeadingSlash.split('/');
            const bucketName = pathParts[0];
            const objectName = pathParts.slice(1).join('/');
            
            console.log('[VOICE-STREAM] Bucket:', bucketName, 'Object:', objectName);
            
            const bucket = objectStorageClient.bucket(bucketName);
            const objectFile = bucket.file(objectName);
            
            const [exists] = await objectFile.exists();
            if (!exists) {
              return res.status(404).json({ error: "Recording file not found in storage" });
            }
            
            const [buffer] = await objectFile.download();
            audioBuffer = buffer;
          } catch (storageError) {
            console.error("Error fetching from Object Storage:", storageError);
            return res.status(502).json({ error: "Failed to fetch audio from storage" });
          }
        } else if (recording.driveFileId) {
          try {
            console.log('[VOICE-STREAM] Downloading from Google Drive:', recording.driveFileId);
            audioBuffer = await downloadFromGoogleDrive(recording.driveFileId);
            console.log('[VOICE-STREAM] Downloaded', audioBuffer.length, 'bytes from Google Drive');
          } catch (driveError) {
            console.error("Error fetching from Google Drive API:", driveError);
            return res.status(502).json({ error: "Failed to fetch audio from Google Drive" });
          }
        } else {
          return res.status(404).json({ error: "No audio source found for this recording" });
        }
        
        audioCache.set(cacheKey, audioBuffer);
        setTimeout(() => audioCache.delete(cacheKey), 10 * 60 * 1000);
      }

      const fileSize = audioBuffer.length;
      const range = req.headers.range;

      if (range) {
        // Parse range header
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        
        if (start >= fileSize || end >= fileSize) {
          res.status(416).header({ 'Content-Range': `bytes */${fileSize}` });
          return res.end();
        }

        const chunkSize = (end - start) + 1;
        const chunk = audioBuffer.slice(start, end + 1);

        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Length', chunkSize);
        res.setHeader('Content-Type', 'audio/webm');
        res.end(chunk);
      } else {
        // Full file
        res.status(200);
        res.setHeader('Content-Length', fileSize);
        res.setHeader('Content-Type', 'audio/webm');
        res.setHeader('Accept-Ranges', 'bytes');
        res.end(audioBuffer);
      }
    } catch (error) {
      console.error("Error streaming voice recording:", error);
      res.status(500).json({ error: "Failed to stream recording" });
    }
  });

  // Update voice recording (admin/host only)
  app.patch("/api/voice-recordings/:id", async (req, res) => {
    try {
      if (!req.session.parentId && !req.session.userId) {
        return res.status(401).json({ error: "Not logged in" });
      }

      const recording = await storage.getVoiceRecording(req.params.id);
      if (!recording) {
        return res.status(404).json({ error: "Recording not found" });
      }

      // Check if user is host or admin
      const isHost = recording.hostId === req.session.parentId;
      const isAdmin = !!req.session.userId;

      if (!isHost && !isAdmin) {
        return res.status(403).json({ error: "Only host or admin can update recording" });
      }

      const { title, description, isPublished } = req.body;
      const updated = await storage.updateVoiceRecording(req.params.id, {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(isPublished !== undefined && { isPublished }),
      });

      res.json(updated);
    } catch (error) {
      console.error("Error updating voice recording:", error);
      res.status(500).json({ error: "Failed to update recording" });
    }
  });

  // Delete voice recording (admin only - checks both admin user and parent with admin privileges)
  app.delete("/api/voice-recordings/:id", async (req, res) => {
    try {
      // Check if user is admin (either admin user or parent with admin email/flag)
      let isAdmin = false;
      
      if (req.session.userId) {
        isAdmin = true;
      } else if (req.session.parentId) {
        const parent = await storage.getParent(req.session.parentId);
        if (parent && (parent.isAdmin || parent.email === "barbaarintasan@gmail.com")) {
          isAdmin = true;
        }
      }
      
      if (!isAdmin) {
        return res.status(401).json({ error: "Admin access required" });
      }

      const recording = await storage.getVoiceRecording(req.params.id);
      if (!recording) {
        return res.status(404).json({ error: "Recording not found" });
      }

      await storage.deleteVoiceRecording(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting voice recording:", error);
      res.status(500).json({ error: "Failed to delete recording" });
    }
  });

  // Reveal self (stop being hidden) in voice room
  app.post("/api/voice-rooms/:id/reveal", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }
      
      const room = await storage.getVoiceRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ error: "Voice room not found" });
      }
      
      const participant = await storage.updateVoiceParticipant(
        req.params.id,
        req.session.parentId,
        { isHidden: false }
      );
      
      // Broadcast participant revealed
      const participants = await storage.getVoiceRoomParticipants(req.params.id);
      broadcastVoiceRoomUpdate({ ...room, participants, event: 'participant-revealed', parentId: req.session.parentId });
      
      res.json(participant);
    } catch (error) {
      console.error("Error revealing participant:", error);
      res.status(500).json({ error: "Failed to reveal participant" });
    }
  });

  // Get voice room messages (live chat) - accessible to everyone including guests
  app.get("/api/voice-rooms/:id/messages", async (req, res) => {
    try {
      const room = await storage.getVoiceRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ error: "Voice room not found" });
      }
      
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const allMessages = await storage.getVoiceRoomMessages(req.params.id, limit);
      // Filter out AI-hidden messages (unless admin viewing)
      const messages = allMessages.filter(m => !m.isHidden);
      res.json(messages.reverse()); // Return oldest first for display
    } catch (error) {
      console.error("Error fetching voice room messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Send a message to voice room chat - accessible to everyone including guests
  app.post("/api/voice-rooms/:id/messages", async (req, res) => {
    try {
      const { message, displayName, guestId } = req.body;
      
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ error: "Fariin qor" });
      }
      
      if (message.length > 500) {
        return res.status(400).json({ error: "Fariintu aad ayay u dheer tahay (max 500)" });
      }
      
      const room = await storage.getVoiceRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ error: "Voice room not found" });
      }
      
      if (room.status !== 'live') {
        return res.status(400).json({ error: "Sheekadu ma socoto" });
      }
      
      let parentId = req.session.parentId || null;
      let effectiveDisplayName = displayName;
      
      // If logged in, get the parent's first name only
      if (parentId) {
        const parent = await storage.getParent(parentId);
        if (parent) {
          // Use only first name for privacy
          const firstName = parent.name ? parent.name.split(' ')[0] : null;
          effectiveDisplayName = firstName || parent.phone;
        }
      } else {
        // Guest user - require displayName or use guestId
        if (!effectiveDisplayName && !guestId) {
          return res.status(400).json({ error: "Magacaaga qor" });
        }
        effectiveDisplayName = effectiveDisplayName || `Marti-${(guestId || '').slice(-4)}`;
      }
      
      const trimmedMessage = message.trim();
      
      // AI Content Moderation
      const moderation = await moderateContent(trimmedMessage);
      
      const newMessage = await storage.createVoiceRoomMessage({
        roomId: req.params.id,
        parentId,
        guestId: parentId ? null : guestId,
        displayName: effectiveDisplayName,
        message: trimmedMessage,
        isHidden: moderation.isFlagged,
        aiModerated: moderation.isFlagged,
        moderationReason: moderation.violationType,
        moderationScore: moderation.confidenceScore,
      });
      
      // If message was flagged, create a moderation report for admin review
      if (moderation.isFlagged) {
        await storage.createAiModerationReport({
          contentType: 'voice_message',
          contentId: newMessage.id,
          roomId: req.params.id,
          userId: parentId,
          displayName: effectiveDisplayName,
          originalContent: trimmedMessage,
          violationType: moderation.violationType || 'unknown',
          confidenceScore: moderation.confidenceScore,
          aiExplanation: moderation.explanation,
          actionTaken: 'hidden',
          status: 'pending',
          userNotified: false,
        });
        
        // Still return success but mark as moderated (message won't be broadcast)
        return res.json({ 
          ...newMessage, 
          moderated: true, 
          message: "Fariintaada waa la hubiyay - maamulka ayaa dib u eegi doona." 
        });
      }
      
      // Broadcast the new message via WebSocket (only if not flagged)
      broadcastVoiceRoomUpdate({ 
        ...room, 
        event: 'new-message', 
        message: newMessage 
      });
      
      res.json(newMessage);
    } catch (error) {
      console.error("Error sending voice room message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // RSVP to a scheduled voice room (indicate attendance)
  app.post("/api/voice-rooms/:id/rsvp", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Fadlan gal akoonkaaga" });
      }
      
      const room = await storage.getVoiceRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ error: "Sheekada lama helin" });
      }
      
      if (room.status !== 'scheduled') {
        return res.status(400).json({ error: "Sheekadani kama heli kartid RSVP - waa live ama waa dhammaatay" });
      }
      
      const rsvp = await storage.addVoiceRoomRsvp(req.params.id, req.session.parentId);
      res.json(rsvp);
    } catch (error) {
      console.error("Error adding RSVP:", error);
      res.status(500).json({ error: "Failed to add RSVP" });
    }
  });

  // Admin: Delete a voice room
  app.delete("/api/voice-rooms/:id", requireAuth, async (req, res) => {
    try {
      const roomId = req.params.id;
      const room = await storage.getVoiceRoom(roomId);
      if (!room) {
        return res.status(404).json({ error: "Sheekada lama helin" });
      }
      
      // Only allow deletion of scheduled rooms (not live or ended)
      if (room.status === "live") {
        return res.status(400).json({ error: "Ma tirtiri kartid sheeko hadda socota. Jooji marka hore." });
      }
      
      await storage.deleteVoiceRoom(roomId);
      res.json({ success: true, message: "Sheekada waa la tirtiray" });
    } catch (error) {
      console.error("Error deleting voice room:", error);
      res.status(500).json({ error: "Failed to delete voice room" });
    }
  });

  // Edit a scheduled voice room (host or admin only)
  app.patch("/api/voice-rooms/:id", async (req, res) => {
    try {
      if (!req.session.parentId && !req.session.userId) {
        return res.status(401).json({ error: "Fadlan gal akoonkaaga" });
      }
      
      const room = await storage.getVoiceRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ error: "Sheekada lama helin" });
      }
      
      // Only allow host or admin to edit
      const isHost = room.hostId === req.session.parentId;
      const isAdmin = req.session.userId ? true : false;
      const parent = req.session.parentId ? await storage.getParent(req.session.parentId) : null;
      const isParentAdmin = parent?.isAdmin === true;
      
      if (!isHost && !isAdmin && !isParentAdmin) {
        return res.status(403).json({ error: "Kaliya host-ka ayaa bedeli kara sheekada" });
      }
      
      // Only allow editing scheduled rooms
      if (room.status !== "scheduled") {
        return res.status(400).json({ error: "Kaliya sheeko la qorsheeyay ayaa la bedeli karaa" });
      }
      
      const { title, description, scheduledAt } = req.body;
      
      const updateData: Partial<typeof room> = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (scheduledAt !== undefined) updateData.scheduledAt = new Date(scheduledAt);
      
      const updatedRoom = await storage.updateVoiceRoom(req.params.id, updateData);
      res.json(updatedRoom);
    } catch (error) {
      console.error("Error updating voice room:", error);
      res.status(500).json({ error: "Failed to update voice room" });
    }
  });

  // Cancel RSVP to a scheduled voice room
  app.delete("/api/voice-rooms/:id/rsvp", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Fadlan gal akoonkaaga" });
      }
      
      await storage.removeVoiceRoomRsvp(req.params.id, req.session.parentId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing RSVP:", error);
      res.status(500).json({ error: "Failed to remove RSVP" });
    }
  });

  // Get RSVPs for a voice room (with optional parent info for admin)
  app.get("/api/voice-rooms/:id/rsvps", async (req, res) => {
    try {
      const room = await storage.getVoiceRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ error: "Sheekada lama helin" });
      }
      
      const rsvps = await storage.getVoiceRoomRsvps(req.params.id);
      const hasRsvpd = req.session.parentId 
        ? await storage.hasParentRsvpd(req.params.id, req.session.parentId)
        : false;
      
      // If admin (userId set), include full parent info in rsvps array
      if (req.session.userId) {
        res.json({ 
          count: rsvps.length,
          hasRsvpd,
          rsvps: rsvps.map(r => ({
            id: r.id,
            parentId: r.parentId,
            parentName: r.parent.name,
            parentPhone: r.parent.phone,
            createdAt: r.createdAt
          }))
        });
      } else {
        // For regular parent users, just return count and whether they've RSVP'd
        res.json({ count: rsvps.length, hasRsvpd });
      }
    } catch (error) {
      console.error("Error fetching RSVPs:", error);
      res.status(500).json({ error: "Failed to fetch RSVPs" });
    }
  });

  app.get("/api/drive/maktabada", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Fadlan gal akoonkaaga si aad u hesho Maktabadda" });
      }

      if (isR2Configured()) {
        try {
          const r2Files = await listR2Files('Maktabada/', 'dhambaal');
          const files = r2Files.map(f => ({
            id: f.key,
            name: f.name,
            mimeType: f.name.endsWith('.mp3') || f.name.endsWith('.mpeg') ? 'audio/mpeg' : f.name.endsWith('.webm') ? 'audio/webm' : f.name.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
            size: String(f.size),
            createdTime: f.lastModified.toISOString(),
            modifiedTime: f.lastModified.toISOString(),
            webViewLink: f.url,
            webContentLink: f.url,
          }));
          return res.json(files);
        } catch (r2Error) {
          console.warn("[Maktabada] R2 listing failed, falling back to Google Drive:", r2Error);
        }
      }

      const files = await listMaktabadaFiles();
      res.json(files);
    } catch (error) {
      console.error("Error fetching Maktabada files:", error);
      res.status(500).json({ error: "Failed to fetch files" });
    }
  });

  // Get Google Drive file download URL
  app.get("/api/drive/file/:fileId", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }
      const downloadUrl = await getFileDownloadUrl(req.params.fileId);
      if (!downloadUrl) {
        return res.status(404).json({ error: "File not found" });
      }
      res.json({ downloadUrl });
    } catch (error) {
      console.error("Error getting file URL:", error);
      res.status(500).json({ error: "Failed to get file URL" });
    }
  });

  // Delete Google Drive file (Admin only)
  app.delete("/api/drive/file/:fileId", requireAuth, async (req, res) => {
    try {
      await deleteDriveFile(req.params.fileId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting Drive file:", error);
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  // List audio files from a Google Drive folder (for Quran reciters)
  app.get("/api/drive/folder-files", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }
      const { folderUrl } = req.query;
      if (!folderUrl || typeof folderUrl !== 'string') {
        return res.status(400).json({ error: "Folder URL required" });
      }
      const files = await listFilesInFolder(folderUrl);
      res.json(files);
    } catch (error) {
      console.error("Error listing folder files:", error);
      res.status(500).json({ error: "Failed to list folder files" });
    }
  });

  // Get books from Maktabada subfolders (parenting books, children books)
  app.get("/api/drive/books/:category", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Fadlan gal akoonkaaga si aad u hesho Kutubta" });
      }
      const { category } = req.params;
      // Map category to folder names in Google Drive
      const folderNames: Record<string, string> = {
        'parenting': 'Kutubta Waalidiinta',
        'children': 'Kutubta Caruurta'
      };
      
      const folderName = folderNames[category];
      if (!folderName) {
        return res.status(400).json({ error: "Invalid category" });
      }
      
      const files = await listMaktabadaSubfolderFiles(folderName);
      res.json(files);
    } catch (error) {
      console.error("Error fetching books:", error);
      res.status(500).json({ error: "Failed to fetch books" });
    }
  });

  // Get direct audio streaming URL for a Google Drive file
  app.get("/api/drive/audio/:fileId", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }
      // Return a proxy URL with cache-busting timestamp to avoid stale cached responses
      const timestamp = Date.now();
      res.json({ streamUrl: `/api/drive/stream/${req.params.fileId}?t=${timestamp}` });
    } catch (error) {
      console.error("Error getting audio stream URL:", error);
      res.status(500).json({ error: "Failed to get audio URL" });
    }
  });

  // Stream audio file through our server to avoid CORS issues
  app.get("/api/drive/stream/:fileId", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }
      
      const { streamAudioFile } = await import("./google-drive");
      const result = await streamAudioFile(req.params.fileId);
      
      if (!result) {
        console.error("[Stream] Failed to get audio stream for file:", req.params.fileId);
        return res.status(404).json({ error: "File not found" });
      }
      
      console.log("[Stream] Streaming audio file, mimeType:", result.mimeType, "size:", result.size);
      
      // Set proper headers for audio streaming
      res.setHeader('Content-Type', result.mimeType);
      if (result.size) {
        res.setHeader('Content-Length', result.size);
      }
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      
      // Pipe the stream directly to the response
      result.stream.pipe(res);
      
      result.stream.on('error', (err) => {
        console.error("[Stream] Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Stream error" });
        }
      });
    } catch (error) {
      console.error("Error streaming audio:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to stream audio" });
      }
    }
  });

  // Public TTS audio streaming endpoint (no auth required - uses public Google Drive URLs)
  // Works on both Replit and Fly.io without requiring Google authentication
  app.get("/api/tts-audio/:fileId", async (req, res) => {
    const fileId = req.params.fileId;
    console.log("[TTS Stream] Request for file:", fileId);
    
    try {
      // First try using Replit connector (works in Replit environment)
      const hasReplitConnector = !!(process.env.REPLIT_CONNECTORS_HOSTNAME && 
        (process.env.REPL_IDENTITY || process.env.WEB_REPL_RENEWAL));
      
      if (hasReplitConnector) {
        try {
          const { streamAudioFile } = await import("./google-drive");
          const result = await streamAudioFile(fileId);
          
          if (result) {
            console.log("[TTS Stream] Streaming via Replit connector, mimeType:", result.mimeType);
            res.setHeader('Content-Type', result.mimeType);
            if (result.size) {
              res.setHeader('Content-Length', result.size);
            }
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            
            result.stream.pipe(res);
            result.stream.on('error', (err) => {
              console.error("[TTS Stream] Replit connector stream error:", err);
            });
            return;
          }
        } catch (connectorError) {
          console.warn("[TTS Stream] Replit connector failed, falling back to public URL:", connectorError);
        }
      }
      
      // Fallback: Direct proxy from public Google Drive URL (works on Fly.io)
      console.log("[TTS Stream] Using public Google Drive proxy for file:", fileId);
      const publicUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      
      const response = await fetch(publicUrl, {
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AudioProxy/1.0)'
        }
      });
      
      if (!response.ok) {
        console.error("[TTS Stream] Public URL fetch failed:", response.status, response.statusText);
        return res.status(404).json({ error: "Audio file not found" });
      }
      
      const contentType = response.headers.get('content-type') || 'audio/mpeg';
      const contentLength = response.headers.get('content-length');
      
      console.log("[TTS Stream] Streaming from public URL, contentType:", contentType);
      
      res.setHeader('Content-Type', contentType);
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      
      // Stream the response body to the client
      if (response.body) {
        const { Readable } = await import('stream');
        const nodeStream = Readable.fromWeb(response.body as any);
        nodeStream.pipe(res);
        nodeStream.on('error', (err) => {
          console.error("[TTS Stream] Public URL stream error:", err);
        });
      } else {
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
      }
    } catch (error) {
      console.error("[TTS Stream] Error streaming audio:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to stream audio" });
      }
    }
  });

  // Get live events (upcoming and past)
  app.get("/api/events", async (req, res) => {
    try {
      const events = await storage.getLiveEvents();
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  // RSVP to an event
  app.post("/api/events/:eventId/rsvp", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }
      const rsvp = await storage.rsvpToEvent(req.params.eventId, req.session.parentId);
      res.json(rsvp);
    } catch (error) {
      console.error("Error RSVPing to event:", error);
      res.status(500).json({ error: "Failed to RSVP" });
    }
  });

  // Get my RSVPs
  app.get("/api/events/my-rsvps", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }
      const rsvps = await storage.getMyRsvps(req.session.parentId);
      res.json(rsvps);
    } catch (error) {
      console.error("Error fetching RSVPs:", error);
      res.status(500).json({ error: "Failed to fetch RSVPs" });
    }
  });

  // Community: Get threads (optionally by course) with parent names
  app.get("/api/community/threads", async (req, res) => {
    try {
      const { courseId } = req.query;
      const currentParentId = req.session.parentId;
      const threads = await storage.getCommunityThreadsWithParentNames(courseId as string | undefined, currentParentId);
      res.json(threads);
    } catch (error) {
      console.error("Error fetching threads:", error);
      res.status(500).json({ error: "Failed to fetch threads" });
    }
  });

  // Community: Create thread
  app.post("/api/community/threads", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }
      const { title, content, courseId, category } = req.body;
      if (!title || !content) {
        return res.status(400).json({ error: "Title and content required" });
      }
      const thread = await storage.createCommunityThread({
        parentId: req.session.parentId,
        title,
        content,
        courseId: courseId || null,
        category: category || "guud",
      });
      res.json(thread);
    } catch (error) {
      console.error("Error creating thread:", error);
      res.status(500).json({ error: "Failed to create thread" });
    }
  });

  // Community: Get posts for a thread with parent names
  app.get("/api/community/threads/:threadId/posts", async (req, res) => {
    try {
      const currentParentId = req.session.parentId;
      const posts = await storage.getCommunityPostsWithParentNames(req.params.threadId, currentParentId);
      res.json(posts);
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  // Community: Create post (reply)
  app.post("/api/community/threads/:threadId/posts", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }
      const { content, voiceNoteUrl } = req.body;
      if (!content) {
        return res.status(400).json({ error: "Content required" });
      }
      const post = await storage.createCommunityPost({
        threadId: req.params.threadId,
        parentId: req.session.parentId,
        content,
        voiceNoteUrl: voiceNoteUrl || null,
      });
      res.json(post);
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  // Community: Like/unlike a thread
  app.post("/api/community/threads/:threadId/like", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }
      const result = await storage.toggleThreadLike(req.params.threadId, req.session.parentId);
      res.json(result);
    } catch (error) {
      console.error("Error liking thread:", error);
      res.status(500).json({ error: "Failed to like thread" });
    }
  });

  // Community: Pin/unpin a thread (admin only)
  app.post("/api/community/threads/:threadId/pin", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }
      const parent = await storage.getParent(req.session.parentId);
      if (!parent?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const result = await storage.toggleThreadPin(req.params.threadId);
      res.json(result);
    } catch (error) {
      console.error("Error pinning thread:", error);
      res.status(500).json({ error: "Failed to pin thread" });
    }
  });

  // Community: Like/unlike a post
  app.post("/api/community/posts/:postId/like", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }
      const result = await storage.togglePostLike(req.params.postId, req.session.parentId);
      res.json(result);
    } catch (error) {
      console.error("Error liking post:", error);
      res.status(500).json({ error: "Failed to like post" });
    }
  });

  // Telegram webhook endpoint (secured with secret token)
  app.post("/api/telegram/webhook", async (req, res) => {
    try {
      const { handleTelegramWebhook, verifyWebhookRequest, sendTelegramMessage } = await import("./telegram");
      
      const secretToken = req.headers["x-telegram-bot-api-secret-token"] as string | undefined;
      if (!verifyWebhookRequest(secretToken)) {
        console.warn("[Telegram] Webhook request failed secret token verification");
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const response = await handleTelegramWebhook(req.body);
      if (response) {
        const chatId = req.body.message?.chat?.id;
        if (chatId) {
          await sendTelegramMessage(chatId.toString(), response);
        }
      }
      res.json({ ok: true });
    } catch (error) {
      console.error("Telegram webhook error:", error);
      res.json({ ok: true });
    }
  });

  // Get Telegram link URL for the logged-in parent
  app.get("/api/telegram/link", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }
      const { getTelegramLinkUrl } = await import("./telegram");
      const url = getTelegramLinkUrl(req.session.parentId);
      res.json({ url });
    } catch (error) {
      console.error("Error getting telegram link:", error);
      res.status(500).json({ error: "Failed to get link" });
    }
  });

  // Get webhook setup info for admin
  app.get("/api/admin/telegram/webhook-info", requireAuth, async (req, res) => {
    try {
      const { getWebhookSecretToken } = await import("./telegram");
      const secretToken = getWebhookSecretToken();
      const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
      const webhookUrl = `${req.protocol}://${req.get("host")}/api/telegram/webhook`;
      res.json({ 
        webhookUrl, 
        secretToken,
        setupCommand: TELEGRAM_BOT_TOKEN 
          ? `curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}&secret_token=${secretToken}"`
          : "TELEGRAM_BOT_TOKEN not configured"
      });
    } catch (error) {
      console.error("Error getting webhook info:", error);
      res.status(500).json({ error: "Failed to get webhook info" });
    }
  });

  // Send test telegram message to logged-in parent
  app.post("/api/telegram/test", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }
      const parent = await storage.getParent(req.session.parentId);
      if (!parent) {
        return res.status(404).json({ error: "Parent not found" });
      }
      const parentData = parent as any;
      if (!parentData.telegramOptin || !parentData.telegramChatId) {
        return res.status(400).json({ error: "Telegram not linked" });
      }
      const { sendTelegramMessage } = await import("./telegram");
      const success = await sendTelegramMessage(
        parentData.telegramChatId,
        `🧪 <b>Fariin Tijaabo</b>\n\nMahadsanid ${parent.name}! Telegram-kaagu si fiican ayuu u shaqeynayaa.\n\n✅ Waxaad heli doontaa xusuusin marka casharo Live ah ay dhow yihiin.`
      );
      if (success) {
        res.json({ success: true, message: "Fariinta waa la diray!" });
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    } catch (error) {
      console.error("Error sending test message:", error);
      res.status(500).json({ error: "Failed to send test message" });
    }
  });

  // =====================================================
  // AI PERSONALIZED LEARNING PATH ROUTES
  // =====================================================

  // Get assessment questions for a specific age range
  app.get("/api/assessment/questions", async (req, res) => {
    try {
      const ageRange = req.query.ageRange as string | undefined;
      const questions = await storage.getActiveAssessmentQuestions(ageRange);
      res.json(questions);
    } catch (error) {
      console.error("Error fetching assessment questions:", error);
      res.status(500).json({ error: "Failed to fetch questions" });
    }
  });

  // Start a new assessment
  app.post("/api/assessment/start", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }
      const { childAgeRange } = req.body;
      if (!childAgeRange) {
        return res.status(400).json({ error: "Child age range is required" });
      }
      const assessment = await storage.createParentAssessment({
        parentId: req.session.parentId,
        childAgeRange,
        status: "in_progress",
      });
      res.json(assessment);
    } catch (error) {
      console.error("Error starting assessment:", error);
      res.status(500).json({ error: "Failed to start assessment" });
    }
  });

  // Submit assessment responses
  app.post("/api/assessment/:id/submit", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }
      const { id } = req.params;
      const { responses } = req.body;

      const assessment = await storage.getParentAssessment(id);
      if (!assessment) {
        return res.status(404).json({ error: "Assessment not found" });
      }
      if (assessment.parentId !== req.session.parentId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      await storage.saveAssessmentResponses(id, responses);
      await storage.updateParentAssessmentStatus(id, "completed");

      const { processAssessmentWithAI } = await import("./ai/personalization");
      const result = await processAssessmentWithAI(id);

      if (result.success) {
        res.json({ success: true, message: "Assessment analyzed successfully" });
      } else {
        res.status(500).json({ error: result.error || "AI analysis failed" });
      }
    } catch (error) {
      console.error("Error submitting assessment:", error);
      res.status(500).json({ error: "Failed to submit assessment" });
    }
  });

  // Retry AI analysis for a completed assessment
  app.post("/api/assessment/:id/reanalyze", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }
      const { id } = req.params;

      const assessment = await storage.getParentAssessment(id);
      if (!assessment) {
        return res.status(404).json({ error: "Assessment not found" });
      }
      if (assessment.parentId !== req.session.parentId) {
        return res.status(403).json({ error: "Not authorized" });
      }
      if (assessment.status === "analyzed") {
        return res.json({ success: true, message: "Already analyzed" });
      }

      const { processAssessmentWithAI } = await import("./ai/personalization");
      const result = await processAssessmentWithAI(id);

      if (result.success) {
        res.json({ success: true, message: "Assessment analyzed successfully" });
      } else {
        res.status(500).json({ error: result.error || "AI analysis failed" });
      }
    } catch (error) {
      console.error("Error reanalyzing assessment:", error);
      res.status(500).json({ error: "Failed to reanalyze assessment" });
    }
  });

  // Get latest assessment and learning path for parent
  app.get("/api/learning-path", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }

      // Get both the latest assessment and the latest analyzed assessment
      const latestAssessment = await storage.getLatestAssessmentByParent(req.session.parentId);
      const latestAnalyzedAssessment = await storage.getLatestAnalyzedAssessmentByParent(req.session.parentId);
      
      if (!latestAssessment && !latestAnalyzedAssessment) {
        return res.json({ hasAssessment: false });
      }
      
      // Use the latest analyzed assessment for recommendations if available
      const assessmentForRecommendations = latestAnalyzedAssessment;
      
      // If there's no analyzed assessment yet
      if (!assessmentForRecommendations) {
        return res.json({ 
          hasAssessment: true, 
          assessment: latestAssessment,
          aiPending: latestAssessment?.status === "completed",
          insights: null,
          recommendations: []
        });
      }

      const insights = await storage.getAiInsights(assessmentForRecommendations.id);
      const recommendations = await storage.getLearningPathRecommendations(assessmentForRecommendations.id);

      const courses = await storage.getAllCourses();
      const courseMap = new Map(courses.map(c => [c.id, c]));

      const enrichedRecommendations = recommendations.map(r => ({
        ...r,
        course: courseMap.get(r.courseId),
      }));

      res.json({
        hasAssessment: true,
        assessment: latestAssessment || assessmentForRecommendations,
        insights: insights ? {
          ...insights,
          strengths: JSON.parse(insights.strengths),
          needsImprovement: JSON.parse(insights.needsImprovement),
          focusAreas: JSON.parse(insights.focusAreas),
          parentingStyle: insights.parentingStyle || null,
          parentingTips: insights.parentingTips ? JSON.parse(insights.parentingTips) : null,
        } : null,
        recommendations: enrichedRecommendations,
      });
    } catch (error) {
      console.error("Error fetching learning path:", error);
      res.status(500).json({ error: "Failed to fetch learning path" });
    }
  });

  // Check if parent has completed an assessment
  app.get("/api/assessment/status", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }

      const assessment = await storage.getLatestAssessmentByParent(req.session.parentId);
      res.json({
        hasAssessment: !!assessment,
        status: assessment?.status || null,
        assessmentId: assessment?.id || null,
      });
    } catch (error) {
      console.error("Error checking assessment status:", error);
      res.status(500).json({ error: "Failed to check status" });
    }
  });

  // Get all assessment history for parent with insights (for Profile page)
  app.get("/api/parent/assessment-history", async (req, res) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Not logged in" });
      }

      const assessments = await storage.getAllAssessmentsByParent(req.session.parentId);
      
      // Get insights for each assessment
      const assessmentsWithInsights = await Promise.all(
        assessments.map(async (assessment) => {
          const insights = await storage.getAiInsights(assessment.id);
          const responses = await storage.getAssessmentResponses(assessment.id);
          
          // Calculate average scores for comparison - only use numeric responses (1-5 scale)
          const numericResponses = responses.filter(r => {
            const val = parseInt(r.response, 10);
            return !isNaN(val) && val >= 1 && val <= 5;
          });
          const avgScore = numericResponses.length > 0 
            ? numericResponses.reduce((sum, r) => sum + parseInt(r.response, 10), 0) / numericResponses.length
            : 0;
          
          return {
            ...assessment,
            averageScore: Math.round(avgScore * 10) / 10,
            insights: insights ? {
              strengths: JSON.parse(insights.strengths || "[]"),
              needsImprovement: JSON.parse(insights.needsImprovement || "[]"),
              focusAreas: JSON.parse(insights.focusAreas || "[]"),
              summary: insights.summary,
              parentingStyle: insights.parentingStyle,
              parentingTips: insights.parentingTips ? JSON.parse(insights.parentingTips) : null,
            } : null,
          };
        })
      );

      res.json(assessmentsWithInsights);
    } catch (error) {
      console.error("Error fetching assessment history:", error);
      res.status(500).json({ error: "Failed to fetch assessment history" });
    }
  });

  // Legacy /api/homework-helper endpoint - redirects to new /api/homework/ask
  app.post("/api/homework-helper", async (req, res) => {
    try {
      const { question, language, history } = req.body;
      
      if (!question || typeof question !== "string") {
        return res.status(400).json({ error: "Question is required" });
      }

      if (question.length > 300) {
        return res.status(400).json({
          error: "Input too long",
          answer: language === "so"
            ? "Fadlan gaabi su'aashaada — ugu badnaan 300 xaraf."
            : "Please shorten your question — max 300 characters."
        });
      }

      const parentId = req.session.parentId;
      if (!parentId) {
        return res.status(401).json({
          error: "Login required",
          answer: language === "so"
            ? "Fadlan gal akoonkaaga si aad u isticmaasho Hagahaaga Barbaarintasan."
            : "Please log in to use the Barbaarintasan Guide.",
          requiresLogin: true
        });
      }

      const access = await checkOrStartTrial(parentId);
      if (!access.allowed) {
        if (access.trialExpired) {
          return res.status(403).json({
            error: "Trial expired",
            answer: MEMBERSHIP_ADVICE_SOMALI,
            trialExpired: true,
            plan: access.plan,
          });
        }
        return res.status(429).json({
          error: "Daily limit reached",
          answer: language === "so"
            ? `Waxaad gaartay xadka maalintii ee ${access.dailyLimit} su'aalood. Fadlan soo noqo berri.`
            : `You've reached the daily limit of ${access.dailyLimit} questions. Please come back tomorrow.`,
          remaining: 0
        });
      }

      const systemPrompt = language === "so" 
        ? `Waxaad tahay caawiye waxbarasho oo saaxiibtinimo leh oo loogu talagalay waalidka Soomaaliyeed. Jawaab su'aal kasta oo la xiriirta carruurta, barbaarinta, waxbarashada, dhaqanka, caafimaadka maskaxda, ama nolosha qoyska.

Waxaad bixin kartaa:
- Talo ku saabsan dabeecadda carruurta, xanaaqooda, iyo hab-dhaqankooda
- Caawin waxbarasho ah sida akhris, xisaab, luuqadda
- Talo ku saabsan hurdo, cunto, iyo caadooyinka
- Hagitaan ku saabsan xiriirka waalidka iyo ilmaha
- Macluumaad ku saabsan horumarka ilmaha da'ahaan kala duwan

Jawaab su'aalaha si fudud oo faham ah. Isticmaal Soomaali fudud. Sharax si buuxda waalidku si ay u fahmaan.
Haddii ay su'aashu tahay mid caafimaad oo degdeg ah, u sheeg inay la tashadaan dhakhtar, laakiin jawaab su'aasha inta aad awooddo.
Hadii lagu weydiyo wax aan ilmaha ku saabsanayn, ka jawaab si saaxiibtinimo leh ama u sheeg inaadan jawaabi karin.`
        : `You are a friendly learning helper for Somali parents. Answer ANY question related to children, parenting, education, family life, culture, health, or development.

You can help with:
- Child behavior, tantrums, discipline, and emotional development
- Education help: reading, math, homework, language learning
- Sleep, feeding, routines, and daily care
- Parent-child relationships and communication
- Child development milestones at different ages
- Cultural and family questions

Answer questions clearly and helpfully. Use simple language. Provide detailed, practical advice.
For urgent health questions, advise consulting a doctor, but still answer what you can.
If asked something truly unrelated to parenting/children, politely explain or redirect.`;

      const messages: any[] = [
        { role: "system", content: systemPrompt }
      ];

      if (history && Array.isArray(history)) {
        messages.push(...history.slice(-6));
      }

      messages.push({ role: "user", content: question });

      const openai = getOpenAIClient();
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 300,
        temperature: 0.3,
      });

      const answer = response.choices[0]?.message?.content || 
        (language === "so" ? "Waan ka xumahay, ma awoodi jawaabta." : "Sorry, I couldn't generate a response.");

      incrementAiHelperUsage(parentId);
      const updatedLimit = checkAiHelperLimit(parentId);

      res.json({ answer, remaining: updatedLimit.remaining });
    } catch (error) {
      console.error("Homework helper error:", error);
      res.status(500).json({ 
        error: "Failed to get response",
        answer: req.body.language === "so" 
          ? "Waan ka xumahay, cilad ayaa dhacday. Fadlan isku day mar kale." 
          : "Sorry, an error occurred. Please try again."
      });
    }
  });

  // Legacy parenting help endpoint
  app.post("/api/ai/parenting-help", requireParentAuth, async (req: Request, res: Response) => {
    try {
      const parentId = (req.session as any).parentId;
      const { question } = req.body;

      if (!question || typeof question !== "string" || question.trim().length < 5) {
        return res.status(400).json({ error: "Su'aasha waa inaad qortaa (ugu yaraan 5 xaraf)" });
      }

      if (question.trim().length > 300) {
        return res.status(400).json({
          error: "Su'aasha waa inay ka gaaban tahay 300 xaraf",
          answer: "Fadlan gaabi su'aashaada — ugu badnaan 300 xaraf."
        });
      }

      const access = await checkOrStartTrial(parentId);
      if (!access.allowed) {
        if (access.trialExpired) {
          return res.status(403).json({
            error: "Trial expired",
            answer: MEMBERSHIP_ADVICE_SOMALI,
            trialExpired: true,
            plan: access.plan,
          });
        }
        return res.status(429).json({
          error: "Daily limit reached",
          answer: `Waxaad gaartay xadka maalintii ee ${access.dailyLimit} su'aalood. Fadlan soo noqo berri.`,
          remaining: 0
        });
      }

      const result = await getParentingHelp(question.trim(), parentId);
      res.json(result);
    } catch (error) {
      console.error("[AI] Parenting help endpoint error:", error);
      res.status(500).json({ 
        answer: "Khalad ayaa dhacay. Fadlan isku day mar kale.",
        remaining: 0 
      });
    }
  });

  app.get("/api/ai/parenting-help/limit", requireParentAuth, (req: Request, res: Response) => {
    const parentId = (req.session as any).parentId;
    const limit = checkRateLimit(parentId);
    res.json(limit);
  });

  // ==========================================
  // AI HOMEWORK HELPER (for children's schoolwork)
  // ==========================================
  const HOMEWORK_DAILY_LIMIT = 20;

  // Get today's homework usage
  app.get("/api/homework/usage", requireParentAuth, async (req: Request, res: Response) => {
    try {
      const parentId = (req.session as any).parentId;
      const today = new Date().toISOString().split('T')[0];
      const usage = await storage.getHomeworkUsageForDate(parentId, today);
      const questionsAsked = usage?.questionsAsked || 0;
      res.json({
        questionsAsked,
        remaining: Math.max(0, HOMEWORK_DAILY_LIMIT - questionsAsked),
        limit: HOMEWORK_DAILY_LIMIT
      });
    } catch (error) {
      console.error("[HOMEWORK] Usage check error:", error);
      res.status(500).json({ error: "Failed to check usage" });
    }
  });

  // Get homework conversation history
  app.get("/api/homework/conversations", requireParentAuth, async (req: Request, res: Response) => {
    try {
      const parentId = (req.session as any).parentId;
      const conversations = await storage.getHomeworkConversationsByParent(parentId);
      res.json(conversations);
    } catch (error) {
      console.error("[HOMEWORK] Get conversations error:", error);
      res.status(500).json({ error: "Failed to get conversations" });
    }
  });

  // Get messages for a conversation
  app.get("/api/homework/conversations/:id/messages", requireParentAuth, async (req: Request, res: Response) => {
    try {
      const parentId = (req.session as any).parentId;
      const conversationId = req.params.id;
      
      // Verify conversation belongs to this parent
      const conversation = await storage.getHomeworkConversation(conversationId);
      if (!conversation || conversation.parentId !== parentId) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      const messages = await storage.getHomeworkMessages(conversationId);
      res.json({ conversation, messages });
    } catch (error) {
      console.error("[HOMEWORK] Get messages error:", error);
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  // Create new homework conversation
  app.post("/api/homework/conversations", requireParentAuth, async (req: Request, res: Response) => {
    try {
      const parentId = (req.session as any).parentId;
      const { subject, childAge } = req.body;
      
      if (!subject) {
        return res.status(400).json({ error: "Subject is required" });
      }
      
      const conversation = await storage.createHomeworkConversation({
        parentId,
        subject,
        childAge: childAge || null
      });
      
      res.json(conversation);
    } catch (error) {
      console.error("[HOMEWORK] Create conversation error:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  // Ask homework question
  app.post("/api/homework/ask", requireParentAuth, async (req: Request, res: Response) => {
    try {
      const parentId = (req.session as any).parentId;
      const { question, conversationId, subject, childAge } = req.body;
      
      if (!question || typeof question !== "string" || question.trim().length < 3) {
        return res.status(400).json({ error: "Su'aasha waa inaad qortaa (ugu yaraan 3 xaraf)" });
      }

      if (question.trim().length > 300) {
        return res.status(400).json({
          error: "Su'aasha waa inay ka gaaban tahay 300 xaraf",
          answer: "Fadlan gaabi su'aashaada — ugu badnaan 300 xaraf."
        });
      }

      const access = await checkOrStartTrial(parentId);
      if (!access.allowed) {
        if (access.trialExpired) {
          return res.status(403).json({
            error: "Trial expired",
            answer: MEMBERSHIP_ADVICE_SOMALI,
            trialExpired: true,
            plan: access.plan,
          });
        }
        return res.status(429).json({
          error: "Xadka maalintii ayaad gaadhay",
          answer: `Waxaad gaartay xadka maalintii ee ${access.dailyLimit} su'aalood. Fadlan soo noqo berri.`,
          remaining: 0
        });
      }

      // Get or create conversation
      let conversation;
      let existingMessages: any[] = [];
      
      if (conversationId) {
        conversation = await storage.getHomeworkConversation(conversationId);
        if (!conversation || conversation.parentId !== parentId) {
          return res.status(404).json({ error: "Conversation not found" });
        }
        existingMessages = await storage.getHomeworkMessages(conversationId);
      } else {
        // Create new conversation
        conversation = await storage.createHomeworkConversation({
          parentId,
          subject: subject || "Guud",
          childAge: childAge || null
        });
      }

      // Build system prompt for homework help
      const ageContext = conversation.childAge ? `Ilmuhu waxa uu da'da yahay ${conversation.childAge}.` : "";
      const subjectContext = conversation.subject !== "Guud" ? `Mawduuca: ${conversation.subject}.` : "";
      
      const systemPrompt = `Waxaad tahay macalin caawin oo saaxiibtinimo leh oo loogu talagalay carruurta Soomaaliyeed oo hawlaha guriga ku caawiya. ${ageContext} ${subjectContext}

Waajibaadkaaga:
1. Sharax fikradaha si fudud oo faham ah
2. Tusaalooyinka isticmaal si ilmuhu u fahmo
3. Ha ku siin jawaabta toos - u caawin inay iyagu helaan jawaabta
4. Dhiirigelinta iyo taageerida bixin
5. Haddii ilmuhu qaldan yahay, si naxariis leh u saxo
6. Jawaab Af-Soomaali

MUHIIM - XAQIIQOOYIN TAARIIKHEED EE SOOMAALIYA:
- Madaxweynihii UGU HORREEYAY ee Soomaaliya: AADAN CABDULLE COSMAAN (Aden Abdullah Osman Daar) - 1960-1967
- Madaxweynihii LABAAD: Cabdirashiid Cali Sharmaarke - 1967-1969
- Ra'iisul wasaarihii ugu horreeyay: Cabdirashiid Cali Sharmaarke - 1960-1964
- Xorayntii Soomaaliya: 1 Luuliyo 1960
- Calanka Soomaaliya: xiddig cad oo shanta gees leh, asalka buluug ah

Haddii lagu weydiiyo su'aalo taariikheed oo aadan si buuxda u hubin, sheeg inaadan hubin oo ku dhiirigli inay ka hubiyaan buugaag ama macallin.

Mawduucyada aad ka caawin karto:
- Xisaab (isku-darida, jarista, isku-dhufashada, qaybinta)
- Aqrinta iyo qoraalka
- Sayniska aasaasiga ah
- Taariikhda iyo cilmiga bulshada
- Luuqadaha (Ingiriis, Carabi, iwm)
- Wax kasta oo la xiriira hawlaha guriga dugsiga

Ha isticmaalin jawaabo dheer - ka dhig mid fudud oo carruurta u fudud.`;

      // Build conversation history for context
      const messages: any[] = [
        { role: "system", content: systemPrompt }
      ];

      // Add last 8 messages for context
      const recentMessages = existingMessages.slice(-8);
      for (const msg of recentMessages) {
        messages.push({ role: msg.role, content: msg.content });
      }

      messages.push({ role: "user", content: question.trim() });

      const openai = getOpenAIClient();
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 300,
        temperature: 0.3,
      });

      const answer = response.choices[0]?.message?.content || 
        "Waan ka xumahay, ma awoodi jawaabta. Fadlan isku day mar kale.";

      await storage.addHomeworkMessage({
        conversationId: conversation.id,
        role: "user",
        content: question.trim()
      });
      
      await storage.addHomeworkMessage({
        conversationId: conversation.id,
        role: "assistant",
        content: answer
      });

      const today = new Date().toISOString().split('T')[0];
      await storage.incrementHomeworkUsage(parentId, today);

      const updatedAccess = await checkAiAccess(parentId);
      const remaining = updatedAccess.dailyRemaining ?? 0;

      res.json({
        answer,
        conversationId: conversation.id,
        remaining
      });
    } catch (error: any) {
      const errMsg = error?.message || error?.toString() || "Unknown error";
      const errStatus = error?.status || error?.response?.status;
      console.error("[HOMEWORK] Ask error:", errMsg, "Status:", errStatus, "Full:", JSON.stringify(error?.response?.data || {}).substring(0, 500));
      
      let userMessage = "Waan ka xumahay, cilad ayaa dhacday. Fadlan isku day mar kale.";
      if (errMsg.includes("API key") || errMsg.includes("auth") || errStatus === 401) {
        userMessage = "Adeegga AI-ka cilad ku haysata. Fadlan isku day dhowr daqiiqo ka dib.";
        console.error("[HOMEWORK] OpenAI API key issue detected");
      } else if (errMsg.includes("rate") || errStatus === 429) {
        userMessage = "Adeegga AI-ku wuu mashquulsan yahay. Fadlan isku day daqiiqad ka dib.";
      } else if (errMsg.includes("timeout") || errMsg.includes("ECONNREFUSED")) {
        userMessage = "Adeegga AI-ka lama xiriiri karo. Fadlan hubso internet-kaaga.";
      }
      
      res.status(500).json({ 
        error: "Khalad ayaa dhacay",
        answer: userMessage
      });
    }
  });

  // ==========================================
  // AI TARBIYA/PARENTING HELPER (MODE 2)
  // ==========================================
  const TARBIYA_DAILY_LIMIT = 20;

  app.get("/api/tarbiya/usage", requireParentAuth, async (req: Request, res: Response) => {
    try {
      const parentId = (req.session as any).parentId;
      const today = new Date().toISOString().split('T')[0];
      const usage = await storage.getParentingUsageForDate(parentId, today);
      const questionsAsked = usage?.questionsAsked || 0;
      res.json({
        questionsAsked,
        remaining: Math.max(0, TARBIYA_DAILY_LIMIT - questionsAsked),
        limit: TARBIYA_DAILY_LIMIT
      });
    } catch (error) {
      console.error("[TARBIYA] Usage check error:", error);
      res.status(500).json({ error: "Failed to check usage" });
    }
  });

  app.get("/api/tarbiya/conversations", requireParentAuth, async (req: Request, res: Response) => {
    try {
      const parentId = (req.session as any).parentId;
      const conversations = await storage.getParentingConversationsByParent(parentId);
      res.json(conversations);
    } catch (error) {
      console.error("[TARBIYA] Get conversations error:", error);
      res.status(500).json({ error: "Failed to get conversations" });
    }
  });

  app.get("/api/tarbiya/conversations/:id/messages", requireParentAuth, async (req: Request, res: Response) => {
    try {
      const parentId = (req.session as any).parentId;
      const conversationId = req.params.id;

      const conversation = await storage.getParentingConversation(conversationId);
      if (!conversation || conversation.parentId !== parentId) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const messages = await storage.getParentingMessages(conversationId);
      res.json({ conversation, messages });
    } catch (error) {
      console.error("[TARBIYA] Get messages error:", error);
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  app.post("/api/tarbiya/ask", requireParentAuth, async (req: Request, res: Response) => {
    try {
      const parentId = (req.session as any).parentId;
      const { question, conversationId, topic } = req.body;

      if (!question || typeof question !== "string" || question.trim().length < 3) {
        return res.status(400).json({ error: "Su'aasha waa inaad qortaa (ugu yaraan 3 xaraf)" });
      }

      if (question.trim().length > 300) {
        return res.status(400).json({
          error: "Su'aasha waa inay ka gaaban tahay 300 xaraf",
          answer: "Fadlan gaabi su'aashaada — ugu badnaan 300 xaraf."
        });
      }

      const access = await checkOrStartTrial(parentId);
      if (!access.allowed) {
        if (access.trialExpired) {
          return res.status(403).json({
            error: "Trial expired",
            answer: MEMBERSHIP_ADVICE_SOMALI,
            trialExpired: true,
            plan: access.plan,
          });
        }
        return res.status(429).json({
          error: "Xadka maalintii ayaad gaadhay",
          answer: `Waxaad gaartay xadka maalintii ee ${access.dailyLimit} su'aalood. Fadlan soo noqo berri.`,
          remaining: 0
        });
      }

      let conversation;
      let existingMessages: any[] = [];

      if (conversationId) {
        conversation = await storage.getParentingConversation(conversationId);
        if (!conversation || conversation.parentId !== parentId) {
          return res.status(404).json({ error: "Conversation not found" });
        }
        existingMessages = await storage.getParentingMessages(conversationId);
      } else {
        conversation = await storage.createParentingConversation({
          parentId,
          topic: topic || "Guud",
        });
      }

      const topicContext = conversation.topic !== "Guud" ? `Mawduuca waalidku wuxuu weyddiinayaa: ${conversation.topic}.` : "";

      const systemPrompt = `Waxaad tahay la-taliye tarbiyad iyo waalidnimo oo ku salaysan dhaqanka Soomaaliyeed iyo bulshada.

${topicContext}

XEERKA UGU MUHIIMSAN:
- WALIGAA talo toos ah ha bixin markii ugu horeeysa ee waalidku keeno dhibaato culus ee dabeecadda ilmaha.
- Marka hore, waraysi gaaban oo xushmad leh ku samee.
- Su'aalahan hal mar weydii, dhammaan ha wada tuurin:
  1) "Fadlan ii sheeg, immisa sano ayuu ilmuhu jiraa?"
  2) "Ma leeyahay walaalo kale? Haddii ay jiraan, sidee ayuu ula dhaqmaa?"
  3) "Marka uu khalad sameeyo, sidee ayaad u edbisaa? Ma tishaa? Ma ku qaylisaa? Ma garaacdaa?"
  4) "Goorma ayaad bilowday inaad aragto dabeecaddan?"
  5) "Ma ku jirtaa guruubkeena Telegram ee Bahda Tarbiyadda Carruurta?"

GURUUBKA TELEGRAM:
- Mar walba weydii waalidka inuu ku jiro guruubka Telegram.
- Hadduu yiraahdo "Haa": weydii goorma uu ku soo biirtay. Aqbal jawaabtiisa.
- Hadduu yiraahdo "Maya": si deggan oo xushmad leh u xus faa'iidada guruubka (ha qasbin): "Waalid qaaliga ah, guruubkeena Bahda Tarbiyadda Carruurta waxaa ku jira waalidiin badan oo Soomaaliyeed oo is caawiya, sidoo kale waxaa jira talooyin iyo waayo-aragnimo faa'iido leh." Ka dib sii wad waraysiga.

CAJLADAHA DUUBAN EE USTAAD MUUSE:
- Marka waraysigu dhammaado, ka hor inta aanad talo bixin, dheh:
  "Waxaa jira cajlado duuban oo dhagaysi ah oo aad u fara badan oo Ustaad Muuse duubay oo Telegram-ka ku jira, arrimahan si qoto dheer ayuu uga hadlay. Aad bay faa'iido u leeyihiin inaad dhagaysato."
- Ka dib dheh: "Haddana, talooyin wax ku ool ah ayaan hadda ku siinayaa."

TALADA:
- Ku saley dhaqanka Soomaaliyeed, naxariista Islaamka, iyo cilmiga nafsiga carruurta.
- Hab-dhaqameedyada waxyeelada ah (qaylo badan, garaacid) si naxariis leh uga hadal.
- Waligaa ha eedayn, ha ceeben, ha xukumin.
- Talooyinka ha ka dhig kuwo wax ku ool ah, tallaabo-tallaabo, oo dhab ah.
- Xooji naxariista, samirka, iyo xidhiidhka waalidka iyo ilmaha.

LUUQADDA:
- Af-Soomaali cad oo faham ah oo xushmad leh keliya ku jawaab.
- Ha ku siin jawaab dheer — ka dhig mid gaaban oo faa'iido leh.
- Isticmaal 🤲 emoji-ga talooyinka diiniga ah.
- Haddii aanad hubin jawaabta, u sheeg inay la tashadaan culimo ama takhasusle.
- Haddii lagu weydiiyo wax aan tarbiyada iyo carruurta ku saabsanayn, si naxariis leh u diid oo u sheeg inaad tahay caawiye tarbiyad oo keliya.`;

      const aiMessages: any[] = [
        { role: "system", content: systemPrompt }
      ];

      const recentMessages = existingMessages.slice(-8);
      for (const msg of recentMessages) {
        aiMessages.push({ role: msg.role, content: msg.content });
      }

      aiMessages.push({ role: "user", content: question.trim() });

      const openai = getOpenAIClient();
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: aiMessages,
        max_tokens: 300,
        temperature: 0.3,
      });

      const answer = response.choices[0]?.message?.content ||
        "Waan ka xumahay, ma awoodi jawaabta. Fadlan isku day mar kale.";

      await storage.addParentingMessage({
        conversationId: conversation.id,
        role: "user",
        content: question.trim()
      });

      await storage.addParentingMessage({
        conversationId: conversation.id,
        role: "assistant",
        content: answer
      });

      const today = new Date().toISOString().split('T')[0];
      await storage.incrementParentingUsage(parentId, today);

      const updatedAccess = await checkAiAccess(parentId);
      const remaining = updatedAccess.dailyRemaining ?? 0;

      res.json({
        answer,
        conversationId: conversation.id,
        remaining
      });
    } catch (error: any) {
      const errMsg = error?.message || error?.toString() || "Unknown error";
      const errStatus = error?.status || error?.response?.status;
      console.error("[TARBIYA] Ask error:", errMsg, "Status:", errStatus, "Full:", JSON.stringify(error?.response?.data || {}).substring(0, 500));
      
      let userMessage = "Waan ka xumahay, cilad ayaa dhacday. Fadlan isku day mar kale.";
      if (errMsg.includes("API key") || errMsg.includes("auth") || errStatus === 401) {
        userMessage = "Adeegga AI-ka cilad ku haysata. Fadlan isku day dhowr daqiiqo ka dib.";
        console.error("[TARBIYA] OpenAI API key issue detected");
      } else if (errMsg.includes("rate") || errStatus === 429) {
        userMessage = "Adeegga AI-ku wuu mashquulsan yahay. Fadlan isku day daqiiqad ka dib.";
      } else if (errMsg.includes("timeout") || errMsg.includes("ECONNREFUSED")) {
        userMessage = "Adeegga AI-ka lama xiriiri karo. Fadlan hubso internet-kaaga.";
      }
      
      res.status(500).json({
        error: "Khalad ayaa dhacay",
        answer: userMessage
      });
    }
  });

  // ==========================================
  // AI ACCESS STATUS & TRIAL/GOLD MEMBERSHIP
  // ==========================================
  app.get("/api/ai/access-status", requireParentAuth, async (req: Request, res: Response) => {
    try {
      const parentId = (req.session as any).parentId;
      const access = await checkAiAccess(parentId);
      res.json(access);
    } catch (error) {
      console.error("[AI ACCESS] Status check error:", error);
      res.status(500).json({ error: "Failed to check AI access" });
    }
  });

  app.post("/api/ai/start-trial", requireParentAuth, async (req: Request, res: Response) => {
    try {
      const parentId = (req.session as any).parentId;
      const access = await checkOrStartTrial(parentId);
      res.json(access);
    } catch (error) {
      console.error("[AI ACCESS] Start trial error:", error);
      res.status(500).json({ error: "Failed to start trial" });
    }
  });

  // ==========================================
  // AI VOICE ENDPOINT (Speech → AI → Speech)
  // ==========================================
  const voiceUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  // ==========================================
  // STEP 1: VOICE TRANSCRIPTION (Audio → Text)
  // ==========================================
  app.post("/api/voice/transcribe", requireParentAuth, voiceUpload.single("audio"), async (req: Request, res: Response) => {
    try {
      const parentId = (req.session as any).parentId;

      const access = await checkOrStartTrial(parentId);
      if (!access.allowed) {
        if (access.trialExpired || (access.plan === "trial" && access.trialDaysRemaining === 0)) {
          return res.json({
            text: "",
            trialExpired: true,
            membershipAdvice: MEMBERSHIP_ADVICE_SOMALI,
            plan: access.plan,
          });
        }
        return res.status(429).json({
          error: "Xadka maalintii ayaad gaadhay",
          text: `Waxaad gaartay xadka maalintii ee ${access.dailyLimit} su'aalood. Fadlan soo noqo berri.`,
          dailyRemaining: 0,
        });
      }

      if (!req.file) {
        return res.status(400).json({ error: "Audio file is required" });
      }

      const openai = getOpenAIClient();

      const mimeType = req.file.mimetype || "audio/webm";
      let ext = "webm";
      if (mimeType.includes("mp4") || mimeType.includes("m4a") || mimeType.includes("x-m4a")) {
        ext = "mp4";
      } else if (mimeType.includes("ogg")) {
        ext = "ogg";
      } else if (mimeType.includes("wav")) {
        ext = "wav";
      } else if (mimeType.includes("aac")) {
        ext = "m4a";
      } else if (mimeType.includes("mpeg") || mimeType.includes("mp3")) {
        ext = "mp3";
      }

      const audioFile = new File([req.file.buffer], `recording.${ext}`, {
        type: mimeType,
      });

      console.log(`[TRANSCRIBE] Received audio: ${req.file.size} bytes, mime: ${mimeType}, ext: ${ext}`);

      const transcription = await openai.audio.transcriptions.create({
        model: "whisper-1",
        file: audioFile,
        language: "so",
      });

      const userText = transcription.text;
      if (!userText || userText.trim().length < 2) {
        return res.status(400).json({
          error: "Codka lagama fahmin qoraal",
          text: "Waan ka xumahay, codkaaga lagama fahmin. Fadlan ku hadal si dhow mic-ka oo isku day mar kale.",
        });
      }

      console.log(`[TRANSCRIBE] Success: "${userText.substring(0, 50)}..."`);

      res.json({
        text: userText.trim(),
        plan: access.plan,
        trialDaysRemaining: access.trialDaysRemaining,
        dailyRemaining: access.dailyRemaining,
      });
    } catch (error: any) {
      const errMsg = error?.message || error?.toString() || "Unknown error";
      console.error("[TRANSCRIBE] Error:", errMsg);

      let userMessage = "Codka lama fahmi karin. Fadlan isku day mar kale.";
      if (errMsg.includes("Could not process") || errMsg.includes("Invalid file") || errMsg.includes("audio")) {
        userMessage = "Codka lama fahmi karin. Fadlan si dhow ugu hadal mic-ka oo isku day mar kale.";
      } else if (errMsg.includes("API key") || errMsg.includes("auth")) {
        userMessage = "Adeegga AI-ka cilad ku haysata. Fadlan isku day dhowr daqiiqo ka dib.";
      }

      res.status(500).json({
        error: "Khalad ayaa dhacay",
        text: userMessage,
      });
    }
  });

  // ==========================================
  // STEP 3: TEXT-TO-SPEECH (Text → Audio URL)
  // ==========================================
  const ttsAudioDir = path.join(process.cwd(), "tts-audio");
  if (!fs.existsSync(ttsAudioDir)) {
    fs.mkdirSync(ttsAudioDir, { recursive: true });
  }

  app.use("/tts-audio", express.static(ttsAudioDir, {
    maxAge: "1h",
    setHeaders: (res) => {
      res.setHeader("Content-Type", "audio/mpeg");
    }
  }));

  setInterval(() => {
    try {
      const files = fs.readdirSync(ttsAudioDir);
      const now = Date.now();
      for (const file of files) {
        const filePath = path.join(ttsAudioDir, file);
        const stat = fs.statSync(filePath);
        if (now - stat.mtimeMs > 2 * 60 * 60 * 1000) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (e) {}
  }, 30 * 60 * 1000);

  app.post("/api/voice/speak", requireParentAuth, async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== "string" || text.trim().length < 2) {
        return res.status(400).json({ error: "Text is required" });
      }

      const openai = getOpenAIClient();

      const maxRetries = 2;
      let lastError: any = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[TTS] Attempt ${attempt + 1}: generating audio for ${text.length} chars`);

          const ttsResponse = await openai.audio.speech.create({
            model: "tts-1",
            voice: "onyx",
            input: text.substring(0, 1000),
            speed: 0.9,
          });

          const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());

          const fileId = `tts_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.mp3`;
          const filePath = path.join(ttsAudioDir, fileId);
          fs.writeFileSync(filePath, audioBuffer);

          console.log(`[TTS] Success: saved ${audioBuffer.length} bytes as ${fileId}`);

          return res.json({
            audioUrl: `/tts-audio/${fileId}`,
          });
        } catch (err: any) {
          lastError = err;
          console.error(`[TTS] Attempt ${attempt + 1} failed:`, err.message);
          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          }
        }
      }

      console.error("[TTS] All retries failed:", lastError?.message);
      res.status(500).json({
        error: "TTS failed",
        audioUrl: null,
      });
    } catch (error: any) {
      console.error("[TTS] Error:", error.message);
      res.status(500).json({
        error: "TTS failed",
        audioUrl: null,
      });
    }
  });

  // Legacy combined endpoint - kept for backward compatibility
  app.post("/api/voice/ask", requireParentAuth, voiceUpload.single("audio"), async (req: Request, res: Response) => {
    try {
      const parentId = (req.session as any).parentId;
      const mode = req.body.mode || "parenting";

      const access = await checkOrStartTrial(parentId);
      if (!access.allowed) {
        if (access.trialExpired || (access.plan === "trial" && access.trialDaysRemaining === 0)) {
          return res.json({
            text: MEMBERSHIP_ADVICE_SOMALI,
            trialExpired: true,
            plan: access.plan,
          });
        }
        return res.status(429).json({
          error: "Xadka maalintii ayaad gaadhay",
          text: `Waxaad gaartay xadka maalintii ee ${access.dailyLimit} su'aalood. Fadlan soo noqo berri.`,
          dailyRemaining: 0,
        });
      }

      if (!req.file) {
        return res.status(400).json({ error: "Audio file is required" });
      }

      const openai = getOpenAIClient();

      const mimeType = req.file.mimetype || "audio/webm";
      let ext = "webm";
      if (mimeType.includes("mp4") || mimeType.includes("m4a") || mimeType.includes("x-m4a")) ext = "mp4";
      else if (mimeType.includes("ogg")) ext = "ogg";
      else if (mimeType.includes("wav")) ext = "wav";
      else if (mimeType.includes("aac")) ext = "m4a";
      else if (mimeType.includes("mpeg") || mimeType.includes("mp3")) ext = "mp3";

      const audioFile = new File([req.file.buffer], `recording.${ext}`, { type: mimeType });
      console.log(`[VOICE-LEGACY] ${req.file.size} bytes, mime: ${mimeType}, ext: ${ext}`);

      const transcription = await openai.audio.transcriptions.create({
        model: "whisper-1",
        file: audioFile,
        language: "so",
      });

      const userText = transcription.text;
      if (!userText || userText.trim().length < 2) {
        return res.status(400).json({
          error: "Codka lagama fahmin qoraal",
          text: "Waan ka xumahay, codkaaga lagama fahmin. Fadlan isku day mar kale.",
        });
      }

      res.json({
        transcription: userText.trim(),
        text: userText.trim(),
        plan: access.plan,
      });
    } catch (error: any) {
      console.error("[VOICE-LEGACY] Error:", error.message);
      res.status(500).json({
        error: "Khalad ayaa dhacay",
        text: "Codka lama fahmi karin. Fadlan isku day mar kale.",
      });
    }
  });

  // ==========================================
  // STRIPE GOLD MEMBERSHIP CHECKOUT ($114/year)
  // ==========================================
  app.post("/api/ai/gold-checkout", requireParentAuth, async (req: Request, res: Response) => {
    try {
      const parentId = (req.session as any).parentId;
      const parent = await storage.getParent(parentId);
      if (!parent) {
        return res.status(404).json({ error: "Parent not found" });
      }

      const stripe = await getUncachableStripeClient();
      const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
      const customDomain = 'appbarbaarintasan.com';
      const replitDomain = process.env.REPLIT_DOMAINS?.split(',')[0];
      const baseUrl = isProduction ? `https://${customDomain}` : `https://${replitDomain}`;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: parent.email,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Xubinimada Dahabiga ah — AI Caawiye",
                description: "Sanad dhan oo AI Caawiye ah — Laylisyada & Tarbiyada — Cod + Qoraal",
              },
              unit_amount: 11400,
            },
            quantity: 1,
          },
        ],
        metadata: {
          parentId: parent.id,
          type: "ai_gold_membership",
        },
        success_url: `${baseUrl}/ai-caawiye?gold=success`,
        cancel_url: `${baseUrl}/ai-caawiye?gold=cancelled`,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("[GOLD] Checkout error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // ==========================================
  // AI QUIZ GENERATION (Admin only)
  // ==========================================
  app.post("/api/admin/generate-quiz", requireAuth, async (req: Request, res: Response) => {
    try {
      const { courseId, lessonContent, numQuestions = 5, questionType = "multiple_choice" } = req.body;

      if (!lessonContent || typeof lessonContent !== "string" || lessonContent.trim().length < 50) {
        return res.status(400).json({ 
          error: "Qoraalka casharka waa inuu noqdaa ugu yaraan 50 xaraf si AI ugu diyaariyo su'aalo" 
        });
      }

      const openai = getOpenAIClient();
      
      // Build prompt based on question type
      let questionTypeInstructions = "";
      let jsonStructure = "";
      
      if (questionType === "true_false") {
        questionTypeInstructions = `2. Su'aal kasta wuxuu lahaan doonaa 2 jawaab KELIYA: "Haa (Run)" iyo "Maya (Been)"
3. Hal jawaab keliya ayaa saxda ah (0 = Haa/Run, 1 = Maya/Been)`;
        jsonStructure = `[
  {
    "question": "Su'aasha halkan ku qor (tusaale: Ilmaha waa inuu seexdo 10 saacadood...)",
    "options": ["Haa (Run)", "Maya (Been)"],
    "correctAnswer": 0,
    "explanation": "Sharaxaadda halkan ku qor"
  }
]`;
      } else if (questionType === "mixed") {
        questionTypeInstructions = `2. Qaarkood waxay leeyihiin 4 jawaab (multiple choice), qaarna 2 jawaab (True/False)
3. Hal jawaab keliya ayaa saxda ah
4. True/False jawaabaha waa "Haa (Run)" iyo "Maya (Been)"`;
        jsonStructure = `[
  {
    "question": "Su'aal multiple choice ah",
    "options": ["Jawaab 1", "Jawaab 2", "Jawaab 3", "Jawaab 4"],
    "correctAnswer": 0,
    "explanation": "Sharaxaadda"
  },
  {
    "question": "Su'aal true/false ah",
    "options": ["Haa (Run)", "Maya (Been)"],
    "correctAnswer": 1,
    "explanation": "Sharaxaadda"
  }
]`;
      } else {
        // Default: multiple_choice
        questionTypeInstructions = `2. Su'aal kasta wuxuu lahaan doonaa 4 jawaab oo kala duwan
3. Hal jawaab keliya ayaa saxda ah`;
        jsonStructure = `[
  {
    "question": "Su'aasha halkan ku qor",
    "options": ["Jawaab 1", "Jawaab 2", "Jawaab 3", "Jawaab 4"],
    "correctAnswer": 0,
    "explanation": "Sharaxaadda halkan ku qor"
  }
]`;
      }
      
      const systemPrompt = `Waxaad tahay macallin Soomaali ah oo diyaarinaya su'aalo imtixaan ah waalidka Soomaaliyeed ee barta wax ku saabsan barbaarinta ilmaha.

Waxaad diyaarin doontaa ${numQuestions} su'aalood oo ku salaysan qoraalka casharka.

QAWAANIINTA:
1. Su'aalaha waa inay ahaadaan af-Soomaali oo fudud
${questionTypeInstructions}
4. Sharax ku dar sababta jawaabta saxda ah
5. Su'aalaha waa inay ku salaysan yihiin macluumaadka casharka

Soo celi JSON array ah oo leh structure-kan:
${jsonStructure}

MUHIIM: Soo celi JSON keliya, wax kale ha ku darin.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Qoraalka casharka:\n\n${lessonContent.trim()}\n\nDiyaari ${numQuestions} su'aalood.` }
        ],
        max_tokens: 2048,
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content || "[]";
      
      // Try to parse the JSON response
      let questions = [];
      try {
        // Extract JSON from response (in case there's extra text)
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          questions = JSON.parse(jsonMatch[0]);
        } else {
          questions = JSON.parse(content);
        }
      } catch (parseError) {
        console.error("[AI QUIZ] Failed to parse response:", content);
        return res.status(500).json({ 
          error: "AI-ga ma diyaarin karin su'aalaha. Fadlan isku day mar kale.",
          rawResponse: content
        });
      }

      // Validate questions structure (allow 2-4 options for mixed/true_false)
      const validQuestions = questions.filter((q: any) => 
        q.question && 
        Array.isArray(q.options) && 
        q.options.length >= 2 &&
        q.options.length <= 4 &&
        typeof q.correctAnswer === "number" &&
        q.correctAnswer >= 0 && 
        q.correctAnswer < q.options.length
      );

      if (validQuestions.length === 0) {
        return res.status(500).json({ 
          error: "AI-ga ma soo saarin su'aalo sax ah. Fadlan isku day mar kale." 
        });
      }

      console.log(`[AI QUIZ] Generated ${validQuestions.length} ${questionType} questions for admin`);
      res.json({ questions: validQuestions });

    } catch (error) {
      console.error("[AI QUIZ] Generation error:", error);
      res.status(500).json({ 
        error: "Khalad ayaa dhacay. Fadlan isku day mar kale." 
      });
    }
  });

  // ==================== FLASHCARD ROUTES ====================
  
  // Get all flashcard categories (public - for learning)
  app.get("/api/flashcard-categories", async (req, res) => {
    try {
      const categories = await storage.getActiveFlashcardCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching flashcard categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // Get flashcards by category (public)
  app.get("/api/flashcard-categories/:categoryId/flashcards", async (req, res) => {
    try {
      const { categoryId } = req.params;
      const flashcards = await storage.getActiveFlashcardsByCategory(categoryId);
      res.json(flashcards);
    } catch (error) {
      console.error("Error fetching flashcards:", error);
      res.status(500).json({ error: "Failed to fetch flashcards" });
    }
  });

  // Get parent's flashcard progress
  app.get("/api/parent/flashcard-progress", requireParentAuth, async (req: any, res) => {
    try {
      const parentId = req.session.parentId;
      const progress = await storage.getAllFlashcardProgress(parentId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching flashcard progress:", error);
      res.status(500).json({ error: "Failed to fetch progress" });
    }
  });

  // Update flashcard progress (when parent views or answers correctly)
  app.post("/api/parent/flashcard-progress/:flashcardId", requireParentAuth, async (req: any, res) => {
    try {
      const parentId = req.session.parentId;
      const { flashcardId } = req.params;
      const { viewed, correct } = req.body;
      
      const progress = await storage.updateFlashcardProgress(
        parentId, 
        flashcardId, 
        viewed === true, 
        correct === true
      );
      res.json(progress);
    } catch (error) {
      console.error("Error updating flashcard progress:", error);
      res.status(500).json({ error: "Failed to update progress" });
    }
  });

  // ==================== ADMIN FLASHCARD ROUTES ====================
  
  // Get all categories (admin - includes inactive)
  app.get("/api/admin/flashcard-categories", requireAuth, async (req, res) => {
    try {
      const categories = await storage.getAllFlashcardCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // Create category
  app.post("/api/admin/flashcard-categories", requireAuth, async (req, res) => {
    try {
      const category = await storage.createFlashcardCategory(req.body);
      res.json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  // Update category
  app.patch("/api/admin/flashcard-categories/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const category = await storage.updateFlashcardCategory(id, req.body);
      res.json(category);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ error: "Failed to update category" });
    }
  });

  // Delete category
  app.delete("/api/admin/flashcard-categories/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteFlashcardCategory(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  // Get flashcards by category (admin - includes inactive)
  app.get("/api/admin/flashcard-categories/:categoryId/flashcards", requireAuth, async (req, res) => {
    try {
      const { categoryId } = req.params;
      const flashcards = await storage.getFlashcardsByCategory(categoryId);
      res.json(flashcards);
    } catch (error) {
      console.error("Error fetching flashcards:", error);
      res.status(500).json({ error: "Failed to fetch flashcards" });
    }
  });

  // Create flashcard
  app.post("/api/admin/flashcards", requireAuth, async (req, res) => {
    try {
      const flashcard = await storage.createFlashcard(req.body);
      res.json(flashcard);
    } catch (error) {
      console.error("Error creating flashcard:", error);
      res.status(500).json({ error: "Failed to create flashcard" });
    }
  });

  // Update flashcard
  app.patch("/api/admin/flashcards/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const flashcard = await storage.updateFlashcard(id, req.body);
      res.json(flashcard);
    } catch (error) {
      console.error("Error updating flashcard:", error);
      res.status(500).json({ error: "Failed to update flashcard" });
    }
  });

  // Delete flashcard
  app.delete("/api/admin/flashcards/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteFlashcard(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting flashcard:", error);
      res.status(500).json({ error: "Failed to delete flashcard" });
    }
  });

  // ==================== LESSON BOOKMARK ROUTES ====================
  
  // Get all bookmarks for logged-in parent
  app.get("/api/parent/bookmarks", requireParentAuth, async (req, res) => {
    try {
      const parentId = req.session.parentId!;
      const bookmarks = await storage.getBookmarksByParentId(parentId);
      
      // Get lesson details for each bookmark
      const bookmarksWithLessons = await Promise.all(
        bookmarks.map(async (bookmark) => {
          const lesson = await storage.getLesson(bookmark.lessonId);
          if (!lesson) return null;
          const course = await storage.getCourse(lesson.courseId);
          return {
            ...bookmark,
            lesson,
            course: course ? { id: course.id, title: course.title, imageUrl: course.imageUrl } : null
          };
        })
      );
      
      res.json(bookmarksWithLessons.filter(Boolean));
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
      res.status(500).json({ error: "Failed to fetch bookmarks" });
    }
  });

  // Check if lesson is bookmarked
  app.get("/api/parent/bookmarks/:lessonId", requireParentAuth, async (req, res) => {
    try {
      const parentId = req.session.parentId!;
      const { lessonId } = req.params;
      const bookmark = await storage.getBookmark(parentId, lessonId);
      res.json({ isBookmarked: !!bookmark });
    } catch (error) {
      console.error("Error checking bookmark:", error);
      res.status(500).json({ error: "Failed to check bookmark" });
    }
  });

  // Add bookmark
  app.post("/api/parent/bookmarks", requireParentAuth, async (req, res) => {
    try {
      const parentId = req.session.parentId!;
      const { lessonId } = req.body;
      
      if (!lessonId) {
        return res.status(400).json({ error: "Lesson ID required" });
      }
      
      // Check if already bookmarked
      const existing = await storage.getBookmark(parentId, lessonId);
      if (existing) {
        return res.json({ message: "Already bookmarked", bookmark: existing });
      }
      
      const bookmark = await storage.createBookmark({ parentId, lessonId });
      res.json(bookmark);
    } catch (error) {
      console.error("Error adding bookmark:", error);
      res.status(500).json({ error: "Failed to add bookmark" });
    }
  });

  // Remove bookmark
  app.delete("/api/parent/bookmarks/:lessonId", requireParentAuth, async (req, res) => {
    try {
      const parentId = req.session.parentId!;
      const { lessonId } = req.params;
      await storage.deleteBookmark(parentId, lessonId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing bookmark:", error);
      res.status(500).json({ error: "Failed to remove bookmark" });
    }
  });

  // ==================== LESSON EXERCISE ROUTES ====================
  
  // Get exercises for a lesson
  app.get("/api/lessons/:lessonId/exercises", async (req, res) => {
    try {
      const { lessonId } = req.params;
      const exercises = await storage.getExercisesByLessonId(lessonId);
      
      // Parse JSON fields for frontend
      const parsedExercises = exercises.map(ex => ({
        ...ex,
        options: ex.options ? (typeof ex.options === 'string' ? JSON.parse(ex.options) : ex.options) : null,
        correctAnswer: (() => {
          if (!ex.correctAnswer) return null;
          try {
            return JSON.parse(ex.correctAnswer);
          } catch {
            return ex.correctAnswer;
          }
        })()
      }));
      
      res.json({ exercises: parsedExercises, progress: [] });
    } catch (error) {
      console.error("Error fetching exercises:", error);
      res.status(500).json({ error: "Failed to fetch exercises" });
    }
  });

  // Submit exercise answer
  app.post("/api/exercises/:exerciseId/submit", requireParentAuth, async (req, res) => {
    try {
      const parentId = req.session.parentId!;
      const { exerciseId } = req.params;
      const { answer } = req.body;
      
      const exercise = await storage.getExercise(exerciseId);
      if (!exercise) {
        return res.status(404).json({ error: "Exercise not found" });
      }
      
      // Parse stored correctAnswer
      let parsedCorrectAnswer: any;
      try {
        parsedCorrectAnswer = JSON.parse(exercise.correctAnswer);
      } catch {
        parsedCorrectAnswer = exercise.correctAnswer;
      }
      
      // Check answer
      let isCorrect = false;
      if (exercise.exerciseType === "multiple_choice") {
        // Multiple choice: compare index numbers
        isCorrect = Number(answer) === Number(parsedCorrectAnswer);
      } else if (exercise.exerciseType === "true_false") {
        // True/false: compare boolean values
        isCorrect = Boolean(answer) === Boolean(parsedCorrectAnswer);
      } else if (exercise.exerciseType === "drag_drop") {
        // Drag-drop: compare JSON objects
        try {
          const userAnswer = typeof answer === "string" ? JSON.parse(answer) : answer;
          isCorrect = JSON.stringify(userAnswer) === JSON.stringify(parsedCorrectAnswer);
        } catch {
          isCorrect = false;
        }
      } else if (exercise.exerciseType === "fill_blank") {
        // Fill blank: case-insensitive string comparison
        const userStr = String(answer || "").toLowerCase().trim();
        const correctStr = String(parsedCorrectAnswer || "").toLowerCase().trim();
        isCorrect = userStr === correctStr;
      }
      
      // Check existing progress
      const existingProgress = await storage.getExerciseProgress(parentId, exerciseId);
      
      if (existingProgress) {
        // Update attempts
        await storage.updateExerciseProgress(existingProgress.id, {
          answer,
          isCorrect,
          attempts: existingProgress.attempts + 1
        });
      } else {
        // Create new progress
        await storage.createExerciseProgress({
          parentId,
          exerciseId,
          answer,
          isCorrect,
          attempts: 1
        });
      }
      
      res.json({
        isCorrect,
        explanation: exercise.explanation,
        correctAnswer: isCorrect ? undefined : exercise.correctAnswer
      });
    } catch (error) {
      console.error("Error submitting exercise:", error);
      res.status(500).json({ error: "Failed to submit answer" });
    }
  });

  // Get exercise progress for a lesson
  app.get("/api/parent/lessons/:lessonId/exercise-progress", requireParentAuth, async (req, res) => {
    try {
      const parentId = req.session.parentId!;
      const { lessonId } = req.params;
      const progress = await storage.getExerciseProgressByParentAndLesson(parentId, lessonId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching exercise progress:", error);
      res.status(500).json({ error: "Failed to fetch progress" });
    }
  });

  // ==================== ADMIN EXERCISE ROUTES ====================
  
  // Get exercises for a specific lesson (admin)
  app.get("/api/admin/exercises/:lessonId", requireAuth, async (req, res) => {
    try {
      const { lessonId } = req.params;
      const exercises = await storage.getExercisesByLessonId(lessonId);
      res.json(exercises);
    } catch (error) {
      console.error("Error fetching lesson exercises:", error);
      res.status(500).json({ error: "Failed to fetch exercises" });
    }
  });
  
  // Get all exercises
  app.get("/api/admin/exercises", requireAuth, async (req, res) => {
    try {
      const exercises = await storage.getAllExercises();
      res.json(exercises);
    } catch (error) {
      console.error("Error fetching exercises:", error);
      res.status(500).json({ error: "Failed to fetch exercises" });
    }
  });

  // Create exercise
  app.post("/api/admin/exercises", requireAuth, async (req, res) => {
    try {
      const exercise = await storage.createExercise(req.body);
      res.json(exercise);
    } catch (error) {
      console.error("Error creating exercise:", error);
      res.status(500).json({ error: "Failed to create exercise" });
    }
  });

  // Update exercise
  app.patch("/api/admin/exercises/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const exercise = await storage.updateExercise(id, req.body);
      res.json(exercise);
    } catch (error) {
      console.error("Error updating exercise:", error);
      res.status(500).json({ error: "Failed to update exercise" });
    }
  });

  // Delete exercise
  app.delete("/api/admin/exercises/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteExercise(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting exercise:", error);
      res.status(500).json({ error: "Failed to delete exercise" });
    }
  });

  // ==================== CONTENT REPORTING (EU DSA COMPLIANCE) ====================

  // Submit a content report
  app.post("/api/reports", requireParentAuth, async (req, res) => {
    try {
      const parentId = req.session.parentId!;
      const { reportType, contentId, reportedUserId, reason, description } = req.body;

      if (!reportType || !contentId || !reason) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const validReasons = ["hate_speech", "harassment", "violence", "misinformation", "spam", "harmful_to_children", "other"];
      if (!validReasons.includes(reason)) {
        return res.status(400).json({ error: "Invalid report reason" });
      }

      const validTypes = ["message", "voice_room", "voice_message", "user", "social_post", "post_comment"];
      if (!validTypes.includes(reportType)) {
        return res.status(400).json({ error: "Invalid report type" });
      }

      const report = await storage.createContentReport({
        reporterId: parentId,
        reportType,
        contentId,
        reportedUserId: reportedUserId || null,
        reason,
        description: description || null,
        status: "pending",
      });

      res.status(201).json({ success: true, reportId: report.id });
    } catch (error) {
      console.error("Error creating report:", error);
      res.status(500).json({ error: "Failed to submit report" });
    }
  });

  // Get user consent status
  app.get("/api/parent/consent", requireParentAuth, async (req, res) => {
    try {
      const parentId = req.session.parentId!;
      const consent = await storage.getUserConsent(parentId);
      res.json(consent || { hasConsent: false });
    } catch (error) {
      console.error("Error fetching consent:", error);
      res.status(500).json({ error: "Failed to fetch consent status" });
    }
  });

  // Accept terms/privacy/guidelines
  app.post("/api/parent/consent", requireParentAuth, async (req, res) => {
    try {
      const parentId = req.session.parentId!;
      const { termsAccepted, privacyAccepted, guidelinesAccepted, marketingConsent } = req.body;

      const consent = await storage.updateUserConsent(parentId, {
        termsAccepted,
        privacyAccepted,
        guidelinesAccepted,
        marketingConsent,
      });

      res.json(consent);
    } catch (error) {
      console.error("Error updating consent:", error);
      res.status(500).json({ error: "Failed to update consent" });
    }
  });

  // ==================== ADMIN MODERATION ROUTES ====================

  // Get all pending reports (admin)
  app.get("/api/admin/reports", requireAuth, async (req, res) => {
    try {
      const status = req.query.status as string || "pending";
      const reports = await storage.getContentReports(status);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  // Review a report (admin)
  app.patch("/api/admin/reports/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, adminNotes, actionTaken } = req.body;
      const adminId = req.session.userId!;

      const report = await storage.updateContentReport(id, {
        status,
        adminNotes,
        actionTaken,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      });

      // If action taken, create moderation action record
      if (actionTaken && actionTaken !== "none" && report?.reportedUserId) {
        await storage.createModerationAction({
          parentId: report.reportedUserId,
          actionType: actionTaken,
          reason: `Report #${id}: ${report.reason}`,
          reportId: id,
          adminId,
        });
      }

      res.json(report);
    } catch (error) {
      console.error("Error updating report:", error);
      res.status(500).json({ error: "Failed to update report" });
    }
  });

  // Get moderation history for a user (admin)
  app.get("/api/admin/moderation/:parentId", requireAuth, async (req, res) => {
    try {
      const { parentId } = req.params;
      const actions = await storage.getModerationActions(parentId);
      res.json(actions);
    } catch (error) {
      console.error("Error fetching moderation history:", error);
      res.status(500).json({ error: "Failed to fetch moderation history" });
    }
  });

  // ==================== AI MODERATION ROUTES ====================

  // Get AI-flagged messages for review (admin only)
  app.get("/api/admin/ai-moderation", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Admin login required" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin only" });
      }
      
      const status = req.query.status as string || "pending";
      const reports = await storage.getAiModerationReports(status);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching AI moderation reports:", error);
      res.status(500).json({ error: "Failed to fetch AI moderation reports" });
    }
  });

  // Review AI-flagged message (admin only)
  app.patch("/api/admin/ai-moderation/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Admin login required" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin only" });
      }
      
      const { id } = req.params;
      const { status, adminNotes, actionTaken, restoreMessage } = req.body;
      const adminId = req.session.userId!;

      const report = await storage.updateAiModerationReport(id, {
        status,
        adminNotes,
        actionTaken: actionTaken || "none",
        reviewedBy: adminId,
        reviewedAt: new Date(),
      });

      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }

      // If dismissed (false positive), restore the message
      if (status === "dismissed" || restoreMessage) {
        await storage.updateVoiceRoomMessage(report.contentId, {
          isHidden: false,
          aiModerated: true, // Keep flag that it was moderated
        });
      }

      // If approved violation, may escalate with user action
      if (status === "approved" && actionTaken && actionTaken !== "none" && report.userId) {
        await storage.createModerationAction({
          parentId: report.userId,
          actionType: actionTaken,
          reason: `AI-detected ${report.violationType}: "${report.originalContent.substring(0, 100)}..."`,
          reportId: id,
          adminId,
        });
      }

      res.json(report);
    } catch (error) {
      console.error("Error updating AI moderation report:", error);
      res.status(500).json({ error: "Failed to update AI moderation report" });
    }
  });

  // Get AI moderation stats (admin dashboard - admin only)
  app.get("/api/admin/ai-moderation/stats", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Admin login required" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin only" });
      }
      
      const pending = await storage.getAiModerationReports("pending");
      const approved = await storage.getAiModerationReports("approved");
      const dismissed = await storage.getAiModerationReports("dismissed");
      
      res.json({
        pending: pending.length,
        approved: approved.length,
        dismissed: dismissed.length,
        falsePositiveRate: dismissed.length > 0 
          ? (dismissed.length / (approved.length + dismissed.length) * 100).toFixed(1) 
          : 0,
      });
    } catch (error) {
      console.error("Error fetching AI moderation stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // ==================== GDPR DATA EXPORT/DELETION ====================

  // Request data export (GDPR)
  app.post("/api/parent/data-export", requireParentAuth, async (req, res) => {
    try {
      const parentId = req.session.parentId!;
      const parent = await storage.getParentById(parentId);
      const progress = await storage.getProgressByParentId(parentId);
      const enrollments = await storage.getEnrollmentsByParentId(parentId);
      const notifications = await storage.getParentNotifications(parentId);
      const consent = await storage.getUserConsent(parentId);

      const exportData = {
        exportDate: new Date().toISOString(),
        profile: {
          name: parent?.name,
          email: parent?.email,
          phone: parent?.phone,
          createdAt: parent?.createdAt,
        },
        learningProgress: progress,
        enrollments: enrollments.map(e => ({
          courseId: e.courseId,
          enrolledAt: e.accessStart,
          subscriptionType: e.planType,
        })),
        notificationCount: notifications.length,
        consentRecord: consent,
      };

      res.json(exportData);
    } catch (error) {
      console.error("Error exporting data:", error);
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  // Request account deletion (GDPR)
  app.post("/api/parent/delete-account", requireParentAuth, async (req, res) => {
    try {
      const parentId = req.session.parentId!;
      const { confirmEmail } = req.body;

      const parent = await storage.getParentById(parentId);
      if (!parent || parent.email !== confirmEmail) {
        return res.status(400).json({ error: "Email confirmation does not match" });
      }

      // Mark account for deletion (soft delete with 30-day grace period)
      await storage.markParentForDeletion(parentId);

      // Destroy session
      req.session.destroy(() => {});

      res.json({ success: true, message: "Account marked for deletion. Data will be removed in 30 days." });
    } catch (error) {
      console.error("Error requesting deletion:", error);
      res.status(500).json({ error: "Failed to process deletion request" });
    }
  });

  // ==================== EXPORT USERS FOR WORDPRESS MIGRATION ====================
  app.get("/api/admin/export-users-wp", async (req, res) => {
    try {
      const parentId = (req.session as any)?.parentId;
      if (parentId) {
        const parent = await storage.getParent(parentId);
        if (!parent?.isAdmin) {
          return res.status(403).json({ error: "Admin only" });
        }
      } else if (req.session.userId) {
        const user = await storage.getUser(req.session.userId);
        if (!user?.isAdmin) {
          return res.status(403).json({ error: "Admin only" });
        }
      } else {
        return res.status(401).json({ error: "Admin login required" });
      }

      console.log("[EXPORT-WP] Admin exporting users for WordPress migration");

      const allParents = await storage.getAllParents();
      const allCourses = await storage.getAllCourses();

      const exportUsers = [];
      for (const parent of allParents) {
        const parentEnrollments = [];
        for (const course of allCourses) {
          const enrollment = await storage.getEnrollmentByParentAndCourse(parent.id, course.id);
          if (enrollment && enrollment.status === 'active') {
            parentEnrollments.push({
              courseId: course.courseId,
              courseTitle: course.title,
              planType: enrollment.planType,
              accessStart: enrollment.accessStart,
              accessEnd: enrollment.accessEnd,
            });
          }
        }

        exportUsers.push({
          id: parent.id,
          email: parent.email,
          name: parent.name,
          phone: parent.phone || '',
          passwordHash: parent.password || '',
          country: parent.country || '',
          city: parent.city || '',
          createdAt: parent.createdAt,
          enrollments: parentEnrollments,
        });
      }

      const exportData = {
        exportedAt: new Date().toISOString(),
        totalUsers: exportUsers.length,
        totalWithEnrollments: exportUsers.filter(u => u.enrollments.length > 0).length,
        users: exportUsers,
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="bsa-users-wp-export-${new Date().toISOString().split('T')[0]}.json"`);
      res.json(exportData);

      console.log(`[EXPORT-WP] Exported ${exportUsers.length} users (${exportData.totalWithEnrollments} with enrollments)`);
    } catch (error: any) {
      console.error("[EXPORT-WP] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Import lost parent user data (re-creates accounts from a WP-export JSON)
  app.post("/api/admin/import-parents", async (req, res) => {
    try {
      const parentId = (req.session as any)?.parentId;
      if (parentId) {
        const parent = await storage.getParent(parentId);
        if (!parent?.isAdmin) {
          return res.status(403).json({ error: "Admin only" });
        }
      } else if (req.session.userId) {
        const user = await storage.getUser(req.session.userId);
        if (!user?.isAdmin) {
          return res.status(403).json({ error: "Admin only" });
        }
      } else {
        return res.status(401).json({ error: "Admin login required" });
      }

      const { users: importedUsers } = req.body;
      if (!importedUsers || !Array.isArray(importedUsers) || importedUsers.length === 0) {
        return res.status(400).json({ error: "No user data provided. Expected { users: [...] }" });
      }

      console.log(`[IMPORT-PARENTS] Admin importing ${importedUsers.length} parent records`);

      const allCourses = await storage.getAllCourses();
      const coursesByExternalId = new Map(allCourses.map(c => [c.courseId, c]));

      let importedCount = 0;
      let skippedCount = 0;
      let enrollmentsImported = 0;
      const errors: string[] = [];

      for (const u of importedUsers) {
        if (!u.email || !u.name) {
          errors.push(`Skipped entry without email/name`);
          skippedCount++;
          continue;
        }

        // Skip if already exists
        const existing = await storage.getParentByEmail(u.email);
        if (existing) {
          skippedCount++;
          continue;
        }

        try {
          const newParent = await storage.createParent({
            email: u.email,
            name: u.name,
            // passwordHash is the bcrypt hash from the app's own export – same format
            password: u.passwordHash || null,
            phone: u.phone || null,
            country: u.country || null,
            city: u.city || null,
          });

          importedCount++;

          // Re-create active enrollments if present
          if (Array.isArray(u.enrollments)) {
            for (const enr of u.enrollments) {
              const course = coursesByExternalId.get(enr.courseId);
              if (!course) continue;
              try {
                await storage.createEnrollment({
                  parentId: newParent.id,
                  courseId: course.id,
                  planType: enr.planType || "lifetime",
                  accessEnd: enr.accessEnd ? new Date(enr.accessEnd) : null,
                  status: "active",
                });
                enrollmentsImported++;
              } catch (enrErr: any) {
                errors.push(`Enrollment error for ${u.email} / ${enr.courseId}: ${enrErr.message}`);
              }
            }
          }
        } catch (createErr: any) {
          errors.push(`Failed to create ${u.email}: ${createErr.message}`);
          skippedCount++;
        }
      }

      const MAX_IMPORT_ERRORS_RETURNED = 20;

      console.log(`[IMPORT-PARENTS] Done: ${importedCount} imported, ${skippedCount} skipped, ${enrollmentsImported} enrollments`);

      res.json({
        success: true,
        message: `${importedCount} parent(s) restored, ${skippedCount} skipped (already exist), ${enrollmentsImported} enrollment(s) restored`,
        importedCount,
        skippedCount,
        enrollmentsImported,
        errors: errors.slice(0, MAX_IMPORT_ERRORS_RETURNED),
      });
    } catch (error: any) {
      console.error("[IMPORT-PARENTS] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== WORDPRESS USER SYNC ====================
  // Sync new user registrations from App → WordPress
  const WORDPRESS_SITE_URL = 'https://barbaarintasan.com';
  
  async function syncUserToWordPress(email: string, name: string, phone: string, passwordHash: string) {
    const apiKey = process.env.WORDPRESS_API_KEY;
    if (!apiKey) {
      console.log('[WP-SYNC] WORDPRESS_API_KEY not set - skipping sync');
      return;
    }
    
    try {
      const response = await fetch(`${WORDPRESS_SITE_URL}/wp-json/bsa/v1/sync-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({ email, name, phone, password_hash: passwordHash }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log(`[WP-SYNC] User synced to WordPress: ${email} (${result.action})`);
      } else {
        console.error(`[WP-SYNC] Failed to sync user to WordPress: ${email}`, result);
      }
    } catch (error) {
      console.error(`[WP-SYNC] Error syncing user to WordPress: ${email}`, error);
    }
  }

  // Sync enrollment deletion from App → WordPress
  async function syncEnrollmentDeleteToWordPress(email: string, courseId: string) {
    const apiKey = process.env.WORDPRESS_API_KEY;
    if (!apiKey) {
      console.log('[WP-SYNC] WORDPRESS_API_KEY not set - skipping enrollment delete sync');
      return;
    }

    try {
      const response = await fetch(`${WORDPRESS_SITE_URL}/wp-json/bsa/v1/unenroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({ email, course_id: courseId }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log(`[WP-SYNC] Enrollment delete synced to WordPress: ${email}, course: ${courseId} (${result.action})`);
      } else {
        console.error(`[WP-SYNC] Failed to sync enrollment delete to WordPress: ${email}`, result);
      }
    } catch (error) {
      console.error(`[WP-SYNC] Error syncing enrollment delete to WordPress: ${email}`, error);
    }
  }

  // ==================== WORDPRESS INTEGRATION APIs ====================
  // These endpoints allow WordPress to integrate with the Replit backend
  // Secured with API key authentication

  const WORDPRESS_API_KEY = process.env.WORDPRESS_API_KEY;

  // Middleware to verify WordPress API key (header only for security)
  const verifyWordPressApiKey = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = (req.headers['x-api-key'] as string || '').trim();
    const expectedKey = (WORDPRESS_API_KEY || '').trim();
    
    if (!expectedKey) {
      return res.status(500).json({ error: "API integration not configured" });
    }
    
    if (!apiKey || apiKey !== expectedKey) {
      return res.status(401).json({ error: "Invalid or missing API key. Use X-API-Key header." });
    }
    
    next();
  };

  // Special course identifier for all-access subscriptions (platform-wide access)
  // This references a real course row in the database with courseId = 'all-access'
  const ALL_ACCESS_COURSE_IDENTIFIER = 'all-access';
  
  // Helper to get the all-access course ID from database
  async function getAllAccessCourseId(): Promise<string | null> {
    const allAccessCourse = await storage.getCourseByCourseId(ALL_ACCESS_COURSE_IDENTIFIER);
    return allAccessCourse?.id || null;
  }
  
  // Helper to check if an enrollment represents an all-access subscription
  async function isAllAccessEnrollment(enrollment: { courseId: string }): Promise<boolean> {
    const allAccessId = await getAllAccessCourseId();
    return allAccessId !== null && enrollment.courseId === allAccessId;
  }
  
  // Get user by phone number (for WordPress to find existing users)
  app.get("/api/wordpress/user-by-phone", verifyWordPressApiKey, async (req, res) => {
    try {
      const phone = req.query.phone as string;
      
      if (!phone) {
        return res.status(400).json({ error: "Phone number required" });
      }
      
      const parent = await storage.getParentByPhone(phone);
      
      if (!parent) {
        return res.json({ exists: false, user: null });
      }
      
      // Get the all-access course ID from database
      const allAccessCourseId = await getAllAccessCourseId();
      
      // Check enrollments for subscription status
      const enrollments = await storage.getEnrollmentsByParentId(parent.id);
      const now = new Date();
      
      // Find all-access subscription (if all-access course exists)
      const allAccessSubscription = allAccessCourseId ? enrollments.find(e => 
        e.courseId === allAccessCourseId &&
        e.status === 'active' &&
        (!e.accessEnd || new Date(e.accessEnd) > now)
      ) : null;
      
      // Get course-specific enrollments (excluding all-access)
      const activeCourseEnrollments = enrollments.filter(e => 
        (!allAccessCourseId || e.courseId !== allAccessCourseId) &&
        e.status === 'active' && 
        (!e.accessEnd || new Date(e.accessEnd) > now)
      );
      
      res.json({
        exists: true,
        user: {
          id: parent.id,
          name: parent.name,
          phone: parent.phone,
          email: parent.email,
          hasActiveSubscription: !!allAccessSubscription,
          subscriptionType: allAccessSubscription?.planType || null,
          subscriptionEnd: allAccessSubscription?.accessEnd || null,
          activeCourseEnrollments: activeCourseEnrollments.length,
          enrolledCourseIds: activeCourseEnrollments.map(e => e.courseId),
        }
      });
    } catch (error) {
      console.error("[WORDPRESS API] Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Find user by email (case-insensitive)
  app.get("/api/wordpress/user-by-email", verifyWordPressApiKey, async (req, res) => {
    try {
      const email = req.query.email as string;
      
      if (!email) {
        return res.status(400).json({ error: "Email required" });
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      const parent = await storage.getParentByEmail(normalizedEmail);
      
      if (!parent) {
        return res.json({ exists: false, user: null });
      }
      
      // Get the all-access course ID from database
      const allAccessCourseId = await getAllAccessCourseId();
      
      // Check enrollments for subscription status
      const enrollments = await storage.getEnrollmentsByParentId(parent.id);
      const now = new Date();
      
      // Find all-access subscription (if all-access course exists)
      const allAccessSubscription = allAccessCourseId ? enrollments.find(e => 
        e.courseId === allAccessCourseId &&
        e.status === 'active' &&
        (!e.accessEnd || new Date(e.accessEnd) > now)
      ) : null;
      
      // Get course-specific enrollments (excluding all-access)
      const activeCourseEnrollments = enrollments.filter(e => 
        (!allAccessCourseId || e.courseId !== allAccessCourseId) &&
        e.status === 'active' && 
        (!e.accessEnd || new Date(e.accessEnd) > now)
      );
      
      res.json({
        exists: true,
        user: {
          id: parent.id,
          name: parent.name,
          phone: parent.phone,
          email: parent.email,
          hasActiveSubscription: !!allAccessSubscription,
          subscriptionType: allAccessSubscription?.planType || null,
          subscriptionEnd: allAccessSubscription?.accessEnd || null,
          activeCourseEnrollments: activeCourseEnrollments.length,
          enrolledCourseIds: activeCourseEnrollments.map(e => e.courseId),
        }
      });
    } catch (error) {
      console.error("[WORDPRESS API] Error fetching user by email:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Check if user has access to a specific course
  // Note: course_id from WordPress is the slug (courses.courseId), not the internal ID
  app.get("/api/wordpress/check-access", verifyWordPressApiKey, async (req, res) => {
    try {
      const email = req.query.email as string;
      const courseSlug = req.query.course_id as string; // This is the slug, e.g., "0-6", "intellect"
      
      if (!email) {
        return res.status(400).json({ error: "Email required" });
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      const parent = await storage.getParentByEmail(normalizedEmail);
      
      if (!parent) {
        return res.json({ hasAccess: false, reason: "user_not_found" });
      }
      
      // Get the all-access course ID from database
      const allAccessCourseId = await getAllAccessCourseId();
      
      // Get all enrollments for this parent
      const enrollments = await storage.getEnrollmentsByParentId(parent.id);
      const now = new Date();
      
      // Check for active all-access subscription
      const allAccessSubscription = allAccessCourseId ? enrollments.find(e => 
        e.courseId === allAccessCourseId &&
        e.status === 'active' &&
        (!e.accessEnd || new Date(e.accessEnd) > now)
      ) : null;
      
      if (allAccessSubscription) {
        return res.json({ 
          hasAccess: true, 
          accessType: "subscription",
          subscriptionType: allAccessSubscription.planType,
          expiresAt: allAccessSubscription.accessEnd
        });
      }
      
      // Check for specific course enrollment by translating slug to internal ID
      if (courseSlug) {
        // Translate course slug to internal ID
        const course = await storage.getCourseByCourseId(courseSlug);
        
        if (course) {
          const courseEnrollment = enrollments.find(e => 
            e.courseId === course.id && 
            e.status === 'active' &&
            (!e.accessEnd || new Date(e.accessEnd) > now)
          );
          
          if (courseEnrollment) {
            return res.json({ 
              hasAccess: true, 
              accessType: "enrollment",
              planType: courseEnrollment.planType,
              expiresAt: courseEnrollment.accessEnd
            });
          }
          
          // Check if course is free
          if (course.isFree) {
            return res.json({ hasAccess: true, accessType: "free_course" });
          }
        }
      }
      
      res.json({ hasAccess: false, reason: "no_subscription_or_enrollment" });
    } catch (error) {
      console.error("[WORDPRESS API] Error checking access:", error);
      res.status(500).json({ error: "Failed to check access" });
    }
  });

  // Record a purchase from WordPress (creates enrollment/subscription)
  // Note: course_id from WordPress is the slug (courses.courseId), not the internal ID
  app.post("/api/wordpress/purchase", verifyWordPressApiKey, async (req, res) => {
    try {
      const { 
        email, 
        course_id: courseSlug, // This is the slug, e.g., "0-6", "intellect", "all-access"
        plan_type, // 'monthly', 'yearly', or 'lifetime'
        amount,
        currency,
        payment_method,
        transaction_id
      } = req.body;
      
      console.log(`[WORDPRESS API] Purchase request: email=${email}, course=${courseSlug}, plan=${plan_type}, amount=${amount}, txn=${transaction_id}`);
      
      if (!email) {
        return res.status(400).json({ success: false, error: "Email required" });
      }
      
      if (!plan_type) {
        return res.status(400).json({ success: false, error: "Plan type required" });
      }
      
      if (!courseSlug) {
        return res.status(400).json({ success: false, error: "Course ID required" });
      }
      
      // Find user by email (case-insensitive)
      const normalizedEmail = email.toLowerCase().trim();
      let parent = await storage.getParentByEmail(normalizedEmail);
      
      if (!parent) {
        // Auto-register: create a new account for WordPress purchasers
        const name = req.body.name || normalizedEmail.split('@')[0];
        const tempPassword = await bcrypt.hash(Math.random().toString(36).slice(-12), 10);
        
        parent = await storage.createParent({
          email: normalizedEmail,
          password: tempPassword,
          name: name,
          phone: req.body.phone || null,
          country: null,
          city: null,
          inParentingGroup: false,
        });
        
        console.log(`[WORDPRESS API] Auto-registered new user: ${normalizedEmail}, name: ${name}, id: ${parent.id}`);
      }
      
      // Determine if this is an all-access subscription or specific course
      const isAllAccess = courseSlug === 'all-access';
      let targetCourseId: string;
      let enrollment: any;
      
      // Get existing enrollments to calculate additive access end date
      const existingEnrollments = await storage.getEnrollmentsByParentId(parent.id);
      
      // Find the latest active accessEnd across all enrollments (for additive renewal)
      let baseDate = new Date();
      for (const e of existingEnrollments) {
        if (e.status === 'active' && e.accessEnd && new Date(e.accessEnd) > baseDate) {
          baseDate = new Date(e.accessEnd);
        }
      }
      
      // Calculate subscription/access end date (ADDITIVE - extends from existing end date)
      // Monthly=$15 → 1 bil, Yearly/Dahabi=$114 → 12 bilood, Onetime=$70 → 6 bilood
      const accessEnd = new Date(baseDate);
      if (plan_type === 'monthly') {
        accessEnd.setMonth(accessEnd.getMonth() + 1);
      } else if (plan_type === 'yearly') {
        accessEnd.setFullYear(accessEnd.getFullYear() + 1);
      } else if (plan_type === 'onetime') {
        accessEnd.setMonth(accessEnd.getMonth() + 6);
      } else if (plan_type === 'lifetime') {
        accessEnd.setFullYear(accessEnd.getFullYear() + 99);
      } else {
        accessEnd.setMonth(accessEnd.getMonth() + 6);
      }
      
      console.log(`[WORDPRESS API] Additive renewal: baseDate=${baseDate.toISOString()}, newAccessEnd=${accessEnd.toISOString()}`);
      
      if (isAllAccess) {
        // Enroll user in ALL courses (subscription = all-access)
        const allCourses = await storage.getAllCourses();
        if (allCourses.length === 0) {
          return res.status(500).json({ success: false, error: "No courses configured in the system" });
        }
        
        const normalizedPlan = (plan_type === 'lifetime') ? 'onetime' : plan_type;
        const enrollAccessEnd = (plan_type === 'lifetime') ? null : accessEnd;
        
        for (const course of allCourses) {
          const existing = existingEnrollments.find(e => e.courseId === course.id);
          if (existing) {
            await storage.renewEnrollment(existing.id, normalizedPlan, enrollAccessEnd);
            console.log(`[WORDPRESS API] Updated enrollment for ${email} in ${course.title} (${normalizedPlan})`);
          } else {
            await storage.createEnrollment({
              parentId: parent.id,
              courseId: course.id,
              planType: normalizedPlan,
              status: 'active',
              accessEnd: enrollAccessEnd,
            });
            console.log(`[WORDPRESS API] Enrolled ${email} in ${course.title} (${normalizedPlan})`);
          }
        }
        
        // Use the all-access course ID for payment tracking, fallback to first course
        const allAccessId = await getAllAccessCourseId();
        targetCourseId = allAccessId || allCourses[0].id;
        console.log(`[WORDPRESS API] All-access subscription: enrolled ${email} in ${allCourses.length} courses`);
      } else {
        const course = await storage.getCourseByCourseId(courseSlug);
        if (!course) {
          console.log(`[WORDPRESS API] Course not found: ${courseSlug}`);
          return res.status(404).json({ 
            success: false,
            error: "Course not found",
            message: `No course found with identifier: ${courseSlug}`
          });
        }
        targetCourseId = course.id;
        
        const existingEnrollments = await storage.getEnrollmentsByParentId(parent.id);
        const existingEnrollment = existingEnrollments.find(e => e.courseId === targetCourseId);
        
        if (existingEnrollment) {
          enrollment = await storage.renewEnrollment(
            existingEnrollment.id, 
            plan_type, 
            accessEnd
          );
        } else {
          enrollment = await storage.createEnrollment({
            parentId: parent.id,
            courseId: targetCourseId,
            planType: plan_type,
            status: 'active',
            accessEnd: accessEnd,
          });
        }
      }
      
      // Create payment submission record for admin dashboard tracking
      const planAmounts: Record<string, number> = { monthly: 15, yearly: 114, onetime: 70, lifetime: 70 };
      const submissionAmount = amount || planAmounts[plan_type] || 0;
      
      // Use first real course ID for payment submission (foreign key requires valid course)
      let submissionCourseId = targetCourseId;
      if (targetCourseId === 'all-access-id' || !targetCourseId) {
        const allCourses = await storage.getAllCourses();
        if (allCourses.length > 0) {
          submissionCourseId = allCourses[0].id;
        }
      }
      
      try {
        await storage.createPaymentSubmission({
          courseId: submissionCourseId,
          customerName: parent.name || email.split('@')[0],
          customerPhone: parent.phone || email,
          customerEmail: parent.email,
          planType: plan_type === 'lifetime' ? 'onetime' : plan_type,
          amount: submissionAmount,
          referenceCode: transaction_id || null,
          status: 'approved',
          paymentSource: `wordpress_${payment_method || 'unknown'}`,
          notes: `WordPress payment - ${payment_method || 'unknown'} (auto-approved). Access until: ${accessEnd.toISOString().split('T')[0]}`,
        });
        console.log(`[WORDPRESS API] Payment submission created for admin dashboard: ${email}`);
      } catch (subErr: any) {
        console.error(`[WORDPRESS API] Failed to create payment submission:`, subErr?.message || subErr);
      }

      // Log the WordPress purchase
      console.log(`[WORDPRESS API] Purchase recorded: email=${email}, plan=${plan_type}, courseId=${targetCourseId}`);
      
      res.json({
        success: true,
        message: "Purchase recorded successfully",
        user: {
          id: parent.id,
          name: parent.name,
          email: parent.email,
        },
        enrollment: {
          id: enrollment?.id,
          status: 'active',
          planType: plan_type,
          courseId: targetCourseId,
          isAllAccess: isAllAccess,
          expiresAt: accessEnd,
        }
      });
    } catch (error) {
      console.error("[WORDPRESS API] Error recording purchase:", error);
      res.status(500).json({ error: "Failed to record purchase" });
    }
  });

  // WordPress → App: Verify user password (for WordPress login of app-registered users)
  app.post("/api/wordpress/verify-password", verifyWordPressApiKey, async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ verified: false, error: "Email and password required" });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const parent = await storage.getParentByEmail(normalizedEmail);

      if (!parent) {
        return res.json({ verified: false, error: "User not found" });
      }

      const isValid = parent.password ? await bcrypt.compare(password, parent.password) : false;
      console.log(`[WP-VERIFY] Password verification for ${normalizedEmail}: ${isValid ? 'SUCCESS' : 'FAILED'}`);

      res.json({ verified: isValid });
    } catch (error) {
      console.error("[WP-VERIFY] Error verifying password:", error);
      res.status(500).json({ verified: false, error: "Verification failed" });
    }
  });

  // WordPress → App: Receive new user registrations from WordPress
  app.post("/api/wordpress/sync-user", verifyWordPressApiKey, async (req, res) => {
    try {
      const { email, name, phone, source } = req.body;
      
      if (!email) {
        return res.status(400).json({ success: false, error: "Email required" });
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      console.log(`[WP-SYNC] Receiving user from WordPress: ${normalizedEmail}`);
      
      const existingParent = await storage.getParentByEmail(normalizedEmail);
      
      if (existingParent) {
        console.log(`[WP-SYNC] User already exists in app: ${normalizedEmail}`);
        return res.json({ 
          success: true, 
          action: 'already_exists',
          app_user_id: existingParent.id 
        });
      }
      
      const randomPassword = crypto.randomUUID() + crypto.randomUUID();
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      
      const parent = await storage.createParent({
        email: normalizedEmail,
        password: hashedPassword,
        name: name || normalizedEmail.split('@')[0],
        phone: phone || null,
        country: null,
        city: null,
        inParentingGroup: false,
      });
      
      console.log(`[WP-SYNC] User created in app from WordPress: ${normalizedEmail} (ID: ${parent.id})`);
      
      res.status(201).json({ 
        success: true, 
        action: 'created',
        app_user_id: parent.id 
      });
    } catch (error: any) {
      console.error("[WP-SYNC] Error creating user from WordPress:", error);
      res.status(500).json({ success: false, error: "Failed to create user" });
    }
  });

  // Webhook endpoint for payment providers (Flutterwave, etc.)
  app.post("/api/wordpress/webhook/payment", async (req, res) => {
    try {
      const { event, data } = req.body;
      
      console.log(`[WORDPRESS WEBHOOK] Received: ${event}`, JSON.stringify(data).substring(0, 200));
      
      // Handle Flutterwave webhook
      if (event === 'charge.completed' && data?.status === 'successful') {
        const phone = data.customer?.phone_number || data.meta?.phone;
        const amount = data.amount;
        
        if (phone) {
          const parent = await storage.getParentByPhone(phone);
          
          if (parent) {
            // Determine plan type from amount
            // Monthly=$15 → 1 bil, Yearly/Dahabi=$114 → 12 bilood, Onetime=$70 → 6 bilood
            const planType = amount >= 100 ? 'yearly' : amount >= 50 ? 'onetime' : 'monthly';
            
            const accessEnd = new Date();
            if (planType === 'monthly') {
              accessEnd.setMonth(accessEnd.getMonth() + 1);
            } else if (planType === 'yearly') {
              accessEnd.setFullYear(accessEnd.getFullYear() + 1);
            } else {
              accessEnd.setMonth(accessEnd.getMonth() + 6);
            }
            
            // Get all-access course ID
            const allAccessCourseId = await getAllAccessCourseId();
            
            if (allAccessCourseId) {
              // Check for existing all-access subscription
              const existingEnrollments = await storage.getEnrollmentsByParentId(parent.id);
              const existingSubscription = existingEnrollments.find(e => 
                e.courseId === allAccessCourseId
              );
              
              if (existingSubscription) {
                await storage.renewEnrollment(existingSubscription.id, planType, accessEnd);
              } else {
                const enrollment = await storage.createEnrollment({
                  parentId: parent.id,
                  courseId: allAccessCourseId,
                  planType: planType,
                });
                await storage.renewEnrollment(enrollment.id, planType, accessEnd);
              }
              
              console.log(`[WORDPRESS WEBHOOK] Subscription activated for ${phone}: ${planType}`);
            } else {
              console.error("[WORDPRESS WEBHOOK] All-access course not configured, cannot process subscription");
            }
          }
        }
      }
      
      // Always respond 200 to acknowledge webhook
      res.json({ received: true });
    } catch (error) {
      console.error("[WORDPRESS WEBHOOK] Error:", error);
      res.json({ received: true, error: "Processing failed" });
    }
  });

  // Get all available courses (for WordPress course catalog sync)
  app.get("/api/wordpress/courses", verifyWordPressApiKey, async (req, res) => {
    try {
      const courses = await storage.getAllCourses();
      
      res.json({
        courses: courses.map(c => ({
          id: c.id,
          courseId: c.courseId,
          title: c.title,
          description: c.description,
          imageUrl: c.imageUrl,
          category: c.category,
          isFree: c.isFree,
          isLive: c.isLive,
          duration: c.duration,
          ageRange: c.ageRange,
          priceMonthly: c.priceMonthly,
          priceYearly: c.priceYearly,
          priceOneTime: c.priceOneTime,
        }))
      });
    } catch (error) {
      console.error("[WORDPRESS API] Error fetching courses:", error);
      res.status(500).json({ error: "Failed to fetch courses" });
    }
  });

  // Track all visitors (logged in + anonymous)
  const activeVisitors = new Map<string, number>();

  const cleanupVisitors = () => {
    const now = Date.now();
    for (const [key, lastSeen] of activeVisitors) {
      if (now - lastSeen > 90000) {
        activeVisitors.delete(key);
      }
    }
  };

  app.post("/api/stats/ping", (req, res) => {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    const visitorKey = `${ip}-${req.sessionID || "anon"}`;
    activeVisitors.set(visitorKey, Date.now());
    res.json({ ok: true });
  });

  // Live stats: online visitors + enrolled users count (public endpoint)
  app.get("/api/stats/live", async (req, res) => {
    try {
      cleanupVisitors();
      const loggedInUsers = getOnlineUsers();
      const onlineCount = Math.max(activeVisitors.size, loggedInUsers.length);

      const [enrollmentResult] = await db
        .select({ count: sql<number>`count(distinct ${enrollments.parentId})` })
        .from(enrollments);
      const enrolledCount = Number(enrollmentResult?.count || 0);

      const [totalUsersResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(parents);
      const totalUsers = Number(totalUsersResult?.count || 0);

      res.json({
        onlineCount,
        enrolledCount,
        totalUsers,
      });
    } catch (error) {
      console.error("Error fetching live stats:", error);
      res.json({ onlineCount: 0, enrolledCount: 0, totalUsers: 0 });
    }
  });

  // Health check for WordPress integration
  app.get("/api/wordpress/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      integration: "barbaarintasan-wordpress",
      apiConfigured: !!WORDPRESS_API_KEY
    });
  });


  // ===========================================
  // STRIPE PAYMENT ROUTES
  // ===========================================

  // Test $0.50 checkout - no auth required
  app.get("/api/stripe/test-checkout", async (req, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const baseUrl = process.env.APP_URL || 
        (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'https://appbarbaarintasan.com');
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: 'Tijaabo $1.00' },
            unit_amount: 100,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${baseUrl}/payment-success`,
        cancel_url: `${baseUrl}/golden-membership`,
      });
      
      res.redirect(session.url!);
    } catch (error: any) {
      console.error("[STRIPE] Test checkout error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get Stripe publishable key for frontend
  app.get("/api/stripe/config", async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      console.error("[STRIPE] Failed to get publishable key:", error);
      res.status(500).json({ error: "Stripe not configured" });
    }
  });

  // Create Stripe checkout session for subscription or one-time purchase
  app.post("/api/stripe/create-checkout-session", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { planType, courseId } = req.body;
      
      if (!planType) {
        return res.status(400).json({ error: "Missing plan type" });
      }

      const parent = await storage.getParentById(req.session.parentId);
      if (!parent) {
        return res.status(404).json({ error: "Parent not found" });
      }

      // Fetch pricing from database
      const pricingPlan = await storage.getPricingPlanByType(planType);
      if (!pricingPlan || !pricingPlan.isActive) {
        return res.status(400).json({ error: "Invalid or inactive plan type" });
      }

      const stripe = await getUncachableStripeClient();

      // Get or create Stripe customer
      let customerId = parent.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: parent.email,
          name: parent.name,
          metadata: { parentId: parent.id },
        });
        customerId = customer.id;
        await storage.updateParent(parent.id, { stripeCustomerId: customer.id });
      }

      const baseUrl = process.env.APP_URL || 
        (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'https://appbarbaarintasan.com');
      
      // Use pricing from database
      const isSubscription = pricingPlan.isRecurring;
      
      const lineItem: any = {
        price_data: {
          currency: 'usd',
          product_data: {
            name: pricingPlan.name,
            description: pricingPlan.description || `Barbaarintasan Academy - ${pricingPlan.name}`,
          },
          unit_amount: pricingPlan.priceUsd,
        },
        quantity: 1,
      };
      
      if (isSubscription && pricingPlan.interval) {
        lineItem.price_data.recurring = { interval: pricingPlan.interval as 'month' | 'year' };
      }
      
      const sessionParams: any = {
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [lineItem],
        mode: isSubscription ? 'subscription' : 'payment',
        success_url: `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/golden-membership`,
        metadata: {
          parentId: parent.id,
          planType,
          courseId: courseId || 'all-access',
        },
      };

      const session = await stripe.checkout.sessions.create(sessionParams);

      res.json({ url: session.url, sessionId: session.id });
    } catch (error: any) {
      console.error("[STRIPE] Checkout session creation error:", error?.message || error);
      console.error("[STRIPE] Full error:", JSON.stringify(error, null, 2));
      res.status(500).json({ error: error?.message || "Failed to create checkout session" });
    }
  });

  // Verify Stripe checkout session after successful payment
  app.post("/api/stripe/verify-session", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ error: "Missing session ID" });
      }

      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== 'paid') {
        return res.status(400).json({ error: "Payment not completed" });
      }

      const parent = await storage.getParentById(req.session.parentId);
      if (!parent) {
        return res.status(404).json({ error: "Parent not found" });
      }

      const planType = session.metadata?.planType;
      const courseId = session.metadata?.courseId;

      // Calculate access period
      // Monthly=$15 → 1 bil, Yearly/Dahabi=$114 → 12 bilood, Onetime=$70 → 6 bilood
      const now = new Date();
      let accessEnd: Date;
      if (planType === "yearly") {
        accessEnd = new Date(now);
        accessEnd.setFullYear(accessEnd.getFullYear() + 1);
      } else if (planType === "monthly") {
        accessEnd = new Date(now);
        accessEnd.setMonth(accessEnd.getMonth() + 1);
      } else {
        accessEnd = new Date(now);
        accessEnd.setMonth(accessEnd.getMonth() + 6);
      }

      // Update Stripe subscription ID if it's a subscription
      if (session.subscription) {
        await storage.updateParent(parent.id, { 
          stripeSubscriptionId: session.subscription as string 
        });
      }

      // Create enrollment
      if (courseId && courseId !== 'all-access') {
        await storage.createEnrollment({
          parentId: parent.id,
          courseId: courseId,
          planType: planType || 'one-time',
          accessEnd: accessEnd,
          status: "active",
          amountPaid: (session.amount_total! / 100).toString(),
        });
      } else {
        // All-access subscription - enroll in all courses
        const courses = await storage.getAllCourses();
        for (const course of courses) {
          const existing = await storage.getEnrollmentByParentAndCourse(parent.id, course.id);
          if (!existing) {
            await storage.createEnrollment({
              parentId: parent.id,
              courseId: course.id,
              planType: planType || 'subscription',
              accessEnd: accessEnd,
              status: "active",
              amountPaid: (session.amount_total! / 100).toString(),
            });
          }
        }
      }

      console.log(`[STRIPE] Payment verified and enrollment created for parent ${parent.id}`);

      // Send confirmation email
      try {
        await sendPurchaseConfirmationEmail(
          parent.email,
          parent.name || "Waalid",
          courseId === 'all-access' ? "Dhammaan Koorsooyinka" : "Koorsada",
          planType || "one-time",
          session.amount_total! / 100,
          undefined
        );
      } catch (emailError) {
        console.error("[STRIPE] Failed to send confirmation email:", emailError);
      }

      res.json({ 
        success: true, 
        message: "Payment verified successfully",
        accessEnd: accessEnd.toISOString()
      });
    } catch (error) {
      console.error("[STRIPE] Session verification error:", error);
      res.status(500).json({ error: "Failed to verify payment" });
    }
  });

  // Get Stripe customer portal URL for subscription management
  app.post("/api/stripe/customer-portal", async (req, res) => {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const parent = await storage.getParentById(req.session.parentId);
      if (!parent || !parent.stripeCustomerId) {
        return res.status(404).json({ error: "No Stripe customer found" });
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = process.env.APP_URL || 
        (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'https://appbarbaarintasan.com');

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: parent.stripeCustomerId,
        return_url: `${baseUrl}/profile`,
      });

      res.json({ url: portalSession.url });
    } catch (error) {
      console.error("[STRIPE] Customer portal error:", error);
      res.status(500).json({ error: "Failed to create portal session" });
    }
  });

  // ==================== GOOGLE MEET EVENTS ====================

  app.get("/api/meet-events", async (req, res) => {
    try {
      const events = await getCached('meet-events', 60000, () => storage.getActiveGoogleMeetEvents());
      res.json(events);
    } catch (error) {
      console.error("Error fetching meet events:", error);
      res.status(500).json({ error: "Failed to fetch meet events" });
    }
  });

  app.get("/api/admin/meet-events", requireAuth, async (req, res) => {
    try {
      const events = await storage.getGoogleMeetEvents();
      res.json(events);
    } catch (error) {
      console.error("Error fetching meet events:", error);
      res.status(500).json({ error: "Failed to fetch meet events" });
    }
  });

  app.post("/api/admin/meet-events", requireAuth, async (req, res) => {
    try {
      const { title, description, meetLink, eventDate, startTime, endTime, isActive } = req.body;
      if (!title || !meetLink || !eventDate || !startTime || !endTime) {
        return res.status(400).json({ error: "Title, meet link, date, start time, and end time are required" });
      }
      const { mediaType, mediaTitle, driveFileId } = req.body;
      const event = await storage.createGoogleMeetEvent({
        title,
        description: description || null,
        meetLink,
        eventDate,
        startTime,
        endTime,
        isActive: isActive !== undefined ? isActive : true,
        mediaType: mediaType || "video",
        mediaTitle: mediaTitle || null,
        driveFileId: driveFileId || null,
      });
      apiCache.delete('meet-events');
      res.json(event);
    } catch (error) {
      console.error("Error creating meet event:", error);
      res.status(500).json({ error: "Failed to create meet event" });
    }
  });

  app.patch("/api/admin/meet-events/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const event = await storage.updateGoogleMeetEvent(id, req.body);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      apiCache.delete('meet-events');
      res.json(event);
    } catch (error) {
      console.error("Error updating meet event:", error);
      res.status(500).json({ error: "Failed to update meet event" });
    }
  });

  app.get("/api/meet-events/:id/stream", async (req, res) => {
    try {
      const { id } = req.params;
      const event = await storage.getGoogleMeetEvent(id);
      if (!event || !event.driveFileId) {
        return res.status(404).json({ error: "Media not found" });
      }

      const { streamVideoFile, streamAudioFile } = await import("./google-drive");

      if (event.mediaType === "audio") {
        const result = await streamAudioFile(event.driveFileId);
        if (!result) return res.status(502).json({ error: "Failed to stream audio" });
        res.set({
          "Content-Type": result.mimeType,
          "Accept-Ranges": "bytes",
          "Cache-Control": "private, max-age=3600",
        });
        if (result.size) res.set("Content-Length", result.size);
        (result.stream as any).pipe(res);
      } else {
        const rangeHeader = req.headers.range;
        const result = await streamVideoFile(event.driveFileId, rangeHeader);
        if (!result) return res.status(502).json({ error: "Failed to stream video" });

        if (result.isPartial && result.start !== undefined && result.end !== undefined) {
          res.writeHead(206, {
            "Content-Type": result.mimeType,
            "Content-Range": `bytes ${result.start}-${result.end}/${result.size}`,
            "Content-Length": result.end - result.start + 1,
            "Accept-Ranges": "bytes",
            "Cache-Control": "private, max-age=3600",
          });
        } else {
          res.writeHead(200, {
            "Content-Type": result.mimeType,
            "Content-Length": result.size,
            "Accept-Ranges": "bytes",
            "Cache-Control": "private, max-age=3600",
          });
        }
        (result.stream as any).pipe(res);
      }
    } catch (error) {
      console.error("Error streaming meet media:", error);
      if (!res.headersSent) res.status(500).json({ error: "Failed to stream media" });
    }
  });

  app.get("/api/meet-events/archived", async (req, res) => {
    try {
      const events = await storage.getArchivedGoogleMeetEvents();
      res.json(events);
    } catch (error) {
      console.error("Error fetching archived meet events:", error);
      res.status(500).json({ error: "Failed to fetch archived events" });
    }
  });

  app.get("/api/meet-events/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const event = await storage.getGoogleMeetEvent(id);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Error fetching meet event:", error);
      res.status(500).json({ error: "Failed to fetch meet event" });
    }
  });

  app.post("/api/admin/meet-events/:id/archive", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const event = await storage.archiveGoogleMeetEvent(id);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      apiCache.delete('meet-events');
      res.json(event);
    } catch (error) {
      console.error("Error archiving meet event:", error);
      res.status(500).json({ error: "Failed to archive event" });
    }
  });

  app.delete("/api/admin/meet-events/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteGoogleMeetEvent(id);
      apiCache.delete('meet-events');
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting meet event:", error);
      res.status(500).json({ error: "Failed to delete meet event" });
    }
  });

  // ==================== SSO TOKEN SYSTEM ====================
  // Generate one-time SSO token for WordPress auto-login
  app.post("/api/sso/generate-token", async (req, res) => {
    if (!req.session?.parentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const parent = await storage.getParent(req.session.parentId);
      if (!parent) {
        return res.status(404).json({ error: "User not found" });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await db.insert(ssoTokens).values({
        token,
        userId: 0,
        email: parent.email,
        name: parent.name,
        expiresAt,
      });

      const ssoUrl = `https://barbaarintasan.com/wp-json/bsa/v1/sso-login?token=${token}&redirect=${encodeURIComponent('https://barbaarintasan.com/koorso-iibso/')}`;

      console.log(`[SSO] Token generated for user ${parent.email}, expires in 10 minutes`);
      res.json({ url: ssoUrl });
    } catch (error) {
      console.error("[SSO] Error generating token:", error);
      res.status(500).json({ error: "Failed to generate SSO token" });
    }
  });

  // WordPress calls this to validate SSO token
  app.post("/api/sso/validate-token", async (req, res) => {
    const apiKey = process.env.WORDPRESS_API_KEY;
    const requestKey = req.headers['x-api-key'] as string;

    if (!apiKey || requestKey !== apiKey) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Token required" });
    }

    try {
      const [ssoToken] = await db.select().from(ssoTokens)
        .where(and(
          eq(ssoTokens.token, token),
          eq(ssoTokens.used, false),
        ))
        .limit(1);

      if (!ssoToken) {
        return res.status(404).json({ error: "Token not found or already used" });
      }

      if (new Date() > ssoToken.expiresAt) {
        await db.update(ssoTokens).set({ used: true }).where(eq(ssoTokens.id, ssoToken.id));
        return res.status(410).json({ error: "Token expired" });
      }

      await db.update(ssoTokens).set({ used: true }).where(eq(ssoTokens.id, ssoToken.id));

      console.log(`[SSO] Token validated for user ${ssoToken.email}`);
      res.json({
        email: ssoToken.email,
        name: ssoToken.name,
        user_id: ssoToken.userId,
      });
    } catch (error) {
      console.error("[SSO] Error validating token:", error);
      res.status(500).json({ error: "Failed to validate token" });
    }
  });

  // ==================== WORDPRESS PAYMENT DATA EXPORT ====================
  app.get("/api/wordpress/export-payments", async (req, res) => {
    const apiKey = process.env.WORDPRESS_API_KEY;
    const requestKey = (req.headers['x-wordpress-api-key'] || req.headers['x-api-key']) as string;

    if (!apiKey || requestKey !== apiKey) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const submissions = await storage.getAllPaymentSubmissions();
      
      const allCourses = await storage.getAllCourses();
      const allMethods = await storage.getActivePaymentMethods();
      
      const courseMap: Record<string, string> = {};
      allCourses.forEach((c: any) => { courseMap[c.id] = c.title; });
      const methodMap: Record<string, string> = {};
      allMethods.forEach((m: any) => { methodMap[m.id] = m.name; });
      
      const exportData = submissions.map((s: any) => ({
        id: s.id,
        customerName: s.customerName,
        customerPhone: s.customerPhone,
        customerEmail: s.customerEmail,
        courseId: s.courseId,
        courseName: courseMap[s.courseId] || s.courseId,
        planType: s.planType,
        amount: s.amount,
        referenceCode: s.referenceCode,
        screenshotUrl: s.screenshotUrl,
        status: s.status,
        notes: s.notes,
        paymentSource: s.paymentSource || 'manual',
        paymentMethodId: s.paymentMethodId,
        paymentMethodName: s.paymentMethodId ? (methodMap[s.paymentMethodId] || null) : null,
        stripeSessionId: s.stripeSessionId,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        reviewedAt: s.reviewedAt,
      }));

      res.json({
        success: true,
        count: exportData.length,
        payments: exportData,
      });
    } catch (error) {
      console.error("[WP-EXPORT] Error exporting payments:", error);
      res.status(500).json({ error: "Failed to export payments" });
    }
  });

  // ==================== WORDPRESS PAYMENT WEBHOOK ====================
  // WordPress calls this after successful payment to enroll user
  app.post("/api/webhook/wordpress-payment", async (req, res) => {
    const apiKey = process.env.WORDPRESS_API_KEY;
    const requestKey = (req.headers['x-wordpress-api-key'] || req.headers['x-api-key']) as string;

    if (!apiKey || requestKey !== apiKey) {
      console.log(`[WP-WEBHOOK] Auth failed. Expected key exists: ${!!apiKey}, Received key: ${requestKey ? 'yes' : 'no'}`);
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { email, plan_type, course_id, amount, payment_method, transaction_id, name: userName } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email required" });
    }

    try {
      const normalizedEmail = email.toLowerCase().trim();
      let [parent] = await db.select().from(parents)
        .where(eq(parents.email, normalizedEmail))
        .limit(1);

      if (!parent && userName) {
        const tempPassword = await bcrypt.hash(Math.random().toString(36).slice(-12), 10);
        parent = await storage.createParent({
          email: normalizedEmail,
          password: tempPassword,
          name: userName,
          phone: null,
          country: null,
          city: null,
          inParentingGroup: false,
        });
        console.log(`[WP-WEBHOOK] Auto-registered user: ${normalizedEmail}`);
      }

      if (!parent) {
        console.log(`[WP-WEBHOOK] User not found in app: ${normalizedEmail}`);
        return res.status(404).json({ error: "User not found" });
      }

      console.log(`[WP-WEBHOOK] Processing payment for ${normalizedEmail}: plan=${plan_type}, course=${course_id}`);

      const now = new Date();
      
      // Find the latest active accessEnd across all enrollments (for additive renewal)
      const existingParentEnrollments = await db.select().from(enrollments)
        .where(and(
          eq(enrollments.parentId, parent.id),
          eq(enrollments.status, 'active')
        ));
      
      let baseDate = new Date();
      for (const e of existingParentEnrollments) {
        if (e.accessEnd && new Date(e.accessEnd) > baseDate) {
          baseDate = new Date(e.accessEnd);
        }
      }

      if (plan_type === 'yearly' || plan_type === 'monthly') {
        // ADDITIVE: extend from existing end date if still active
        const expiresAt = new Date(baseDate);
        if (plan_type === 'yearly') {
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        } else {
          expiresAt.setMonth(expiresAt.getMonth() + 1);
        }

        console.log(`[WP-WEBHOOK] Additive renewal: baseDate=${baseDate.toISOString()}, newAccessEnd=${expiresAt.toISOString()}`);

        const allCourses = await db.select().from(courses);

        for (const course of allCourses) {
          const existingEnrollment = await db.select().from(enrollments)
            .where(and(
              eq(enrollments.parentId, parent.id),
              eq(enrollments.courseId, course.id),
            ))
            .limit(1);

          if (existingEnrollment.length === 0) {
            await db.insert(enrollments).values({
              parentId: parent.id,
              courseId: course.id,
              planType: plan_type,
              accessStart: now,
              accessEnd: expiresAt,
              status: 'active',
            });
            console.log(`[WP-WEBHOOK] Enrolled ${normalizedEmail} in course ${course.title} (${plan_type})`);
          } else {
            await db.update(enrollments).set({
              planType: plan_type,
              accessStart: now,
              accessEnd: expiresAt,
              status: 'active',
            }).where(eq(enrollments.id, existingEnrollment[0].id));
            console.log(`[WP-WEBHOOK] Updated enrollment for ${normalizedEmail} in course ${course.title} (${plan_type})`);
          }
        }

        console.log(`[WP-WEBHOOK] All-access subscription activated for ${normalizedEmail}: ${plan_type}, expires ${expiresAt.toISOString()}`);
      } else if (plan_type === 'onetime') {
        // Onetime=$70 → 6 bilood (ADDITIVE)
        const onetimeExpiry = new Date(baseDate);
        onetimeExpiry.setMonth(onetimeExpiry.getMonth() + 6);

        console.log(`[WP-WEBHOOK] Additive onetime: baseDate=${baseDate.toISOString()}, newAccessEnd=${onetimeExpiry.toISOString()}`);

        const allCourses = await db.select().from(courses);

        for (const course of allCourses) {
          const existingEnrollment = await db.select().from(enrollments)
            .where(and(
              eq(enrollments.parentId, parent.id),
              eq(enrollments.courseId, course.id),
            ))
            .limit(1);

          if (existingEnrollment.length === 0) {
            await db.insert(enrollments).values({
              parentId: parent.id,
              courseId: course.id,
              planType: 'onetime',
              accessStart: now,
              accessEnd: onetimeExpiry,
              status: 'active',
            });
          } else {
            await db.update(enrollments).set({
              planType: 'onetime',
              status: 'active',
              accessStart: now,
              accessEnd: onetimeExpiry,
            }).where(eq(enrollments.id, existingEnrollment[0].id));
          }
        }

        console.log(`[WP-WEBHOOK] 6-month access activated for ${normalizedEmail} (${allCourses.length} courses), expires ${onetimeExpiry.toISOString()}`);
      } else if (plan_type === 'lifetime') {
        // Lifetime = weligaa
        const allCourses = await db.select().from(courses);

        for (const course of allCourses) {
          const existingEnrollment = await db.select().from(enrollments)
            .where(and(
              eq(enrollments.parentId, parent.id),
              eq(enrollments.courseId, course.id),
            ))
            .limit(1);

          if (existingEnrollment.length === 0) {
            await db.insert(enrollments).values({
              parentId: parent.id,
              courseId: course.id,
              planType: 'onetime',
              accessStart: now,
              accessEnd: null,
              status: 'active',
            });
          } else {
            await db.update(enrollments).set({
              planType: 'onetime',
              status: 'active',
              accessEnd: null,
            }).where(eq(enrollments.id, existingEnrollment[0].id));
          }
        }

        console.log(`[WP-WEBHOOK] Lifetime all-access activated for ${normalizedEmail} (${allCourses.length} courses)`);
      }

      // Create payment submission for admin dashboard tracking
      try {
        // Use a valid course ID for the foreign key - fallback to first real course
        let submissionCourseId: string | null = null;
        const allAccessCourseId = await getAllAccessCourseId();
        if (allAccessCourseId) {
          submissionCourseId = allAccessCourseId;
        } else {
          const allCoursesList = await storage.getAllCourses();
          if (allCoursesList.length > 0) {
            submissionCourseId = allCoursesList[0].id;
          }
        }
        
        // Calculate the actual accessEnd for notes
        const webhookAccessEnd = plan_type === 'monthly' 
          ? new Date(new Date(baseDate).setMonth(baseDate.getMonth() + 1))
          : plan_type === 'yearly' 
            ? new Date(new Date(baseDate).setFullYear(baseDate.getFullYear() + 1))
            : plan_type === 'onetime'
              ? new Date(new Date(baseDate).setMonth(baseDate.getMonth() + 6))
              : null;
        
        if (submissionCourseId) {
          await storage.createPaymentSubmission({
            courseId: submissionCourseId,
            customerName: parent.name || userName || normalizedEmail.split('@')[0],
            customerPhone: parent.phone || normalizedEmail,
            customerEmail: normalizedEmail,
            planType: plan_type === 'lifetime' ? 'onetime' : plan_type,
            amount: amount || 0,
            referenceCode: transaction_id || null,
            paymentSource: `wordpress_${payment_method || 'webhook'}`,
            notes: `WordPress webhook payment - ${payment_method || 'unknown'}. Access until: ${webhookAccessEnd ? webhookAccessEnd.toISOString().split('T')[0] : 'lifetime'}`,
          });
          console.log(`[WP-WEBHOOK] Payment submission created for admin dashboard: ${normalizedEmail}, amount: ${amount}`);
        }
      } catch (subErr: any) {
        console.error(`[WP-WEBHOOK] Failed to create payment submission:`, subErr?.message || subErr);
      }

      res.json({ success: true, message: "Payment processed successfully" });
    } catch (error) {
      console.error("[WP-WEBHOOK] Error processing payment webhook:", error);
      res.status(500).json({ error: "Failed to process payment" });
    }
  });

  const httpServer = createServer(app);

  initializeWebSocket(httpServer);

  return httpServer;
}
