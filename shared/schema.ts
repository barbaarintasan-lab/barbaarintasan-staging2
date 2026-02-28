import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, real, uniqueIndex, date, serial } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for admin authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  picture: text("picture"),
});

// Courses table
export const courses = pgTable("courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  courseId: text("course_id").notNull().unique(), // e.g., "0-6", "intellect"
  description: text("description"),
  imageUrl: text("image_url"),
  category: text("category").notNull(), // "special" or "general"
  isLive: boolean("is_live").notNull().default(false),
  isFree: boolean("is_free").notNull().default(false),
  duration: text("duration"),
  order: integer("order").notNull().default(0),
  // Pricing fields (stored as whole dollars, e.g., 95 = $95)
  priceOneTime: integer("price_one_time"), // One-time purchase price
  priceMonthly: integer("price_monthly"), // Monthly subscription price
  priceYearly: integer("price_yearly"), // Yearly subscription price
  // Age range filter field
  ageRange: text("age_range"), // "0-6", "6-12", "1-2", "2-4", "4-6", "all" or null for special courses
  // Content readiness - controls whether enrolled parents can access course content
  contentReady: boolean("content_ready").notNull().default(false), // Admin sets true when content is uploaded
  // Custom coming soon message for popup
  comingSoonMessage: text("coming_soon_message"),
});

// Modules table (sections within a course)
export const modules = pgTable("modules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(), // e.g., "Hordhaca", "Qaybta 2aad - Cuntada"
  order: integer("order").notNull().default(0),
});

// Lessons table
export const lessons = pgTable("lessons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  videoUrl: text("video_url"), // YouTube/Vimeo embed URL
  textContent: text("text_content"), // HTML or markdown content
  order: integer("order").notNull().default(0),
  duration: text("duration"),
  moduleNumber: integer("module_number"), // Legacy - kept for backward compatibility
  moduleId: varchar("module_id").references(() => modules.id, { onDelete: "set null" }), // New module reference
  isLive: boolean("is_live").notNull().default(false), // Is this a live session?
  liveUrl: text("live_url"), // Google Meet or Zoom link
  liveDate: text("live_date"), // Date/time of the live session (e.g., "17.1.2026 oo Sabti ah")
  liveTimezone: text("live_timezone").default("Africa/Mogadishu"), // IANA timezone for the live session
  lessonType: text("lesson_type").default("video"), // video, text, quiz, assignment, live
  assignmentRequirements: text("assignment_requirements"), // What the admin wants the student to do
  unlockType: text("unlock_type").default("immediate"), // immediate, date, days_after_enrollment, days_after_previous
  unlockDate: text("unlock_date"), // Specific date when lesson unlocks (YYYY-MM-DD)
  unlockDaysAfter: integer("unlock_days_after"), // Days after enrollment or previous lesson completion
  videoWatchRequired: boolean("video_watch_required").default(true), // Must watch video before marking complete
  isFree: boolean("is_free").notNull().default(false), // Free trial lesson - accessible without enrollment
  audioUrl: text("audio_url"), // TTS audio URL (Azure Ubax/Muuse voice)
  voiceName: text("voice_name"), // "ubax" or "muuse" - which voice reads the lesson
});

// Quizzes table
export const quizzes = pgTable("quizzes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lessonId: varchar("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  passingScore: integer("passing_score").notNull().default(70), // Percentage
  order: integer("order").notNull().default(0),
});

// Quiz Questions table
export const quizQuestions = pgTable("quiz_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quizId: varchar("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  questionType: text("question_type").notNull().default("multiple_choice"), // "multiple_choice" or "open_ended"
  options: text("options"), // JSON array of options (null for open_ended)
  correctAnswer: integer("correct_answer"), // Index of correct option (null for open_ended)
  explanation: text("explanation"), // Optional explanation
  order: integer("order").notNull().default(0),
});

// Assignments table (homework/tasks for parents to complete)
export const assignments = pgTable("assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lessonId: varchar("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"), // Instructions for the assignment
  order: integer("order").notNull().default(0),
});

// Lesson Images table (AI-generated educational images for lessons)
export const lessonImages = pgTable("lesson_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lessonId: varchar("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(), // Object storage path or URL
  prompt: text("prompt").notNull(), // The prompt used to generate the image
  caption: text("caption"), // Optional caption/description for the image
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLessonImageSchema = createInsertSchema(lessonImages).omit({
  id: true,
  createdAt: true,
});

export type InsertLessonImage = z.infer<typeof insertLessonImageSchema>;
export type LessonImage = typeof lessonImages.$inferSelect;

// Manual Payment Methods table (EVC, Zaad, Bank, etc.)
export const paymentMethods = pgTable("payment_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // e.g., "EVC Plus", "Zaad", "Bank Transfer"
  instructions: text("instructions").notNull(), // Payment instructions with account details
  accountNumber: text("account_number"), // Phone/account number to pay to
  category: text("category").notNull().default("taaj"), // "taaj" or "dahab-shiil"
  isActive: boolean("is_active").notNull().default(true),
  order: integer("order").notNull().default(0),
});

// Payment Submissions table (track manual payment requests)
export const paymentSubmissions = pgTable("payment_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email"),
  paymentMethodId: varchar("payment_method_id").references(() => paymentMethods.id), // Optional for Stripe payments
  planType: text("plan_type").notNull(), // "onetime", "monthly", "yearly"
  amount: integer("amount").notNull(), // Amount in USD
  referenceCode: text("reference_code"), // Transaction reference
  screenshotUrl: text("screenshot_url"), // Payment screenshot URL
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  notes: text("notes"), // Admin notes
  isRenewal: boolean("is_renewal").notNull().default(false), // Whether this is a subscription renewal
  existingAccessEnd: timestamp("existing_access_end"), // Store existing access end date for renewals
  paymentSource: text("payment_source").default("manual"), // "manual" or "stripe"
  stripeSessionId: text("stripe_session_id"), // Stripe checkout session ID
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
});

// Receipt Fingerprints table (prevent duplicate receipt usage)
export const receiptFingerprints = pgTable("receipt_fingerprints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").references(() => parents.id, { onDelete: "cascade" }),
  paymentSubmissionId: varchar("payment_submission_id").references(() => paymentSubmissions.id, { onDelete: "set null" }),
  normalizedReference: text("normalized_reference"), // Uppercase, no spaces/dashes
  transactionDate: text("transaction_date"), // Date extracted from receipt (YYYY-MM-DD)
  transactionTime: text("transaction_time"), // Time extracted from receipt if available
  amountCents: integer("amount_cents"), // Amount in cents for precise matching
  senderName: text("sender_name"), // Name of person who sent the payment
  senderPhone: text("sender_phone"), // Phone number of sender (normalized)
  paymentMethodId: varchar("payment_method_id").references(() => paymentMethods.id),
  status: text("status").notNull().default("approved"), // approved, pending, rejected
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertReceiptFingerprintSchema = createInsertSchema(receiptFingerprints).omit({
  id: true,
  createdAt: true,
});

export type InsertReceiptFingerprint = z.infer<typeof insertReceiptFingerprintSchema>;
export type ReceiptFingerprint = typeof receiptFingerprints.$inferSelect;

// Receipt Attempts table (track failed receipt upload attempts per parent per course)
export const receiptAttempts = pgTable("receipt_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  attemptCount: integer("attempt_count").notNull().default(0),
  lastAttemptAt: timestamp("last_attempt_at").notNull().defaultNow(),
});

export const insertReceiptAttemptSchema = createInsertSchema(receiptAttempts).omit({
  id: true,
});

export type InsertReceiptAttempt = z.infer<typeof insertReceiptAttemptSchema>;
export type ReceiptAttempt = typeof receiptAttempts.$inferSelect;

// Parent users table (for email/password login)
export const parents = pgTable("parents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  googleId: text("google_id").unique(),
  email: text("email").notNull().unique(),
  password: text("password"),
  name: text("name").notNull(),
  picture: text("picture"),
  phone: text("phone"),
  country: text("country"),
  city: text("city"),
  isAdmin: boolean("is_admin").notNull().default(false),
  whatsappOptin: boolean("whatsapp_optin").notNull().default(false),
  whatsappNumber: text("whatsapp_number"),
  telegramOptin: boolean("telegram_optin").notNull().default(false),
  telegramChatId: text("telegram_chat_id"),
  inParentingGroup: boolean("in_parenting_group").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastStreakDate: text("last_streak_date"),
  points: integer("points").notNull().default(0),
  dailyReminderEnabled: boolean("daily_reminder_enabled").notNull().default(false),
  dailyReminderTime: text("daily_reminder_time"),
  canHostSheeko: boolean("can_host_sheeko").notNull().default(false),
  // Single-session enforcement & login tracking
  lastLoginIp: text("last_login_ip"),
  lastLoginDevice: text("last_login_device"),
  activeSessionId: text("active_session_id"), // Current valid session - others are invalidated
  // Community terms acceptance for App Store compliance
  hasAcceptedCommunityTerms: boolean("has_accepted_community_terms").notNull().default(false),
  communityTermsAcceptedAt: timestamp("community_terms_accepted_at"),
  // Stripe payment integration
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  // AI Membership plan: free | trial | gold
  aiPlan: text("ai_plan").notNull().default("free"),
  aiTrialStartedAt: timestamp("ai_trial_started_at"),
  aiTrialEndsAt: timestamp("ai_trial_ends_at"),
  aiGoldExpiresAt: timestamp("ai_gold_expires_at"),
  lastActiveAt: timestamp("last_active_at"),
  lastEngagementNotifiedAt: timestamp("last_engagement_notified_at"),
});

// User blocks table (for community safety - users can block each other)
export const userBlocks = pgTable("user_blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  blockerId: varchar("blocker_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  blockedId: varchar("blocked_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserBlockSchema = createInsertSchema(userBlocks).omit({ id: true, createdAt: true });
export type InsertUserBlock = z.infer<typeof insertUserBlockSchema>;
export type UserBlock = typeof userBlocks.$inferSelect;

// Password Reset Tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Testimonials table (parent feedback)
export const testimonials = pgTable("testimonials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  location: text("location"),
  courseTag: text("course_tag"),
  profileImage: text("profile_image"),
  parentId: varchar("parent_id").references(() => parents.id),
  rating: integer("rating").notNull().default(5),
  message: text("message").notNull(),
  isPublished: boolean("is_published").notNull().default(true),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Testimonial Reactions table (emoji reactions on testimonials)
export const testimonialReactions = pgTable("testimonial_reactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  testimonialId: varchar("testimonial_id").notNull().references(() => testimonials.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  reactionType: text("reaction_type").notNull(), // 'thumbsup', 'heart', 'clap', 'pray'
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("testimonial_parent_reaction_unique").on(table.testimonialId, table.parentId),
]);

export const insertTestimonialReactionSchema = createInsertSchema(testimonialReactions).omit({ id: true, createdAt: true });
export type InsertTestimonialReaction = z.infer<typeof insertTestimonialReactionSchema>;
export type TestimonialReaction = typeof testimonialReactions.$inferSelect;

// Enrollments table (track course access)
export const enrollments = pgTable("enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerPhone: text("customer_phone"), // Legacy - still used for non-logged-in users
  parentId: varchar("parent_id").references(() => parents.id), // Link to parent account
  courseId: varchar("course_id").notNull().references(() => courses.id),
  planType: text("plan_type").notNull(),
  accessStart: timestamp("access_start").notNull().defaultNow(),
  accessEnd: timestamp("access_end"), // null = lifetime access
  status: text("status").notNull().default("active"), // active, expired, past_due, cancelled
  paymentSubmissionId: varchar("payment_submission_id").references(() => paymentSubmissions.id),
  amountPaid: text("amount_paid"), // Amount paid for this enrollment
  reminder7DaySent: timestamp("reminder_7_day_sent"),
  reminder3DaySent: timestamp("reminder_3_day_sent"),
  reminder25HourSent: timestamp("reminder_25_hour_sent"),
  lastRenewalReminder: timestamp("last_renewal_reminder"),
  upgradeBannerLastShown: timestamp("upgrade_banner_last_shown"), // When banner was last shown
  upgradeBannerCount: integer("upgrade_banner_count").notNull().default(0), // Times shown in current period (max 3)
  upgradeBannerLastWindow: integer("upgrade_banner_last_window"), // Last window index shown (-1 or null = none, 0/1/2 = window)
  // Scheduling fields for "0-6 Months" course (max 2 lessons/day, max 4 lessons/week)
  firstLessonAt: timestamp("first_lesson_at"), // When parent started first lesson
  lessonsThisWeek: integer("lessons_this_week").notNull().default(0), // Lessons completed this week (max 4)
  weekStartDate: timestamp("week_start_date"), // Start of current tracking week
  lessonsToday: integer("lessons_today").notNull().default(0), // Lessons completed today (max 2)
  lastLessonDate: timestamp("last_lesson_date"), // Date of last lesson completion
});

// Assignment Submissions table
export const assignmentSubmissions = pgTable("assignment_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assignmentId: varchar("assignment_id").notNull().references(() => assignments.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id").notNull().references(() => parents.id),
  content: text("content").notNull(), // The student's submission text
  status: text("status").notNull().default("pending"), // pending, approved, revision_needed
  feedback: text("feedback"), // Admin's feedback on the submission
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

// Relations
export const coursesRelations = relations(courses, ({ many }) => ({
  lessons: many(lessons),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  course: one(courses, {
    fields: [lessons.courseId],
    references: [courses.id],
  }),
  quizzes: many(quizzes),
}));

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  lesson: one(lessons, {
    fields: [quizzes.lessonId],
    references: [lessons.id],
  }),
  questions: many(quizQuestions),
}));

export const quizQuestionsRelations = relations(quizQuestions, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [quizQuestions.quizId],
    references: [quizzes.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
});

export const insertModuleSchema = createInsertSchema(modules).omit({
  id: true,
});

export const insertLessonSchema = createInsertSchema(lessons).omit({
  id: true,
});

export const insertQuizSchema = createInsertSchema(quizzes).omit({
  id: true,
});

export const insertQuizQuestionSchema = createInsertSchema(quizQuestions).omit({
  id: true,
});

export const insertAssignmentSchema = createInsertSchema(assignments).omit({
  id: true,
});

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({
  id: true,
});

export const insertPaymentSubmissionSchema = createInsertSchema(paymentSubmissions).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
  reviewedBy: true,
  status: true,
});

export const insertEnrollmentSchema = createInsertSchema(enrollments).omit({
  id: true,
  accessStart: true,
});

export const insertParentSchema = createInsertSchema(parents).omit({
  id: true,
  createdAt: true,
  lastLoginAt: true,
  points: true,
  aiPlan: true,
  aiTrialStartedAt: true,
  aiTrialEndsAt: true,
  aiGoldExpiresAt: true,
});

export const insertTestimonialSchema = createInsertSchema(testimonials).omit({
  id: true,
  createdAt: true,
});

export const insertAssignmentSubmissionSchema = createInsertSchema(assignmentSubmissions).omit({
  id: true,
  submittedAt: true,
  reviewedAt: true,
  status: true,
  feedback: true,
});

// Lesson Progress table (track completed lessons per parent)
export const lessonProgress = pgTable("lesson_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id),
  lessonId: varchar("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  courseId: varchar("course_id").notNull().references(() => courses.id),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  videoWatchedPercent: integer("video_watched_percent").default(0), // Percentage of video watched (0-100)
  videoWatchedAt: timestamp("video_watched_at"), // When video was marked as watched
  videoPosition: integer("video_position").default(0), // Current video position in seconds for resume
  lastViewedAt: timestamp("last_viewed_at"), // When the lesson page was last opened
});

// Course Reviews table (ratings and reviews from parents)
export const courseReviews = pgTable("course_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id").notNull().references(() => parents.id),
  rating: integer("rating").notNull(), // 1-5 stars
  review: text("review"), // Optional review text
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCourseReviewSchema = createInsertSchema(courseReviews).omit({
  id: true,
  createdAt: true,
});

export type InsertCourseReview = z.infer<typeof insertCourseReviewSchema>;
export type CourseReview = typeof courseReviews.$inferSelect;

export const insertLessonProgressSchema = createInsertSchema(lessonProgress).omit({
  id: true,
  completedAt: true,
});

export type InsertLessonProgress = z.infer<typeof insertLessonProgressSchema>;
export type LessonProgress = typeof lessonProgress.$inferSelect;

// Support Messages table (for chat support)
export const supportMessages = pgTable("support_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").references(() => parents.id),
  sessionId: text("session_id"),
  guestName: text("guest_name"),
  guestEmail: text("guest_email"),
  guestPhone: text("guest_phone"),
  guestLocation: text("guest_location"),
  message: text("message").notNull(),
  isFromAdmin: boolean("is_from_admin").notNull().default(false),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSupportMessageSchema = createInsertSchema(supportMessages).omit({
  id: true,
  createdAt: true,
  isRead: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof courses.$inferSelect;

export type InsertModule = z.infer<typeof insertModuleSchema>;
export type Module = typeof modules.$inferSelect;

export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type Lesson = typeof lessons.$inferSelect;

export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type Quiz = typeof quizzes.$inferSelect;

export type InsertQuizQuestion = z.infer<typeof insertQuizQuestionSchema>;
export type QuizQuestion = typeof quizQuestions.$inferSelect;

export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Assignment = typeof assignments.$inferSelect;

export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type PaymentMethod = typeof paymentMethods.$inferSelect;

export type InsertPaymentSubmission = z.infer<typeof insertPaymentSubmissionSchema>;
export type PaymentSubmission = typeof paymentSubmissions.$inferSelect;

export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;
export type Enrollment = typeof enrollments.$inferSelect;

export type InsertParent = z.infer<typeof insertParentSchema>;
export type Parent = typeof parents.$inferSelect;

export type InsertTestimonial = z.infer<typeof insertTestimonialSchema>;
export type Testimonial = typeof testimonials.$inferSelect;

export type InsertAssignmentSubmission = z.infer<typeof insertAssignmentSubmissionSchema>;
export type AssignmentSubmission = typeof assignmentSubmissions.$inferSelect;

export type InsertSupportMessage = z.infer<typeof insertSupportMessageSchema>;
export type SupportMessage = typeof supportMessages.$inferSelect;

// =====================================================
// NEW FEATURES: Daily Tips, Milestones, Badges, Resources, Community
// =====================================================

// Daily Tips table (parenting tips by age range)
export const dailyTips = pgTable("daily_tips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ageRange: text("age_range").notNull(), // "0-6", "6-12", "1-2", "2-4", "4-6"
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category"), // "feeding", "sleep", "play", "health", "emotional"
  dayOfYear: integer("day_of_year"), // 1-365, for rotating tips
  order: integer("order").notNull().default(0),
});

// Daily Tip Schedules table (control when tips appear)
export const dailyTipSchedules = pgTable("daily_tip_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tipId: varchar("tip_id").notNull().references(() => dailyTips.id, { onDelete: "cascade" }),
  scheduleType: text("schedule_type").notNull(), // "day" or "week"
  scheduledDate: text("scheduled_date"), // YYYY-MM-DD format for day schedules
  weekNumber: integer("week_number"), // Week number (1-52) for week schedules
  courseId: varchar("course_id").references(() => courses.id, { onDelete: "set null" }), // Optional course link
  priority: integer("priority").notNull().default(0), // Higher = shows first
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Milestones table (child development milestones)
export const milestones = pgTable("milestones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ageRange: text("age_range").notNull(), // "0-6", "6-12", etc.
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"), // "physical", "cognitive", "social", "language"
  order: integer("order").notNull().default(0),
});

// Milestone Progress (tracking which milestones parents have checked)
export const milestoneProgress = pgTable("milestone_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id),
  milestoneId: varchar("milestone_id").notNull().references(() => milestones.id, { onDelete: "cascade" }),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  notes: text("notes"), // Parent's notes about this milestone
});

// Badges table (achievement badges)
export const badges = pgTable("badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  triggerType: text("trigger_type").notNull(), // "course_complete", "lessons_complete", "streak", "milestone"
  triggerValue: text("trigger_value"), // e.g., courseId or number of lessons
  order: integer("order").notNull().default(0),
});

// Badge Awards (badges earned by parents)
export const badgeAwards = pgTable("badge_awards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id),
  badgeId: varchar("badge_id").notNull().references(() => badges.id, { onDelete: "cascade" }),
  awardedAt: timestamp("awarded_at").notNull().defaultNow(),
});

// Certificates (course completion certificates)
export const certificates = pgTable("certificates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id),
  courseId: varchar("course_id").notNull().references(() => courses.id),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
  certificateUrl: text("certificate_url"), // Generated certificate image/PDF URL
});

// Resources table (downloadable PDFs, images, audio)
export const resources = pgTable("resources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull(), // "pdf", "image", "audio", "video"
  imageUrl: text("image_url"), // Optional cover image URL
  ageRange: text("age_range"), // Optional age range filter
  category: text("category"), // "guide", "checklist", "infographic", "audio"
  courseId: varchar("course_id").references(() => courses.id), // Optional course link
  downloadCount: integer("download_count").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(true),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Community Threads (discussion threads per course)
export const communityThreads = pgTable("community_threads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").references(() => courses.id),
  parentId: varchar("parent_id").notNull().references(() => parents.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull().default("guud"), // guud, caafimaad, waxbarasho, ciyaar, dhaqan, kale
  isPinned: boolean("is_pinned").notNull().default(false),
  isLocked: boolean("is_locked").notNull().default(false),
  replyCount: integer("reply_count").notNull().default(0),
  likeCount: integer("like_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Community Posts (replies to threads)
export const communityPosts = pgTable("community_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id").notNull().references(() => communityThreads.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id").notNull().references(() => parents.id),
  content: text("content").notNull(),
  voiceNoteUrl: text("voice_note_url"), // Optional voice note
  likeCount: integer("like_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Community Likes (for threads and posts)
export const communityLikes = pgTable("community_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  threadId: varchar("thread_id").references(() => communityThreads.id, { onDelete: "cascade" }),
  postId: varchar("post_id").references(() => communityPosts.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Live Q&A Events
export const liveEvents = pgTable("live_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  eventType: text("event_type").notNull().default("qa"), // "qa", "webinar", "workshop"
  courseId: varchar("course_id").references(() => courses.id),
  lessonId: varchar("lesson_id").references(() => lessons.id, { onDelete: "cascade" }), // Link to live lesson
  hostName: text("host_name"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration"), // Duration in minutes
  meetingUrl: text("meeting_url"),
  recordingUrl: text("recording_url"), // After event ends
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Event RSVPs
export const eventRsvps = pgTable("event_rsvps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => liveEvents.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id").notNull().references(() => parents.id),
  rsvpAt: timestamp("rsvp_at").notNull().defaultNow(),
  attended: boolean("attended").notNull().default(false),
  reminder24hSentAt: timestamp("reminder_24h_sent_at"),
  reminder1hSentAt: timestamp("reminder_1h_sent_at"),
});

// Push Notification Subscriptions
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(), // Public key for encryption
  auth: text("auth").notNull(), // Auth secret
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// AI Generated Tips table (tips generated by AI for admin approval)
export const aiGeneratedTips = pgTable("ai_generated_tips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(), // Somali parenting tip
  ageRange: text("age_range"), // "0-6", "6-12", "1-2", "2-4" etc
  category: text("category"), // "feeding", "sleep", "play", "health", "emotional", "behavior"
  status: text("status").notNull().default("pending_review"), // pending_review, approved, rejected
  adminNotes: text("admin_notes"), // Admin's correction notes
  correctedContent: text("corrected_content"), // Admin corrected Somali text
  audioUrl: text("audio_url"), // TTS audio URL (Azure Ubax voice)
  publishDate: text("publish_date"), // YYYY-MM-DD when to publish
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
});

// Teacher/Consultant Appointments table (for parent-teacher booking)
export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id),
  teacherName: text("teacher_name").notNull().default("Ustaad Musse Said"),
  appointmentDate: text("appointment_date").notNull(), // YYYY-MM-DD
  appointmentTime: text("appointment_time").notNull(), // HH:MM format
  duration: integer("duration").notNull().default(30), // minutes
  topic: text("topic"), // What the parent wants to discuss
  status: text("status").notNull().default("pending"), // pending, approved, rejected, completed, cancelled
  meetingLink: text("meeting_link"), // Zoom/Google Meet link added by admin
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reminder1hSentAt: timestamp("reminder_1h_sent_at"), // Telegram reminder 1 hour before
});

// Admin availability slots - weekly recurring time slots
export const availabilitySlots = pgTable("availability_slots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday, 1=Monday, ..., 6=Saturday
  startTime: text("start_time").notNull(), // HH:MM format
  endTime: text("end_time").notNull(), // HH:MM format
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Admin calendar availability - specific dates marked as available
export const calendarAvailability = pgTable("calendar_availability", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: text("date").notNull().unique(), // YYYY-MM-DD format
  isAvailable: boolean("is_available").notNull().default(true),
  startTime: text("start_time").notNull().default("09:00"), // HH:MM format
  endTime: text("end_time").notNull().default("17:00"), // HH:MM format
  notes: text("notes"), // Admin notes for this day
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas for new tables
export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({ id: true, createdAt: true });
export const insertAiGeneratedTipSchema = createInsertSchema(aiGeneratedTips).omit({ id: true, generatedAt: true, reviewedAt: true, reviewedBy: true, status: true });
export const insertAppointmentSchema = createInsertSchema(appointments).omit({ id: true, createdAt: true, reviewedAt: true, status: true });
export const insertAvailabilitySlotSchema = createInsertSchema(availabilitySlots).omit({ id: true, createdAt: true });
export const insertCalendarAvailabilitySchema = createInsertSchema(calendarAvailability).omit({ id: true, createdAt: true });
export const insertDailyTipSchema = createInsertSchema(dailyTips).omit({ id: true });
export const insertDailyTipScheduleSchema = createInsertSchema(dailyTipSchedules).omit({ id: true, createdAt: true });
export const insertMilestoneSchema = createInsertSchema(milestones).omit({ id: true });
export const insertMilestoneProgressSchema = createInsertSchema(milestoneProgress).omit({ id: true, completedAt: true });
export const insertBadgeSchema = createInsertSchema(badges).omit({ id: true });
export const insertBadgeAwardSchema = createInsertSchema(badgeAwards).omit({ id: true, awardedAt: true });
export const insertCertificateSchema = createInsertSchema(certificates).omit({ id: true, completedAt: true });
export const insertResourceSchema = createInsertSchema(resources).omit({ id: true, downloadCount: true, createdAt: true });
export const insertCommunityThreadSchema = createInsertSchema(communityThreads).omit({ id: true, replyCount: true, likeCount: true, createdAt: true, updatedAt: true });
export const insertCommunityPostSchema = createInsertSchema(communityPosts).omit({ id: true, likeCount: true, createdAt: true });
export const insertCommunityLikeSchema = createInsertSchema(communityLikes).omit({ id: true, createdAt: true });
export const insertLiveEventSchema = createInsertSchema(liveEvents).omit({ id: true, createdAt: true });
export const insertEventRsvpSchema = createInsertSchema(eventRsvps).omit({ id: true, rsvpAt: true });

// Types for new tables
export type InsertDailyTip = z.infer<typeof insertDailyTipSchema>;
export type DailyTip = typeof dailyTips.$inferSelect;

export type InsertDailyTipSchedule = z.infer<typeof insertDailyTipScheduleSchema>;
export type DailyTipSchedule = typeof dailyTipSchedules.$inferSelect;

export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;
export type Milestone = typeof milestones.$inferSelect;

export type InsertMilestoneProgress = z.infer<typeof insertMilestoneProgressSchema>;
export type MilestoneProgress = typeof milestoneProgress.$inferSelect;

export type InsertBadge = z.infer<typeof insertBadgeSchema>;
export type Badge = typeof badges.$inferSelect;

export type InsertBadgeAward = z.infer<typeof insertBadgeAwardSchema>;
export type BadgeAward = typeof badgeAwards.$inferSelect;

export type InsertCertificate = z.infer<typeof insertCertificateSchema>;
export type Certificate = typeof certificates.$inferSelect;

export type InsertResource = z.infer<typeof insertResourceSchema>;
export type Resource = typeof resources.$inferSelect;

export type InsertCommunityThread = z.infer<typeof insertCommunityThreadSchema>;
export type CommunityThread = typeof communityThreads.$inferSelect;

export type InsertCommunityPost = z.infer<typeof insertCommunityPostSchema>;
export type CommunityPost = typeof communityPosts.$inferSelect;

export type InsertCommunityLike = z.infer<typeof insertCommunityLikeSchema>;
export type CommunityLike = typeof communityLikes.$inferSelect;

export type InsertLiveEvent = z.infer<typeof insertLiveEventSchema>;
export type LiveEvent = typeof liveEvents.$inferSelect;

export type InsertEventRsvp = z.infer<typeof insertEventRsvpSchema>;
export type EventRsvp = typeof eventRsvps.$inferSelect;

export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

export type InsertAiGeneratedTip = z.infer<typeof insertAiGeneratedTipSchema>;
export type AiGeneratedTip = typeof aiGeneratedTips.$inferSelect;

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

export type InsertAvailabilitySlot = z.infer<typeof insertAvailabilitySlotSchema>;
export type AvailabilitySlot = typeof availabilitySlots.$inferSelect;

export type InsertCalendarAvailability = z.infer<typeof insertCalendarAvailabilitySchema>;
export type CalendarAvailability = typeof calendarAvailability.$inferSelect;

// =====================================================
// AI PERSONALIZED LEARNING PATHS
// =====================================================

// Assessment Questions (questions to ask parents about their child)
export const assessmentQuestions = pgTable("assessment_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  question: text("question").notNull(),
  questionSomali: text("question_somali").notNull(),
  ageRange: text("age_range"), // "0-6", "6-12", "1-2", "2-4", "4-6", or null for all ages
  category: text("category").notNull(), // "cognitive", "physical", "emotional", "social", "language"
  answerType: text("answer_type").notNull().default("scale"), // "scale", "multiple_choice", "yes_no"
  options: text("options"), // JSON array of options for multiple_choice
  order: integer("order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

// Parent Assessments (each assessment session)
export const parentAssessments = pgTable("parent_assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id),
  childAgeRange: text("child_age_range").notNull(), // The age range selected for this assessment
  status: text("status").notNull().default("in_progress"), // "in_progress", "completed", "analyzed"
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  analyzedAt: timestamp("analyzed_at"),
});

// Assessment Responses (answers to each question)
export const assessmentResponses = pgTable("assessment_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assessmentId: varchar("assessment_id").notNull().references(() => parentAssessments.id, { onDelete: "cascade" }),
  questionId: varchar("question_id").notNull().references(() => assessmentQuestions.id),
  response: text("response").notNull(), // The answer value (number 1-5, option index, or yes/no)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// AI Assessment Insights (AI-generated analysis results)
export const aiAssessmentInsights = pgTable("ai_assessment_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assessmentId: varchar("assessment_id").notNull().references(() => parentAssessments.id, { onDelete: "cascade" }),
  strengths: text("strengths").notNull(), // JSON array of strength areas
  needsImprovement: text("needs_improvement").notNull(), // JSON array of areas needing work
  focusAreas: text("focus_areas").notNull(), // JSON array of recommended focus areas
  summary: text("summary").notNull(), // AI-generated summary in Somali
  parentingStyle: text("parenting_style"), // Detected parenting style (Waalid Dhab ah, Waalid Adag, Waalid Debecsan, Waalid Ka Fog)
  parentingTips: text("parenting_tips"), // JSON array of parenting improvement tips in Somali
  aiModel: text("ai_model").default("gpt-4o"), // Which AI model was used
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Learning Path Recommendations (personalized course/lesson suggestions)
export const learningPathRecommendations = pgTable("learning_path_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assessmentId: varchar("assessment_id").notNull().references(() => parentAssessments.id, { onDelete: "cascade" }),
  courseId: varchar("course_id").notNull().references(() => courses.id),
  priority: integer("priority").notNull().default(1), // 1 = highest priority
  reason: text("reason").notNull(), // Why this course is recommended (in Somali)
  focusArea: text("focus_area"), // Which focus area this addresses
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas for assessment tables
export const insertAssessmentQuestionSchema = createInsertSchema(assessmentQuestions).omit({ id: true });
export const insertParentAssessmentSchema = createInsertSchema(parentAssessments).omit({ id: true, createdAt: true, completedAt: true, analyzedAt: true });
export const insertAssessmentResponseSchema = createInsertSchema(assessmentResponses).omit({ id: true, createdAt: true });
export const insertAiAssessmentInsightSchema = createInsertSchema(aiAssessmentInsights).omit({ id: true, createdAt: true });
export const insertLearningPathRecommendationSchema = createInsertSchema(learningPathRecommendations).omit({ id: true, createdAt: true });

// Types for assessment tables
export type InsertAssessmentQuestion = z.infer<typeof insertAssessmentQuestionSchema>;
export type AssessmentQuestion = typeof assessmentQuestions.$inferSelect;

export type InsertParentAssessment = z.infer<typeof insertParentAssessmentSchema>;
export type ParentAssessment = typeof parentAssessments.$inferSelect;

export type InsertAssessmentResponse = z.infer<typeof insertAssessmentResponseSchema>;
export type AssessmentResponse = typeof assessmentResponses.$inferSelect;

export type InsertAiAssessmentInsight = z.infer<typeof insertAiAssessmentInsightSchema>;
export type AiAssessmentInsight = typeof aiAssessmentInsights.$inferSelect;

export type InsertLearningPathRecommendation = z.infer<typeof insertLearningPathRecommendationSchema>;
export type LearningPathRecommendation = typeof learningPathRecommendations.$inferSelect;

// Homework Helper Conversations (AI-powered homework assistance)
export const homeworkConversations = pgTable("homework_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(), // Math, Science, Language, History, etc.
  childAge: text("child_age"), // Age of the child for context
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Homework Messages (individual messages in a conversation)
export const homeworkMessages = pgTable("homework_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => homeworkConversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // "user" or "assistant"
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Daily homework helper usage tracking (10 questions/day limit)
export const homeworkUsage = pgTable("homework_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD format
  questionsAsked: integer("questions_asked").notNull().default(0),
});

// Insert schemas for homework helper
export const insertHomeworkConversationSchema = createInsertSchema(homeworkConversations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertHomeworkMessageSchema = createInsertSchema(homeworkMessages).omit({ id: true, createdAt: true });
export const insertHomeworkUsageSchema = createInsertSchema(homeworkUsage).omit({ id: true });

// Types for homework helper
export type InsertHomeworkConversation = z.infer<typeof insertHomeworkConversationSchema>;
export type HomeworkConversation = typeof homeworkConversations.$inferSelect;

export type InsertHomeworkMessage = z.infer<typeof insertHomeworkMessageSchema>;
export type HomeworkMessage = typeof homeworkMessages.$inferSelect;

export type InsertHomeworkUsage = z.infer<typeof insertHomeworkUsageSchema>;
export type HomeworkUsage = typeof homeworkUsage.$inferSelect;

// Parenting/Tarbiya AI Conversations (MODE 2: Parenting & Tarbiya Assistant)
export const parentingConversations = pgTable("parenting_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  topic: text("topic").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const parentingMessages = pgTable("parenting_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => parentingConversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const parentingUsage = pgTable("parenting_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  questionsAsked: integer("questions_asked").notNull().default(0),
});

export const insertParentingConversationSchema = createInsertSchema(parentingConversations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertParentingMessageSchema = createInsertSchema(parentingMessages).omit({ id: true, createdAt: true });
export const insertParentingUsageSchema = createInsertSchema(parentingUsage).omit({ id: true });

export type InsertParentingConversation = z.infer<typeof insertParentingConversationSchema>;
export type ParentingConversation = typeof parentingConversations.$inferSelect;

export type InsertParentingMessage = z.infer<typeof insertParentingMessageSchema>;
export type ParentingMessage = typeof parentingMessages.$inferSelect;

export type InsertParentingUsage = z.infer<typeof insertParentingUsageSchema>;
export type ParentingUsage = typeof parentingUsage.$inferSelect;

// Telegram Referrals table (track parents who joined from Telegram groups)
export const telegramReferrals = pgTable("telegram_referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentName: text("parent_name").notNull(),
  telegramUsername: text("telegram_username"),
  telegramGroupName: text("telegram_group_name"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
});

// Insert schema for telegram referrals
export const insertTelegramReferralSchema = createInsertSchema(telegramReferrals).omit({ id: true, createdAt: true });

// Types for telegram referrals
export type InsertTelegramReferral = z.infer<typeof insertTelegramReferralSchema>;
export type TelegramReferral = typeof telegramReferrals.$inferSelect;

// Announcements table (Ogeeysiisyada - for admin to post announcements/ads)
export const announcements = pgTable("announcements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title"),
  content: text("content").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Insert schema for announcements
export const insertAnnouncementSchema = createInsertSchema(announcements).omit({ id: true, createdAt: true, updatedAt: true });

// Types for announcements
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Announcement = typeof announcements.$inferSelect;

// Expenses table (Kharashaadka - for tracking money going out)
export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  description: text("description").notNull(), // What the money was spent on
  amount: integer("amount").notNull(), // Amount in dollars
  category: text("category").notNull(), // e.g., "salary", "equipment", "marketing", "other"
  date: timestamp("date").notNull().defaultNow(), // When the expense occurred
  notes: text("notes"), // Optional additional notes
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schema for expenses
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true });

// Types for expenses
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

// Homepage Sections table (for admin to reorder sections on the main page)
export const homepageSections = pgTable("homepage_sections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sectionKey: text("section_key").notNull().unique(), // Unique identifier like "stats", "services", "search", "general_courses", "special_courses", etc.
  title: text("title").notNull(), // Display name in admin: "Lambarada", "Adeegyada", etc.
  isVisible: boolean("is_visible").notNull().default(true),
  order: integer("order").notNull().default(0),
});

// Insert schema for homepage sections
export const insertHomepageSectionSchema = createInsertSchema(homepageSections).omit({ id: true });

// Types for homepage sections
export type InsertHomepageSection = z.infer<typeof insertHomepageSectionSchema>;
export type HomepageSection = typeof homepageSections.$inferSelect;

// Parent Community Settings table (admin-controlled settings for Baraha Waalidiinta)
export const parentCommunitySettings = pgTable("parent_community_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  settingKey: text("setting_key").notNull().unique(), // e.g., "banner_image_url", "banner_title", "banner_subtitle"
  settingValue: text("setting_value"), // The value of the setting
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Insert schema for parent community settings
export const insertParentCommunitySettingSchema = createInsertSchema(parentCommunitySettings).omit({ id: true, updatedAt: true });

// Types for parent community settings
export type InsertParentCommunitySetting = z.infer<typeof insertParentCommunitySettingSchema>;
export type ParentCommunitySetting = typeof parentCommunitySettings.$inferSelect;

// Flashcard Categories table (Khudaar, Miro, Xayawaan, etc.)
export const flashcardCategories = pgTable("flashcard_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // e.g., "Khudaar", "Miro", "Xayawaan"
  nameEnglish: text("name_english"), // e.g., "Vegetables", "Fruits", "Animals"
  description: text("description"),
  iconEmoji: text("icon_emoji"), // e.g., "🥕", "🍎", "🦁"
  order: integer("order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Flashcards table (individual vocabulary cards)
export const flashcards = pgTable("flashcards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").notNull().references(() => flashcardCategories.id, { onDelete: "cascade" }),
  nameSomali: text("name_somali").notNull(), // e.g., "Tufaax", "Moos", "Libaax"
  nameEnglish: text("name_english"), // Optional English translation
  imageUrl: text("image_url").notNull(), // Image of the item
  audioUrl: text("audio_url"), // Optional audio pronunciation
  order: integer("order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Flashcard Progress table (track which cards child has learned)
export const flashcardProgress = pgTable("flashcard_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  flashcardId: varchar("flashcard_id").notNull().references(() => flashcards.id, { onDelete: "cascade" }),
  timesViewed: integer("times_viewed").notNull().default(0),
  timesCorrect: integer("times_correct").notNull().default(0),
  lastViewedAt: timestamp("last_viewed_at"),
  masteredAt: timestamp("mastered_at"), // When child "mastered" this card
});

// Insert schemas for flashcards
export const insertFlashcardCategorySchema = createInsertSchema(flashcardCategories).omit({ id: true, createdAt: true });
export const insertFlashcardSchema = createInsertSchema(flashcards).omit({ id: true, createdAt: true });
export const insertFlashcardProgressSchema = createInsertSchema(flashcardProgress).omit({ id: true });

// Types for flashcards
export type InsertFlashcardCategory = z.infer<typeof insertFlashcardCategorySchema>;
export type FlashcardCategory = typeof flashcardCategories.$inferSelect;

export type InsertFlashcard = z.infer<typeof insertFlashcardSchema>;
export type Flashcard = typeof flashcards.$inferSelect;

export type InsertFlashcardProgress = z.infer<typeof insertFlashcardProgressSchema>;
export type FlashcardProgress = typeof flashcardProgress.$inferSelect;

// Lesson Bookmarks table (parents can save lessons for later)
export const lessonBookmarks = pgTable("lesson_bookmarks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  lessonId: varchar("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLessonBookmarkSchema = createInsertSchema(lessonBookmarks).omit({ id: true, createdAt: true });
export type InsertLessonBookmark = z.infer<typeof insertLessonBookmarkSchema>;
export type LessonBookmark = typeof lessonBookmarks.$inferSelect;

// Lesson Exercises table (interactive exercises within lessons)
export const lessonExercises = pgTable("lesson_exercises", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lessonId: varchar("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  exerciseType: text("exercise_type").notNull(), // "multiple_choice", "drag_drop", "fill_blank", "true_false"
  question: text("question").notNull(),
  options: text("options"), // JSON array of options
  correctAnswer: text("correct_answer").notNull(), // For drag_drop: JSON mapping, for others: correct value
  explanation: text("explanation"), // Feedback shown after answering
  order: integer("order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLessonExerciseSchema = createInsertSchema(lessonExercises).omit({ id: true, createdAt: true });
export type InsertLessonExercise = z.infer<typeof insertLessonExerciseSchema>;
export type LessonExercise = typeof lessonExercises.$inferSelect;

// Exercise Progress table (track parent answers and scores)
export const exerciseProgress = pgTable("exercise_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  exerciseId: varchar("exercise_id").notNull().references(() => lessonExercises.id, { onDelete: "cascade" }),
  answer: text("answer"), // The answer they gave
  isCorrect: boolean("is_correct").notNull().default(false),
  attempts: integer("attempts").notNull().default(1),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
});

export const insertExerciseProgressSchema = createInsertSchema(exerciseProgress).omit({ id: true, completedAt: true });
export type InsertExerciseProgress = z.infer<typeof insertExerciseProgressSchema>;
export type ExerciseProgress = typeof exerciseProgress.$inferSelect;

// ============================================
// MESSENGER SYSTEM TABLES
// ============================================

// Conversations table (chat between two users)
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participant1: varchar("participant_1").notNull().references(() => parents.id, { onDelete: "cascade" }),
  participant2: varchar("participant_2").notNull().references(() => parents.id, { onDelete: "cascade" }),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true });
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

// Messages table (individual messages in a conversation)
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
});

export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// User Presence table (online/offline status tracking)
export const userPresence = pgTable("user_presence", {
  userId: varchar("user_id").primaryKey().references(() => parents.id, { onDelete: "cascade" }),
  isOnline: boolean("is_online").notNull().default(false),
  lastSeen: timestamp("last_seen").defaultNow(),
});

export const insertUserPresenceSchema = createInsertSchema(userPresence);
export type InsertUserPresence = z.infer<typeof insertUserPresenceSchema>;
export type UserPresence = typeof userPresence.$inferSelect;

// ============================================
// BANK BALANCE TRACKING (Admin Accounting)
// ============================================

// Bank Transfers table (manual entries for tracking Salaam Bank balance)
export const bankTransfers = pgTable("bank_transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  amount: integer("amount").notNull(), // Amount in dollars
  description: text("description"), // Optional note (e.g., "Monthly transfer")
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBankTransferSchema = createInsertSchema(bankTransfers).omit({ id: true, createdAt: true });
export type InsertBankTransfer = z.infer<typeof insertBankTransferSchema>;
export type BankTransfer = typeof bankTransfers.$inferSelect;

// ============================================
// QURAN RECITERS (Library Section)
// ============================================

// Quran Reciters table (Sheikhs for Quran audio)
export const quranReciters = pgTable("quran_reciters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // e.g., "Mishary Alafasy"
  nameSomali: text("name_somali"), // Somali name if different
  audioBaseUrl: text("audio_base_url").notNull(), // e.g., "https://mp3quran.net/afs/"
  imageUrl: text("image_url"), // Optional sheikh photo
  isActive: boolean("is_active").notNull().default(true),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertQuranReciterSchema = createInsertSchema(quranReciters).omit({ id: true, createdAt: true });
export type InsertQuranReciter = z.infer<typeof insertQuranReciterSchema>;
export type QuranReciter = typeof quranReciters.$inferSelect;

// ============================================
// 40 HADITH (Axaadiista - Library Section)
// ============================================

// Hadith table (40 Xadiis collection)
export const hadiths = pgTable("hadiths", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  number: integer("number").notNull(), // Hadith number (1-40)
  arabicText: text("arabic_text").notNull(), // Arabic text
  somaliText: text("somali_text").notNull(), // Somali translation
  source: text("source"), // e.g., "Bukhari", "Muslim", "Nawawi"
  narrator: text("narrator"), // Who narrated the hadith
  topic: text("topic"), // Topic/category of hadith
  isActive: boolean("is_active").notNull().default(true),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertHadithSchema = createInsertSchema(hadiths).omit({ id: true, createdAt: true });
export type InsertHadith = z.infer<typeof insertHadithSchema>;
export type Hadith = typeof hadiths.$inferSelect;

// ============================================
// PARENT NOTIFICATIONS (Inbox for push notifications)
// ============================================

// Parent Notifications table (stores all sent notifications for viewing in-app)
export const parentNotifications = pgTable("parent_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  type: text("type").notNull().default("general"), // general, reminder, announcement, campaign, streak, tip
  payload: text("payload"), // Optional JSON payload for click actions (e.g., URL to navigate to)
  readAt: timestamp("read_at"), // Null = unread, timestamp = when read
  deletedAt: timestamp("deleted_at"), // Soft delete - null = visible
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertParentNotificationSchema = createInsertSchema(parentNotifications).omit({ id: true, createdAt: true, readAt: true, deletedAt: true });
export type InsertParentNotification = z.infer<typeof insertParentNotificationSchema>;
export type ParentNotification = typeof parentNotifications.$inferSelect;

// Push Broadcast Logs (admin notification history)
export const pushBroadcastLogs = pgTable("push_broadcast_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull().references(() => parents.id),
  title: text("title").notNull(),
  body: text("body").notNull(),
  url: text("url"),
  targetAudience: text("target_audience").notNull().default("all"),
  totalTargeted: integer("total_targeted").notNull().default(0),
  sentSuccessfully: integer("sent_successfully").notNull().default(0),
  failed: integer("failed").notNull().default(0),
  noSubscription: integer("no_subscription").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPushBroadcastLogSchema = createInsertSchema(pushBroadcastLogs).omit({ id: true, createdAt: true });
export type InsertPushBroadcastLog = z.infer<typeof insertPushBroadcastLogSchema>;
export type PushBroadcastLog = typeof pushBroadcastLogs.$inferSelect;

// ============================================
// PRAYER SETTINGS (Jadwalka Salaadda)
// ============================================

// Parent Prayer Settings table (stores prayer time preferences per parent)
export const parentPrayerSettings = pgTable("parent_prayer_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }).unique(),
  latitude: text("latitude"), // User's latitude
  longitude: text("longitude"), // User's longitude
  cityName: text("city_name"), // Human-readable city name
  countryName: text("country_name"), // Country name
  timezone: text("timezone"), // IANA timezone (e.g., "Africa/Mogadishu")
  calculationMethod: integer("calculation_method").notNull().default(4), // Aladhan method (4 = Umm Al-Qura)
  madhab: integer("madhab").notNull().default(1), // 1 = Shafi (default), 2 = Hanafi
  azanEnabled: boolean("azan_enabled").notNull().default(true), // Play azan audio
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true), // Send push notifications
  notificationMinutesBefore: integer("notification_minutes_before").notNull().default(5), // Minutes before prayer
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertParentPrayerSettingsSchema = createInsertSchema(parentPrayerSettings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertParentPrayerSettings = z.infer<typeof insertParentPrayerSettingsSchema>;
export type ParentPrayerSettings = typeof parentPrayerSettings.$inferSelect;

// ============================================
// BSAv.1 SHEEKO - VOICE SPACES
// ============================================

// Voice Rooms table (Spaces where parents can talk)
export const voiceRooms = pgTable("voice_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  hostId: varchar("host_id").notNull().references(() => parents.id, { onDelete: "cascade" }), // Parent who hosts the space
  status: text("status").notNull().default("scheduled"), // scheduled, live, ended
  scheduledAt: timestamp("scheduled_at"), // When the space is scheduled to start
  startedAt: timestamp("started_at"), // When the space actually started
  endedAt: timestamp("ended_at"), // When the space ended
  maxSpeakers: integer("max_speakers").notNull().default(5), // Max people who can speak at once
  isRecorded: boolean("is_recorded").notNull().default(false), // Whether to record the session
  recordingUrl: text("recording_url"), // URL to recording if saved
  pinnedMessageId: varchar("pinned_message_id"), // Currently pinned chat message ID
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVoiceRoomSchema = createInsertSchema(voiceRooms).omit({ id: true, createdAt: true, startedAt: true, endedAt: true, recordingUrl: true });
export type InsertVoiceRoom = z.infer<typeof insertVoiceRoomSchema>;
export type VoiceRoom = typeof voiceRooms.$inferSelect;

// Voice Room Participants table (People in the space)
export const voiceParticipants = pgTable("voice_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull().references(() => voiceRooms.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("listener"), // listener, speaker, co-host
  isMuted: boolean("is_muted").notNull().default(true),
  isHidden: boolean("is_hidden").notNull().default(false), // Hidden listeners (anonymous mode)
  handRaised: boolean("hand_raised").notNull().default(false),
  handRaisedAt: timestamp("hand_raised_at"),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  leftAt: timestamp("left_at"),
});

export const insertVoiceParticipantSchema = createInsertSchema(voiceParticipants).omit({ id: true, joinedAt: true, leftAt: true, handRaisedAt: true });
export type InsertVoiceParticipant = z.infer<typeof insertVoiceParticipantSchema>;
export type VoiceParticipant = typeof voiceParticipants.$inferSelect;

// Voice Room Messages table (Live chat messages in voice rooms - TikTok style)
export const voiceRoomMessages = pgTable("voice_room_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull().references(() => voiceRooms.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id").references(() => parents.id, { onDelete: "set null" }), // null for guests
  guestId: varchar("guest_id"), // For guest users
  displayName: varchar("display_name").notNull(), // Name shown in chat
  message: text("message").notNull(),
  isHidden: boolean("is_hidden").notNull().default(false), // Hidden by AI moderation
  aiModerated: boolean("ai_moderated").notNull().default(false), // Was AI moderation triggered
  moderationReason: text("moderation_reason"), // Why it was flagged (hate_speech, harassment, etc)
  moderationScore: real("moderation_score"), // Confidence score 0-1
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVoiceRoomMessageSchema = createInsertSchema(voiceRoomMessages).omit({ id: true, createdAt: true });
export type InsertVoiceRoomMessage = z.infer<typeof insertVoiceRoomMessageSchema>;
export type VoiceRoomMessage = typeof voiceRoomMessages.$inferSelect;

// Voice Room RSVPs table (Parents who indicated they will attend scheduled rooms)
export const voiceRoomRsvps = pgTable("voice_room_rsvps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull().references(() => voiceRooms.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVoiceRoomRsvpSchema = createInsertSchema(voiceRoomRsvps).omit({ id: true, createdAt: true });
export type InsertVoiceRoomRsvp = z.infer<typeof insertVoiceRoomRsvpSchema>;
export type VoiceRoomRsvp = typeof voiceRoomRsvps.$inferSelect;

// Voice Recordings table (Recorded sessions saved to Object Storage for Maktabada)
export const voiceRecordings = pgTable("voice_recordings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").references(() => voiceRooms.id, { onDelete: "set null" }), // Original room (nullable if deleted)
  title: text("title").notNull(), // Recording title
  description: text("description"), // Description
  hostId: varchar("host_id").notNull().references(() => parents.id, { onDelete: "cascade" }), // Who recorded it
  driveFileId: text("drive_file_id"), // Google Drive file ID (legacy, nullable now)
  driveUrl: text("drive_url"), // Google Drive direct URL (legacy)
  objectPath: text("object_path"), // Object Storage path (new - preferred)
  duration: integer("duration"), // Duration in seconds
  fileSize: integer("file_size"), // Size in bytes
  isPublished: boolean("is_published").notNull().default(false), // Visible in Maktabada
  participantCount: integer("participant_count"), // How many people were in the session
  recordedAt: timestamp("recorded_at").notNull(), // When the session was recorded
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVoiceRecordingSchema = createInsertSchema(voiceRecordings).omit({ id: true, createdAt: true });
export type InsertVoiceRecording = z.infer<typeof insertVoiceRecordingSchema>;
export type VoiceRecording = typeof voiceRecordings.$inferSelect;

// Voice Room Bans table (Banned users who cannot rejoin a room)
export const voiceRoomBans = pgTable("voice_room_bans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull().references(() => voiceRooms.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  bannedById: varchar("banned_by_id").notNull().references(() => parents.id, { onDelete: "cascade" }), // Host or co-host who banned
  reason: text("reason"), // Optional reason for ban
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVoiceRoomBanSchema = createInsertSchema(voiceRoomBans).omit({ id: true, createdAt: true });
export type InsertVoiceRoomBan = z.infer<typeof insertVoiceRoomBanSchema>;
export type VoiceRoomBan = typeof voiceRoomBans.$inferSelect;

// Host Followers table (Follow/subscribe to Sheeko hosts for notifications)
export const hostFollows = pgTable("host_follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").notNull().references(() => parents.id, { onDelete: "cascade" }), // Parent who is following
  hostId: varchar("host_id").notNull().references(() => parents.id, { onDelete: "cascade" }), // Host being followed
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertHostFollowSchema = createInsertSchema(hostFollows).omit({ id: true, createdAt: true });
export type InsertHostFollow = z.infer<typeof insertHostFollowSchema>;
export type HostFollow = typeof hostFollows.$inferSelect;

// Sheeko Appreciations table (points/emoji appreciation given to speakers)
export const sheekoAppreciations = pgTable("sheeko_appreciations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  giverId: varchar("giver_id").notNull().references(() => parents.id, { onDelete: "cascade" }), // Parent who gave appreciation
  receiverId: varchar("receiver_id").notNull().references(() => parents.id, { onDelete: "cascade" }), // Parent who received
  roomId: varchar("room_id").references(() => voiceRooms.id, { onDelete: "set null" }), // Room where appreciation was given
  emojiType: text("emoji_type").notNull(), // "heart" (10 points) or "clap" (5 points)
  points: integer("points").notNull(), // 10 for heart, 5 for clap
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSheekoAppreciationSchema = createInsertSchema(sheekoAppreciations).omit({ id: true, createdAt: true });
export type InsertSheekoAppreciation = z.infer<typeof insertSheekoAppreciationSchema>;
export type SheekoAppreciation = typeof sheekoAppreciations.$inferSelect;

// ============================================
// CONTENT REPORTS (EU DSA COMPLIANCE)
// ============================================

// Content Reports table (for reporting inappropriate content)
export const contentReports = pgTable("content_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reporterId: varchar("reporter_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  reportType: text("report_type").notNull(), // message, voice_room, voice_message, user
  contentId: varchar("content_id").notNull(), // ID of the reported content
  reportedUserId: varchar("reported_user_id").references(() => parents.id, { onDelete: "set null" }), // User being reported
  reason: text("reason").notNull(), // hate_speech, harassment, violence, misinformation, spam, harmful_to_children, other
  description: text("description"), // Additional details from reporter
  status: text("status").notNull().default("pending"), // pending, reviewed, resolved, dismissed
  adminNotes: text("admin_notes"), // Notes from admin review
  actionTaken: text("action_taken"), // warning, muted, suspended, banned, none
  reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertContentReportSchema = createInsertSchema(contentReports).omit({ id: true, createdAt: true, reviewedAt: true, reviewedBy: true, adminNotes: true, actionTaken: true });
export type InsertContentReport = z.infer<typeof insertContentReportSchema>;
export type ContentReport = typeof contentReports.$inferSelect;

// User Moderation Actions table (track all moderation actions taken)
export const moderationActions = pgTable("moderation_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  actionType: text("action_type").notNull(), // warning, mute, suspend, ban, unmute, unsuspend, unban
  reason: text("reason").notNull(),
  reportId: varchar("report_id").references(() => contentReports.id, { onDelete: "set null" }), // Related report if any
  adminId: varchar("admin_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at"), // For temporary actions
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertModerationActionSchema = createInsertSchema(moderationActions).omit({ id: true, createdAt: true });
export type InsertModerationAction = z.infer<typeof insertModerationActionSchema>;
export type ModerationAction = typeof moderationActions.$inferSelect;

// User Consent Tracking (GDPR compliance)
export const userConsent = pgTable("user_consent", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }).unique(),
  termsAccepted: boolean("terms_accepted").notNull().default(false),
  termsAcceptedAt: timestamp("terms_accepted_at"),
  privacyAccepted: boolean("privacy_accepted").notNull().default(false),
  privacyAcceptedAt: timestamp("privacy_accepted_at"),
  guidelinesAccepted: boolean("guidelines_accepted").notNull().default(false),
  guidelinesAcceptedAt: timestamp("guidelines_accepted_at"),
  marketingConsent: boolean("marketing_consent").notNull().default(false),
  marketingConsentAt: timestamp("marketing_consent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserConsentSchema = createInsertSchema(userConsent).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUserConsent = z.infer<typeof insertUserConsentSchema>;
export type UserConsent = typeof userConsent.$inferSelect;

// ============================================
// AI MODERATION (AUTOMATED CONTENT FILTERING)
// ============================================

// AI Moderation Reports table (AI-flagged content for admin review)
export const aiModerationReports = pgTable("ai_moderation_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentType: text("content_type").notNull(), // voice_message, direct_message, etc
  contentId: varchar("content_id").notNull(), // ID of the flagged content
  roomId: varchar("room_id"), // Room context if applicable
  userId: varchar("user_id").references(() => parents.id, { onDelete: "set null" }), // User who sent the content
  displayName: varchar("display_name"), // Display name for context
  originalContent: text("original_content").notNull(), // The flagged content
  violationType: text("violation_type").notNull(), // hate_speech, harassment, threat, toxic, spam
  confidenceScore: real("confidence_score").notNull(), // AI confidence 0-1
  aiExplanation: text("ai_explanation"), // AI reasoning for the flag
  actionTaken: text("action_taken").notNull().default("hidden"), // hidden, warned, none
  status: text("status").notNull().default("pending"), // pending, approved, dismissed, escalated
  reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  adminNotes: text("admin_notes"),
  userNotified: boolean("user_notified").notNull().default(false), // Was user notified of the flag
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAiModerationReportSchema = createInsertSchema(aiModerationReports).omit({ id: true, createdAt: true, reviewedAt: true, reviewedBy: true, adminNotes: true });
export type InsertAiModerationReport = z.infer<typeof insertAiModerationReportSchema>;
export type AiModerationReport = typeof aiModerationReports.$inferSelect;

// ============================================
// SHEEKO USER-TO-USER FOLLOWS
// ============================================

// Sheeko Follows table (User-to-user follow system within Sheeko)
export const sheekoFollows = pgTable("sheeko_follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  followeeId: varchar("followee_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("sheeko_follows_unique").on(table.followerId, table.followeeId),
]);

export const insertSheekoFollowSchema = createInsertSchema(sheekoFollows).omit({ id: true, createdAt: true });
export type InsertSheekoFollow = z.infer<typeof insertSheekoFollowSchema>;
export type SheekoFollow = typeof sheekoFollows.$inferSelect;

// ============================================
// MAAWEELADA CARUURTA (BEDTIME STORIES)
// ============================================

// Bedtime Stories table (AI-generated Islamic bedtime stories for children)
export const bedtimeStories = pgTable("bedtime_stories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  titleSomali: varchar("title_somali", { length: 255 }).notNull(),
  content: text("content").notNull(),
  characterName: varchar("character_name", { length: 255 }).notNull(),
  characterType: text("character_type").notNull(),
  moralLesson: text("moral_lesson"),
  ageRange: varchar("age_range", { length: 50 }).default("3-8"),
  images: text("images").array().notNull().default(sql`ARRAY[]::text[]`),
  thumbnailUrl: text("thumbnail_url"), // Lightweight thumbnail URL for list views
  audioUrl: text("audio_url"), // TTS audio URL for parents who can't read
  storyDate: date("story_date").notNull(),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
  isPublished: boolean("is_published").notNull().default(true),
}, (table) => [
  uniqueIndex("bedtime_stories_date_unique").on(table.storyDate),
]);

export const insertBedtimeStorySchema = createInsertSchema(bedtimeStories).omit({ id: true, generatedAt: true });
export type InsertBedtimeStory = z.infer<typeof insertBedtimeStorySchema>;
export type BedtimeStory = typeof bedtimeStories.$inferSelect;

// ============================================
// DHAMBAALKA WAALIDKA (PARENT'S MESSAGE/BLOG)
// ============================================

// Parent Messages table (AI-generated daily parenting blog for Somali parents)
export const parentMessages = pgTable("parent_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  topic: varchar("topic", { length: 255 }).notNull(),
  keyPoints: text("key_points"),
  images: text("images").array().notNull().default(sql`ARRAY[]::text[]`),
  thumbnailUrl: text("thumbnail_url"),
  audioUrl: text("audio_url"),
  messageDate: date("message_date").notNull(),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
  isPublished: boolean("is_published").notNull().default(true),
  authorName: varchar("author_name", { length: 255 }).default("Musse Said Aw-Musse"),
  ageCategory: varchar("age_category", { length: 50 }),
}, (table) => [
  uniqueIndex("parent_messages_date_unique").on(table.messageDate),
]);

export const insertParentMessageSchema = createInsertSchema(parentMessages).omit({ id: true, generatedAt: true });
export type InsertParentMessage = z.infer<typeof insertParentMessageSchema>;
export type ParentMessage = typeof parentMessages.$inferSelect;

// ============================================
// TALOOYINKA WAALIDKA (PARENT TIPS BY DEV STAGE)
// ============================================

export const DEVELOPMENTAL_STAGES = [
  { id: "newborn-0-3m", label: "Murjux (0-3 bilood)", labelEn: "Newborn (0-3 months)" },
  { id: "infant-3-6m", label: "Fadhi-barad (3-6 bilood)", labelEn: "Infant (3-6 months)" },
  { id: "infant-6-12m", label: "Gurguurte (6-12 bilood)", labelEn: "Infant (6-12 months)" },
  { id: "toddler-1-2y", label: "Socod barad (1-2 sano)", labelEn: "Toddler (1-2 years)" },
  { id: "toddler-2-3y", label: "Inyow (2-3 sano)", labelEn: "Toddler (2-3 years)" },
  { id: "preschool-3-5y", label: "Dareeme (3-5 sano)", labelEn: "Preschool (3-5 years)" },
  { id: "school-age-5-7y", label: "Salaad-barad (5-7 sano)", labelEn: "School Age (5-7 years)" },
] as const;

export const parentTips = pgTable("parent_tips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  stage: varchar("stage", { length: 50 }).notNull(),
  topic: varchar("topic", { length: 255 }).notNull(),
  keyPoints: text("key_points"),
  images: text("images").array().notNull().default(sql`ARRAY[]::text[]`),
  audioUrl: text("audio_url"),
  tipDate: date("tip_date").notNull(),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  isPublished: boolean("is_published").notNull().default(true),
});

export const insertParentTipSchema = createInsertSchema(parentTips).omit({ id: true, generatedAt: true });
export type InsertParentTip = z.infer<typeof insertParentTipSchema>;
export type ParentTip = typeof parentTips.$inferSelect;

// ============================================
// CONTENT ENGAGEMENT (REACTIONS & COMMENTS)
// ============================================

// Content Reactions table (reactions for bedtime stories and parent messages)
export const contentReactions = pgTable("content_reactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  contentType: text("content_type").notNull(), // 'bedtime_story' or 'parent_message'
  contentId: varchar("content_id").notNull(),
  reactionType: text("reaction_type").notNull(), // 'love', 'like', 'dislike', 'sparkle'
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("content_reactions_unique").on(table.parentId, table.contentType, table.contentId),
]);

export const insertContentReactionSchema = createInsertSchema(contentReactions).omit({ id: true, createdAt: true });
export type InsertContentReaction = z.infer<typeof insertContentReactionSchema>;
export type ContentReaction = typeof contentReactions.$inferSelect;

// Content Comments table (comments for bedtime stories and parent messages)
export const contentComments = pgTable("content_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  contentType: text("content_type").notNull(), // 'bedtime_story' or 'parent_message'
  contentId: varchar("content_id").notNull(),
  replyToId: varchar("reply_to_id"), // For nested replies, references another comment id
  body: text("body").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
  isHidden: boolean("is_hidden").notNull().default(false), // For moderation
});

export const insertContentCommentSchema = createInsertSchema(contentComments).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContentComment = z.infer<typeof insertContentCommentSchema>;
export type ContentComment = typeof contentComments.$inferSelect;

// Comment Reactions table (reactions on comments)
export const commentReactions = pgTable("comment_reactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  commentId: varchar("comment_id").notNull().references(() => contentComments.id, { onDelete: "cascade" }),
  reactionType: text("reaction_type").notNull(), // 'love', 'like', 'dislike', 'sparkle'
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("comment_reactions_unique").on(table.parentId, table.commentId),
]);

export const insertCommentReactionSchema = createInsertSchema(commentReactions).omit({ id: true, createdAt: true });
export type InsertCommentReaction = z.infer<typeof insertCommentReactionSchema>;
export type CommentReaction = typeof commentReactions.$inferSelect;

// ============================================
// DHAMBAALKA WAALIDKA DISCUSSION (Per-article discussion with audio)
// ============================================

export const dhambaalDiscussionPosts = pgTable("dhambaal_discussion_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull(),
  userId: varchar("user_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  parentPostId: varchar("parent_post_id"),
  content: text("content"),
  audioUrl: text("audio_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type DhambaalDiscussionPost = typeof dhambaalDiscussionPosts.$inferSelect;

export const dhambaalDiscussionReactions = pgTable("dhambaal_discussion_reactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => dhambaalDiscussionPosts.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  reactionType: text("reaction_type").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("dhambaal_discussion_reactions_unique").on(table.postId, table.userId, table.reactionType),
]);

export type DhambaalDiscussionReaction = typeof dhambaalDiscussionReactions.$inferSelect;

// ============================================
// PARENT SOCIAL NETWORK (FOLLOW & MESSAGING)
// ============================================

// Parent Follows table (who follows whom)
export const parentFollows = pgTable("parent_follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  followingId: varchar("following_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("parent_follows_unique").on(table.followerId, table.followingId),
]);

export const insertParentFollowSchema = createInsertSchema(parentFollows).omit({ id: true, createdAt: true });
export type InsertParentFollow = z.infer<typeof insertParentFollowSchema>;
export type ParentFollow = typeof parentFollows.$inferSelect;

// Direct Messages table (private messages between parents)
export const directMessages = pgTable("direct_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  receiverId: varchar("receiver_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  audioUrl: text("audio_url"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDirectMessageSchema = createInsertSchema(directMessages).omit({ id: true, createdAt: true });
export type InsertDirectMessage = z.infer<typeof insertDirectMessageSchema>;
export type DirectMessage = typeof directMessages.$inferSelect;

// Social Notifications table (new follower, new message notifications)
export const socialNotifications = pgTable("social_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'new_follower', 'new_message', 'comment_reaction'
  actorId: varchar("actor_id").notNull().references(() => parents.id, { onDelete: "cascade" }), // who triggered the notification
  referenceId: varchar("reference_id"), // message id, comment id, etc.
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSocialNotificationSchema = createInsertSchema(socialNotifications).omit({ id: true, createdAt: true });
export type InsertSocialNotification = z.infer<typeof insertSocialNotificationSchema>;
export type SocialNotification = typeof socialNotifications.$inferSelect;

// Parent Posts table (Facebook-like feed posts)
export const parentPosts = pgTable("parent_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }),
  content: text("content"),
  audioUrl: text("audio_url"),
  visibility: text("visibility").notNull().default("public"), // 'public', 'followers', 'private'
  likeCount: integer("like_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertParentPostSchema = createInsertSchema(parentPosts).omit({ id: true, createdAt: true, updatedAt: true, likeCount: true, commentCount: true });
export type InsertParentPost = z.infer<typeof insertParentPostSchema>;
export type ParentPost = typeof parentPosts.$inferSelect;

// Parent Post Images table (images attached to posts)
export const parentPostImages = pgTable("parent_post_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => parentPosts.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  storageKey: text("storage_key"), // for deletion from object storage
  altText: varchar("alt_text", { length: 255 }),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertParentPostImageSchema = createInsertSchema(parentPostImages).omit({ id: true, createdAt: true });
export type InsertParentPostImage = z.infer<typeof insertParentPostImageSchema>;
export type ParentPostImage = typeof parentPostImages.$inferSelect;

// Course Promotions table (ads for courses in the sidebar)
export const coursePromotions = pgTable("course_promotions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  headline: varchar("headline", { length: 150 }).notNull(), // catchy headline for the ad
  description: text("description"), // optional short description
  imageUrl: text("image_url"), // custom promotional image (Google Drive)
  priority: integer("priority").notNull().default(0), // higher = shows first
  isActive: boolean("is_active").notNull().default(true),
  startDate: timestamp("start_date"), // when to start showing
  endDate: timestamp("end_date"), // when to stop showing
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertCoursePromotionSchema = createInsertSchema(coursePromotions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCoursePromotion = z.infer<typeof insertCoursePromotionSchema>;
export type CoursePromotion = typeof coursePromotions.$inferSelect;

// Parent Post Reactions table (5 reaction types: love, haha, wow, sad, angry)
export const parentPostReactions = pgTable("parent_post_reactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => parentPosts.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  reactionType: text("reaction_type").notNull(), // 'love', 'haha', 'wow', 'sad', 'angry'
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("post_parent_reaction_unique").on(table.postId, table.parentId),
]);

export const insertParentPostReactionSchema = createInsertSchema(parentPostReactions).omit({ id: true, createdAt: true });
export type InsertParentPostReaction = z.infer<typeof insertParentPostReactionSchema>;
export type ParentPostReaction = typeof parentPostReactions.$inferSelect;

// Parent Post Comments table (with edit/delete support and nested replies)
export const parentPostComments = pgTable("parent_post_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => parentPosts.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  parentCommentId: varchar("parent_comment_id"), // For nested replies - null means top-level comment
  body: text("body").notNull(),
  isEdited: boolean("is_edited").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertParentPostCommentSchema = createInsertSchema(parentPostComments).omit({ id: true, createdAt: true, updatedAt: true, isEdited: true });
export type InsertParentPostComment = z.infer<typeof insertParentPostCommentSchema>;
export type ParentPostComment = typeof parentPostComments.$inferSelect;

// Parent Post Comment Images table
export const parentPostCommentImages = pgTable("parent_post_comment_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  commentId: varchar("comment_id").notNull().references(() => parentPostComments.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  storageKey: text("storage_key"), // Google Drive file ID
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertParentPostCommentImageSchema = createInsertSchema(parentPostCommentImages).omit({ id: true, createdAt: true });
export type InsertParentPostCommentImage = z.infer<typeof insertParentPostCommentImageSchema>;
export type ParentPostCommentImage = typeof parentPostCommentImages.$inferSelect;

// Parent Post Comment Reactions table (emoji reactions on comments)
export const parentPostCommentReactions = pgTable("parent_post_comment_reactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  commentId: varchar("comment_id").notNull().references(() => parentPostComments.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  reactionType: text("reaction_type").notNull(), // 'like', 'dislike', 'love', 'haha', 'wow', 'sad', 'angry'
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("comment_parent_reaction_unique").on(table.commentId, table.parentId),
]);

export const insertParentPostCommentReactionSchema = createInsertSchema(parentPostCommentReactions).omit({ id: true, createdAt: true });
export type InsertParentPostCommentReaction = z.infer<typeof insertParentPostCommentReactionSchema>;
export type ParentPostCommentReaction = typeof parentPostCommentReactions.$inferSelect;

// Pricing Plans table (admin-managed subscription and one-time prices)
export const pricingPlans = pgTable("pricing_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planType: text("plan_type").notNull().unique(), // 'yearly', 'monthly', 'one-time'
  name: text("name").notNull(), // 'Xubin Dahabi', 'Xubin Biile', 'Hal Mar Iibso'
  description: text("description"),
  priceUsd: integer("price_usd").notNull(), // Price in cents (e.g., 11400 = $114)
  interval: text("interval"), // 'year', 'month', null for one-time
  isRecurring: boolean("is_recurring").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertPricingPlanSchema = createInsertSchema(pricingPlans).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPricingPlan = z.infer<typeof insertPricingPlanSchema>;
export type PricingPlan = typeof pricingPlans.$inferSelect;

// Learning Groups table (cohort-based learning)
export const learningGroups = pgTable("learning_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  coverImage: text("cover_image"),
  courseIds: text("course_ids").array(),
  contentType: text("content_type"),
  contentId: text("content_id"),
  createdBy: varchar("created_by").notNull().references(() => parents.id, { onDelete: "cascade" }),
  isPublic: boolean("is_public").notNull().default(true),
  maxMembers: integer("max_members").default(50),
  memberCount: integer("member_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertLearningGroupSchema = createInsertSchema(learningGroups).omit({ id: true, createdAt: true, updatedAt: true, memberCount: true });
export type InsertLearningGroup = z.infer<typeof insertLearningGroupSchema>;
export type LearningGroup = typeof learningGroups.$inferSelect;

// Group Members table
export const groupMembers = pgTable("group_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => learningGroups.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("group_member_unique").on(table.groupId, table.userId),
]);

export const insertGroupMemberSchema = createInsertSchema(groupMembers).omit({ id: true, joinedAt: true });
export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;
export type GroupMember = typeof groupMembers.$inferSelect;

// Group Posts table (text + optional audio)
export const groupPosts = pgTable("group_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => learningGroups.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  title: text("title"),
  content: text("content"),
  audioUrl: text("audio_url"),
  imageUrl: text("image_url"),
  likeCount: integer("like_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertGroupPostSchema = createInsertSchema(groupPosts).omit({ id: true, createdAt: true, updatedAt: true, likeCount: true, commentCount: true });
export type InsertGroupPost = z.infer<typeof insertGroupPostSchema>;
export type GroupPost = typeof groupPosts.$inferSelect;

// Group Post Likes table
export const groupPostLikes = pgTable("group_post_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => groupPosts.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("group_post_like_unique").on(table.postId, table.userId),
]);

export const insertGroupPostLikeSchema = createInsertSchema(groupPostLikes).omit({ id: true, createdAt: true });
export type InsertGroupPostLike = z.infer<typeof insertGroupPostLikeSchema>;
export type GroupPostLike = typeof groupPostLikes.$inferSelect;

export const groupPostReactions = pgTable("group_post_reactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => groupPosts.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  emoji: text("emoji").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("group_post_reaction_unique").on(table.postId, table.userId, table.emoji),
]);

export type GroupPostReaction = typeof groupPostReactions.$inferSelect;

// Group Post Comments table
export const groupPostComments = pgTable("group_post_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => groupPosts.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGroupPostCommentSchema = createInsertSchema(groupPostComments).omit({ id: true, createdAt: true });
export type InsertGroupPostComment = z.infer<typeof insertGroupPostCommentSchema>;
export type GroupPostComment = typeof groupPostComments.$inferSelect;

// Lesson Discussion Groups - auto-created per lesson
export const lessonGroups = pgTable("lesson_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lessonId: varchar("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("lesson_group_lesson_unique").on(table.lessonId),
]);

export type LessonGroup = typeof lessonGroups.$inferSelect;

// Posts within lesson discussion groups
export const lessonGroupPosts = pgTable("lesson_group_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => lessonGroups.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  parentPostId: varchar("parent_post_id"),
  content: text("content"),
  audioUrl: text("audio_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLessonGroupPostSchema = createInsertSchema(lessonGroupPosts).omit({ id: true, createdAt: true });
export type InsertLessonGroupPost = z.infer<typeof insertLessonGroupPostSchema>;
export type LessonGroupPost = typeof lessonGroupPosts.$inferSelect;

// Reactions on lesson group posts (emoji-based)
export const lessonGroupPostReactions = pgTable("lesson_group_post_reactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => lessonGroupPosts.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  reactionType: varchar("reaction_type", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("lesson_reaction_unique").on(table.postId, table.userId, table.reactionType),
]);

export const insertLessonGroupPostReactionSchema = createInsertSchema(lessonGroupPostReactions).omit({ id: true, createdAt: true });
export type InsertLessonGroupPostReaction = z.infer<typeof insertLessonGroupPostReactionSchema>;
export type LessonGroupPostReaction = typeof lessonGroupPostReactions.$inferSelect;

// ============================================
// CONTENT PROGRESS (DHAMBAAL & SHEEKO TRACKING)
// ============================================

export const contentProgress = pgTable("content_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  contentType: text("content_type").notNull(), // 'dhambaal' or 'sheeko'
  contentId: varchar("content_id").notNull(),
  completed: boolean("completed").notNull().default(true),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("content_progress_unique").on(table.parentId, table.contentType, table.contentId),
]);

export const insertContentProgressSchema = createInsertSchema(contentProgress).omit({ id: true, completedAt: true });
export type InsertContentProgress = z.infer<typeof insertContentProgressSchema>;
export type ContentProgress = typeof contentProgress.$inferSelect;

export const googleMeetEvents = pgTable("google_meet_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  meetLink: text("meet_link").notNull(),
  eventDate: text("event_date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  mediaType: text("media_type").notNull().default("video"),
  mediaTitle: text("media_title"),
  driveFileId: text("drive_file_id"),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGoogleMeetEventSchema = createInsertSchema(googleMeetEvents).omit({ id: true, createdAt: true });
export type InsertGoogleMeetEvent = z.infer<typeof insertGoogleMeetEventSchema>;
export type GoogleMeetEvent = typeof googleMeetEvents.$inferSelect;

// ============================================
// OPENAI BATCH API PROCESSING
// ============================================

// Batch Jobs table - tracks OpenAI batch API jobs
export const batchJobs = pgTable("batch_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  batchId: text("batch_id"), // OpenAI batch job ID
  type: text("type").notNull(), // 'translation', 'summary', 'quiz_improvement'
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed, cancelled
  inputFileId: text("input_file_id"), // OpenAI file ID for input
  outputFileId: text("output_file_id"), // OpenAI file ID for output
  errorFileId: text("error_file_id"), // OpenAI file ID for errors
  totalRequests: integer("total_requests").notNull().default(0),
  completedRequests: integer("completed_requests").notNull().default(0),
  failedRequests: integer("failed_requests").notNull().default(0),
  metadata: text("metadata"), // JSON string with additional info (consider jsonb in future for better queries)
  error: text("error"), // Error message if failed
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertBatchJobSchema = createInsertSchema(batchJobs).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBatchJob = z.infer<typeof insertBatchJobSchema>;
export type BatchJob = typeof batchJobs.$inferSelect;

// Batch Job Items table - tracks individual items within a batch
export const batchJobItems = pgTable("batch_job_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  batchJobId: varchar("batch_job_id").notNull().references(() => batchJobs.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(), // 'lesson', 'quiz_question', etc.
  entityId: varchar("entity_id").notNull(), // ID of the lesson/quiz/etc.
  customId: text("custom_id").notNull(), // Custom ID for tracking in batch request
  status: text("status").notNull().default("pending"), // pending, completed, failed
  request: text("request"), // JSON string of the request
  response: text("response"), // JSON string of the response
  error: text("error"), // Error message if failed
  createdAt: timestamp("created_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
});

export const insertBatchJobItemSchema = createInsertSchema(batchJobItems).omit({ id: true, createdAt: true });
export type InsertBatchJobItem = z.infer<typeof insertBatchJobItemSchema>;
export type BatchJobItem = typeof batchJobItems.$inferSelect;

// Translations table - stores translated content for lessons
export const translations = pgTable("translations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(), // 'lesson', 'quiz_question', etc.
  entityId: varchar("entity_id").notNull(), // ID of the lesson/quiz/etc.
  fieldName: text("field_name").notNull(), // 'title', 'description', 'textContent', etc.
  sourceLanguage: text("source_language").notNull().default("somali"),
  targetLanguage: text("target_language").notNull(), // 'english', 'arabic', etc.
  translatedText: text("translated_text").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("translation_unique").on(table.entityType, table.entityId, table.fieldName, table.targetLanguage),
]);

export const insertTranslationSchema = createInsertSchema(translations).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTranslation = z.infer<typeof insertTranslationSchema>;
export type Translation = typeof translations.$inferSelect;

export const promoVideos = pgTable("promo_videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  isVisible: boolean("is_visible").notNull().default(true),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPromoVideoSchema = createInsertSchema(promoVideos).omit({ id: true, createdAt: true });
export type InsertPromoVideo = z.infer<typeof insertPromoVideoSchema>;
export type PromoVideo = typeof promoVideos.$inferSelect;

export const ssoTokens = pgTable("sso_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: integer("user_id").notNull(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  used: boolean("used").notNull().default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
