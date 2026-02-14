import { users, courses, lessons, quizzes, quizQuestions, paymentMethods, paymentSubmissions, enrollments, parents, testimonials, testimonialReactions, assignmentSubmissions, supportMessages, lessonProgress, assignments, modules, dailyTips, dailyTipSchedules, milestones, milestoneProgress, badges, badgeAwards, certificates, resources, communityThreads, communityPosts, communityLikes, liveEvents, eventRsvps, courseReviews, pushSubscriptions, assessmentQuestions, parentAssessments, assessmentResponses, aiAssessmentInsights, learningPathRecommendations, passwordResetTokens, homeworkConversations, homeworkMessages, homeworkUsage, parentingConversations, parentingMessages, parentingUsage, telegramReferrals, aiGeneratedTips, appointments, availabilitySlots, calendarAvailability, announcements, homepageSections, parentCommunitySettings, lessonImages, flashcardCategories, flashcards, flashcardProgress, expenses, receiptFingerprints, receiptAttempts, lessonBookmarks, lessonExercises, exerciseProgress, conversations, messages, userPresence, bankTransfers, quranReciters, hadiths, parentNotifications, parentPrayerSettings, voiceRooms, voiceParticipants, voiceRoomMessages, voiceRoomRsvps, voiceRecordings, voiceRoomBans, hostFollows, sheekoFollows, sheekoAppreciations, contentReports, moderationActions, userConsent, aiModerationReports, bedtimeStories, parentMessages, contentReactions, contentComments, commentReactions, parentFollows, directMessages, socialNotifications, parentPosts, parentPostImages, coursePromotions, parentPostReactions, parentPostComments, parentPostCommentImages, parentPostCommentReactions, userBlocks, googleMeetEvents, type User, type InsertUser, type VoiceRoom, type InsertVoiceRoom, type VoiceParticipant, type InsertVoiceParticipant, type VoiceRoomMessage, type InsertVoiceRoomMessage, type VoiceRoomRsvp, type InsertVoiceRoomRsvp, type VoiceRecording, type InsertVoiceRecording, type VoiceRoomBan, type InsertVoiceRoomBan, type HostFollow, type InsertHostFollow, type SheekoFollow, type InsertSheekoFollow, type SheekoAppreciation, type InsertSheekoAppreciation, type ContentReport, type InsertContentReport, type ModerationAction, type InsertModerationAction, type UserConsent, type InsertUserConsent, type CoursePromotion, type InsertCoursePromotion, type ParentPostReaction, type InsertParentPostReaction, type ParentPostComment, type InsertParentPostComment, type AiModerationReport, type InsertAiModerationReport, type BedtimeStory, type InsertBedtimeStory, type ParentMessage, type InsertParentMessage, type ContentReaction, type InsertContentReaction, type ContentComment, type InsertContentComment, type CommentReaction, type InsertCommentReaction, type ParentFollow, type InsertParentFollow, type DirectMessage, type InsertDirectMessage, type SocialNotification, type InsertSocialNotification, type ParentPost, type InsertParentPost, type ParentPostImage, type InsertParentPostImage, type Course, type InsertCourse, type Lesson, type InsertLesson, type Quiz, type InsertQuiz, type QuizQuestion, type InsertQuizQuestion, type PaymentMethod, type InsertPaymentMethod, type PaymentSubmission, type InsertPaymentSubmission, type Enrollment, type InsertEnrollment, type Parent, type InsertParent, type Testimonial, type InsertTestimonial, type AssignmentSubmission, type InsertAssignmentSubmission, type SupportMessage, type InsertSupportMessage, type LessonProgress, type InsertLessonProgress, type Assignment, type InsertAssignment, type Module, type InsertModule, type DailyTip, type InsertDailyTip, type DailyTipSchedule, type InsertDailyTipSchedule, type Milestone, type InsertMilestone, type MilestoneProgress, type InsertMilestoneProgress, type Badge, type InsertBadge, type BadgeAward, type InsertBadgeAward, type Certificate, type InsertCertificate, type Resource, type InsertResource, type CommunityThread, type InsertCommunityThread, type CommunityPost, type InsertCommunityPost, type QuranReciter, type InsertQuranReciter, type Hadith, type InsertHadith, type ParentNotification, type InsertParentNotification, type ParentPrayerSettings, type InsertParentPrayerSettings, type CommunityLike, type InsertCommunityLike, type BankTransfer, type InsertBankTransfer, type LiveEvent, type InsertLiveEvent, type EventRsvp, type InsertEventRsvp, type CourseReview, type InsertCourseReview, type Expense, type InsertExpense, type PushSubscription, type InsertPushSubscription, type FlashcardCategory, type InsertFlashcardCategory, type Flashcard, type InsertFlashcard, type FlashcardProgress, type InsertFlashcardProgress, type AssessmentQuestion, type InsertAssessmentQuestion, type ParentAssessment, type InsertParentAssessment, type AssessmentResponse, type InsertAssessmentResponse, type AiAssessmentInsight, type InsertAiAssessmentInsight, type LearningPathRecommendation, type InsertLearningPathRecommendation, type HomeworkConversation, type InsertHomeworkConversation, type HomeworkMessage, type InsertHomeworkMessage, type HomeworkUsage, type InsertHomeworkUsage, type ParentingConversation, type InsertParentingConversation, type ParentingMessage, type InsertParentingMessage, type ParentingUsage, type InsertParentingUsage, type TelegramReferral, type InsertTelegramReferral, type AiGeneratedTip, type InsertAiGeneratedTip, type Appointment, type InsertAppointment, type AvailabilitySlot, type InsertAvailabilitySlot, type CalendarAvailability, type InsertCalendarAvailability, type Announcement, type InsertAnnouncement, type HomepageSection, type InsertHomepageSection, type ParentCommunitySetting, type InsertParentCommunitySetting, type LessonImage, type InsertLessonImage, type ReceiptFingerprint, type InsertReceiptFingerprint, type ReceiptAttempt, type InsertReceiptAttempt, type LessonBookmark, type InsertLessonBookmark, type LessonExercise, type InsertLessonExercise, type ExerciseProgress, type InsertExerciseProgress, type ParentPostCommentImage, type InsertParentPostCommentImage, pricingPlans, type PricingPlan, type InsertPricingPlan, contentProgress, type ContentProgress, type GoogleMeetEvent, type InsertGoogleMeetEvent } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, lte, gte, sql, asc, ilike, or, not, isNull, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPicture(id: string, picture: string): Promise<User | undefined>;
  
  // Course operations
  getAllCourses(): Promise<Course[]>;
  getCourse(id: string): Promise<Course | undefined>;
  getCourseByCourseId(courseId: string): Promise<Course | undefined>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: string, course: Partial<InsertCourse>): Promise<Course | undefined>;
  deleteCourse(id: string): Promise<void>;
  
  // Lesson operations
  getAllLessons(): Promise<Lesson[]>;
  getLessonsByCourseId(courseId: string): Promise<Lesson[]>;
  getLesson(id: string): Promise<Lesson | undefined>;
  createLesson(lesson: InsertLesson): Promise<Lesson>;
  updateLesson(id: string, lesson: Partial<InsertLesson>): Promise<Lesson | undefined>;
  deleteLesson(id: string): Promise<void>;
  reorderLessons(courseId: string, orderedIds: string[]): Promise<void>;

  // Quiz operations
  getQuizzesByLessonId(lessonId: string): Promise<Quiz[]>;
  getQuiz(id: string): Promise<Quiz | undefined>;
  createQuiz(quiz: InsertQuiz): Promise<Quiz>;
  deleteQuiz(id: string): Promise<void>;
  
  // Quiz Question operations
  getQuizQuestions(quizId: string): Promise<QuizQuestion[]>;
  createQuizQuestion(question: InsertQuizQuestion): Promise<QuizQuestion>;
  deleteQuizQuestion(id: string): Promise<void>;

  // Payment Method operations
  getActivePaymentMethods(): Promise<PaymentMethod[]>;
  getPaymentMethod(id: string): Promise<PaymentMethod | undefined>;
  createPaymentMethod(method: InsertPaymentMethod): Promise<PaymentMethod>;

  // Payment Submission operations
  getAllPaymentSubmissions(): Promise<PaymentSubmission[]>;
  getPaymentSubmission(id: string): Promise<PaymentSubmission | undefined>;
  createPaymentSubmission(submission: InsertPaymentSubmission): Promise<PaymentSubmission>;
  updatePaymentSubmissionStatus(id: string, status: string, reviewedBy: string): Promise<PaymentSubmission | undefined>;
  updatePaymentSubmission(id: string, data: { status?: string; notes?: string; reviewedBy?: string }): Promise<PaymentSubmission | undefined>;

  // Enrollment operations
  getEnrollmentByPhoneAndCourse(phone: string, courseId: string): Promise<Enrollment | undefined>;
  getEnrollmentsByParentId(parentId: string): Promise<Enrollment[]>;
  getActiveEnrollmentByParentAndCourse(parentId: string, courseId: string): Promise<Enrollment | undefined>;
  getExpiringEnrollments(daysAhead: number): Promise<Enrollment[]>;
  getExpiredEnrollments(): Promise<Enrollment[]>;
  updateEnrollmentStatus(id: string, status: string): Promise<void>;
  renewEnrollment(id: string, planType: string, accessEnd: Date | null, paymentSubmissionId?: string, customerPhone?: string): Promise<Enrollment | undefined>;
  getEnrollmentByParentAndCourse(parentId: string, courseId: string): Promise<Enrollment | undefined>;
  createEnrollment(enrollment: InsertEnrollment): Promise<Enrollment>;
  getAllEnrollments(): Promise<Enrollment[]>;
  getEnrollment(id: string): Promise<Enrollment | undefined>;
  deleteEnrollment(id: string): Promise<void>;
  getUpgradeBannerStatus(enrollmentId: string): Promise<{ shouldShow: boolean; expiresAt?: Date }>;
  markUpgradeBannerShown(enrollmentId: string): Promise<void>;
  
  // Scheduling operations (for 0-6 course)
  getSchedulingStatus(parentId: string, courseId: string): Promise<{ 
    canAccessLesson: boolean; 
    lessonsToday: number; 
    lessonsThisWeek: number; 
    maxPerDay: number; 
    maxPerWeek: number;
    reason?: string;
    code?: string;
  }>;
  recordLessonCompletion(enrollmentId: string): Promise<{ success: boolean; error?: string }>;

  // Parent operations
  getParent(id: string): Promise<Parent | undefined>;
  getParentByGoogleId(googleId: string): Promise<Parent | undefined>;
  getParentByEmail(email: string): Promise<Parent | undefined>;
  getParentByPhone(phone: string): Promise<Parent | undefined>;
  createParent(parent: InsertParent): Promise<Parent>;
  updateParentLastLogin(id: string): Promise<void>;
  updateParentPassword(id: string, hashedPassword: string): Promise<Parent | undefined>;
  updateParent(id: string, data: { name?: string; picture?: string; phone?: string; country?: string; city?: string; whatsappOptin?: boolean; whatsappNumber?: string; telegramOptin?: boolean; telegramChatId?: string; dailyReminderEnabled?: boolean; dailyReminderTime?: string; activeSessionId?: string; lastLoginIp?: string; lastLoginDevice?: string; googleId?: string; stripeCustomerId?: string; stripeSubscriptionId?: string; aiPlan?: string; aiTrialStartedAt?: Date | null; aiTrialEndsAt?: Date | null; aiGoldExpiresAt?: Date | null }): Promise<Parent | undefined>;
  getAllParents(): Promise<Parent[]>;
  deleteParent(id: string): Promise<void>;
  setParentAdmin(id: string, isAdmin: boolean): Promise<Parent | undefined>;
  setParentHostStatus(id: string, canHostSheeko: boolean): Promise<Parent | undefined>;
  getApprovedHosts(): Promise<Parent[]>;
  
  // Community terms & user blocks (App Store compliance)
  acceptCommunityTerms(parentId: string): Promise<void>;
  blockUser(blockerId: string, blockedId: string): Promise<void>;
  unblockUser(blockerId: string, blockedId: string): Promise<void>;
  getBlockedUsers(parentId: string): Promise<{ id: string; name: string; picture: string | null }[]>;
  isUserBlocked(blockerId: string, blockedId: string): Promise<boolean>;
  getBlockedByUsers(parentId: string): Promise<string[]>;
  
  getEventRsvps(eventId: string): Promise<EventRsvp[]>;
  markRsvpReminderSent(rsvpId: string, reminderType: "24h" | "1h"): Promise<void>;
  getPaymentsByEmail(email: string): Promise<PaymentSubmission[]>;
  getProgressByParentId(parentId: string): Promise<LessonProgress[]>;
  markLessonComplete(parentId: string, lessonId: string, courseId: string): Promise<LessonProgress | { error: string; code?: string }>;
  getLessonProgress(parentId: string, lessonId: string): Promise<LessonProgress | undefined>;
  updateVideoProgress(parentId: string, lessonId: string, courseId: string, percent: number): Promise<LessonProgress>;
  updateLastViewed(parentId: string, lessonId: string, courseId: string): Promise<LessonProgress>;
  checkLessonUnlocked(parentId: string, lesson: Lesson): Promise<{ unlocked: boolean; reason?: string; unlockDate?: string }>;
  checkPreviousLessonCompleted(parentId: string, lesson: Lesson): Promise<{ canAccess: boolean; previousLessonId?: string; previousLessonTitle?: string }>;
  getAllLessonProgress(parentId: string, courseId: string): Promise<LessonProgress[]>;

  // Testimonial operations
  getPublishedTestimonials(): Promise<Testimonial[]>;
  getAllTestimonials(): Promise<Testimonial[]>;
  getTestimonial(id: string): Promise<Testimonial | undefined>;
  createTestimonial(testimonial: InsertTestimonial): Promise<Testimonial>;
  updateTestimonial(id: string, testimonial: Partial<InsertTestimonial>): Promise<Testimonial | undefined>;
  deleteTestimonial(id: string): Promise<void>;

  // Lesson Image operations
  getLessonImages(lessonId: string): Promise<LessonImage[]>;
  createLessonImage(image: InsertLessonImage): Promise<LessonImage>;
  deleteLessonImage(id: string): Promise<void>;

  // Quiz operations for admin
  getAllQuizzesWithDetails(): Promise<any[]>;
  getQuizzesByCourseId(courseId: string): Promise<any[]>;

  // Assignment operations
  getAssignment(id: string): Promise<any | null>;
  getAssignmentsByLessonId(lessonId: string): Promise<any[]>;
  getAssignmentsByCourseId(courseId: string): Promise<any[]>;
  getAllAssignmentsWithDetails(): Promise<any[]>;
  createAssignment(assignment: any): Promise<any>;
  deleteAssignment(id: string): Promise<void>;
  deleteQuiz(id: string): Promise<void>;

  // Assignment Submission operations
  getAssignmentSubmissionByParentAndLesson(parentId: string, lessonId: string): Promise<AssignmentSubmission | undefined>;
  getAllAssignmentSubmissions(): Promise<AssignmentSubmission[]>;
  getAllAssignmentSubmissionsWithDetails(): Promise<any[]>;
  getAssignmentSubmissionsByParentAndAssignment(parentId: string, assignmentId: string): Promise<AssignmentSubmission[]>;
  createAssignmentSubmission(submission: InsertAssignmentSubmission): Promise<AssignmentSubmission>;
  updateAssignmentSubmission(id: string, data: Partial<AssignmentSubmission>): Promise<AssignmentSubmission | undefined>;

  // Support Message operations
  getSupportMessagesByParentId(parentId: string): Promise<SupportMessage[]>;
  getAllSupportMessages(): Promise<SupportMessage[]>;
  createSupportMessage(message: InsertSupportMessage): Promise<SupportMessage>;

  // Stats operations
  getParentCount(): Promise<number>;
  
  // Parent Progress tracking for educator dashboard
  getAllParentsWithProgress(): Promise<{
    parent: Parent;
    lessonsCompleted: number;
    totalLessons: number;
    enrolledCourses: number;
    assessmentsCompleted: number;
    lastActivity: string | null;
  }[]>;

  // Module operations
  getAllModules(): Promise<Module[]>;
  getModulesByCourseId(courseId: string): Promise<Module[]>;
  getModule(id: string): Promise<Module | undefined>;
  createModule(module: InsertModule): Promise<Module>;
  updateModule(id: string, data: Partial<InsertModule>): Promise<Module | undefined>;
  deleteModule(id: string): Promise<void>;

  // Daily Tips admin operations
  getAllDailyTips(): Promise<DailyTip[]>;
  createDailyTip(tip: InsertDailyTip): Promise<DailyTip>;
  updateDailyTip(id: string, data: Partial<InsertDailyTip>): Promise<DailyTip | undefined>;
  deleteDailyTip(id: string): Promise<void>;

  // Daily Tip Schedule operations
  getAllDailyTipSchedules(): Promise<DailyTipSchedule[]>;
  getDailyTipSchedulesByTipId(tipId: string): Promise<DailyTipSchedule[]>;
  getScheduledTipForDate(date: string): Promise<DailyTip | null>;
  getScheduledTipForWeek(weekNumber: number): Promise<DailyTip | null>;
  createDailyTipSchedule(schedule: InsertDailyTipSchedule): Promise<DailyTipSchedule>;
  updateDailyTipSchedule(id: string, data: Partial<InsertDailyTipSchedule>): Promise<DailyTipSchedule | undefined>;
  deleteDailyTipSchedule(id: string): Promise<void>;

  // Milestones admin operations
  getAllMilestones(): Promise<Milestone[]>;
  createMilestone(milestone: InsertMilestone): Promise<Milestone>;
  updateMilestone(id: string, data: Partial<InsertMilestone>): Promise<Milestone | undefined>;
  deleteMilestone(id: string): Promise<void>;

  // Badge operations
  getBadges(): Promise<Badge[]>;
  getEarnedBadges(parentId: string): Promise<BadgeAward[]>;
  hasEarnedBadge(parentId: string, badgeId: string): Promise<boolean>;
  awardBadge(parentId: string, badgeId: string): Promise<BadgeAward | null>;
  getBadgesByTrigger(triggerType: string, triggerValue?: string): Promise<Badge[]>;
  createBadge(data: { name: string; description?: string; imageUrl?: string; triggerType: string; triggerValue?: string; order?: number }): Promise<Badge>;
  ensureDefaultBadges(): Promise<void>;
  getCompletedLessonsCount(parentId: string): Promise<number>;
  
  // Streak operations
  updateStreak(parentId: string): Promise<{ currentStreak: number; longestStreak: number; streakUpdated: boolean }>;
  getStreak(parentId: string): Promise<{ currentStreak: number; longestStreak: number; lastStreakDate: string | null }>;
  getActivityCalendar(parentId: string, year: number, month: number): Promise<{ day: number; lessonsCompleted: number }[]>;
  getWeeklyProgress(parentId: string): Promise<{
    weekStart: string;
    weekEnd: string;
    days: { date: string; dayName: string; lessonsCompleted: number }[];
    totalLessons: number;
    todayDate: string;
  }>;

  // Points operations
  addPoints(parentId: string, points: number, reason: string): Promise<number>;
  getPoints(parentId: string): Promise<number>;
  getLeaderboard(limit?: number): Promise<{ id: string; name: string; picture: string | null; points: number }[]>;

  // Assessment operations
  getActiveAssessmentQuestions(ageRange?: string): Promise<AssessmentQuestion[]>;
  createParentAssessment(assessment: InsertParentAssessment): Promise<ParentAssessment>;
  getParentAssessment(id: string): Promise<ParentAssessment | undefined>;
  getLatestAssessmentByParent(parentId: string): Promise<ParentAssessment | undefined>;
  getLatestAnalyzedAssessmentByParent(parentId: string): Promise<ParentAssessment | undefined>;
  getAllAssessmentsByParent(parentId: string): Promise<ParentAssessment[]>;
  updateParentAssessmentStatus(id: string, status: string): Promise<ParentAssessment | undefined>;
  saveAssessmentResponses(assessmentId: string, responses: { questionId: string; response: string }[]): Promise<void>;
  getAssessmentResponses(assessmentId: string): Promise<AssessmentResponse[]>;
  saveAiInsights(insight: InsertAiAssessmentInsight): Promise<AiAssessmentInsight>;
  getAiInsights(assessmentId: string): Promise<AiAssessmentInsight | undefined>;
  saveLearningPathRecommendations(recommendations: InsertLearningPathRecommendation[]): Promise<LearningPathRecommendation[]>;
  getLearningPathRecommendations(assessmentId: string): Promise<LearningPathRecommendation[]>;

  // Password Reset operations
  createPasswordResetToken(parentId: string, token: string, expiresAt: Date): Promise<void>;
  getValidPasswordResetToken(token: string): Promise<{ id: string; parentId: string; token: string; expiresAt: Date } | undefined>;
  markPasswordResetTokenUsed(token: string): Promise<void>;
  deleteExpiredPasswordResetTokens(parentId: string): Promise<void>;

  // Homework Helper operations
  createHomeworkConversation(conversation: InsertHomeworkConversation): Promise<HomeworkConversation>;
  getHomeworkConversation(id: string): Promise<HomeworkConversation | undefined>;
  getHomeworkConversationsByParent(parentId: string): Promise<HomeworkConversation[]>;
  getHomeworkMessages(conversationId: string): Promise<HomeworkMessage[]>;
  addHomeworkMessage(message: InsertHomeworkMessage): Promise<HomeworkMessage>;
  getHomeworkUsageForDate(parentId: string, date: string): Promise<HomeworkUsage | undefined>;
  incrementHomeworkUsage(parentId: string, date: string): Promise<HomeworkUsage>;

  // Parenting/Tarbiya AI operations
  createParentingConversation(conversation: InsertParentingConversation): Promise<ParentingConversation>;
  getParentingConversation(id: string): Promise<ParentingConversation | undefined>;
  getParentingConversationsByParent(parentId: string): Promise<ParentingConversation[]>;
  getParentingMessages(conversationId: string): Promise<ParentingMessage[]>;
  addParentingMessage(message: InsertParentingMessage): Promise<ParentingMessage>;
  getParentingUsageForDate(parentId: string, date: string): Promise<ParentingUsage | undefined>;
  incrementParentingUsage(parentId: string, date: string): Promise<ParentingUsage>;

  // Telegram Referrals operations (parent feedback from Telegram groups)
  getAllTelegramReferrals(): Promise<TelegramReferral[]>;
  createTelegramReferral(referral: InsertTelegramReferral): Promise<TelegramReferral>;
  deleteTelegramReferral(id: string): Promise<void>;

  // AI Generated Tips operations
  getAllAiGeneratedTips(): Promise<AiGeneratedTip[]>;
  getAiGeneratedTipsByStatus(status: string): Promise<AiGeneratedTip[]>;
  getAiGeneratedTip(id: string): Promise<AiGeneratedTip | undefined>;
  createAiGeneratedTip(tip: InsertAiGeneratedTip): Promise<AiGeneratedTip>;
  updateAiGeneratedTip(id: string, data: { status?: string; correctedContent?: string; adminNotes?: string; publishDate?: string; reviewedBy?: string; audioUrl?: string; title?: string }): Promise<AiGeneratedTip | undefined>;
  getApprovedTipForToday(): Promise<AiGeneratedTip | undefined>;

  // Appointment operations
  getAllAppointments(): Promise<Appointment[]>;
  getAppointmentsByStatus(status: string): Promise<Appointment[]>;
  getAppointmentsByParent(parentId: string): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, data: { status?: string; meetingLink?: string; adminNotes?: string; appointmentDate?: string; appointmentTime?: string }): Promise<Appointment | undefined>;

  // Availability slots operations
  getAllAvailabilitySlots(): Promise<AvailabilitySlot[]>;
  getActiveAvailabilitySlots(): Promise<AvailabilitySlot[]>;
  getAvailabilitySlotsByDay(dayOfWeek: number): Promise<AvailabilitySlot[]>;
  createAvailabilitySlot(slot: InsertAvailabilitySlot): Promise<AvailabilitySlot>;
  deleteAvailabilitySlot(id: string): Promise<void>;
  toggleAvailabilitySlot(id: string, isActive: boolean): Promise<AvailabilitySlot | undefined>;

  // Calendar availability operations (date-specific)
  getAllCalendarAvailability(): Promise<CalendarAvailability[]>;
  getAvailableDates(fromDate: string, toDate: string): Promise<CalendarAvailability[]>;
  getCalendarAvailabilityByDate(date: string): Promise<CalendarAvailability | undefined>;
  setCalendarAvailability(data: InsertCalendarAvailability): Promise<CalendarAvailability>;
  deleteCalendarAvailability(date: string): Promise<void>;

  // Announcements operations (Ogeeysiisyada)
  getAllAnnouncements(): Promise<Announcement[]>;
  getActiveAnnouncements(): Promise<Announcement[]>;
  getAnnouncement(id: string): Promise<Announcement | undefined>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  updateAnnouncement(id: string, data: Partial<InsertAnnouncement>): Promise<Announcement | undefined>;
  deleteAnnouncement(id: string): Promise<void>;

  // Homepage Sections operations (Admin reordering)
  getAllHomepageSections(): Promise<HomepageSection[]>;
  getVisibleHomepageSections(): Promise<HomepageSection[]>;
  updateHomepageSection(id: string, data: Partial<InsertHomepageSection>): Promise<HomepageSection | undefined>;
  reorderHomepageSections(orderedIds: string[]): Promise<void>;

  // Parent Community Settings operations (Baraha Waalidiinta admin settings)
  getAllParentCommunitySettings(): Promise<ParentCommunitySetting[]>;
  getParentCommunitySetting(key: string): Promise<ParentCommunitySetting | undefined>;
  upsertParentCommunitySetting(key: string, value: string | null): Promise<ParentCommunitySetting>;

  // Live Events operations
  getLiveEvents(): Promise<LiveEvent[]>;
  createLiveEvent(event: InsertLiveEvent): Promise<LiveEvent>;
  deleteLiveEventByLessonId(lessonId: string): Promise<void>;
  getLiveEventByLessonId(lessonId: string): Promise<LiveEvent | undefined>;
  updateLiveEvent(id: string, data: Partial<InsertLiveEvent>): Promise<LiveEvent | undefined>;

  // Flashcard Category operations
  getAllFlashcardCategories(): Promise<FlashcardCategory[]>;
  getActiveFlashcardCategories(): Promise<FlashcardCategory[]>;
  getFlashcardCategory(id: string): Promise<FlashcardCategory | undefined>;
  createFlashcardCategory(category: InsertFlashcardCategory): Promise<FlashcardCategory>;
  updateFlashcardCategory(id: string, data: Partial<InsertFlashcardCategory>): Promise<FlashcardCategory | undefined>;
  deleteFlashcardCategory(id: string): Promise<void>;

  // Flashcard operations
  getFlashcardsByCategory(categoryId: string): Promise<Flashcard[]>;
  getActiveFlashcardsByCategory(categoryId: string): Promise<Flashcard[]>;
  getFlashcard(id: string): Promise<Flashcard | undefined>;
  createFlashcard(flashcard: InsertFlashcard): Promise<Flashcard>;
  updateFlashcard(id: string, data: Partial<InsertFlashcard>): Promise<Flashcard | undefined>;
  deleteFlashcard(id: string): Promise<void>;

  // Flashcard Progress operations
  getFlashcardProgress(parentId: string, flashcardId: string): Promise<FlashcardProgress | undefined>;
  getAllFlashcardProgress(parentId: string): Promise<FlashcardProgress[]>;
  updateFlashcardProgress(parentId: string, flashcardId: string, viewed: boolean, correct: boolean): Promise<FlashcardProgress>;

  // Receipt Fingerprint operations (prevent duplicate receipts)
  findDuplicateReceipt(normalizedReference: string | null, transactionDate: string | null, amountCents: number | null): Promise<ReceiptFingerprint | undefined>;
  
  // Receipt Attempt tracking (persist failed attempts per parent per course)
  getReceiptAttempts(parentId: string, courseId: string): Promise<ReceiptAttempt | undefined>;
  incrementReceiptAttempts(parentId: string, courseId: string): Promise<ReceiptAttempt>;
  resetReceiptAttempts(parentId: string, courseId: string): Promise<void>;
  createReceiptFingerprint(fingerprint: InsertReceiptFingerprint): Promise<ReceiptFingerprint>;

  // Quran Reciter operations (Maktabada - Quran Sheikhs)
  getAllQuranReciters(): Promise<QuranReciter[]>;
  getActiveQuranReciters(): Promise<QuranReciter[]>;
  getQuranReciter(id: string): Promise<QuranReciter | undefined>;
  createQuranReciter(reciter: InsertQuranReciter): Promise<QuranReciter>;
  updateQuranReciter(id: string, data: Partial<InsertQuranReciter>): Promise<QuranReciter | undefined>;
  deleteQuranReciter(id: string): Promise<void>;

  // Hadith operations (40 Xadiis - Library Section)
  getAllHadiths(): Promise<Hadith[]>;
  getActiveHadiths(): Promise<Hadith[]>;
  getHadith(id: string): Promise<Hadith | undefined>;
  createHadith(hadith: InsertHadith): Promise<Hadith>;
  updateHadith(id: string, data: Partial<InsertHadith>): Promise<Hadith | undefined>;
  deleteHadith(id: string): Promise<void>;

  // Parent Notification operations (Inbox for push notifications)
  createParentNotification(notification: InsertParentNotification): Promise<ParentNotification>;
  getParentNotifications(parentId: string, limit?: number): Promise<ParentNotification[]>;
  getUnreadNotificationCount(parentId: string): Promise<number>;
  markNotificationRead(id: string, parentId: string): Promise<ParentNotification | undefined>;
  markAllNotificationsRead(parentId: string): Promise<void>;
  deleteNotification(id: string, parentId: string): Promise<void>;

  // Prayer Settings operations (Jadwalka Salaadda)
  getParentPrayerSettings(parentId: string): Promise<ParentPrayerSettings | undefined>;
  upsertParentPrayerSettings(parentId: string, settings: Partial<InsertParentPrayerSettings>): Promise<ParentPrayerSettings>;
  getAllPrayerNotificationEnabledParents(): Promise<ParentPrayerSettings[]>;

  // BSAv.1 Sheeko - Voice Spaces operations
  getVoiceRooms(): Promise<VoiceRoom[]>;
  getVoiceRoom(id: string): Promise<VoiceRoom | undefined>;
  createVoiceRoom(room: InsertVoiceRoom): Promise<VoiceRoom>;
  updateVoiceRoom(id: string, data: Partial<VoiceRoom>): Promise<VoiceRoom | undefined>;
  deleteVoiceRoom(id: string): Promise<void>;
  getVoiceRoomParticipants(roomId: string): Promise<(VoiceParticipant & { parent: Parent })[]>;
  getVoiceParticipant(roomId: string, parentId: string): Promise<VoiceParticipant | undefined>;
  joinVoiceRoom(roomId: string, parentId: string, isHidden?: boolean, role?: string): Promise<VoiceParticipant>;
  leaveVoiceRoom(roomId: string, parentId: string): Promise<void>;
  updateVoiceParticipant(roomId: string, parentId: string, data: Partial<VoiceParticipant>): Promise<VoiceParticipant | undefined>;
  
  // Voice Room Messages (Live chat)
  getVoiceRoomMessages(roomId: string, limit?: number): Promise<VoiceRoomMessage[]>;
  getVoiceRoomMessage(id: string): Promise<VoiceRoomMessage | undefined>;
  createVoiceRoomMessage(message: InsertVoiceRoomMessage): Promise<VoiceRoomMessage>;
  deleteVoiceRoomMessage(id: string): Promise<void>;
  pinVoiceRoomMessage(roomId: string, messageId: string): Promise<void>;
  unpinVoiceRoomMessage(roomId: string): Promise<void>;

  // Host Follow System
  followHost(followerId: string, hostId: string): Promise<HostFollow>;
  unfollowHost(followerId: string, hostId: string): Promise<void>;
  isFollowingHost(followerId: string, hostId: string): Promise<boolean>;
  getHostFollowerCount(hostId: string): Promise<number>;
  getHostFollowers(hostId: string): Promise<(HostFollow & { follower: Parent })[]>;
  getFollowingHosts(followerId: string): Promise<{ id: string; name: string; picture: string | null; followerCount: number }[]>;
  
  // Sheeko User-to-User Follow System
  sheekoFollow(followerId: string, followeeId: string): Promise<SheekoFollow>;
  sheekoUnfollow(followerId: string, followeeId: string): Promise<void>;
  isSheekoFollowing(followerId: string, followeeId: string): Promise<boolean>;
  getSheekoFollowerCount(userId: string): Promise<number>;
  getSheekoFollowingCount(userId: string): Promise<number>;
  getSheekoFollowers(userId: string): Promise<{ id: string; name: string; picture: string | null; followedAt: Date }[]>;
  getSheekoFollowing(userId: string): Promise<{ id: string; name: string; picture: string | null; followedAt: Date }[]>;
  
  // Voice Room Bans
  banFromVoiceRoom(roomId: string, parentId: string, bannedById: string, reason?: string): Promise<VoiceRoomBan>;
  unbanFromVoiceRoom(roomId: string, parentId: string): Promise<void>;
  isParentBannedFromRoom(roomId: string, parentId: string): Promise<boolean>;
  getVoiceRoomBans(roomId: string): Promise<VoiceRoomBan[]>;
  
  // Voice Room RSVPs
  getVoiceRoomRsvps(roomId: string): Promise<(VoiceRoomRsvp & { parent: Parent })[]>;
  hasParentRsvpd(roomId: string, parentId: string): Promise<boolean>;

  // Voice Recordings (Google Drive stored)
  createVoiceRecording(recording: InsertVoiceRecording): Promise<VoiceRecording>;
  getVoiceRecordings(publishedOnly?: boolean): Promise<(VoiceRecording & { host: Parent })[]>;
  getVoiceRecording(id: string): Promise<(VoiceRecording & { host: Parent }) | undefined>;
  updateVoiceRecording(id: string, data: Partial<VoiceRecording>): Promise<VoiceRecording | undefined>;
  deleteVoiceRecording(id: string): Promise<void>;

  // Content Reporting (EU DSA COMPLIANCE)
  createContentReport(report: InsertContentReport): Promise<ContentReport>;
  getContentReports(status: string): Promise<ContentReport[]>;
  updateContentReport(id: string, data: Partial<ContentReport>): Promise<ContentReport | undefined>;

  // Moderation
  createModerationAction(action: InsertModerationAction): Promise<ModerationAction>;
  getModerationActions(parentId: string): Promise<ModerationAction[]>;

  // User Consent (GDPR COMPLIANCE)
  getUserConsent(parentId: string): Promise<UserConsent | undefined>;
  updateUserConsent(parentId: string, data: Partial<InsertUserConsent>): Promise<UserConsent>;

  // GDPR DATA EXPORT/DELETION
  markParentForDeletion(parentId: string): Promise<void>;

  // AI Moderation
  createAiModerationReport(report: InsertAiModerationReport): Promise<AiModerationReport>;
  getAiModerationReports(status?: string): Promise<AiModerationReport[]>;
  updateAiModerationReport(id: string, data: Partial<AiModerationReport>): Promise<AiModerationReport | undefined>;
  updateVoiceRoomMessage(id: string, data: Partial<VoiceRoomMessage>): Promise<VoiceRoomMessage | undefined>;

  // Bedtime Stories (Maaweelada Caruurta)
  createBedtimeStory(story: InsertBedtimeStory): Promise<BedtimeStory>;
  getBedtimeStories(limit?: number): Promise<BedtimeStory[]>;
  getAllBedtimeStories(limit?: number): Promise<BedtimeStory[]>;
  getBedtimeStory(id: string): Promise<BedtimeStory | undefined>;
  getTodayBedtimeStory(): Promise<BedtimeStory | undefined>;
  getBedtimeStoryByDate(date: string): Promise<BedtimeStory | undefined>;
  updateBedtimeStory(id: string, data: Partial<InsertBedtimeStory>): Promise<BedtimeStory | undefined>;
  updateBedtimeStoryWithTimestamp(id: string, data: Partial<InsertBedtimeStory>): Promise<BedtimeStory | undefined>;
  deleteBedtimeStory(id: string): Promise<void>;

  // Parent Messages (Dhambaalka Waalidka)
  createParentMessage(message: InsertParentMessage): Promise<ParentMessage>;
  getParentMessages(limit?: number): Promise<ParentMessage[]>;
  getAllParentMessages(limit?: number): Promise<ParentMessage[]>;
  getParentMessage(id: string): Promise<ParentMessage | undefined>;
  getTodayParentMessage(): Promise<ParentMessage | undefined>;
  getParentMessageByDate(date: string): Promise<ParentMessage | undefined>;
  updateParentMessage(id: string, data: Partial<InsertParentMessage>): Promise<ParentMessage | undefined>;
  updateParentMessageWithTimestamp(id: string, data: Partial<InsertParentMessage>): Promise<ParentMessage | undefined>;
  deleteParentMessage(id: string): Promise<void>;

  // Content Reactions & Comments (Engagement)
  getContentReactions(contentType: string, contentId: string, parentId?: string): Promise<{ counts: Record<string, number>; userReaction: string | null }>;
  upsertContentReaction(parentId: string, contentType: string, contentId: string, reactionType: string): Promise<ContentReaction>;
  removeContentReaction(parentId: string, contentType: string, contentId: string): Promise<void>;
  getContentComments(contentType: string, contentId: string): Promise<(ContentComment & { parent: { id: string; name: string; picture: string | null }; replyTo?: ContentComment & { parent: { id: string; name: string } } })[]>;
  createContentComment(data: InsertContentComment): Promise<ContentComment>;
  deleteContentComment(id: string, parentId: string): Promise<void>;

  // Comment Reactions
  getCommentReactions(commentId: string, parentId?: string): Promise<{ counts: Record<string, number>; userReaction: string | null }>;
  upsertCommentReaction(parentId: string, commentId: string, reactionType: string): Promise<CommentReaction>;
  removeCommentReaction(parentId: string, commentId: string): Promise<void>;
  getCommentById(commentId: string): Promise<ContentComment | undefined>;

  // Parent Social Network operations
  followParent(followerId: string, followingId: string): Promise<ParentFollow>;
  unfollowParent(followerId: string, followingId: string): Promise<void>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  getFollowers(parentId: string): Promise<{ id: string; name: string; picture: string | null }[]>;
  getFollowing(parentId: string): Promise<{ id: string; name: string; picture: string | null }[]>;
  getFollowCounts(parentId: string): Promise<{ followersCount: number; followingCount: number }>;
  createSocialNotification(notification: Omit<InsertSocialNotification, 'id' | 'createdAt'>): Promise<SocialNotification>;
  getSocialNotifications(parentId: string): Promise<(SocialNotification & { actor: { id: string; name: string; picture: string | null } })[]>;
  markSocialNotificationsAsRead(parentId: string): Promise<void>;
  getUnreadSocialNotificationCount(parentId: string): Promise<number>;
  
  // Direct Messages
  sendDirectMessage(senderId: string, receiverId: string, body: string, audioUrl?: string): Promise<DirectMessage>;
  getConversations(parentId: string): Promise<{ partnerId: string; partnerName: string; partnerPicture: string | null; lastMessage: string; lastMessageAt: Date; unreadCount: number }[]>;
  getMessagesWithParent(parentId: string, partnerId: string, limit?: number): Promise<DirectMessage[]>;
  markMessagesAsRead(receiverId: string, senderId: string): Promise<void>;
  getUnreadMessageCount(parentId: string): Promise<number>;

  // Parent Posts (Social Feed)
  createParentPost(post: Omit<InsertParentPost, 'id'>): Promise<ParentPost>;
  getParentPostById(id: string): Promise<ParentPost | null>;
  listParentPosts(limit?: number, cursor?: string, parentId?: string): Promise<ParentPost[]>;
  updateParentPost(id: string, data: { title?: string; content?: string; visibility?: string }): Promise<ParentPost | null>;
  listLatestParentPosts(limit?: number): Promise<ParentPost[]>;
  deleteParentPost(id: string): Promise<void>;
  addPostImage(image: Omit<InsertParentPostImage, 'id'>): Promise<ParentPostImage>;
  getPostImages(postId: string): Promise<ParentPostImage[]>;
  deletePostImage(id: string): Promise<void>;

  // Course Promotions (sidebar ads)
  createCoursePromotion(data: InsertCoursePromotion): Promise<CoursePromotion>;
  getCoursePromotion(id: string): Promise<CoursePromotion | null>;
  listActivePromotions(): Promise<(CoursePromotion & { course: Course })[]>;
  listAllPromotions(): Promise<(CoursePromotion & { course: Course })[]>;
  updateCoursePromotion(id: string, data: Partial<InsertCoursePromotion>): Promise<CoursePromotion | null>;
  deleteCoursePromotion(id: string): Promise<void>;

  // Post Reactions
  togglePostReaction(postId: string, parentId: string, reactionType: string): Promise<{ action: 'added' | 'changed' | 'removed'; reaction?: ParentPostReaction }>;
  getPostReactions(postId: string): Promise<{ counts: Record<string, number>; userReaction: string | null }>;
  getPostReactionsWithParent(postId: string, parentId: string): Promise<{ counts: Record<string, number>; userReaction: string | null }>;

  // Post Comments
  createPostComment(data: InsertParentPostComment): Promise<ParentPostComment>;
  getPostComments(postId: string): Promise<(ParentPostComment & { author: { id: string; name: string; picture: string | null }; parentCommentId: string | null; replies?: any[] })[]>;
  updatePostComment(id: string, parentId: string, body: string): Promise<ParentPostComment | null>;
  deletePostComment(id: string, parentId: string): Promise<void>;
  incrementCommentCount(postId: string): Promise<void>;
  decrementCommentCount(postId: string): Promise<void>;
  
  // Comment Images
  addCommentImage(data: InsertParentPostCommentImage): Promise<ParentPostCommentImage>;
  getCommentImages(commentId: string): Promise<ParentPostCommentImage[]>;

  // Comment Reactions
  toggleCommentReaction(commentId: string, parentId: string, reactionType: string): Promise<{ action: 'added' | 'changed' | 'removed' }>;
  getCommentReactions(commentId: string, parentId?: string): Promise<{ counts: Record<string, number>; userReaction: string | null }>;

  // Community Thread operations
  getCommunityThreadsWithParentNames(courseId?: string, currentParentId?: string): Promise<any[]>;
  getCommunityThreads(courseId?: string): Promise<any[]>;
  createCommunityThread(thread: any): Promise<any>;
  toggleThreadLike(threadId: string, parentId: string): Promise<{ liked: boolean }>;
  togglePostLike(postId: string, parentId: string): Promise<{ liked: boolean }>;
  toggleThreadPin(threadId: string): Promise<{ pinned: boolean }>;

  // Testimonial Reactions
  toggleTestimonialReaction(testimonialId: string, parentId: string, reactionType: string): Promise<{ action: 'added' | 'changed' | 'removed' }>;
  getTestimonialReactions(testimonialId: string, parentId?: string): Promise<{ counts: Record<string, number>; userReaction: string | null }>;
  getAllTestimonialReactions(parentId?: string): Promise<Record<string, { counts: Record<string, number>; userReaction: string | null }>>;

  // Pricing Plans
  getAllPricingPlans(): Promise<PricingPlan[]>;
  getActivePricingPlans(): Promise<PricingPlan[]>;
  getPricingPlanByType(planType: string): Promise<PricingPlan | undefined>;
  updatePricingPlan(id: string, data: Partial<InsertPricingPlan>): Promise<PricingPlan | undefined>;

  // Content Progress (Dhambaal & Sheeko tracking)
  markContentComplete(parentId: string, contentType: string, contentId: string): Promise<ContentProgress>;
  getContentProgress(parentId: string, contentType: string): Promise<ContentProgress[]>;
  getContentProgressSummary(parentId: string): Promise<{ dhambaalCount: number; sheekoCount: number }>;
  isContentCompleted(parentId: string, contentType: string, contentId: string): Promise<boolean>;

  // Google Meet Events
  getGoogleMeetEvents(): Promise<GoogleMeetEvent[]>;
  getActiveGoogleMeetEvents(): Promise<GoogleMeetEvent[]>;
  getArchivedGoogleMeetEvents(): Promise<GoogleMeetEvent[]>;
  getGoogleMeetEvent(id: string): Promise<GoogleMeetEvent | undefined>;
  createGoogleMeetEvent(event: InsertGoogleMeetEvent): Promise<GoogleMeetEvent>;
  updateGoogleMeetEvent(id: string, data: Partial<InsertGoogleMeetEvent>): Promise<GoogleMeetEvent | undefined>;
  archiveGoogleMeetEvent(id: string): Promise<GoogleMeetEvent | undefined>;
  deleteGoogleMeetEvent(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserPicture(id: string, picture: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ picture })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  // Course operations
  async getAllCourses(): Promise<Course[]> {
    return await db.select().from(courses).orderBy(asc(courses.order));
  }

  async getCourse(id: string): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    return course || undefined;
  }

  async getCourseByCourseId(courseId: string): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.courseId, courseId));
    return course || undefined;
  }

  async createCourse(insertCourse: InsertCourse): Promise<Course> {
    const [course] = await db
      .insert(courses)
      .values(insertCourse)
      .returning();
    return course;
  }

  async updateCourse(id: string, updateData: Partial<InsertCourse>): Promise<Course | undefined> {
    const [course] = await db
      .update(courses)
      .set(updateData)
      .where(eq(courses.id, id))
      .returning();
    return course || undefined;
  }

  async deleteCourse(id: string): Promise<void> {
    await db.delete(courses).where(eq(courses.id, id));
  }

  // Lesson operations
  async getAllLessons(): Promise<Lesson[]> {
    return await db.select().from(lessons).orderBy(asc(lessons.order));
  }

  async getLessonsByCourseId(courseId: string): Promise<Lesson[]> {
    return await db.select().from(lessons).where(eq(lessons.courseId, courseId)).orderBy(asc(lessons.order));
  }

  async getLesson(id: string): Promise<Lesson | undefined> {
    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, id));
    return lesson || undefined;
  }

  async createLesson(insertLesson: InsertLesson): Promise<Lesson> {
    // Get max order for this course and assign new lesson to end
    const courseLessons = await db.select().from(lessons).where(eq(lessons.courseId, insertLesson.courseId));
    const maxOrder = courseLessons.length > 0 ? Math.max(...courseLessons.map(l => l.order || 0)) : -1;
    
    const [lesson] = await db
      .insert(lessons)
      .values({ ...insertLesson, order: maxOrder + 1 })
      .returning();
    return lesson;
  }

  async updateLesson(id: string, updateData: Partial<InsertLesson>): Promise<Lesson | undefined> {
    const [lesson] = await db
      .update(lessons)
      .set(updateData)
      .where(eq(lessons.id, id))
      .returning();
    return lesson || undefined;
  }

  async deleteLesson(id: string): Promise<void> {
    await db.delete(lessons).where(eq(lessons.id, id));
  }

  async reorderLessons(courseId: string, orderedIds: string[]): Promise<void> {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.update(lessons)
        .set({ order: i })
        .where(and(eq(lessons.id, orderedIds[i]), eq(lessons.courseId, courseId)));
    }
  }

  // Quiz operations
  async getQuizzesByLessonId(lessonId: string): Promise<Quiz[]> {
    return await db.select().from(quizzes).where(eq(quizzes.lessonId, lessonId));
  }

  async getQuiz(id: string): Promise<Quiz | undefined> {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, id));
    return quiz || undefined;
  }

  async createQuiz(insertQuiz: InsertQuiz): Promise<Quiz> {
    const [quiz] = await db.insert(quizzes).values(insertQuiz).returning();
    return quiz;
  }

  async deleteQuiz(id: string): Promise<void> {
    await db.delete(quizzes).where(eq(quizzes.id, id));
  }

  // Quiz Question operations
  async getQuizQuestions(quizId: string): Promise<QuizQuestion[]> {
    return await db.select().from(quizQuestions).where(eq(quizQuestions.quizId, quizId)).orderBy(quizQuestions.order);
  }

  async createQuizQuestion(insertQuestion: InsertQuizQuestion): Promise<QuizQuestion> {
    const [question] = await db.insert(quizQuestions).values(insertQuestion).returning();
    return question;
  }

  async deleteQuizQuestion(id: string): Promise<void> {
    await db.delete(quizQuestions).where(eq(quizQuestions.id, id));
  }

  // Payment Method operations
  async getActivePaymentMethods(): Promise<PaymentMethod[]> {
    return await db.select().from(paymentMethods).where(eq(paymentMethods.isActive, true)).orderBy(paymentMethods.order);
  }

  async getPaymentMethod(id: string): Promise<PaymentMethod | undefined> {
    const [method] = await db.select().from(paymentMethods).where(eq(paymentMethods.id, id)).limit(1);
    return method;
  }

  async createPaymentMethod(method: InsertPaymentMethod): Promise<PaymentMethod> {
    const [paymentMethod] = await db.insert(paymentMethods).values(method).returning();
    return paymentMethod;
  }

  // Payment Submission operations
  async getAllPaymentSubmissions(): Promise<PaymentSubmission[]> {
    return await db.select().from(paymentSubmissions).orderBy(desc(paymentSubmissions.createdAt));
  }

  async getPaymentSubmission(id: string): Promise<PaymentSubmission | undefined> {
    const [submission] = await db.select().from(paymentSubmissions).where(eq(paymentSubmissions.id, id));
    return submission || undefined;
  }

  async createPaymentSubmission(submission: InsertPaymentSubmission): Promise<PaymentSubmission> {
    const [paymentSubmission] = await db.insert(paymentSubmissions).values(submission).returning();
    return paymentSubmission;
  }

  async updatePaymentSubmissionStatus(id: string, status: string, reviewedBy: string): Promise<PaymentSubmission | undefined> {
    const [submission] = await db.update(paymentSubmissions)
      .set({ status, reviewedBy, reviewedAt: new Date() })
      .where(eq(paymentSubmissions.id, id))
      .returning();
    return submission || undefined;
  }

  async updatePaymentSubmission(id: string, data: { status?: string; notes?: string; reviewedBy?: string }): Promise<PaymentSubmission | undefined> {
    const updateData: any = { reviewedAt: new Date() };
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.reviewedBy !== undefined) updateData.reviewedBy = data.reviewedBy;
    
    const [submission] = await db.update(paymentSubmissions)
      .set(updateData)
      .where(eq(paymentSubmissions.id, id))
      .returning();
    return submission || undefined;
  }

  async deletePaymentSubmission(id: string): Promise<void> {
    await db.delete(paymentSubmissions).where(eq(paymentSubmissions.id, id));
  }

  // Enrollment operations
  async getEnrollmentByPhoneAndCourse(phone: string, courseId: string): Promise<Enrollment | undefined> {
    const [enrollment] = await db.select().from(enrollments)
      .where(and(eq(enrollments.customerPhone, phone), eq(enrollments.courseId, courseId)));
    return enrollment || undefined;
  }

  async createEnrollment(enrollment: InsertEnrollment): Promise<Enrollment> {
    // DEFENSIVE: Ensure yearly plans always have 12-month accessEnd if not explicitly set
    // This prevents accidental lifetime access for paid yearly subscriptions
    if (enrollment.planType === "yearly" && !enrollment.accessEnd) {
      const accessEnd = new Date();
      accessEnd.setFullYear(accessEnd.getFullYear() + 1);
      enrollment.accessEnd = accessEnd;
      console.log(`[STORAGE] Defensive: Added 12-month accessEnd for yearly plan: ${accessEnd}`);
    }
    
    const [newEnrollment] = await db.insert(enrollments).values(enrollment).returning();
    return newEnrollment;
  }

  async getAllEnrollments(): Promise<Enrollment[]> {
    return await db.select().from(enrollments).orderBy(desc(enrollments.accessStart));
  }

  async getEnrollment(id: string): Promise<Enrollment | undefined> {
    const [enrollment] = await db.select().from(enrollments).where(eq(enrollments.id, id));
    return enrollment || undefined;
  }

  async deleteEnrollment(id: string): Promise<void> {
    await db.delete(enrollments).where(eq(enrollments.id, id));
  }

  async getUpgradeBannerStatus(enrollmentId: string): Promise<{ shouldShow: boolean; expiresAt?: Date }> {
    const [enrollment] = await db.select().from(enrollments).where(eq(enrollments.id, enrollmentId));
    if (!enrollment) {
      return { shouldShow: false };
    }
    
    // Only show for monthly subscribers
    if (enrollment.planType !== "monthly") {
      return { shouldShow: false };
    }
    
    const now = new Date();
    const accessStart = new Date(enrollment.accessStart);
    
    // Calculate days since subscription started
    const daysSinceStart = Math.floor((now.getTime() - accessStart.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate which billing month we're in (0-indexed)
    const currentBillingMonth = Math.floor(daysSinceStart / 30);
    
    // Calculate day within the current 30-day billing cycle (0-29)
    const dayInCurrentCycle = daysSinceStart % 30;
    
    // Calculate which 10-day window we're in within this cycle (0=day 0-9, 1=day 10-19, 2=day 20-29)
    const currentWindowInCycle = Math.floor(dayInCurrentCycle / 10);
    
    // Get banner tracking data
    let bannerCount = enrollment.upgradeBannerCount || 0;
    let lastWindowShown = enrollment.upgradeBannerLastWindow ?? -1; // -1 means no window shown yet
    const lastShown = enrollment.upgradeBannerLastShown ? new Date(enrollment.upgradeBannerLastShown) : null;
    
    // Check if we need to treat as reset for a new billing cycle (read-only check)
    if (lastShown) {
      const lastShownDaysSinceStart = Math.floor((lastShown.getTime() - accessStart.getTime()) / (1000 * 60 * 60 * 24));
      const lastShownBillingMonth = Math.floor(lastShownDaysSinceStart / 30);
      
      if (lastShownBillingMonth < currentBillingMonth) {
        // New billing cycle - treat as reset (actual reset happens in markUpgradeBannerShown)
        bannerCount = 0;
        lastWindowShown = -1;
      }
    }
    
    // FIRST: Check if still within 24 hours of last shown (within same billing cycle)
    // This must come BEFORE the count cap to allow the 3rd window's 24h to complete
    if (lastShown) {
      const hoursSinceLastShown = (now.getTime() - lastShown.getTime()) / (1000 * 60 * 60);
      // Only count as active if within 24h AND in the same billing cycle
      const lastShownDaysSinceStart = Math.floor((lastShown.getTime() - accessStart.getTime()) / (1000 * 60 * 60 * 24));
      const lastShownBillingMonth = Math.floor(lastShownDaysSinceStart / 30);
      
      if (hoursSinceLastShown < 24 && lastShownBillingMonth === currentBillingMonth) {
        const expiresAt = new Date(lastShown.getTime() + 24 * 60 * 60 * 1000);
        return { shouldShow: true, expiresAt };
      }
    }
    
    // THEN: Check max 3 shows per billing cycle (after 24h check to allow final window to complete)
    if (bannerCount >= 3) {
      return { shouldShow: false };
    }
    
    // Check if it's time to show for a new window
    // Only show if current window is greater than the last window shown
    // This ensures each window can only trigger once
    if (currentWindowInCycle > lastWindowShown) {
      // New window - time to show!
      return { shouldShow: true };
    }
    
    return { shouldShow: false };
  }

  async markUpgradeBannerShown(enrollmentId: string): Promise<void> {
    const [enrollment] = await db.select().from(enrollments).where(eq(enrollments.id, enrollmentId));
    if (!enrollment) return;
    
    const now = new Date();
    const accessStart = new Date(enrollment.accessStart);
    const lastShown = enrollment.upgradeBannerLastShown ? new Date(enrollment.upgradeBannerLastShown) : null;
    
    // Calculate days since subscription started
    const daysSinceStart = Math.floor((now.getTime() - accessStart.getTime()) / (1000 * 60 * 60 * 24));
    const currentBillingMonth = Math.floor(daysSinceStart / 30);
    const dayInCurrentCycle = daysSinceStart % 30;
    const currentWindowInCycle = Math.floor(dayInCurrentCycle / 10); // 0, 1, or 2
    
    let currentCount = enrollment.upgradeBannerCount || 0;
    let lastWindowShown = enrollment.upgradeBannerLastWindow ?? -1;
    
    // Check if we need to reset for a new billing cycle
    if (lastShown) {
      const lastShownDaysSinceStart = Math.floor((lastShown.getTime() - accessStart.getTime()) / (1000 * 60 * 60 * 24));
      const lastShownBillingMonth = Math.floor(lastShownDaysSinceStart / 30);
      
      if (lastShownBillingMonth < currentBillingMonth) {
        // New billing cycle - reset everything before recording new show
        currentCount = 0;
        lastWindowShown = -1;
      } else {
        // Same billing cycle - check if we're still in the same 24-hour window
        const hoursSinceLastShown = (now.getTime() - lastShown.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastShown < 24) {
          // Still within the same 24-hour window - don't update anything, keep original expiry
          return;
        }
        
        // 24 hours have passed - check if we've already shown for this window
        if (lastWindowShown >= currentWindowInCycle) {
          // Already shown for this window - don't record again
          return;
        }
      }
    }
    
    // Only record if this is a new window
    if (currentWindowInCycle > lastWindowShown) {
      await db.update(enrollments)
        .set({ 
          upgradeBannerLastShown: now,
          upgradeBannerCount: currentCount + 1,
          upgradeBannerLastWindow: currentWindowInCycle
        })
        .where(eq(enrollments.id, enrollmentId));
    }
  }

  async getSchedulingStatus(parentId: string, courseId: string): Promise<{ 
    canAccessLesson: boolean; 
    lessonsToday: number; 
    lessonsThisWeek: number; 
    maxPerDay: number; 
    maxPerWeek: number;
    reason?: string;
    code?: string;
  }> {
    const MAX_PER_DAY = 2;
    const MAX_PER_WEEK = 4;
    
    // Only apply scheduling limits to "0-6 Bilood" course - look up course by UUID to check title
    const course = await this.getCourse(courseId);
    const is06Course = course && course.title.includes("0-6");
    
    if (!is06Course) {
      return { canAccessLesson: true, lessonsToday: 0, lessonsThisWeek: 0, maxPerDay: MAX_PER_DAY, maxPerWeek: MAX_PER_WEEK };
    }
    
    const enrollment = await this.getActiveEnrollmentByParentAndCourse(parentId, courseId);
    if (!enrollment) {
      return { canAccessLesson: false, lessonsToday: 0, lessonsThisWeek: 0, maxPerDay: MAX_PER_DAY, maxPerWeek: MAX_PER_WEEK, reason: "No active enrollment", code: "NO_ENROLLMENT" };
    }
    
    // Use Somalia timezone (UTC+3) for consistent day/week boundaries
    const getSomaliDate = () => {
      const now = new Date();
      // Convert to Somalia time (UTC+3)
      const somaliOffset = 3 * 60 * 60 * 1000; // 3 hours in ms
      const utcTime = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
      return new Date(utcTime + somaliOffset);
    };
    
    const somaliNow = getSomaliDate();
    const today = new Date(somaliNow.getFullYear(), somaliNow.getMonth(), somaliNow.getDate());
    
    // Reset daily count if it's a new day (in Somalia time)
    let lessonsToday = enrollment.lessonsToday || 0;
    const lastLessonDate = enrollment.lastLessonDate ? new Date(enrollment.lastLessonDate) : null;
    if (lastLessonDate) {
      // Convert stored date to Somalia timezone for comparison
      const lastOffset = 3 * 60 * 60 * 1000;
      const lastUtc = lastLessonDate.getTime() + lastLessonDate.getTimezoneOffset() * 60 * 1000;
      const lastSomali = new Date(lastUtc + lastOffset);
      const lastLessonDay = new Date(lastSomali.getFullYear(), lastSomali.getMonth(), lastSomali.getDate());
      if (lastLessonDay.getTime() !== today.getTime()) {
        lessonsToday = 0;
      }
    }
    
    // Reset weekly count if it's a new week (weeks start on Monday, Somalia time)
    let lessonsThisWeek = enrollment.lessonsThisWeek || 0;
    const currentWeekStart = new Date(today);
    const dayOfWeek = currentWeekStart.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    currentWeekStart.setDate(currentWeekStart.getDate() - daysToMonday);
    
    const weekStart = enrollment.weekStartDate ? new Date(enrollment.weekStartDate) : null;
    if (weekStart) {
      const weekOffset = 3 * 60 * 60 * 1000;
      const weekUtc = weekStart.getTime() + weekStart.getTimezoneOffset() * 60 * 1000;
      const weekSomali = new Date(weekUtc + weekOffset);
      const storedWeekStart = new Date(weekSomali.getFullYear(), weekSomali.getMonth(), weekSomali.getDate());
      if (storedWeekStart.getTime() !== currentWeekStart.getTime()) {
        lessonsThisWeek = 0;
      }
    } else {
      lessonsThisWeek = 0;
    }
    
    // Check daily limit
    if (lessonsToday >= MAX_PER_DAY) {
      return { 
        canAccessLesson: false, 
        lessonsToday, 
        lessonsThisWeek, 
        maxPerDay: MAX_PER_DAY, 
        maxPerWeek: MAX_PER_WEEK,
        reason: `Maanta waxaad dhamaysay ${MAX_PER_DAY} cashar. Berri ku soo laabo.`,
        code: "DAILY_LIMIT_REACHED"
      };
    }
    
    // Check weekly limit
    if (lessonsThisWeek >= MAX_PER_WEEK) {
      return { 
        canAccessLesson: false, 
        lessonsToday, 
        lessonsThisWeek, 
        maxPerDay: MAX_PER_DAY, 
        maxPerWeek: MAX_PER_WEEK,
        reason: `Usbuucan waxaad dhamaysay ${MAX_PER_WEEK} cashar. Usbuuca dambe ku soo laabo.`,
        code: "WEEKLY_LIMIT_REACHED"
      };
    }
    
    return { canAccessLesson: true, lessonsToday, lessonsThisWeek, maxPerDay: MAX_PER_DAY, maxPerWeek: MAX_PER_WEEK };
  }

  async recordLessonCompletion(enrollmentId: string): Promise<{ success: boolean; error?: string }> {
    const [enrollment] = await db.select().from(enrollments).where(eq(enrollments.id, enrollmentId));
    if (!enrollment) return { success: false, error: "NO_ENROLLMENT" };
    
    const MAX_PER_DAY = 2;
    const MAX_PER_WEEK = 4;
    
    // Use Somalia timezone (UTC+3) for consistent day/week boundaries
    const getSomaliDate = () => {
      const now = new Date();
      const somaliOffset = 3 * 60 * 60 * 1000;
      const utcTime = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
      return new Date(utcTime + somaliOffset);
    };
    
    const somaliNow = getSomaliDate();
    const today = new Date(somaliNow.getFullYear(), somaliNow.getMonth(), somaliNow.getDate());
    
    // Calculate current week start (Monday, Somalia time)
    const currentWeekStart = new Date(today);
    const dayOfWeek = currentWeekStart.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    currentWeekStart.setDate(currentWeekStart.getDate() - daysToMonday);
    
    // Determine if we need to reset counts
    let lessonsToday = enrollment.lessonsToday || 0;
    let lessonsThisWeek = enrollment.lessonsThisWeek || 0;
    
    const lastLessonDate = enrollment.lastLessonDate ? new Date(enrollment.lastLessonDate) : null;
    if (lastLessonDate) {
      const lastOffset = 3 * 60 * 60 * 1000;
      const lastUtc = lastLessonDate.getTime() + lastLessonDate.getTimezoneOffset() * 60 * 1000;
      const lastSomali = new Date(lastUtc + lastOffset);
      const lastLessonDay = new Date(lastSomali.getFullYear(), lastSomali.getMonth(), lastSomali.getDate());
      if (lastLessonDay.getTime() !== today.getTime()) {
        lessonsToday = 0;
      }
    }
    
    const weekStart = enrollment.weekStartDate ? new Date(enrollment.weekStartDate) : null;
    if (weekStart) {
      const weekOffset = 3 * 60 * 60 * 1000;
      const weekUtc = weekStart.getTime() + weekStart.getTimezoneOffset() * 60 * 1000;
      const weekSomali = new Date(weekUtc + weekOffset);
      const storedWeekStart = new Date(weekSomali.getFullYear(), weekSomali.getMonth(), weekSomali.getDate());
      if (storedWeekStart.getTime() !== currentWeekStart.getTime()) {
        lessonsThisWeek = 0;
      }
    } else {
      lessonsThisWeek = 0;
    }
    
    // Guard: Check limits before incrementing to prevent overshooting
    if (lessonsToday >= MAX_PER_DAY) {
      return { success: false, error: "DAILY_LIMIT_REACHED" };
    }
    if (lessonsThisWeek >= MAX_PER_WEEK) {
      return { success: false, error: "WEEKLY_LIMIT_REACHED" };
    }
    
    // Update counts (now safe since we checked limits first)
    await db.update(enrollments)
      .set({
        lessonsToday: lessonsToday + 1,
        lessonsThisWeek: lessonsThisWeek + 1,
        lastLessonDate: new Date(), // Store in UTC, will convert on read
        weekStartDate: currentWeekStart,
        firstLessonAt: enrollment.firstLessonAt || new Date()
      })
      .where(eq(enrollments.id, enrollmentId));
    
    return { success: true };
  }

  async getEnrollmentsByParentId(parentId: string): Promise<Enrollment[]> {
    return await db.select().from(enrollments).where(eq(enrollments.parentId, parentId));
  }

  async getActiveEnrollmentByParentAndCourse(parentId: string, courseId: string): Promise<Enrollment | undefined> {
    // First check for specific course enrollment
    const [enrollment] = await db.select().from(enrollments)
      .where(and(
        eq(enrollments.parentId, parentId),
        eq(enrollments.courseId, courseId),
        eq(enrollments.status, "active")
      ));
    
    if (enrollment) {
      return enrollment;
    }
    
    // If no specific enrollment, check for all-access subscription
    const allAccessCourse = await this.getCourseByCourseId("all-access");
    if (allAccessCourse) {
      const [allAccessEnrollment] = await db.select().from(enrollments)
        .where(and(
          eq(enrollments.parentId, parentId),
          eq(enrollments.courseId, allAccessCourse.id),
          eq(enrollments.status, "active")
        ));
      
      if (allAccessEnrollment) {
        // Return all-access enrollment (grants access to all courses)
        return allAccessEnrollment;
      }
    }
    
    return undefined;
  }

  async getExpiringEnrollments(daysAhead: number): Promise<Enrollment[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);
    
    return await db.select().from(enrollments)
      .where(and(
        eq(enrollments.status, "active"),
        lte(enrollments.accessEnd, futureDate),
        gte(enrollments.accessEnd, today)
      ));
  }

  async getExpiredEnrollments(): Promise<Enrollment[]> {
    const now = new Date();
    return await db.select().from(enrollments)
      .where(and(
        eq(enrollments.status, "active"),
        lte(enrollments.accessEnd, now)
      ));
  }

  async updateEnrollmentStatus(id: string, status: string): Promise<void> {
    await db.update(enrollments).set({ status }).where(eq(enrollments.id, id));
  }

  async renewEnrollment(id: string, planType: string, accessEnd: Date | null, paymentSubmissionId?: string, customerPhone?: string): Promise<Enrollment | undefined> {
    // DEFENSIVE: Ensure yearly plans always have 12-month accessEnd if not explicitly set
    let finalAccessEnd = accessEnd;
    if (planType === "yearly" && !finalAccessEnd) {
      finalAccessEnd = new Date();
      finalAccessEnd.setFullYear(finalAccessEnd.getFullYear() + 1);
      console.log(`[STORAGE] Defensive: Added 12-month accessEnd for yearly renewal: ${finalAccessEnd}`);
    }
    
    const updateData: any = { 
      status: "active",
      planType,
      accessEnd: finalAccessEnd,
      accessStart: new Date(),
      reminder7DaySent: null,
      reminder3DaySent: null,
      reminder25HourSent: null,
      lastRenewalReminder: null,
    };
    if (paymentSubmissionId) updateData.paymentSubmissionId = paymentSubmissionId;
    if (customerPhone) updateData.customerPhone = customerPhone;
    
    const [enrollment] = await db.update(enrollments)
      .set(updateData)
      .where(eq(enrollments.id, id))
      .returning();
    return enrollment || undefined;
  }

  async getEnrollmentByParentAndCourse(parentId: string, courseId: string): Promise<Enrollment | undefined> {
    const [enrollment] = await db.select().from(enrollments)
      .where(and(
        eq(enrollments.parentId, parentId),
        eq(enrollments.courseId, courseId)
      ))
      .orderBy(desc(enrollments.accessStart))
      .limit(1);
    return enrollment || undefined;
  }

  // Parent operations
  async getParent(id: string): Promise<Parent | undefined> {
    const [parent] = await db.select().from(parents).where(eq(parents.id, id));
    return parent || undefined;
  }

  async getParentByGoogleId(googleId: string): Promise<Parent | undefined> {
    const [parent] = await db.select().from(parents).where(eq(parents.googleId, googleId));
    return parent || undefined;
  }

  async getParentByEmail(email: string): Promise<Parent | undefined> {
    const [parent] = await db.select().from(parents).where(eq(parents.email, email));
    return parent || undefined;
  }

  async getParentByPhone(phone: string): Promise<Parent | undefined> {
    const [parent] = await db.select().from(parents).where(eq(parents.phone, phone));
    return parent || undefined;
  }

  async createParent(insertParent: InsertParent): Promise<Parent> {
    const [parent] = await db.insert(parents).values(insertParent).returning();
    return parent;
  }

  async updateParentLastLogin(id: string): Promise<void> {
    await db.update(parents).set({ lastLoginAt: new Date() }).where(eq(parents.id, id));
  }

  async updateParentPassword(id: string, hashedPassword: string): Promise<Parent | undefined> {
    const [parent] = await db.update(parents).set({ password: hashedPassword }).where(eq(parents.id, id)).returning();
    return parent || undefined;
  }

  async updateParent(id: string, data: { name?: string; picture?: string; phone?: string; country?: string; city?: string; whatsappOptin?: boolean; whatsappNumber?: string; telegramOptin?: boolean; telegramChatId?: string; dailyReminderEnabled?: boolean; dailyReminderTime?: string; activeSessionId?: string; lastLoginIp?: string; lastLoginDevice?: string; googleId?: string; stripeCustomerId?: string; stripeSubscriptionId?: string; aiPlan?: string; aiTrialStartedAt?: Date | null; aiTrialEndsAt?: Date | null; aiGoldExpiresAt?: Date | null }): Promise<Parent | undefined> {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.picture !== undefined) updateData.picture = data.picture;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.whatsappOptin !== undefined) updateData.whatsappOptin = data.whatsappOptin;
    if (data.whatsappNumber !== undefined) updateData.whatsappNumber = data.whatsappNumber;
    if (data.telegramOptin !== undefined) updateData.telegramOptin = data.telegramOptin;
    if (data.telegramChatId !== undefined) updateData.telegramChatId = data.telegramChatId;
    if (data.dailyReminderEnabled !== undefined) updateData.dailyReminderEnabled = data.dailyReminderEnabled;
    if (data.dailyReminderTime !== undefined) updateData.dailyReminderTime = data.dailyReminderTime;
    if (data.activeSessionId !== undefined) updateData.activeSessionId = data.activeSessionId;
    if (data.lastLoginIp !== undefined) updateData.lastLoginIp = data.lastLoginIp;
    if (data.lastLoginDevice !== undefined) updateData.lastLoginDevice = data.lastLoginDevice;
    if (data.googleId !== undefined) updateData.googleId = data.googleId;
    if (data.stripeCustomerId !== undefined) updateData.stripeCustomerId = data.stripeCustomerId;
    if (data.stripeSubscriptionId !== undefined) updateData.stripeSubscriptionId = data.stripeSubscriptionId;
    if (data.aiPlan !== undefined) updateData.aiPlan = data.aiPlan;
    if (data.aiTrialStartedAt !== undefined) updateData.aiTrialStartedAt = data.aiTrialStartedAt;
    if (data.aiTrialEndsAt !== undefined) updateData.aiTrialEndsAt = data.aiTrialEndsAt;
    if (data.aiGoldExpiresAt !== undefined) updateData.aiGoldExpiresAt = data.aiGoldExpiresAt;
    
    const [parent] = await db.update(parents).set(updateData).where(eq(parents.id, id)).returning();
    return parent || undefined;
  }

  async getAllParents(): Promise<Parent[]> {
    return await db.select().from(parents).orderBy(desc(parents.createdAt));
  }

  async setParentAdmin(id: string, isAdmin: boolean): Promise<Parent | undefined> {
    const [parent] = await db.update(parents).set({ isAdmin }).where(eq(parents.id, id)).returning();
    return parent || undefined;
  }

  async setParentHostStatus(id: string, canHostSheeko: boolean): Promise<Parent | undefined> {
    const [parent] = await db.update(parents).set({ canHostSheeko }).where(eq(parents.id, id)).returning();
    return parent || undefined;
  }

  async getApprovedHosts(): Promise<Parent[]> {
    return await db.select().from(parents).where(eq(parents.canHostSheeko, true)).orderBy(parents.name);
  }

  // ======== COMMUNITY TERMS & USER BLOCKS (App Store Compliance) ========
  
  async acceptCommunityTerms(parentId: string): Promise<void> {
    await db.update(parents)
      .set({ 
        hasAcceptedCommunityTerms: true,
        communityTermsAcceptedAt: new Date()
      })
      .where(eq(parents.id, parentId));
  }

  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    // Check if already blocked
    const existing = await db.select().from(userBlocks)
      .where(and(
        eq(userBlocks.blockerId, blockerId),
        eq(userBlocks.blockedId, blockedId)
      ));
    
    if (existing.length === 0) {
      await db.insert(userBlocks).values({ blockerId, blockedId });
    }
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    await db.delete(userBlocks)
      .where(and(
        eq(userBlocks.blockerId, blockerId),
        eq(userBlocks.blockedId, blockedId)
      ));
  }

  async getBlockedUsers(parentId: string): Promise<{ id: string; name: string; picture: string | null }[]> {
    const blocks = await db.select({
      id: parents.id,
      name: parents.name,
      picture: parents.picture
    })
    .from(userBlocks)
    .innerJoin(parents, eq(userBlocks.blockedId, parents.id))
    .where(eq(userBlocks.blockerId, parentId));
    
    return blocks;
  }

  async isUserBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const block = await db.select().from(userBlocks)
      .where(and(
        eq(userBlocks.blockerId, blockerId),
        eq(userBlocks.blockedId, blockedId)
      ));
    return block.length > 0;
  }

  async getBlockedByUsers(parentId: string): Promise<string[]> {
    const blocks = await db.select({ blockerId: userBlocks.blockerId })
      .from(userBlocks)
      .where(eq(userBlocks.blockedId, parentId));
    return blocks.map(b => b.blockerId);
  }

  async deleteParent(id: string): Promise<void> {
    // Delete all related records first
    await db.delete(lessonProgress).where(eq(lessonProgress.parentId, id));
    await db.delete(enrollments).where(eq(enrollments.parentId, id));
    await db.delete(eventRsvps).where(eq(eventRsvps.parentId, id));
    await db.delete(appointments).where(eq(appointments.parentId, id));
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.parentId, id));
    await db.delete(badgeAwards).where(eq(badgeAwards.parentId, id));
    await db.delete(certificates).where(eq(certificates.parentId, id));
    await db.delete(courseReviews).where(eq(courseReviews.parentId, id));
    await db.delete(milestoneProgress).where(eq(milestoneProgress.parentId, id));
    await db.delete(assignmentSubmissions).where(eq(assignmentSubmissions.parentId, id));
    await db.delete(supportMessages).where(eq(supportMessages.parentId, id));
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.parentId, id));
    await db.delete(testimonials).where(eq(testimonials.parentId, id));
    
    // Delete homework related records
    await db.delete(homeworkUsage).where(eq(homeworkUsage.parentId, id));
    const conversations = await db.select().from(homeworkConversations).where(eq(homeworkConversations.parentId, id));
    for (const conv of conversations) {
      await db.delete(homeworkMessages).where(eq(homeworkMessages.conversationId, conv.id));
    }
    await db.delete(homeworkConversations).where(eq(homeworkConversations.parentId, id));
    
    // Delete community posts first (they reference threads), then threads
    await db.delete(communityPosts).where(eq(communityPosts.parentId, id));
    await db.delete(communityThreads).where(eq(communityThreads.parentId, id));
    
    // Delete assessment related records
    const assessments = await db.select().from(parentAssessments).where(eq(parentAssessments.parentId, id));
    for (const assessment of assessments) {
      await db.delete(assessmentResponses).where(eq(assessmentResponses.assessmentId, assessment.id));
      await db.delete(aiAssessmentInsights).where(eq(aiAssessmentInsights.assessmentId, assessment.id));
      await db.delete(learningPathRecommendations).where(eq(learningPathRecommendations.assessmentId, assessment.id));
    }
    await db.delete(parentAssessments).where(eq(parentAssessments.parentId, id));
    
    // Finally delete the parent (cascade will handle lessonProgress, homework tables)
    await db.delete(parents).where(eq(parents.id, id));
  }

  async getEventRsvps(eventId: string): Promise<EventRsvp[]> {
    return await db.select().from(eventRsvps).where(eq(eventRsvps.eventId, eventId));
  }

  async markRsvpReminderSent(rsvpId: string, reminderType: "24h" | "1h"): Promise<void> {
    const updateData: any = {};
    if (reminderType === "24h") {
      updateData.reminder24hSentAt = new Date();
    } else {
      updateData.reminder1hSentAt = new Date();
    }
    await db.update(eventRsvps).set(updateData).where(eq(eventRsvps.id, rsvpId));
  }

  async getPaymentsByEmail(email: string): Promise<PaymentSubmission[]> {
    return await db.select().from(paymentSubmissions)
      .where(and(
        eq(paymentSubmissions.customerEmail, email),
        eq(paymentSubmissions.status, "approved")
      ))
      .orderBy(paymentSubmissions.createdAt);
  }

  async getProgressByParentId(parentId: string): Promise<LessonProgress[]> {
    return await db.select().from(lessonProgress).where(eq(lessonProgress.parentId, parentId));
  }

  async markLessonComplete(parentId: string, lessonId: string, courseId: string): Promise<LessonProgress | { error: string; code?: string }> {
    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId));
    if (!lesson) {
      return { error: 'Casharkan lama helin' };
    }
    
    // Video watch requirement removed - parents can now complete lessons without viewing 80% of the video
    
    const existing = await this.getLessonProgress(parentId, lessonId);
    
    // Check if already completed - don't count again
    if (existing?.completed) {
      return existing;
    }
    
    // Check and record scheduling limits for "0-6 Bilood" course before completing
    const courseForScheduling = await this.getCourse(courseId);
    const is06Course = courseForScheduling && courseForScheduling.title.includes("0-6");
    
    if (is06Course) {
      const enrollment = await this.getActiveEnrollmentByParentAndCourse(parentId, courseId);
      if (enrollment) {
        // Use recordLessonCompletion which has its own guard check
        const result = await this.recordLessonCompletion(enrollment.id);
        if (!result.success) {
          // Return structured error with code
          const messages: Record<string, string> = {
            "DAILY_LIMIT_REACHED": "Maanta waxaad dhamaysay 2 cashar. Berri ku soo laabo.",
            "WEEKLY_LIMIT_REACHED": "Usbuucan waxaad dhamaysay 4 cashar. Usbuuca dambe ku soo laabo.",
            "NO_ENROLLMENT": "Ma lihid diiwaan gal koorsadan."
          };
          return { 
            error: messages[result.error || ""] || "Waqtiga casharkaaga waa dhamaaday",
            code: result.error 
          };
        }
      }
    }
    
    if (existing) {
      const [updated] = await db.update(lessonProgress)
        .set({ completed: true, completedAt: new Date() })
        .where(eq(lessonProgress.id, existing.id))
        .returning();
      return updated;
    }
    const [progress] = await db.insert(lessonProgress).values({
      parentId,
      lessonId,
      courseId,
      completed: true,
      completedAt: new Date(),
    }).returning();
    return progress;
  }

  async getLessonProgress(parentId: string, lessonId: string): Promise<LessonProgress | undefined> {
    const [progress] = await db.select().from(lessonProgress)
      .where(and(eq(lessonProgress.parentId, parentId), eq(lessonProgress.lessonId, lessonId)));
    return progress || undefined;
  }

  async updateVideoProgress(parentId: string, lessonId: string, courseId: string, percent: number): Promise<LessonProgress> {
    const existing = await this.getLessonProgress(parentId, lessonId);
    if (existing) {
      const [updated] = await db.update(lessonProgress)
        .set({ 
          videoWatchedPercent: percent, 
          videoWatchedAt: percent >= 80 ? new Date() : existing.videoWatchedAt 
        })
        .where(eq(lessonProgress.id, existing.id))
        .returning();
      return updated;
    }
    const [progress] = await db.insert(lessonProgress).values({
      parentId,
      lessonId,
      courseId,
      completed: false,
      videoWatchedPercent: percent,
      videoWatchedAt: percent >= 80 ? new Date() : null,
    }).returning();
    return progress;
  }

  async updateLastViewed(parentId: string, lessonId: string, courseId: string): Promise<LessonProgress> {
    const existing = await this.getLessonProgress(parentId, lessonId);
    if (existing) {
      const [updated] = await db.update(lessonProgress)
        .set({ lastViewedAt: new Date() })
        .where(eq(lessonProgress.id, existing.id))
        .returning();
      return updated;
    }
    const [progress] = await db.insert(lessonProgress).values({
      parentId,
      lessonId,
      courseId,
      completed: false,
      lastViewedAt: new Date(),
    }).returning();
    return progress;
  }

  async checkLessonUnlocked(parentId: string, lesson: Lesson): Promise<{ unlocked: boolean; reason?: string; unlockDate?: string }> {
    // Admin bypass - admins can access all lessons without restrictions
    const parent = await this.getParent(parentId);
    if (parent?.isAdmin) {
      return { unlocked: true };
    }
    
    const unlockType = lesson.unlockType || 'immediate';
    
    if (unlockType === 'immediate') {
      return { unlocked: true };
    }
    
    if (unlockType === 'date' && lesson.unlockDate) {
      const unlockDate = new Date(lesson.unlockDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      unlockDate.setHours(0, 0, 0, 0);
      
      if (today >= unlockDate) {
        return { unlocked: true };
      }
      
      // Format date as DD.MM.YYYY for Somali users
      const day = unlockDate.getDate().toString().padStart(2, '0');
      const month = (unlockDate.getMonth() + 1).toString().padStart(2, '0');
      const year = unlockDate.getFullYear();
      const formattedDate = `${day}.${month}.${year}`;
      
      return { 
        unlocked: false, 
        reason: `Casharkani wuxuu furmayaa ${formattedDate}`, 
        unlockDate: lesson.unlockDate 
      };
    }
    
    if (unlockType === 'days_after_enrollment' && lesson.unlockDaysAfter) {
      // First check for specific course enrollment
      let [enrollment] = await db.select().from(enrollments)
        .where(and(
          eq(enrollments.parentId, parentId),
          eq(enrollments.courseId, lesson.courseId),
          eq(enrollments.status, 'active')
        ));
      
      // If no specific enrollment, check for All-Access subscription
      if (!enrollment) {
        const allAccessCourse = await this.getCourseByCourseId("all-access");
        if (allAccessCourse) {
          const [allAccessEnrollment] = await db.select().from(enrollments)
            .where(and(
              eq(enrollments.parentId, parentId),
              eq(enrollments.courseId, allAccessCourse.id),
              eq(enrollments.status, 'active')
            ));
          if (allAccessEnrollment) {
            enrollment = allAccessEnrollment;
          }
        }
      }
      
      if (!enrollment) {
        return { unlocked: false, reason: 'Ma haysatid diiwaangelin' };
      }
      
      const enrollmentDate = new Date(enrollment.accessStart || new Date());
      const unlockDate = new Date(enrollmentDate);
      unlockDate.setDate(unlockDate.getDate() + lesson.unlockDaysAfter);
      
      const today = new Date();
      if (today >= unlockDate) {
        return { unlocked: true };
      }
      
      return { 
        unlocked: false, 
        reason: `Casharkani wuxuu furmayaa ${lesson.unlockDaysAfter} maalmood ka dib marka aad koorsada gasho`,
        unlockDate: unlockDate.toISOString().split('T')[0]
      };
    }
    
    if (unlockType === 'days_after_previous' && lesson.unlockDaysAfter) {
      const courseLessons = await db.select().from(lessons)
        .where(eq(lessons.courseId, lesson.courseId))
        .orderBy(asc(lessons.order));
      
      const lessonIndex = courseLessons.findIndex(l => l.id === lesson.id);
      if (lessonIndex <= 0) {
        return { unlocked: true };
      }
      
      const previousLesson = courseLessons[lessonIndex - 1];
      const prevProgress = await this.getLessonProgress(parentId, previousLesson.id);
      
      if (!prevProgress?.completed || !prevProgress.completedAt) {
        return { 
          unlocked: false, 
          reason: 'Waa inaad marka hore dhamaysataa casharka hore'
        };
      }
      
      const completedDate = new Date(prevProgress.completedAt);
      const unlockDate = new Date(completedDate);
      unlockDate.setDate(unlockDate.getDate() + lesson.unlockDaysAfter);
      
      const today = new Date();
      if (today >= unlockDate) {
        return { unlocked: true };
      }
      
      return { 
        unlocked: false, 
        reason: `Casharkani wuxuu furmayaa ${lesson.unlockDaysAfter} maalmood ka dib marka aad casharka hore dhameysato`,
        unlockDate: unlockDate.toISOString().split('T')[0]
      };
    }
    
    return { unlocked: true };
  }

  async checkPreviousLessonCompleted(parentId: string, lesson: Lesson): Promise<{ canAccess: boolean; previousLessonId?: string; previousLessonTitle?: string }> {
    // Admin bypass - admins can access all lessons without restrictions
    const parent = await this.getParent(parentId);
    if (parent?.isAdmin) {
      return { canAccess: true };
    }

    // Get all lessons in this course ordered by order field
    const courseLessons = await db.select().from(lessons)
      .where(eq(lessons.courseId, lesson.courseId))
      .orderBy(asc(lessons.order));

    // Find the index of the current lesson
    const currentIndex = courseLessons.findIndex(l => l.id === lesson.id);
    
    // First lesson is always accessible
    if (currentIndex <= 0) {
      return { canAccess: true };
    }

    // Get the previous lesson
    const previousLesson = courseLessons[currentIndex - 1];
    
    // Check if the previous lesson has actual content (skip empty placeholders)
    const hasContent = previousLesson.videoUrl || previousLesson.textContent || previousLesson.liveUrl || previousLesson.assignmentRequirements;
    if (!hasContent) {
      // If previous lesson has no content, it's considered complete - check the one before that
      // For simplicity, allow access if the immediate previous has no content
      return { canAccess: true };
    }

    // Check if the previous lesson is completed
    const prevProgress = await this.getLessonProgress(parentId, previousLesson.id);
    
    if (prevProgress?.completed) {
      return { canAccess: true };
    }

    return { 
      canAccess: false, 
      previousLessonId: previousLesson.id,
      previousLessonTitle: previousLesson.title
    };
  }

  async getAllLessonProgress(parentId: string, courseId: string): Promise<LessonProgress[]> {
    return await db.select().from(lessonProgress)
      .where(and(
        eq(lessonProgress.parentId, parentId),
        eq(lessonProgress.courseId, courseId)
      ));
  }

  // Testimonial operations
  async getPublishedTestimonials(): Promise<Testimonial[]> {
    return await db.select().from(testimonials).where(eq(testimonials.isPublished, true)).orderBy(testimonials.order);
  }

  async getAllTestimonials(): Promise<Testimonial[]> {
    return await db.select().from(testimonials).orderBy(testimonials.order);
  }

  async getTestimonial(id: string): Promise<Testimonial | undefined> {
    const [testimonial] = await db.select().from(testimonials).where(eq(testimonials.id, id));
    return testimonial || undefined;
  }

  async createTestimonial(insertTestimonial: InsertTestimonial): Promise<Testimonial> {
    const [testimonial] = await db.insert(testimonials).values(insertTestimonial).returning();
    return testimonial;
  }

  async updateTestimonial(id: string, updateData: Partial<InsertTestimonial>): Promise<Testimonial | undefined> {
    const [testimonial] = await db.update(testimonials).set(updateData).where(eq(testimonials.id, id)).returning();
    return testimonial || undefined;
  }

  async deleteTestimonial(id: string): Promise<void> {
    await db.delete(testimonials).where(eq(testimonials.id, id));
  }

  // Quiz operations for admin
  async getAllQuizzesWithDetails(): Promise<any[]> {
    const quizzesList = await db.select({
      id: quizzes.id,
      title: quizzes.title,
      description: quizzes.description,
      lessonId: quizzes.lessonId,
      passingScore: quizzes.passingScore,
      lessonTitle: lessons.title,
      courseId: lessons.courseId,
    }).from(quizzes)
      .leftJoin(lessons, eq(quizzes.lessonId, lessons.id));
    
    const quizzesWithCourse = await Promise.all(quizzesList.map(async (quiz) => {
      const [course] = await db.select({ title: courses.title }).from(courses).where(eq(courses.id, quiz.courseId || ''));
      const questionCount = await db.select().from(quizQuestions).where(eq(quizQuestions.quizId, quiz.id));
      return {
        ...quiz,
        courseTitle: course?.title || 'Unknown',
        questionCount: questionCount.length,
      };
    }));
    
    return quizzesWithCourse;
  }

  async getQuizzesByCourseId(courseId: string): Promise<any[]> {
    const quizzesList = await db.select({
      id: quizzes.id,
      title: quizzes.title,
      description: quizzes.description,
      lessonId: quizzes.lessonId,
      passingScore: quizzes.passingScore,
      lessonOrder: lessons.order,
      lessonModuleNumber: lessons.moduleNumber,
    }).from(quizzes)
      .innerJoin(lessons, eq(quizzes.lessonId, lessons.id))
      .where(eq(lessons.courseId, courseId));
    
    return quizzesList;
  }

  // Assignment operations
  async getAssignmentsByLessonId(lessonId: string): Promise<any[]> {
    return await db.select().from(assignments).where(eq(assignments.lessonId, lessonId));
  }

  async getAssignment(id: string): Promise<any | null> {
    const result = await db.select({
      id: assignments.id,
      title: assignments.title,
      description: assignments.description,
      lessonId: assignments.lessonId,
      order: assignments.order,
      lesson: {
        id: lessons.id,
        title: lessons.title,
        courseId: lessons.courseId,
      }
    })
    .from(assignments)
    .leftJoin(lessons, eq(assignments.lessonId, lessons.id))
    .where(eq(assignments.id, id));
    return result[0] || null;
  }

  async getAssignmentsByCourseId(courseId: string): Promise<any[]> {
    const assignmentsList = await db.select({
      id: assignments.id,
      title: assignments.title,
      description: assignments.description,
      lessonId: assignments.lessonId,
      lessonOrder: lessons.order,
      lessonModuleNumber: lessons.moduleNumber,
    }).from(assignments)
      .innerJoin(lessons, eq(assignments.lessonId, lessons.id))
      .where(eq(lessons.courseId, courseId));
    
    return assignmentsList;
  }

  async getAllAssignmentsWithDetails(): Promise<any[]> {
    const assignmentsList = await db.select({
      id: assignments.id,
      title: assignments.title,
      description: assignments.description,
      lessonId: assignments.lessonId,
      lessonTitle: lessons.title,
      courseId: lessons.courseId,
    }).from(assignments)
      .leftJoin(lessons, eq(assignments.lessonId, lessons.id));
    
    const assignmentsWithCourse = await Promise.all(assignmentsList.map(async (assignment) => {
      const [course] = await db.select({ title: courses.title }).from(courses).where(eq(courses.id, assignment.courseId || ''));
      return {
        ...assignment,
        courseTitle: course?.title || 'Unknown',
      };
    }));
    
    return assignmentsWithCourse;
  }

  async createAssignment(assignment: any): Promise<any> {
    const [result] = await db.insert(assignments).values(assignment).returning();
    return result;
  }

  async deleteAssignment(id: string): Promise<void> {
    await db.delete(assignments).where(eq(assignments.id, id));
  }

  // Assignment Submission operations
  async getAssignmentSubmissionByParentAndLesson(parentId: string, lessonId: string): Promise<AssignmentSubmission | undefined> {
    const [submission] = await db.select().from(assignmentSubmissions).where(
      and(eq(assignmentSubmissions.parentId, parentId), eq(assignmentSubmissions.assignmentId, lessonId))
    );
    return submission || undefined;
  }

  async getAllAssignmentSubmissions(): Promise<AssignmentSubmission[]> {
    return await db.select().from(assignmentSubmissions).orderBy(desc(assignmentSubmissions.submittedAt));
  }

  async getAllAssignmentSubmissionsWithDetails(): Promise<any[]> {
    const result = await db.select({
      id: assignmentSubmissions.id,
      content: assignmentSubmissions.content,
      submittedAt: assignmentSubmissions.submittedAt,
      parentId: assignmentSubmissions.parentId,
      assignmentId: assignmentSubmissions.assignmentId,
      parentName: parents.name,
      parentEmail: parents.email,
      assignmentTitle: assignments.title,
      lessonTitle: lessons.title,
      courseTitle: courses.title,
    })
    .from(assignmentSubmissions)
    .leftJoin(parents, eq(assignmentSubmissions.parentId, parents.id))
    .leftJoin(assignments, eq(assignmentSubmissions.assignmentId, assignments.id))
    .leftJoin(lessons, eq(assignments.lessonId, lessons.id))
    .leftJoin(courses, eq(lessons.courseId, courses.id))
    .orderBy(desc(assignmentSubmissions.submittedAt));
    return result;
  }

  async getAssignmentSubmissionsByParentAndAssignment(parentId: string, assignmentId: string): Promise<AssignmentSubmission[]> {
    return await db.select()
      .from(assignmentSubmissions)
      .where(and(
        eq(assignmentSubmissions.parentId, parentId),
        eq(assignmentSubmissions.assignmentId, assignmentId)
      ));
  }

  async createAssignmentSubmission(submission: InsertAssignmentSubmission): Promise<AssignmentSubmission> {
    const [result] = await db.insert(assignmentSubmissions).values(submission).returning();
    return result;
  }

  async updateAssignmentSubmission(id: string, data: Partial<AssignmentSubmission>): Promise<AssignmentSubmission | undefined> {
    const [result] = await db.update(assignmentSubmissions).set(data).where(eq(assignmentSubmissions.id, id)).returning();
    return result || undefined;
  }

  // Support Message operations
  async getSupportMessagesByParentId(parentId: string): Promise<SupportMessage[]> {
    return await db.select().from(supportMessages)
      .where(eq(supportMessages.parentId, parentId))
      .orderBy(asc(supportMessages.createdAt));
  }

  async getSupportMessagesBySessionId(sessionId: string): Promise<SupportMessage[]> {
    return await db.select().from(supportMessages)
      .where(eq(supportMessages.sessionId, sessionId))
      .orderBy(asc(supportMessages.createdAt));
  }

  async getAllSupportMessages(): Promise<SupportMessage[]> {
    return await db.select().from(supportMessages).orderBy(desc(supportMessages.createdAt));
  }

  async getSupportConversations(): Promise<any[]> {
    const messages = await db.select().from(supportMessages).orderBy(desc(supportMessages.createdAt));
    const conversations: Record<string, any> = {};
    
    for (const msg of messages) {
      const key = msg.parentId || msg.sessionId || 'unknown';
      if (!conversations[key]) {
        conversations[key] = {
          id: key,
          parentId: msg.parentId,
          sessionId: msg.sessionId,
          guestName: msg.guestName,
          guestEmail: msg.guestEmail,
          guestPhone: msg.guestPhone,
          guestLocation: msg.guestLocation,
          messages: [],
          lastMessage: msg.message,
          lastMessageAt: msg.createdAt,
          unreadCount: 0
        };
      }
      conversations[key].messages.push(msg);
      if (!msg.isFromAdmin && !msg.isRead) {
        conversations[key].unreadCount++;
      }
    }
    
    return Object.values(conversations).sort((a, b) => 
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
  }

  async createSupportMessage(message: InsertSupportMessage): Promise<SupportMessage> {
    const [result] = await db.insert(supportMessages).values(message).returning();
    return result;
  }

  async markSupportMessagesAsRead(parentId?: string, sessionId?: string): Promise<void> {
    if (parentId) {
      await db.update(supportMessages).set({ isRead: true }).where(eq(supportMessages.parentId, parentId));
    } else if (sessionId) {
      await db.update(supportMessages).set({ isRead: true }).where(eq(supportMessages.sessionId, sessionId));
    }
  }

  // Stats operations
  async getParentCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(parents);
    return Number(result[0]?.count || 0);
  }
  
  async getAllParentsWithProgress(): Promise<{
    parent: Parent;
    lessonsCompleted: number;
    totalLessons: number;
    enrolledCourses: number;
    assessmentsCompleted: number;
    lastActivity: string | null;
  }[]> {
    // Get all parents
    const allParents = await db.select().from(parents).orderBy(desc(parents.createdAt));
    
    // Get total lessons count
    const totalLessonsResult = await db.select({ count: sql<number>`count(*)` }).from(lessons);
    const totalLessons = Number(totalLessonsResult[0]?.count || 0);
    
    // Get progress for all parents in one query
    const progressData = await db.select({
      parentId: lessonProgress.parentId,
      completedCount: sql<number>`count(*) filter (where ${lessonProgress.completed} = true)`,
      lastActivity: sql<string>`max(${lessonProgress.completedAt})`,
    }).from(lessonProgress).groupBy(lessonProgress.parentId);
    
    // Get enrollments count per parent
    const enrollmentsData = await db.select({
      parentId: enrollments.parentId,
      courseCount: sql<number>`count(distinct ${enrollments.courseId})`,
    }).from(enrollments).where(eq(enrollments.status, "active")).groupBy(enrollments.parentId);
    
    // Get completed assessments count per parent
    const assessmentsData = await db.select({
      parentId: parentAssessments.parentId,
      assessmentCount: sql<number>`count(*) filter (where ${parentAssessments.status} = 'completed' or ${parentAssessments.status} = 'analyzed')`,
    }).from(parentAssessments).groupBy(parentAssessments.parentId);
    
    // Create lookup maps
    const progressMap = new Map(progressData.map(p => [p.parentId, p]));
    const enrollmentMap = new Map(enrollmentsData.map(e => [e.parentId, Number(e.courseCount)]));
    const assessmentMap = new Map(assessmentsData.map(a => [a.parentId, Number(a.assessmentCount)]));
    
    // Combine data
    return allParents.map(parent => {
      const progress = progressMap.get(parent.id);
      return {
        parent,
        lessonsCompleted: progress ? Number(progress.completedCount) : 0,
        totalLessons,
        enrolledCourses: enrollmentMap.get(parent.id) || 0,
        assessmentsCompleted: assessmentMap.get(parent.id) || 0,
        lastActivity: progress?.lastActivity || parent.lastLoginAt?.toISOString() || null,
      };
    });
  }

  // Module operations
  async getAllModules(): Promise<Module[]> {
    return db.select().from(modules).orderBy(asc(modules.courseId), asc(modules.order));
  }

  async getModulesByCourseId(courseId: string): Promise<Module[]> {
    return db.select().from(modules).where(eq(modules.courseId, courseId)).orderBy(asc(modules.order));
  }

  async getModule(id: string): Promise<Module | undefined> {
    const [module] = await db.select().from(modules).where(eq(modules.id, id));
    return module || undefined;
  }

  async createModule(module: InsertModule): Promise<Module> {
    const [result] = await db.insert(modules).values(module).returning();
    return result;
  }

  async updateModule(id: string, data: Partial<InsertModule>): Promise<Module | undefined> {
    const [result] = await db.update(modules).set(data).where(eq(modules.id, id)).returning();
    return result || undefined;
  }

  async deleteModule(id: string): Promise<void> {
    await db.delete(modules).where(eq(modules.id, id));
  }

  // ===============================================
  // NEW FEATURES: Daily Tips, Milestones, Badges, Resources, Community
  // ===============================================

  // Daily Tips
  async getDailyTip(ageRange?: string, dayOfYear?: number): Promise<DailyTip | undefined> {
    let query = db.select().from(dailyTips);
    if (ageRange) {
      const tips = await query.where(eq(dailyTips.ageRange, ageRange)).orderBy(asc(dailyTips.order));
      if (tips.length > 0) {
        const index = dayOfYear ? dayOfYear % tips.length : 0;
        return tips[index];
      }
    }
    const allTips = await query.orderBy(asc(dailyTips.order));
    if (allTips.length > 0) {
      const index = dayOfYear ? dayOfYear % allTips.length : 0;
      return allTips[index];
    }
    return undefined;
  }

  async getAllDailyTips(): Promise<DailyTip[]> {
    return db.select().from(dailyTips).orderBy(asc(dailyTips.ageRange), asc(dailyTips.order));
  }

  async createDailyTip(tip: InsertDailyTip): Promise<DailyTip> {
    const [result] = await db.insert(dailyTips).values(tip).returning();
    return result;
  }

  async updateDailyTip(id: string, data: Partial<InsertDailyTip>): Promise<DailyTip | undefined> {
    const [result] = await db.update(dailyTips).set(data).where(eq(dailyTips.id, id)).returning();
    return result || undefined;
  }

  async deleteDailyTip(id: string): Promise<void> {
    await db.delete(dailyTips).where(eq(dailyTips.id, id));
  }

  // Daily Tip Schedules
  async getAllDailyTipSchedules(): Promise<DailyTipSchedule[]> {
    return db.select().from(dailyTipSchedules).orderBy(desc(dailyTipSchedules.createdAt));
  }

  async getDailyTipSchedulesByTipId(tipId: string): Promise<DailyTipSchedule[]> {
    return db.select().from(dailyTipSchedules).where(eq(dailyTipSchedules.tipId, tipId));
  }

  async getScheduledTipForDate(date: string): Promise<DailyTip | null> {
    const schedules = await db.select()
      .from(dailyTipSchedules)
      .where(and(
        eq(dailyTipSchedules.scheduleType, 'day'),
        eq(dailyTipSchedules.scheduledDate, date),
        eq(dailyTipSchedules.isActive, true)
      ))
      .orderBy(desc(dailyTipSchedules.priority));
    
    if (schedules.length > 0) {
      const [tip] = await db.select().from(dailyTips).where(eq(dailyTips.id, schedules[0].tipId));
      return tip || null;
    }
    return null;
  }

  async getScheduledTipForWeek(weekNumber: number): Promise<DailyTip | null> {
    const schedules = await db.select()
      .from(dailyTipSchedules)
      .where(and(
        eq(dailyTipSchedules.scheduleType, 'week'),
        eq(dailyTipSchedules.weekNumber, weekNumber),
        eq(dailyTipSchedules.isActive, true)
      ))
      .orderBy(desc(dailyTipSchedules.priority));
    
    if (schedules.length > 0) {
      const [tip] = await db.select().from(dailyTips).where(eq(dailyTips.id, schedules[0].tipId));
      return tip || null;
    }
    return null;
  }

  async createDailyTipSchedule(schedule: InsertDailyTipSchedule): Promise<DailyTipSchedule> {
    const [result] = await db.insert(dailyTipSchedules).values(schedule).returning();
    return result;
  }

  async updateDailyTipSchedule(id: string, data: Partial<InsertDailyTipSchedule>): Promise<DailyTipSchedule | undefined> {
    const [result] = await db.update(dailyTipSchedules).set(data).where(eq(dailyTipSchedules.id, id)).returning();
    return result || undefined;
  }

  async deleteDailyTipSchedule(id: string): Promise<void> {
    await db.delete(dailyTipSchedules).where(eq(dailyTipSchedules.id, id));
  }

  // Milestones
  async getMilestones(ageRange?: string): Promise<Milestone[]> {
    if (ageRange) {
      return db.select().from(milestones).where(eq(milestones.ageRange, ageRange)).orderBy(asc(milestones.order));
    }
    return db.select().from(milestones).orderBy(asc(milestones.ageRange), asc(milestones.order));
  }

  async getAllMilestones(): Promise<Milestone[]> {
    return db.select().from(milestones).orderBy(asc(milestones.ageRange), asc(milestones.order));
  }

  async createMilestone(milestone: InsertMilestone): Promise<Milestone> {
    const [result] = await db.insert(milestones).values(milestone).returning();
    return result;
  }

  async updateMilestone(id: string, data: Partial<InsertMilestone>): Promise<Milestone | undefined> {
    const [result] = await db.update(milestones).set(data).where(eq(milestones.id, id)).returning();
    return result || undefined;
  }

  async deleteMilestone(id: string): Promise<void> {
    await db.delete(milestones).where(eq(milestones.id, id));
  }

  async getMilestoneProgress(parentId: string): Promise<MilestoneProgress[]> {
    return db.select().from(milestoneProgress).where(eq(milestoneProgress.parentId, parentId));
  }

  async toggleMilestoneProgress(parentId: string, milestoneId: string, notes?: string): Promise<MilestoneProgress> {
    const existing = await db.select().from(milestoneProgress)
      .where(and(eq(milestoneProgress.parentId, parentId), eq(milestoneProgress.milestoneId, milestoneId)));
    
    if (existing.length > 0) {
      const [updated] = await db.update(milestoneProgress)
        .set({ 
          completed: !existing[0].completed, 
          completedAt: !existing[0].completed ? new Date() : null,
          notes: notes || existing[0].notes 
        })
        .where(eq(milestoneProgress.id, existing[0].id))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(milestoneProgress).values({
      parentId,
      milestoneId,
      completed: true,
      completedAt: new Date(),
      notes: notes || null,
    }).returning();
    return created;
  }

  // Badges
  async getBadges(): Promise<Badge[]> {
    return db.select().from(badges).orderBy(asc(badges.order));
  }

  async getEarnedBadges(parentId: string): Promise<BadgeAward[]> {
    return db.select().from(badgeAwards).where(eq(badgeAwards.parentId, parentId));
  }

  async hasEarnedBadge(parentId: string, badgeId: string): Promise<boolean> {
    const existing = await db.select().from(badgeAwards)
      .where(and(eq(badgeAwards.parentId, parentId), eq(badgeAwards.badgeId, badgeId)));
    return existing.length > 0;
  }

  async awardBadge(parentId: string, badgeId: string): Promise<BadgeAward | null> {
    // Check if already awarded
    const hasEarned = await this.hasEarnedBadge(parentId, badgeId);
    if (hasEarned) return null;
    
    const [award] = await db.insert(badgeAwards).values({ parentId, badgeId }).returning();
    return award;
  }

  async getBadgesByTrigger(triggerType: string, triggerValue?: string): Promise<Badge[]> {
    if (triggerValue) {
      return db.select().from(badges)
        .where(and(eq(badges.triggerType, triggerType), eq(badges.triggerValue, triggerValue)));
    }
    return db.select().from(badges).where(eq(badges.triggerType, triggerType));
  }

  async createBadge(data: { name: string; description?: string; imageUrl?: string; triggerType: string; triggerValue?: string; order?: number }): Promise<Badge> {
    const [badge] = await db.insert(badges).values({
      name: data.name,
      description: data.description || null,
      imageUrl: data.imageUrl || null,
      triggerType: data.triggerType,
      triggerValue: data.triggerValue || null,
      order: data.order || 0,
    }).returning();
    return badge;
  }

  async ensureDefaultBadges(): Promise<void> {
    const existingBadges = await this.getBadges();
    if (existingBadges.length === 0) {
      // Create default badges
      await this.createBadge({
        name: "Koorso Dhamaystiray",
        description: "Waxaad si guul leh u dhameysay koorso",
        triggerType: "course_complete",
        order: 1,
      });
      await this.createBadge({
        name: "Arday Bilaabay",
        description: "Waxaad bilowday safarkaaga waxbarashada",
        triggerType: "first_lesson",
        order: 2,
      });
      await this.createBadge({
        name: "Arday Dadaal Badan",
        description: "Waxaad dhameysay 10 cashar",
        triggerType: "lessons_complete",
        triggerValue: "10",
        order: 3,
      });
    }
  }

  async getCompletedLessonsCount(parentId: string): Promise<number> {
    const progress = await db.select().from(lessonProgress)
      .where(and(eq(lessonProgress.parentId, parentId), eq(lessonProgress.completed, true)));
    return progress.length;
  }

  // Resources
  async getResources(category?: string, ageRange?: string): Promise<Resource[]> {
    let query = db.select().from(resources).where(eq(resources.isPublished, true));
    const allResources = await query.orderBy(asc(resources.order));
    return allResources.filter(r => {
      if (category && r.category !== category) return false;
      if (ageRange && r.ageRange && r.ageRange !== ageRange) return false;
      return true;
    });
  }

  async incrementResourceDownload(id: string): Promise<Resource | undefined> {
    const [resource] = await db.update(resources)
      .set({ downloadCount: sql`${resources.downloadCount} + 1` })
      .where(eq(resources.id, id))
      .returning();
    return resource;
  }

  async getAllResourcesAdmin(): Promise<Resource[]> {
    return db.select().from(resources).orderBy(asc(resources.order));
  }

  async createResource(resource: InsertResource): Promise<Resource> {
    const [created] = await db.insert(resources).values(resource).returning();
    return created;
  }

  async deleteResource(id: string): Promise<void> {
    await db.delete(resources).where(eq(resources.id, id));
  }

  // Live Events
  async getLiveEvents(): Promise<LiveEvent[]> {
    return db.select().from(liveEvents).where(eq(liveEvents.isPublished, true)).orderBy(desc(liveEvents.scheduledAt));
  }

  async createLiveEvent(event: InsertLiveEvent): Promise<LiveEvent> {
    const [created] = await db.insert(liveEvents).values(event).returning();
    return created;
  }

  async deleteLiveEventByLessonId(lessonId: string): Promise<void> {
    // Delete live events linked to this lesson via the lessonId column
    await db.delete(liveEvents).where(eq(liveEvents.lessonId, lessonId));
  }

  async getLiveEventByLessonId(lessonId: string): Promise<LiveEvent | undefined> {
    const [event] = await db.select().from(liveEvents).where(eq(liveEvents.lessonId, lessonId));
    return event || undefined;
  }

  async updateLiveEvent(id: string, data: Partial<InsertLiveEvent>): Promise<LiveEvent | undefined> {
    const [updated] = await db.update(liveEvents).set(data).where(eq(liveEvents.id, id)).returning();
    return updated || undefined;
  }

  async rsvpToEvent(eventId: string, parentId: string): Promise<EventRsvp> {
    const existing = await db.select().from(eventRsvps)
      .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.parentId, parentId)));
    if (existing.length > 0) {
      return existing[0];
    }
    const [rsvp] = await db.insert(eventRsvps).values({ eventId, parentId }).returning();
    return rsvp;
  }

  async getMyRsvps(parentId: string): Promise<EventRsvp[]> {
    return db.select().from(eventRsvps).where(eq(eventRsvps.parentId, parentId));
  }

  // Community
  async getCommunityThreadsWithParentNames(courseId?: string, currentParentId?: string): Promise<(CommunityThread & { parentName: string; isLikedByMe: boolean })[]> {
    const baseQuery = courseId 
      ? db.select({
          thread: communityThreads,
          parentName: parents.name,
        }).from(communityThreads)
          .leftJoin(parents, eq(communityThreads.parentId, parents.id))
          .where(eq(communityThreads.courseId, courseId))
          .orderBy(desc(communityThreads.isPinned), desc(communityThreads.createdAt))
      : db.select({
          thread: communityThreads,
          parentName: parents.name,
        }).from(communityThreads)
          .leftJoin(parents, eq(communityThreads.parentId, parents.id))
          .orderBy(desc(communityThreads.isPinned), desc(communityThreads.createdAt));
    
    const results = await baseQuery;
    
    const threadsWithNames = await Promise.all(results.map(async (r) => {
      let isLikedByMe = false;
      if (currentParentId) {
        const like = await db.select().from(communityLikes)
          .where(and(
            eq(communityLikes.threadId, r.thread.id),
            eq(communityLikes.parentId, currentParentId)
          ));
        isLikedByMe = like.length > 0;
      }
      return {
        ...r.thread,
        parentName: r.parentName || "Waalid",
        isLikedByMe,
      };
    }));
    
    return threadsWithNames;
  }

  async getCommunityThreads(courseId?: string): Promise<CommunityThread[]> {
    if (courseId) {
      return db.select().from(communityThreads).where(eq(communityThreads.courseId, courseId)).orderBy(desc(communityThreads.isPinned), desc(communityThreads.createdAt));
    }
    return db.select().from(communityThreads).orderBy(desc(communityThreads.isPinned), desc(communityThreads.createdAt));
  }

  async createCommunityThread(thread: InsertCommunityThread): Promise<CommunityThread> {
    const [created] = await db.insert(communityThreads).values(thread).returning();
    return created;
  }

  async getCommunityPostsWithParentNames(threadId: string, currentParentId?: string): Promise<(CommunityPost & { parentName: string; isLikedByMe: boolean })[]> {
    const results = await db.select({
      post: communityPosts,
      parentName: parents.name,
    }).from(communityPosts)
      .leftJoin(parents, eq(communityPosts.parentId, parents.id))
      .where(eq(communityPosts.threadId, threadId))
      .orderBy(asc(communityPosts.createdAt));
    
    const postsWithNames = await Promise.all(results.map(async (r) => {
      let isLikedByMe = false;
      if (currentParentId) {
        const like = await db.select().from(communityLikes)
          .where(and(
            eq(communityLikes.postId, r.post.id),
            eq(communityLikes.parentId, currentParentId)
          ));
        isLikedByMe = like.length > 0;
      }
      return {
        ...r.post,
        parentName: r.parentName || "Waalid",
        isLikedByMe,
      };
    }));
    
    return postsWithNames;
  }

  async getCommunityPosts(threadId: string): Promise<CommunityPost[]> {
    return db.select().from(communityPosts).where(eq(communityPosts.threadId, threadId)).orderBy(asc(communityPosts.createdAt));
  }

  async createCommunityPost(post: InsertCommunityPost): Promise<CommunityPost> {
    const [created] = await db.insert(communityPosts).values(post).returning();
    await db.update(communityThreads)
      .set({ replyCount: sql`${communityThreads.replyCount} + 1`, updatedAt: new Date() })
      .where(eq(communityThreads.id, post.threadId));
    return created;
  }

  async toggleThreadLike(threadId: string, parentId: string): Promise<{ liked: boolean }> {
    const existing = await db.select().from(communityLikes)
      .where(and(eq(communityLikes.threadId, threadId), eq(communityLikes.parentId, parentId)));
    
    if (existing.length > 0) {
      await db.delete(communityLikes).where(eq(communityLikes.id, existing[0].id));
      await db.update(communityThreads)
        .set({ likeCount: sql`GREATEST(${communityThreads.likeCount} - 1, 0)` })
        .where(eq(communityThreads.id, threadId));
      return { liked: false };
    } else {
      await db.insert(communityLikes).values({ threadId, parentId });
      await db.update(communityThreads)
        .set({ likeCount: sql`${communityThreads.likeCount} + 1` })
        .where(eq(communityThreads.id, threadId));
      return { liked: true };
    }
  }

  async toggleThreadPin(threadId: string): Promise<{ pinned: boolean }> {
    const [thread] = await db.select().from(communityThreads).where(eq(communityThreads.id, threadId));
    if (!thread) {
      throw new Error("Thread not found");
    }
    const newPinned = !thread.isPinned;
    await db.update(communityThreads)
      .set({ isPinned: newPinned })
      .where(eq(communityThreads.id, threadId));
    return { pinned: newPinned };
  }

  async togglePostLike(postId: string, parentId: string): Promise<{ liked: boolean }> {
    const existing = await db.select().from(communityLikes)
      .where(and(eq(communityLikes.postId, postId), eq(communityLikes.parentId, parentId)));
    
    if (existing.length > 0) {
      await db.delete(communityLikes).where(eq(communityLikes.id, existing[0].id));
      await db.update(communityPosts)
        .set({ likeCount: sql`GREATEST(${communityPosts.likeCount} - 1, 0)` })
        .where(eq(communityPosts.id, postId));
      return { liked: false };
    } else {
      await db.insert(communityLikes).values({ postId, parentId });
      await db.update(communityPosts)
        .set({ likeCount: sql`${communityPosts.likeCount} + 1` })
        .where(eq(communityPosts.id, postId));
      return { liked: true };
    }
  }

  // Search functionality
  async searchCoursesAndLessons(query: string): Promise<{ courses: Course[]; lessons: (Lesson & { courseName: string })[] }> {
    const searchPattern = `%${query}%`;
    
    const matchingCourses = await db.select().from(courses)
      .where(or(
        ilike(courses.title, searchPattern),
        ilike(courses.description, searchPattern)
      ))
      .orderBy(courses.order);
    
    const matchingLessons = await db.select({
      id: lessons.id,
      courseId: lessons.courseId,
      title: lessons.title,
      description: lessons.description,
      videoUrl: lessons.videoUrl,
      textContent: lessons.textContent,
      order: lessons.order,
      duration: lessons.duration,
      moduleNumber: lessons.moduleNumber,
      moduleId: lessons.moduleId,
      isLive: lessons.isLive,
      liveUrl: lessons.liveUrl,
      liveDate: lessons.liveDate,
      liveTimezone: lessons.liveTimezone,
      lessonType: lessons.lessonType,
      assignmentRequirements: lessons.assignmentRequirements,
      unlockType: lessons.unlockType,
      unlockDate: lessons.unlockDate,
      unlockDaysAfter: lessons.unlockDaysAfter,
      videoWatchRequired: lessons.videoWatchRequired,
      isFree: lessons.isFree,
      audioUrl: lessons.audioUrl,
      voiceName: lessons.voiceName,
      courseName: courses.title,
    }).from(lessons)
      .innerJoin(courses, eq(lessons.courseId, courses.id))
      .where(or(
        ilike(lessons.title, searchPattern),
        ilike(lessons.description, searchPattern),
        ilike(lessons.textContent, searchPattern)
      ))
      .orderBy(lessons.order);
    
    return { courses: matchingCourses, lessons: matchingLessons };
  }

  // Video position tracking
  async updateVideoPosition(parentId: string, lessonId: string, courseId: string, position: number): Promise<LessonProgress> {
    const existing = await this.getLessonProgress(parentId, lessonId);
    if (existing) {
      const [updated] = await db.update(lessonProgress)
        .set({ videoPosition: position })
        .where(eq(lessonProgress.id, existing.id))
        .returning();
      return updated;
    }
    const [progress] = await db.insert(lessonProgress).values({
      parentId,
      lessonId,
      courseId,
      completed: false,
      videoPosition: position,
    }).returning();
    return progress;
  }

  // Course Reviews
  async getCourseReviews(courseId: string): Promise<(CourseReview & { parentName: string; parentPicture: string | null })[]> {
    const reviews = await db.select({
      id: courseReviews.id,
      courseId: courseReviews.courseId,
      parentId: courseReviews.parentId,
      rating: courseReviews.rating,
      review: courseReviews.review,
      createdAt: courseReviews.createdAt,
      parentName: parents.name,
      parentPicture: parents.picture,
    }).from(courseReviews)
      .innerJoin(parents, eq(courseReviews.parentId, parents.id))
      .where(eq(courseReviews.courseId, courseId))
      .orderBy(desc(courseReviews.createdAt));
    return reviews;
  }

  async getCourseAverageRating(courseId: string): Promise<{ average: number; count: number }> {
    const result = await db.select({
      avgRating: sql<number>`AVG(${courseReviews.rating})::numeric`,
      count: sql<number>`COUNT(*)::int`,
    }).from(courseReviews).where(eq(courseReviews.courseId, courseId));
    return { 
      average: result[0]?.avgRating ? parseFloat(String(result[0].avgRating)) : 0, 
      count: result[0]?.count || 0 
    };
  }

  async createCourseReview(review: InsertCourseReview): Promise<CourseReview> {
    // Check if user already reviewed this course
    const existing = await db.select().from(courseReviews)
      .where(and(eq(courseReviews.courseId, review.courseId), eq(courseReviews.parentId, review.parentId)));
    if (existing.length > 0) {
      // Update existing review
      const [updated] = await db.update(courseReviews)
        .set({ rating: review.rating, review: review.review, createdAt: new Date() })
        .where(eq(courseReviews.id, existing[0].id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(courseReviews).values(review).returning();
    return created;
  }

  // Push Subscription methods
  async savePushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    // Delete any existing subscription for this endpoint
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, subscription.endpoint));
    const [created] = await db.insert(pushSubscriptions).values(subscription).returning();
    return created;
  }

  async deletePushSubscription(parentId: string, endpoint: string): Promise<void> {
    await db.delete(pushSubscriptions).where(
      and(eq(pushSubscriptions.parentId, parentId), eq(pushSubscriptions.endpoint, endpoint))
    );
  }

  async getAllPushSubscriptions(): Promise<PushSubscription[]> {
    return await db.select().from(pushSubscriptions);
  }

  async getPushSubscriptionsByParent(parentId: string): Promise<PushSubscription[]> {
    return await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.parentId, parentId));
  }

  // Streak operations
  async updateStreak(parentId: string): Promise<{ currentStreak: number; longestStreak: number; streakUpdated: boolean }> {
    const parent = await this.getParent(parentId);
    if (!parent) {
      return { currentStreak: 0, longestStreak: 0, streakUpdated: false };
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const lastStreakDate = parent.lastStreakDate;
    
    // If already updated today, don't increment
    if (lastStreakDate === today) {
      return { 
        currentStreak: parent.currentStreak, 
        longestStreak: parent.longestStreak, 
        streakUpdated: false 
      };
    }

    // Calculate if this is a consecutive day
    let newStreak = 1;
    if (lastStreakDate) {
      const lastDate = new Date(lastStreakDate);
      const todayDate = new Date(today);
      const diffTime = todayDate.getTime() - lastDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        // Consecutive day - increment streak
        newStreak = parent.currentStreak + 1;
      } else if (diffDays === 0) {
        // Same day - keep streak
        newStreak = parent.currentStreak;
      }
      // If diffDays > 1, streak resets to 1 (already set above)
    }

    const newLongest = Math.max(newStreak, parent.longestStreak);

    await db.update(parents).set({
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastStreakDate: today,
    }).where(eq(parents.id, parentId));

    return { currentStreak: newStreak, longestStreak: newLongest, streakUpdated: true };
  }

  async getStreak(parentId: string): Promise<{ currentStreak: number; longestStreak: number; lastStreakDate: string | null }> {
    const parent = await this.getParent(parentId);
    if (!parent) {
      return { currentStreak: 0, longestStreak: 0, lastStreakDate: null };
    }

    // Check if streak should be reset (missed a day)
    const today = new Date().toISOString().split('T')[0];
    const lastStreakDate = parent.lastStreakDate;
    
    if (lastStreakDate && lastStreakDate !== today) {
      const lastDate = new Date(lastStreakDate);
      const todayDate = new Date(today);
      const diffTime = todayDate.getTime() - lastDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 1) {
        // Streak broken - reset to 0 but keep longest
        await db.update(parents).set({
          currentStreak: 0,
        }).where(eq(parents.id, parentId));
        
        return { currentStreak: 0, longestStreak: parent.longestStreak, lastStreakDate };
      }
    }

    return { 
      currentStreak: parent.currentStreak, 
      longestStreak: parent.longestStreak, 
      lastStreakDate: parent.lastStreakDate 
    };
  }

  // Points operations
  async addPoints(parentId: string, points: number, reason: string): Promise<number> {
    const parent = await this.getParent(parentId);
    if (!parent) return 0;
    
    const newPoints = (parent.points || 0) + points;
    await db.update(parents).set({ points: newPoints }).where(eq(parents.id, parentId));
    
    console.log(`[POINTS] Added ${points} points to parent ${parentId} for: ${reason}. Total: ${newPoints}`);
    return newPoints;
  }

  async getPoints(parentId: string): Promise<number> {
    const parent = await this.getParent(parentId);
    return parent?.points || 0;
  }

  async getLeaderboard(limit: number = 10): Promise<{ id: string; name: string; picture: string | null; points: number }[]> {
    const topParents = await db.select({
      id: parents.id,
      name: parents.name,
      picture: parents.picture,
      points: parents.points,
    })
    .from(parents)
    .where(and(
      sql`${parents.points} > 0`,
      eq(parents.isAdmin, false) // Exclude admin accounts from leaderboard
    ))
    .orderBy(desc(parents.points))
    .limit(limit);
    
    return topParents;
  }

  // Assessment operations
  async getActiveAssessmentQuestions(ageRange?: string): Promise<AssessmentQuestion[]> {
    if (ageRange) {
      return await db.select().from(assessmentQuestions)
        .where(and(
          eq(assessmentQuestions.isActive, true),
          or(
            eq(assessmentQuestions.ageRange, ageRange),
            sql`${assessmentQuestions.ageRange} IS NULL`
          )
        ))
        .orderBy(asc(assessmentQuestions.order));
    }
    return await db.select().from(assessmentQuestions)
      .where(eq(assessmentQuestions.isActive, true))
      .orderBy(asc(assessmentQuestions.order));
  }

  async createParentAssessment(assessment: InsertParentAssessment): Promise<ParentAssessment> {
    const [result] = await db.insert(parentAssessments).values(assessment).returning();
    return result;
  }

  async getParentAssessment(id: string): Promise<ParentAssessment | undefined> {
    const [result] = await db.select().from(parentAssessments).where(eq(parentAssessments.id, id));
    return result || undefined;
  }

  async getLatestAssessmentByParent(parentId: string): Promise<ParentAssessment | undefined> {
    const [result] = await db.select().from(parentAssessments)
      .where(eq(parentAssessments.parentId, parentId))
      .orderBy(desc(parentAssessments.createdAt))
      .limit(1);
    return result || undefined;
  }

  async getLatestAnalyzedAssessmentByParent(parentId: string): Promise<ParentAssessment | undefined> {
    const [result] = await db.select().from(parentAssessments)
      .where(and(
        eq(parentAssessments.parentId, parentId),
        eq(parentAssessments.status, "analyzed")
      ))
      .orderBy(desc(parentAssessments.createdAt))
      .limit(1);
    return result || undefined;
  }

  async getAllAssessmentsByParent(parentId: string): Promise<ParentAssessment[]> {
    return await db.select().from(parentAssessments)
      .where(eq(parentAssessments.parentId, parentId))
      .orderBy(desc(parentAssessments.createdAt));
  }

  async updateParentAssessmentStatus(id: string, status: string): Promise<ParentAssessment | undefined> {
    const updateData: any = { status };
    if (status === 'completed') {
      updateData.completedAt = new Date();
    } else if (status === 'analyzed') {
      updateData.analyzedAt = new Date();
    }
    const [result] = await db.update(parentAssessments)
      .set(updateData)
      .where(eq(parentAssessments.id, id))
      .returning();
    return result || undefined;
  }

  async saveAssessmentResponses(assessmentId: string, responses: { questionId: string; response: string }[]): Promise<void> {
    if (responses.length === 0) return;
    const values = responses.map(r => ({
      assessmentId,
      questionId: r.questionId,
      response: r.response,
    }));
    await db.insert(assessmentResponses).values(values);
  }

  async getAssessmentResponses(assessmentId: string): Promise<AssessmentResponse[]> {
    return await db.select().from(assessmentResponses)
      .where(eq(assessmentResponses.assessmentId, assessmentId));
  }

  async saveAiInsights(insight: InsertAiAssessmentInsight): Promise<AiAssessmentInsight> {
    // Delete existing insights for this assessment before inserting new one
    await db.delete(aiAssessmentInsights)
      .where(eq(aiAssessmentInsights.assessmentId, insight.assessmentId));
    const [result] = await db.insert(aiAssessmentInsights).values(insight).returning();
    return result;
  }

  async getAiInsights(assessmentId: string): Promise<AiAssessmentInsight | undefined> {
    const [result] = await db.select().from(aiAssessmentInsights)
      .where(eq(aiAssessmentInsights.assessmentId, assessmentId))
      .orderBy(desc(aiAssessmentInsights.createdAt))
      .limit(1);
    return result || undefined;
  }

  async getAllAiInsights(): Promise<(AiAssessmentInsight & { parentName?: string; parentEmail?: string; childAgeRange?: string })[]> {
    const results = await db.select({
      insight: aiAssessmentInsights,
      parentName: parents.name,
      parentEmail: parents.email,
      childAgeRange: parentAssessments.childAgeRange,
    })
    .from(aiAssessmentInsights)
    .innerJoin(parentAssessments, eq(aiAssessmentInsights.assessmentId, parentAssessments.id))
    .innerJoin(parents, eq(parentAssessments.parentId, parents.id))
    .orderBy(desc(aiAssessmentInsights.createdAt));
    
    return results.map(r => ({
      ...r.insight,
      parentName: r.parentName || undefined,
      parentEmail: r.parentEmail || undefined,
      childAgeRange: r.childAgeRange || undefined,
    }));
  }

  async updateAiInsights(id: string, data: Partial<Pick<AiAssessmentInsight, 'strengths' | 'needsImprovement' | 'focusAreas' | 'summary' | 'parentingStyle' | 'parentingTips'>>): Promise<AiAssessmentInsight | undefined> {
    const [result] = await db.update(aiAssessmentInsights)
      .set(data)
      .where(eq(aiAssessmentInsights.id, id))
      .returning();
    return result || undefined;
  }

  async saveLearningPathRecommendations(recommendations: InsertLearningPathRecommendation[]): Promise<LearningPathRecommendation[]> {
    if (recommendations.length === 0) return [];
    const result = await db.insert(learningPathRecommendations).values(recommendations).returning();
    return result;
  }

  async getLearningPathRecommendations(assessmentId: string): Promise<LearningPathRecommendation[]> {
    return await db.select().from(learningPathRecommendations)
      .where(eq(learningPathRecommendations.assessmentId, assessmentId))
      .orderBy(asc(learningPathRecommendations.priority));
  }

  // Password Reset operations
  async createPasswordResetToken(parentId: string, token: string, expiresAt: Date): Promise<void> {
    await db.insert(passwordResetTokens).values({
      parentId,
      token,
      expiresAt,
    });
  }

  async getValidPasswordResetToken(token: string): Promise<{ id: string; parentId: string; token: string; expiresAt: Date } | undefined> {
    const [result] = await db.select().from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.token, token),
        gte(passwordResetTokens.expiresAt, new Date()),
        sql`${passwordResetTokens.usedAt} IS NULL`
      ));
    return result || undefined;
  }

  async markPasswordResetTokenUsed(token: string): Promise<void> {
    await db.update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.token, token));
  }

  async deleteExpiredPasswordResetTokens(parentId: string): Promise<void> {
    await db.delete(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.parentId, parentId),
        lte(passwordResetTokens.expiresAt, new Date())
      ));
  }

  // Homework Helper operations
  async createHomeworkConversation(conversation: InsertHomeworkConversation): Promise<HomeworkConversation> {
    const [result] = await db.insert(homeworkConversations).values(conversation).returning();
    return result;
  }

  async getHomeworkConversation(id: string): Promise<HomeworkConversation | undefined> {
    const [result] = await db.select().from(homeworkConversations).where(eq(homeworkConversations.id, id));
    return result || undefined;
  }

  async getHomeworkConversationsByParent(parentId: string): Promise<HomeworkConversation[]> {
    return await db.select().from(homeworkConversations)
      .where(eq(homeworkConversations.parentId, parentId))
      .orderBy(desc(homeworkConversations.createdAt));
  }

  async getHomeworkMessages(conversationId: string): Promise<HomeworkMessage[]> {
    return await db.select().from(homeworkMessages)
      .where(eq(homeworkMessages.conversationId, conversationId))
      .orderBy(asc(homeworkMessages.createdAt));
  }

  async addHomeworkMessage(message: InsertHomeworkMessage): Promise<HomeworkMessage> {
    const [result] = await db.insert(homeworkMessages).values(message).returning();
    return result;
  }

  async getHomeworkUsageForDate(parentId: string, date: string): Promise<HomeworkUsage | undefined> {
    const [result] = await db.select().from(homeworkUsage)
      .where(and(
        eq(homeworkUsage.parentId, parentId),
        eq(homeworkUsage.date, date)
      ));
    return result || undefined;
  }

  async incrementHomeworkUsage(parentId: string, date: string): Promise<HomeworkUsage> {
    const existing = await this.getHomeworkUsageForDate(parentId, date);
    if (existing) {
      const [result] = await db.update(homeworkUsage)
        .set({ questionsAsked: existing.questionsAsked + 1 })
        .where(eq(homeworkUsage.id, existing.id))
        .returning();
      return result;
    } else {
      const [result] = await db.insert(homeworkUsage).values({
        parentId,
        date,
        questionsAsked: 1
      }).returning();
      return result;
    }
  }

  // Parenting/Tarbiya AI operations
  async createParentingConversation(conversation: InsertParentingConversation): Promise<ParentingConversation> {
    const [result] = await db.insert(parentingConversations).values(conversation).returning();
    return result;
  }

  async getParentingConversation(id: string): Promise<ParentingConversation | undefined> {
    const [result] = await db.select().from(parentingConversations).where(eq(parentingConversations.id, id));
    return result || undefined;
  }

  async getParentingConversationsByParent(parentId: string): Promise<ParentingConversation[]> {
    return await db.select().from(parentingConversations)
      .where(eq(parentingConversations.parentId, parentId))
      .orderBy(desc(parentingConversations.createdAt));
  }

  async getParentingMessages(conversationId: string): Promise<ParentingMessage[]> {
    return await db.select().from(parentingMessages)
      .where(eq(parentingMessages.conversationId, conversationId))
      .orderBy(asc(parentingMessages.createdAt));
  }

  async addParentingMessage(message: InsertParentingMessage): Promise<ParentingMessage> {
    const [result] = await db.insert(parentingMessages).values(message).returning();
    return result;
  }

  async getParentingUsageForDate(parentId: string, date: string): Promise<ParentingUsage | undefined> {
    const [result] = await db.select().from(parentingUsage)
      .where(and(
        eq(parentingUsage.parentId, parentId),
        eq(parentingUsage.date, date)
      ));
    return result || undefined;
  }

  async incrementParentingUsage(parentId: string, date: string): Promise<ParentingUsage> {
    const existing = await this.getParentingUsageForDate(parentId, date);
    if (existing) {
      const [result] = await db.update(parentingUsage)
        .set({ questionsAsked: existing.questionsAsked + 1 })
        .where(eq(parentingUsage.id, existing.id))
        .returning();
      return result;
    } else {
      const [result] = await db.insert(parentingUsage).values({
        parentId,
        date,
        questionsAsked: 1
      }).returning();
      return result;
    }
  }

  // Telegram Referrals operations (parent feedback from Telegram groups)
  async getAllTelegramReferrals(): Promise<TelegramReferral[]> {
    return await db.select().from(telegramReferrals).orderBy(desc(telegramReferrals.createdAt));
  }

  async createTelegramReferral(referral: InsertTelegramReferral): Promise<TelegramReferral> {
    const [result] = await db.insert(telegramReferrals).values(referral).returning();
    return result;
  }

  async deleteTelegramReferral(id: string): Promise<void> {
    await db.delete(telegramReferrals).where(eq(telegramReferrals.id, id));
  }

  // AI Generated Tips operations
  async getAllAiGeneratedTips(): Promise<AiGeneratedTip[]> {
    return await db.select().from(aiGeneratedTips).orderBy(desc(aiGeneratedTips.generatedAt));
  }

  async getAiGeneratedTipsByStatus(status: string): Promise<AiGeneratedTip[]> {
    return await db.select().from(aiGeneratedTips)
      .where(eq(aiGeneratedTips.status, status))
      .orderBy(desc(aiGeneratedTips.generatedAt));
  }

  async getAiGeneratedTip(id: string): Promise<AiGeneratedTip | undefined> {
    const [result] = await db.select().from(aiGeneratedTips).where(eq(aiGeneratedTips.id, id));
    return result || undefined;
  }

  async createAiGeneratedTip(tip: InsertAiGeneratedTip): Promise<AiGeneratedTip> {
    const [result] = await db.insert(aiGeneratedTips).values(tip).returning();
    return result;
  }

  async updateAiGeneratedTip(id: string, data: { status?: string; correctedContent?: string; adminNotes?: string; publishDate?: string; reviewedBy?: string; audioUrl?: string; title?: string }): Promise<AiGeneratedTip | undefined> {
    const updateData: any = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.correctedContent !== undefined) updateData.correctedContent = data.correctedContent;
    if (data.adminNotes !== undefined) updateData.adminNotes = data.adminNotes;
    if (data.publishDate !== undefined) updateData.publishDate = data.publishDate;
    if (data.reviewedBy !== undefined) updateData.reviewedBy = data.reviewedBy;
    if (data.audioUrl !== undefined) updateData.audioUrl = data.audioUrl;
    if (data.title !== undefined) updateData.title = data.title;
    
    if (data.status === 'approved' || data.status === 'rejected') {
      updateData.reviewedAt = new Date();
    }
    
    const [result] = await db.update(aiGeneratedTips)
      .set(updateData)
      .where(eq(aiGeneratedTips.id, id))
      .returning();
    return result || undefined;
  }

  async getApprovedTipForToday(): Promise<AiGeneratedTip | undefined> {
    const approvedTips = await db.select().from(aiGeneratedTips)
      .where(eq(aiGeneratedTips.status, 'approved'))
      .orderBy(asc(aiGeneratedTips.generatedAt));
    
    if (approvedTips.length === 0) {
      return undefined;
    }
    
    const tipsWithAudio = approvedTips.filter(t => t.audioUrl);
    
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - startOfYear.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    const twoHourSlot = Math.floor(now.getHours() / 2);
    const slotIndex = dayOfYear * 12 + twoHourSlot;
    
    if (tipsWithAudio.length > 0) {
      const rotationIndex = slotIndex % tipsWithAudio.length;
      return tipsWithAudio[rotationIndex];
    }
    
    const rotationIndex = slotIndex % approvedTips.length;
    return approvedTips[rotationIndex];
  }

  // Appointment operations
  async getAllAppointments(): Promise<Appointment[]> {
    return await db.select().from(appointments).orderBy(desc(appointments.createdAt));
  }

  async getAppointmentsByStatus(status: string): Promise<Appointment[]> {
    return await db.select().from(appointments)
      .where(eq(appointments.status, status))
      .orderBy(desc(appointments.createdAt));
  }

  async getAppointmentsByParent(parentId: string): Promise<Appointment[]> {
    return await db.select().from(appointments)
      .where(eq(appointments.parentId, parentId))
      .orderBy(desc(appointments.createdAt));
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [result] = await db.insert(appointments).values(appointment).returning();
    return result;
  }

  async updateAppointment(id: string, data: { status?: string; meetingLink?: string; adminNotes?: string; appointmentDate?: string; appointmentTime?: string }): Promise<Appointment | undefined> {
    const updateData: any = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.meetingLink !== undefined) updateData.meetingLink = data.meetingLink;
    if (data.adminNotes !== undefined) updateData.adminNotes = data.adminNotes;
    if (data.appointmentDate !== undefined) updateData.appointmentDate = data.appointmentDate;
    if (data.appointmentTime !== undefined) updateData.appointmentTime = data.appointmentTime;
    
    if (data.status && data.status !== 'pending') {
      updateData.reviewedAt = new Date();
    }
    
    const [result] = await db.update(appointments)
      .set(updateData)
      .where(eq(appointments.id, id))
      .returning();
    return result || undefined;
  }

  // Availability slots operations
  async getAllAvailabilitySlots(): Promise<AvailabilitySlot[]> {
    return await db.select().from(availabilitySlots).orderBy(asc(availabilitySlots.dayOfWeek), asc(availabilitySlots.startTime));
  }

  async getActiveAvailabilitySlots(): Promise<AvailabilitySlot[]> {
    return await db.select().from(availabilitySlots)
      .where(eq(availabilitySlots.isActive, true))
      .orderBy(asc(availabilitySlots.dayOfWeek), asc(availabilitySlots.startTime));
  }

  async getAvailabilitySlotsByDay(dayOfWeek: number): Promise<AvailabilitySlot[]> {
    return await db.select().from(availabilitySlots)
      .where(and(eq(availabilitySlots.dayOfWeek, dayOfWeek), eq(availabilitySlots.isActive, true)))
      .orderBy(asc(availabilitySlots.startTime));
  }

  async createAvailabilitySlot(slot: InsertAvailabilitySlot): Promise<AvailabilitySlot> {
    const [result] = await db.insert(availabilitySlots).values(slot).returning();
    return result;
  }

  async deleteAvailabilitySlot(id: string): Promise<void> {
    await db.delete(availabilitySlots).where(eq(availabilitySlots.id, id));
  }

  async toggleAvailabilitySlot(id: string, isActive: boolean): Promise<AvailabilitySlot | undefined> {
    const [result] = await db.update(availabilitySlots)
      .set({ isActive })
      .where(eq(availabilitySlots.id, id))
      .returning();
    return result || undefined;
  }

  // Calendar availability operations (date-specific)
  async getAllCalendarAvailability(): Promise<CalendarAvailability[]> {
    return await db.select().from(calendarAvailability).orderBy(asc(calendarAvailability.date));
  }

  async getAvailableDates(fromDate: string, toDate: string): Promise<CalendarAvailability[]> {
    return await db.select().from(calendarAvailability)
      .where(and(
        gte(calendarAvailability.date, fromDate),
        lte(calendarAvailability.date, toDate),
        eq(calendarAvailability.isAvailable, true)
      ))
      .orderBy(asc(calendarAvailability.date));
  }

  async getCalendarAvailabilityByDate(date: string): Promise<CalendarAvailability | undefined> {
    const [result] = await db.select().from(calendarAvailability)
      .where(eq(calendarAvailability.date, date));
    return result || undefined;
  }

  async setCalendarAvailability(data: InsertCalendarAvailability): Promise<CalendarAvailability> {
    const [result] = await db.insert(calendarAvailability)
      .values(data)
      .onConflictDoUpdate({
        target: calendarAvailability.date,
        set: {
          isAvailable: data.isAvailable,
          startTime: data.startTime,
          endTime: data.endTime,
          notes: data.notes
        }
      })
      .returning();
    return result;
  }

  async deleteCalendarAvailability(date: string): Promise<void> {
    await db.delete(calendarAvailability).where(eq(calendarAvailability.date, date));
  }

  // Announcements operations (Ogeeysiisyada)
  async getAllAnnouncements(): Promise<Announcement[]> {
    return await db.select().from(announcements).orderBy(asc(announcements.order), desc(announcements.createdAt));
  }

  async getActiveAnnouncements(): Promise<Announcement[]> {
    return await db.select().from(announcements)
      .where(eq(announcements.isActive, true))
      .orderBy(asc(announcements.order), desc(announcements.createdAt));
  }

  async getAnnouncement(id: string): Promise<Announcement | undefined> {
    const [result] = await db.select().from(announcements).where(eq(announcements.id, id));
    return result || undefined;
  }

  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const [result] = await db.insert(announcements).values(announcement).returning();
    return result;
  }

  async updateAnnouncement(id: string, data: Partial<InsertAnnouncement>): Promise<Announcement | undefined> {
    const [result] = await db.update(announcements)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(announcements.id, id))
      .returning();
    return result || undefined;
  }

  async deleteAnnouncement(id: string): Promise<void> {
    await db.delete(announcements).where(eq(announcements.id, id));
  }

  // Homepage Sections operations
  async getAllHomepageSections(): Promise<HomepageSection[]> {
    return await db.select().from(homepageSections).orderBy(asc(homepageSections.order));
  }

  async getVisibleHomepageSections(): Promise<HomepageSection[]> {
    return await db.select().from(homepageSections)
      .where(eq(homepageSections.isVisible, true))
      .orderBy(asc(homepageSections.order));
  }

  async updateHomepageSection(id: string, data: Partial<InsertHomepageSection>): Promise<HomepageSection | undefined> {
    const [result] = await db.update(homepageSections)
      .set(data)
      .where(eq(homepageSections.id, id))
      .returning();
    return result || undefined;
  }

  async reorderHomepageSections(orderedIds: string[]): Promise<void> {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.update(homepageSections)
        .set({ order: i + 1 })
        .where(eq(homepageSections.id, orderedIds[i]));
    }
  }

  // Parent Community Settings operations
  async getAllParentCommunitySettings(): Promise<ParentCommunitySetting[]> {
    return await db.select().from(parentCommunitySettings);
  }

  async getParentCommunitySetting(key: string): Promise<ParentCommunitySetting | undefined> {
    const [result] = await db.select().from(parentCommunitySettings)
      .where(eq(parentCommunitySettings.settingKey, key));
    return result || undefined;
  }

  async upsertParentCommunitySetting(key: string, value: string | null): Promise<ParentCommunitySetting> {
    const existing = await this.getParentCommunitySetting(key);
    if (existing) {
      const [result] = await db.update(parentCommunitySettings)
        .set({ settingValue: value, updatedAt: new Date() })
        .where(eq(parentCommunitySettings.settingKey, key))
        .returning();
      return result;
    } else {
      const [result] = await db.insert(parentCommunitySettings)
        .values({ settingKey: key, settingValue: value })
        .returning();
      return result;
    }
  }

  // Lesson Image operations
  async getLessonImages(lessonId: string): Promise<LessonImage[]> {
    return await db.select().from(lessonImages)
      .where(eq(lessonImages.lessonId, lessonId))
      .orderBy(asc(lessonImages.order));
  }

  async createLessonImage(image: InsertLessonImage): Promise<LessonImage> {
    const [result] = await db.insert(lessonImages).values(image).returning();
    return result;
  }

  async deleteLessonImage(id: string): Promise<void> {
    await db.delete(lessonImages).where(eq(lessonImages.id, id));
  }

  // Flashcard Category operations
  async getAllFlashcardCategories(): Promise<FlashcardCategory[]> {
    return await db.select().from(flashcardCategories).orderBy(asc(flashcardCategories.order));
  }

  async getActiveFlashcardCategories(): Promise<FlashcardCategory[]> {
    return await db.select().from(flashcardCategories)
      .where(eq(flashcardCategories.isActive, true))
      .orderBy(asc(flashcardCategories.order));
  }

  async getFlashcardCategory(id: string): Promise<FlashcardCategory | undefined> {
    const [result] = await db.select().from(flashcardCategories).where(eq(flashcardCategories.id, id));
    return result || undefined;
  }

  async createFlashcardCategory(category: InsertFlashcardCategory): Promise<FlashcardCategory> {
    const [result] = await db.insert(flashcardCategories).values(category).returning();
    return result;
  }

  async updateFlashcardCategory(id: string, data: Partial<InsertFlashcardCategory>): Promise<FlashcardCategory | undefined> {
    const [result] = await db.update(flashcardCategories)
      .set(data)
      .where(eq(flashcardCategories.id, id))
      .returning();
    return result || undefined;
  }

  async deleteFlashcardCategory(id: string): Promise<void> {
    await db.delete(flashcardCategories).where(eq(flashcardCategories.id, id));
  }

  // Flashcard operations
  async getFlashcardsByCategory(categoryId: string): Promise<Flashcard[]> {
    return await db.select().from(flashcards)
      .where(eq(flashcards.categoryId, categoryId))
      .orderBy(asc(flashcards.order));
  }

  async getActiveFlashcardsByCategory(categoryId: string): Promise<Flashcard[]> {
    return await db.select().from(flashcards)
      .where(and(eq(flashcards.categoryId, categoryId), eq(flashcards.isActive, true)))
      .orderBy(asc(flashcards.order));
  }

  async getFlashcard(id: string): Promise<Flashcard | undefined> {
    const [result] = await db.select().from(flashcards).where(eq(flashcards.id, id));
    return result || undefined;
  }

  async createFlashcard(flashcard: InsertFlashcard): Promise<Flashcard> {
    const [result] = await db.insert(flashcards).values(flashcard).returning();
    return result;
  }

  async updateFlashcard(id: string, data: Partial<InsertFlashcard>): Promise<Flashcard | undefined> {
    const [result] = await db.update(flashcards)
      .set(data)
      .where(eq(flashcards.id, id))
      .returning();
    return result || undefined;
  }

  async deleteFlashcard(id: string): Promise<void> {
    await db.delete(flashcards).where(eq(flashcards.id, id));
  }

  // Flashcard Progress operations
  async getFlashcardProgress(parentId: string, flashcardId: string): Promise<FlashcardProgress | undefined> {
    const [result] = await db.select().from(flashcardProgress)
      .where(and(eq(flashcardProgress.parentId, parentId), eq(flashcardProgress.flashcardId, flashcardId)));
    return result || undefined;
  }

  async getAllFlashcardProgress(parentId: string): Promise<FlashcardProgress[]> {
    return await db.select().from(flashcardProgress).where(eq(flashcardProgress.parentId, parentId));
  }

  async updateFlashcardProgress(parentId: string, flashcardId: string, viewed: boolean, correct: boolean): Promise<FlashcardProgress> {
    const existing = await this.getFlashcardProgress(parentId, flashcardId);
    
    if (existing) {
      const updates: Partial<FlashcardProgress> = {
        lastViewedAt: new Date(),
      };
      if (viewed) {
        updates.timesViewed = existing.timesViewed + 1;
      }
      if (correct) {
        updates.timesCorrect = existing.timesCorrect + 1;
        if (existing.timesCorrect + 1 >= 3 && !existing.masteredAt) {
          updates.masteredAt = new Date();
        }
      }
      const [result] = await db.update(flashcardProgress)
        .set(updates)
        .where(eq(flashcardProgress.id, existing.id))
        .returning();
      return result;
    } else {
      const [result] = await db.insert(flashcardProgress).values({
        parentId,
        flashcardId,
        timesViewed: viewed ? 1 : 0,
        timesCorrect: correct ? 1 : 0,
        lastViewedAt: new Date(),
      }).returning();
      return result;
    }
  }

  // Expense operations
  async getAllExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses).orderBy(desc(expenses.date));
  }

  async getExpense(id: string): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense || undefined;
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [newExpense] = await db.insert(expenses).values(expense).returning();
    return newExpense;
  }

  async updateExpense(id: string, data: Partial<InsertExpense>): Promise<Expense | undefined> {
    const [expense] = await db.update(expenses).set(data).where(eq(expenses.id, id)).returning();
    return expense || undefined;
  }

  async deleteExpense(id: string): Promise<void> {
    await db.delete(expenses).where(eq(expenses.id, id));
  }

  async getExpensesByDateRange(startDate: Date, endDate: Date): Promise<Expense[]> {
    return await db.select().from(expenses)
      .where(and(gte(expenses.date, startDate), lte(expenses.date, endDate)))
      .orderBy(desc(expenses.date));
  }

  async getApprovedPaymentsByDateRange(startDate: Date, endDate: Date): Promise<PaymentSubmission[]> {
    return await db.select().from(paymentSubmissions)
      .where(and(
        eq(paymentSubmissions.status, "approved"),
        gte(paymentSubmissions.createdAt, startDate),
        lte(paymentSubmissions.createdAt, endDate)
      ))
      .orderBy(desc(paymentSubmissions.createdAt));
  }

  // Receipt Fingerprint operations - Enhanced duplicate detection (GLOBAL - not per-parent)
  async findDuplicateReceipt(
    normalizedReference: string | null, 
    transactionDate: string | null, 
    amountCents: number | null, 
    transactionTime: string | null = null,
    senderPhone: string | null = null
  ): Promise<ReceiptFingerprint | undefined> {
    // Check for BOTH approved AND pending receipts to ensure global uniqueness
    // This prevents the same receipt from being used by different parents
    const validStatuses = ["approved", "pending"];
    
    // Priority 1: Find by reference number (most reliable - unique per transaction)
    if (normalizedReference) {
      const [byRef] = await db.select().from(receiptFingerprints)
        .where(and(
          eq(receiptFingerprints.normalizedReference, normalizedReference),
          inArray(receiptFingerprints.status, validStatuses)
        ));
      if (byRef) {
        console.log(`[DUPLICATE] Match found by REFERENCE: ${normalizedReference} (status: ${byRef.status})`);
        return byRef;
      }
    }
    
    // Priority 2: If we have time, check date + time + amount (very specific)
    if (transactionDate && transactionTime && amountCents) {
      const [byDateTimeAmount] = await db.select().from(receiptFingerprints)
        .where(and(
          eq(receiptFingerprints.transactionDate, transactionDate),
          eq(receiptFingerprints.transactionTime, transactionTime),
          eq(receiptFingerprints.amountCents, amountCents),
          inArray(receiptFingerprints.status, validStatuses)
        ));
      if (byDateTimeAmount) {
        console.log(`[DUPLICATE] Match found by DATE+TIME+AMOUNT: ${transactionDate} ${transactionTime} ${amountCents} (status: ${byDateTimeAmount.status})`);
        return byDateTimeAmount;
      }
    }
    
    // Priority 3: If we have sender phone, check date + amount + sender (still specific)
    if (transactionDate && amountCents && senderPhone) {
      const [byDateAmountSender] = await db.select().from(receiptFingerprints)
        .where(and(
          eq(receiptFingerprints.transactionDate, transactionDate),
          eq(receiptFingerprints.amountCents, amountCents),
          eq(receiptFingerprints.senderPhone, senderPhone),
          inArray(receiptFingerprints.status, validStatuses)
        ));
      if (byDateAmountSender) {
        console.log(`[DUPLICATE] Match found by DATE+AMOUNT+SENDER: ${transactionDate} ${amountCents} ${senderPhone} (status: ${byDateAmountSender.status})`);
        return byDateAmountSender;
      }
    }
    
    // NOTE: We intentionally DON'T fallback to date + amount only anymore
    // This was causing false positives when different people send the same amount on the same day
    // Without reference, time, or sender phone, we cannot reliably detect duplicates
    console.log(`[DUPLICATE] No match found for ref=${normalizedReference}, date=${transactionDate}, time=${transactionTime}, amount=${amountCents}, phone=${senderPhone}`);
    
    return undefined;
  }

  async createReceiptFingerprint(fingerprint: InsertReceiptFingerprint): Promise<ReceiptFingerprint> {
    const [created] = await db.insert(receiptFingerprints).values(fingerprint).returning();
    return created;
  }

  // Receipt Attempt tracking (persist failed attempts per parent per course)
  async getReceiptAttempts(parentId: string, courseId: string): Promise<ReceiptAttempt | undefined> {
    const [attempt] = await db.select().from(receiptAttempts)
      .where(and(
        eq(receiptAttempts.parentId, parentId),
        eq(receiptAttempts.courseId, courseId)
      ));
    return attempt || undefined;
  }

  async incrementReceiptAttempts(parentId: string, courseId: string): Promise<ReceiptAttempt> {
    // Try to find existing record
    const existing = await this.getReceiptAttempts(parentId, courseId);
    
    if (existing) {
      // Increment existing
      const [updated] = await db.update(receiptAttempts)
        .set({ 
          attemptCount: existing.attemptCount + 1,
          lastAttemptAt: new Date()
        })
        .where(and(
          eq(receiptAttempts.parentId, parentId),
          eq(receiptAttempts.courseId, courseId)
        ))
        .returning();
      return updated;
    } else {
      // Create new with count 1
      const [created] = await db.insert(receiptAttempts)
        .values({
          parentId,
          courseId,
          attemptCount: 1,
          lastAttemptAt: new Date()
        })
        .returning();
      return created;
    }
  }

  async resetReceiptAttempts(parentId: string, courseId: string): Promise<void> {
    await db.delete(receiptAttempts)
      .where(and(
        eq(receiptAttempts.parentId, parentId),
        eq(receiptAttempts.courseId, courseId)
      ));
  }

  // Lesson Bookmark operations
  async getBookmarksByParentId(parentId: string): Promise<LessonBookmark[]> {
    return await db.select().from(lessonBookmarks)
      .where(eq(lessonBookmarks.parentId, parentId))
      .orderBy(desc(lessonBookmarks.createdAt));
  }

  async getBookmark(parentId: string, lessonId: string): Promise<LessonBookmark | undefined> {
    const [bookmark] = await db.select().from(lessonBookmarks)
      .where(and(
        eq(lessonBookmarks.parentId, parentId),
        eq(lessonBookmarks.lessonId, lessonId)
      ));
    return bookmark || undefined;
  }

  async createBookmark(bookmark: InsertLessonBookmark): Promise<LessonBookmark> {
    const [created] = await db.insert(lessonBookmarks).values(bookmark).returning();
    return created;
  }

  async deleteBookmark(parentId: string, lessonId: string): Promise<void> {
    await db.delete(lessonBookmarks)
      .where(and(
        eq(lessonBookmarks.parentId, parentId),
        eq(lessonBookmarks.lessonId, lessonId)
      ));
  }

  // Lesson Exercise operations
  async getExercisesByLessonId(lessonId: string): Promise<LessonExercise[]> {
    return await db.select().from(lessonExercises)
      .where(and(
        eq(lessonExercises.lessonId, lessonId),
        eq(lessonExercises.isActive, true)
      ))
      .orderBy(asc(lessonExercises.order));
  }

  async getExercise(id: string): Promise<LessonExercise | undefined> {
    const [exercise] = await db.select().from(lessonExercises)
      .where(eq(lessonExercises.id, id));
    return exercise || undefined;
  }

  async createExercise(exercise: InsertLessonExercise): Promise<LessonExercise> {
    const [created] = await db.insert(lessonExercises).values(exercise).returning();
    return created;
  }

  async updateExercise(id: string, data: Partial<InsertLessonExercise>): Promise<LessonExercise | undefined> {
    const [updated] = await db.update(lessonExercises)
      .set(data)
      .where(eq(lessonExercises.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteExercise(id: string): Promise<void> {
    await db.delete(lessonExercises).where(eq(lessonExercises.id, id));
  }

  async getAllExercises(): Promise<LessonExercise[]> {
    return await db.select().from(lessonExercises).orderBy(asc(lessonExercises.order));
  }

  // Exercise Progress operations
  async getExerciseProgress(parentId: string, exerciseId: string): Promise<ExerciseProgress | undefined> {
    const [progress] = await db.select().from(exerciseProgress)
      .where(and(
        eq(exerciseProgress.parentId, parentId),
        eq(exerciseProgress.exerciseId, exerciseId)
      ));
    return progress || undefined;
  }

  async createExerciseProgress(progress: InsertExerciseProgress): Promise<ExerciseProgress> {
    const [created] = await db.insert(exerciseProgress).values(progress).returning();
    return created;
  }

  async updateExerciseProgress(id: string, data: Partial<InsertExerciseProgress>): Promise<ExerciseProgress | undefined> {
    const [updated] = await db.update(exerciseProgress)
      .set(data)
      .where(eq(exerciseProgress.id, id))
      .returning();
    return updated || undefined;
  }

  async getExerciseProgressByParentAndLesson(parentId: string, lessonId: string): Promise<ExerciseProgress[]> {
    const exercisesList = await this.getExercisesByLessonId(lessonId);
    const exerciseIds = exercisesList.map(e => e.id);
    
    if (exerciseIds.length === 0) return [];
    
    return await db.select().from(exerciseProgress)
      .where(and(
        eq(exerciseProgress.parentId, parentId),
        inArray(exerciseProgress.exerciseId, exerciseIds)
      ));
  }

  async getActivityCalendar(parentId: string, year: number, month: number): Promise<{ day: number; lessonsCompleted: number }[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    const completedLessons = await db.select({
      completedAt: lessonProgress.completedAt,
    })
      .from(lessonProgress)
      .where(and(
        eq(lessonProgress.parentId, parentId),
        eq(lessonProgress.completed, true),
        sql`${lessonProgress.completedAt} >= ${startDate}`,
        sql`${lessonProgress.completedAt} <= ${endDate}`
      ));
    
    const dayMap = new Map<number, number>();
    
    for (const lesson of completedLessons) {
      if (lesson.completedAt) {
        const day = lesson.completedAt.getDate();
        dayMap.set(day, (dayMap.get(day) || 0) + 1);
      }
    }
    
    return Array.from(dayMap.entries()).map(([day, lessonsCompleted]) => ({
      day,
      lessonsCompleted,
    }));
  }

  async getWeeklyProgress(parentId: string): Promise<{
    weekStart: string;
    weekEnd: string;
    days: { date: string; dayName: string; lessonsCompleted: number }[];
    totalLessons: number;
    todayDate: string;
  }> {
    const SOMALI_DAYS = ["Axad", "Isniin", "Talaado", "Arbaco", "Khamiis", "Jimco", "Sabti"];
    
    const formatDateLocal = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const now = new Date();
    const todayDate = formatDateLocal(now);
    const dayOfWeek = now.getDay();
    
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    const completedLessons = await db.select({
      completedAt: lessonProgress.completedAt,
    })
      .from(lessonProgress)
      .where(and(
        eq(lessonProgress.parentId, parentId),
        eq(lessonProgress.completed, true),
        sql`${lessonProgress.completedAt} >= ${startOfWeek}`,
        sql`${lessonProgress.completedAt} <= ${endOfWeek}`
      ));
    
    const dayMap = new Map<string, number>();
    
    for (const lesson of completedLessons) {
      if (lesson.completedAt) {
        const dateStr = formatDateLocal(lesson.completedAt);
        dayMap.set(dateStr, (dayMap.get(dateStr) || 0) + 1);
      }
    }
    
    const days = [];
    let totalLessons = 0;
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dateStr = formatDateLocal(d);
      const lessonsCompleted = dayMap.get(dateStr) || 0;
      totalLessons += lessonsCompleted;
      
      days.push({
        date: dateStr,
        dayName: SOMALI_DAYS[i],
        lessonsCompleted,
      });
    }
    
    return {
      weekStart: formatDateLocal(startOfWeek),
      weekEnd: formatDateLocal(endOfWeek),
      days,
      totalLessons,
      todayDate,
    };
  }

  async getConversationsForUser(userId: string): Promise<any[]> {
    const userConversations = await db
      .select()
      .from(conversations)
      .where(
        or(
          eq(conversations.participant1, userId),
          eq(conversations.participant2, userId)
        )
      )
      .orderBy(desc(conversations.lastMessageAt));

    const result = [];
    for (const conv of userConversations) {
      const otherParticipantId = conv.participant1 === userId ? conv.participant2 : conv.participant1;
      const [otherParticipant] = await db.select().from(parents).where(eq(parents.id, otherParticipantId));
      const [lastMessage] = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conv.id))
        .orderBy(desc(messages.createdAt))
        .limit(1);
      const [presence] = await db.select().from(userPresence).where(eq(userPresence.userId, otherParticipantId));

      result.push({
        id: conv.id,
        participant: otherParticipant ? {
          id: otherParticipant.id,
          name: otherParticipant.name,
          picture: otherParticipant.picture,
          isOnline: presence?.isOnline ?? false,
          lastSeen: presence?.lastSeen,
        } : null,
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          createdAt: lastMessage.createdAt,
          senderId: lastMessage.senderId,
        } : null,
        lastMessageAt: conv.lastMessageAt,
      });
    }
    return result;
  }

  async getMessagesByConversation(conversationId: string, limit: number = 50, offset: number = 0): Promise<{ messages: any[], total: number }> {
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(messages)
      .where(eq(messages.conversationId, conversationId));

    const messageList = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);

    const messagesWithSender = await Promise.all(
      messageList.map(async (msg) => {
        const [sender] = await db.select().from(parents).where(eq(parents.id, msg.senderId));
        return {
          id: msg.id,
          content: msg.content,
          createdAt: msg.createdAt,
          sender: sender ? {
            id: sender.id,
            name: sender.name,
            picture: sender.picture,
          } : null,
        };
      })
    );

    return {
      messages: messagesWithSender,
      total: countResult?.count || 0,
    };
  }

  async createMessage(conversationId: string, senderId: string, content: string): Promise<any> {
    const [newMessage] = await db
      .insert(messages)
      .values({ conversationId, senderId, content })
      .returning();

    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, conversationId));

    return newMessage;
  }

  async getConversation(id: string): Promise<any> {
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conv;
  }

  async createConversation(participant1: string, participant2: string): Promise<any> {
    const existing = await db
      .select()
      .from(conversations)
      .where(
        or(
          and(eq(conversations.participant1, participant1), eq(conversations.participant2, participant2)),
          and(eq(conversations.participant1, participant2), eq(conversations.participant2, participant1))
        )
      );

    if (existing.length > 0) {
      return existing[0];
    }

    const [newConv] = await db
      .insert(conversations)
      .values({ participant1, participant2 })
      .returning();

    return newConv;
  }

  async getParentById(id: string): Promise<any> {
    const [parent] = await db.select().from(parents).where(eq(parents.id, id));
    return parent;
  }

  async markConversationMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    await db
      .update(messages)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(messages.conversationId, conversationId),
          not(eq(messages.senderId, userId)),
          isNull(messages.readAt)
        )
      );
  }

  async getUnreadConversationMessageCount(userId: string): Promise<number> {
    const userConversations = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        or(
          eq(conversations.participant1, userId),
          eq(conversations.participant2, userId)
        )
      );

    if (userConversations.length === 0) {
      return 0;
    }

    const conversationIds = userConversations.map((c: any) => c.id);
    
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(
        and(
          inArray(messages.conversationId, conversationIds),
          not(eq(messages.senderId, userId)),
          isNull(messages.readAt)
        )
      );

    return result[0]?.count || 0;
  }

  // Bank Transfer operations (Admin accounting - Salaam Bank)
  async getAllBankTransfers(): Promise<BankTransfer[]> {
    return await db.select().from(bankTransfers).orderBy(desc(bankTransfers.createdAt));
  }

  async createBankTransfer(data: InsertBankTransfer): Promise<BankTransfer> {
    const [transfer] = await db.insert(bankTransfers).values(data).returning();
    return transfer;
  }

  async deleteBankTransfer(id: string): Promise<void> {
    await db.delete(bankTransfers).where(eq(bankTransfers.id, id));
  }

  async getBankBalance(): Promise<number> {
    const result = await db
      .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(bankTransfers);
    return result[0]?.total || 0;
  }

  // Quran Reciter operations (Maktabada - Quran Sheikhs)
  async getAllQuranReciters(): Promise<QuranReciter[]> {
    return await db.select().from(quranReciters).orderBy(asc(quranReciters.order));
  }

  async getActiveQuranReciters(): Promise<QuranReciter[]> {
    return await db.select().from(quranReciters)
      .where(eq(quranReciters.isActive, true))
      .orderBy(asc(quranReciters.order));
  }

  async getQuranReciter(id: string): Promise<QuranReciter | undefined> {
    const [reciter] = await db.select().from(quranReciters).where(eq(quranReciters.id, id));
    return reciter || undefined;
  }

  async createQuranReciter(reciter: InsertQuranReciter): Promise<QuranReciter> {
    const [result] = await db.insert(quranReciters).values(reciter).returning();
    return result;
  }

  async updateQuranReciter(id: string, data: Partial<InsertQuranReciter>): Promise<QuranReciter | undefined> {
    const [result] = await db.update(quranReciters).set(data).where(eq(quranReciters.id, id)).returning();
    return result || undefined;
  }

  async deleteQuranReciter(id: string): Promise<void> {
    await db.delete(quranReciters).where(eq(quranReciters.id, id));
  }

  // Hadith operations (40 Xadiis - Library Section)
  async getAllHadiths(): Promise<Hadith[]> {
    return await db.select().from(hadiths).orderBy(asc(hadiths.number));
  }

  async getActiveHadiths(): Promise<Hadith[]> {
    return await db.select().from(hadiths)
      .where(eq(hadiths.isActive, true))
      .orderBy(asc(hadiths.number));
  }

  async getHadith(id: string): Promise<Hadith | undefined> {
    const [hadith] = await db.select().from(hadiths).where(eq(hadiths.id, id));
    return hadith || undefined;
  }

  async createHadith(hadith: InsertHadith): Promise<Hadith> {
    const [result] = await db.insert(hadiths).values(hadith).returning();
    return result;
  }

  async updateHadith(id: string, data: Partial<InsertHadith>): Promise<Hadith | undefined> {
    const [result] = await db.update(hadiths).set(data).where(eq(hadiths.id, id)).returning();
    return result || undefined;
  }

  async deleteHadith(id: string): Promise<void> {
    await db.delete(hadiths).where(eq(hadiths.id, id));
  }

  // Parent Notification operations (Inbox for push notifications)
  async createParentNotification(notification: InsertParentNotification): Promise<ParentNotification> {
    const [result] = await db.insert(parentNotifications).values(notification).returning();
    return result;
  }

  async getParentNotifications(parentId: string, limit: number = 50): Promise<ParentNotification[]> {
    return await db.select().from(parentNotifications)
      .where(and(
        eq(parentNotifications.parentId, parentId),
        isNull(parentNotifications.deletedAt)
      ))
      .orderBy(desc(parentNotifications.createdAt))
      .limit(limit);
  }

  async getUnreadNotificationCount(parentId: string): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)::int` })
      .from(parentNotifications)
      .where(and(
        eq(parentNotifications.parentId, parentId),
        isNull(parentNotifications.readAt),
        isNull(parentNotifications.deletedAt)
      ));
    return result?.count || 0;
  }

  async markNotificationRead(id: string, parentId: string): Promise<ParentNotification | undefined> {
    const [result] = await db.update(parentNotifications)
      .set({ readAt: new Date() })
      .where(and(
        eq(parentNotifications.id, id),
        eq(parentNotifications.parentId, parentId)
      ))
      .returning();
    return result || undefined;
  }

  async markAllNotificationsRead(parentId: string): Promise<void> {
    await db.update(parentNotifications)
      .set({ readAt: new Date() })
      .where(and(
        eq(parentNotifications.parentId, parentId),
        isNull(parentNotifications.readAt),
        isNull(parentNotifications.deletedAt)
      ));
  }

  async deleteNotification(id: string, parentId: string): Promise<void> {
    await db.update(parentNotifications)
      .set({ deletedAt: new Date() })
      .where(and(
        eq(parentNotifications.id, id),
        eq(parentNotifications.parentId, parentId)
      ));
  }

  // Prayer Settings operations (Jadwalka Salaadda)
  async getParentPrayerSettings(parentId: string): Promise<ParentPrayerSettings | undefined> {
    const [result] = await db.select().from(parentPrayerSettings).where(eq(parentPrayerSettings.parentId, parentId));
    return result || undefined;
  }

  async upsertParentPrayerSettings(parentId: string, settings: Partial<InsertParentPrayerSettings>): Promise<ParentPrayerSettings> {
    const existing = await this.getParentPrayerSettings(parentId);
    
    if (existing) {
      const [result] = await db.update(parentPrayerSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(parentPrayerSettings.parentId, parentId))
        .returning();
      return result;
    } else {
      const [result] = await db.insert(parentPrayerSettings)
        .values({ ...settings, parentId })
        .returning();
      return result;
    }
  }

  async getAllPrayerNotificationEnabledParents(): Promise<ParentPrayerSettings[]> {
    return await db.select().from(parentPrayerSettings)
      .where(eq(parentPrayerSettings.notificationsEnabled, true));
  }

  // ============================================
  // BSAv.1 SHEEKO - VOICE SPACES
  // ============================================

  async getVoiceRooms(): Promise<VoiceRoom[]> {
    return await db.select().from(voiceRooms)
      .where(or(eq(voiceRooms.status, "scheduled"), eq(voiceRooms.status, "live")))
      .orderBy(desc(voiceRooms.createdAt));
  }

  async getVoiceRoom(id: string): Promise<VoiceRoom | undefined> {
    const [room] = await db.select().from(voiceRooms).where(eq(voiceRooms.id, id));
    return room || undefined;
  }

  async createVoiceRoom(room: InsertVoiceRoom): Promise<VoiceRoom> {
    const [newRoom] = await db.insert(voiceRooms).values(room).returning();
    return newRoom;
  }

  async updateVoiceRoom(id: string, data: Partial<VoiceRoom>): Promise<VoiceRoom | undefined> {
    const [updated] = await db.update(voiceRooms)
      .set(data)
      .where(eq(voiceRooms.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteVoiceRoom(id: string): Promise<void> {
    await db.delete(voiceRooms).where(eq(voiceRooms.id, id));
  }

  async getVoiceRoomParticipants(roomId: string): Promise<(VoiceParticipant & { parent: Parent & { isYearlySubscriber?: boolean } })[]> {
    const participantsList = await db.select()
      .from(voiceParticipants)
      .where(and(
        eq(voiceParticipants.roomId, roomId),
        isNull(voiceParticipants.leftAt)
      ))
      .orderBy(voiceParticipants.joinedAt);

    const allAccessCourse = await this.getCourseByCourseId("all-access");
    
    const result = [];
    for (const p of participantsList) {
      const [parent] = await db.select().from(parents).where(eq(parents.id, p.parentId));
      if (parent) {
        let isYearlySubscriber = false;
        if (allAccessCourse) {
          const parentEnrollments = await db.select().from(enrollments).where(eq(enrollments.parentId, p.parentId));
          const yearlyEnrollment = parentEnrollments.find(e => 
            e.courseId === allAccessCourse.id && 
            e.planType === "yearly" && 
            e.status === "active" &&
            (!e.accessEnd || new Date(e.accessEnd) > new Date())
          );
          isYearlySubscriber = !!yearlyEnrollment;
        }
        result.push({ ...p, parent: { ...parent, isYearlySubscriber } });
      }
    }
    return result;
  }

  async getVoiceParticipant(roomId: string, parentId: string): Promise<VoiceParticipant | undefined> {
    const [participant] = await db.select()
      .from(voiceParticipants)
      .where(and(
        eq(voiceParticipants.roomId, roomId),
        eq(voiceParticipants.parentId, parentId),
        isNull(voiceParticipants.leftAt)
      ));
    return participant || undefined;
  }

  async joinVoiceRoom(roomId: string, parentId: string, isHidden: boolean = false, role: string = "listener"): Promise<VoiceParticipant> {
    // Check if already in the room
    const [existing] = await db.select().from(voiceParticipants)
      .where(and(
        eq(voiceParticipants.roomId, roomId),
        eq(voiceParticipants.parentId, parentId),
        isNull(voiceParticipants.leftAt)
      ));

    if (existing) {
      // If already exists but joining as admin with co-host role, update the role
      if (role === 'co-host' && existing.role !== 'co-host') {
        const [updated] = await db.update(voiceParticipants)
          .set({ role: 'co-host', isMuted: false })
          .where(and(
            eq(voiceParticipants.roomId, roomId),
            eq(voiceParticipants.parentId, parentId),
            isNull(voiceParticipants.leftAt)
          ))
          .returning();
        return updated;
      }
      return existing;
    }

    const [participant] = await db.insert(voiceParticipants)
      .values({
        roomId,
        parentId,
        role: role as any,
        isMuted: role === 'co-host' ? false : true,
        isHidden,
        handRaised: false,
      })
      .returning();
    return participant;
  }

  async leaveVoiceRoom(roomId: string, parentId: string): Promise<void> {
    await db.update(voiceParticipants)
      .set({ leftAt: new Date() })
      .where(and(
        eq(voiceParticipants.roomId, roomId),
        eq(voiceParticipants.parentId, parentId),
        isNull(voiceParticipants.leftAt)
      ));
  }

  async updateVoiceParticipant(roomId: string, parentId: string, data: Partial<VoiceParticipant>): Promise<VoiceParticipant | undefined> {
    const [updated] = await db.update(voiceParticipants)
      .set(data)
      .where(and(
        eq(voiceParticipants.roomId, roomId),
        eq(voiceParticipants.parentId, parentId),
        isNull(voiceParticipants.leftAt)
      ))
      .returning();
    return updated || undefined;
  }

  // Voice Room Messages (Live chat)
  async getVoiceRoomMessages(roomId: string, limit: number = 100): Promise<VoiceRoomMessage[]> {
    const messages = await db.select({
      id: voiceRoomMessages.id,
      roomId: voiceRoomMessages.roomId,
      parentId: voiceRoomMessages.parentId,
      guestId: voiceRoomMessages.guestId,
      displayName: voiceRoomMessages.displayName,
      message: voiceRoomMessages.message,
      isHidden: voiceRoomMessages.isHidden,
      aiModerated: voiceRoomMessages.aiModerated,
      moderationReason: voiceRoomMessages.moderationReason,
      moderationScore: voiceRoomMessages.moderationScore,
      createdAt: voiceRoomMessages.createdAt,
      parentName: parents.name,
    })
      .from(voiceRoomMessages)
      .leftJoin(parents, eq(voiceRoomMessages.parentId, parents.id))
      .where(eq(voiceRoomMessages.roomId, roomId))
      .orderBy(desc(voiceRoomMessages.createdAt))
      .limit(limit);
    
    // Return messages with parent's first name if available
    return messages.map(msg => ({
      id: msg.id,
      roomId: msg.roomId,
      parentId: msg.parentId,
      guestId: msg.guestId,
      displayName: msg.parentName ? msg.parentName.split(' ')[0] : msg.displayName,
      message: msg.message,
      isHidden: msg.isHidden,
      aiModerated: msg.aiModerated,
      moderationReason: msg.moderationReason,
      moderationScore: msg.moderationScore,
      createdAt: msg.createdAt,
    }));
  }

  async createVoiceRoomMessage(message: InsertVoiceRoomMessage): Promise<VoiceRoomMessage> {
    const [created] = await db.insert(voiceRoomMessages)
      .values(message)
      .returning();
    return created;
  }

  async deleteVoiceRoomMessage(id: string): Promise<void> {
    await db.delete(voiceRoomMessages)
      .where(eq(voiceRoomMessages.id, id));
  }

  async getVoiceRoomMessage(id: string): Promise<VoiceRoomMessage | undefined> {
    const [message] = await db.select()
      .from(voiceRoomMessages)
      .where(eq(voiceRoomMessages.id, id));
    return message;
  }

  async pinVoiceRoomMessage(roomId: string, messageId: string): Promise<void> {
    await db.update(voiceRooms)
      .set({ pinnedMessageId: messageId })
      .where(eq(voiceRooms.id, roomId));
  }

  async unpinVoiceRoomMessage(roomId: string): Promise<void> {
    await db.update(voiceRooms)
      .set({ pinnedMessageId: null })
      .where(eq(voiceRooms.id, roomId));
  }

  // Host Follow System
  async followHost(followerId: string, hostId: string): Promise<HostFollow> {
    const [existing] = await db.select().from(hostFollows)
      .where(and(
        eq(hostFollows.followerId, followerId),
        eq(hostFollows.hostId, hostId)
      ));
    
    if (existing) {
      return existing;
    }

    const [follow] = await db.insert(hostFollows)
      .values({ followerId, hostId })
      .returning();
    return follow;
  }

  async unfollowHost(followerId: string, hostId: string): Promise<void> {
    await db.delete(hostFollows)
      .where(and(
        eq(hostFollows.followerId, followerId),
        eq(hostFollows.hostId, hostId)
      ));
  }

  async isFollowingHost(followerId: string, hostId: string): Promise<boolean> {
    const [follow] = await db.select().from(hostFollows)
      .where(and(
        eq(hostFollows.followerId, followerId),
        eq(hostFollows.hostId, hostId)
      ));
    return !!follow;
  }

  async getHostFollowerCount(hostId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` })
      .from(hostFollows)
      .where(eq(hostFollows.hostId, hostId));
    return result[0]?.count || 0;
  }

  async getHostFollowers(hostId: string): Promise<(HostFollow & { follower: Parent })[]> {
    const follows = await db.select({
      id: hostFollows.id,
      followerId: hostFollows.followerId,
      hostId: hostFollows.hostId,
      createdAt: hostFollows.createdAt,
      follower: parents,
    })
      .from(hostFollows)
      .innerJoin(parents, eq(hostFollows.followerId, parents.id))
      .where(eq(hostFollows.hostId, hostId))
      .orderBy(desc(hostFollows.createdAt));
    return follows;
  }

  async getFollowingHosts(followerId: string): Promise<{ id: string; name: string; picture: string | null; followerCount: number }[]> {
    const follows = await db.select({
      hostId: hostFollows.hostId,
      host: parents,
    })
      .from(hostFollows)
      .innerJoin(parents, eq(hostFollows.hostId, parents.id))
      .where(eq(hostFollows.followerId, followerId))
      .orderBy(desc(hostFollows.createdAt));
    
    const hostsWithCounts = await Promise.all(
      follows.map(async (f) => ({
        id: f.host.id,
        name: f.host.name || 'Unknown',
        picture: f.host.picture,
        followerCount: await this.getHostFollowerCount(f.host.id),
      }))
    );
    return hostsWithCounts;
  }

  // Sheeko User-to-User Follow System
  async sheekoFollow(followerId: string, followeeId: string): Promise<SheekoFollow> {
    const [existing] = await db.select().from(sheekoFollows)
      .where(and(
        eq(sheekoFollows.followerId, followerId),
        eq(sheekoFollows.followeeId, followeeId)
      ));
    if (existing) return existing;
    
    const [follow] = await db.insert(sheekoFollows)
      .values({ followerId, followeeId })
      .returning();
    return follow;
  }

  async sheekoUnfollow(followerId: string, followeeId: string): Promise<void> {
    await db.delete(sheekoFollows)
      .where(and(
        eq(sheekoFollows.followerId, followerId),
        eq(sheekoFollows.followeeId, followeeId)
      ));
  }

  async isSheekoFollowing(followerId: string, followeeId: string): Promise<boolean> {
    const [follow] = await db.select().from(sheekoFollows)
      .where(and(
        eq(sheekoFollows.followerId, followerId),
        eq(sheekoFollows.followeeId, followeeId)
      ));
    return !!follow;
  }

  async getSheekoFollowerCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` })
      .from(sheekoFollows)
      .where(eq(sheekoFollows.followeeId, userId));
    return result[0]?.count || 0;
  }

  async getSheekoFollowingCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` })
      .from(sheekoFollows)
      .where(eq(sheekoFollows.followerId, userId));
    return result[0]?.count || 0;
  }

  async getSheekoFollowers(userId: string): Promise<{ id: string; name: string; picture: string | null; followedAt: Date }[]> {
    const follows = await db.select({
      follower: parents,
      createdAt: sheekoFollows.createdAt,
    })
      .from(sheekoFollows)
      .innerJoin(parents, eq(sheekoFollows.followerId, parents.id))
      .where(eq(sheekoFollows.followeeId, userId))
      .orderBy(desc(sheekoFollows.createdAt));
    
    return follows.map((f) => ({
      id: f.follower.id,
      name: f.follower.name || 'Unknown',
      picture: f.follower.picture,
      followedAt: f.createdAt,
    }));
  }

  async getSheekoFollowing(userId: string): Promise<{ id: string; name: string; picture: string | null; followedAt: Date }[]> {
    const follows = await db.select({
      followee: parents,
      createdAt: sheekoFollows.createdAt,
    })
      .from(sheekoFollows)
      .innerJoin(parents, eq(sheekoFollows.followeeId, parents.id))
      .where(eq(sheekoFollows.followerId, userId))
      .orderBy(desc(sheekoFollows.createdAt));
    
    return follows.map((f) => ({
      id: f.followee.id,
      name: f.followee.name || 'Unknown',
      picture: f.followee.picture,
      followedAt: f.createdAt,
    }));
  }

  // Sheeko Appreciation Points
  async giveSheekoAppreciation(data: Omit<InsertSheekoAppreciation, 'points'>): Promise<SheekoAppreciation> {
    // Server-side point calculation - ignore any incoming points value
    const points = data.emojiType === 'heart' ? 10 : 5;
    
    const [appreciation] = await db.insert(sheekoAppreciations)
      .values({ ...data, points })
      .returning();
    return appreciation;
  }

  async getSheekoTotalPoints(userId: string): Promise<number> {
    const result = await db.select({ total: sql<number>`COALESCE(SUM(points), 0)::int` })
      .from(sheekoAppreciations)
      .where(eq(sheekoAppreciations.receiverId, userId));
    return result[0]?.total || 0;
  }

  async getSheekoPointsBreakdown(userId: string): Promise<{ hearts: number; claps: number; heartPoints: number; clapPoints: number }> {
    const result = await db.select({
      emojiType: sheekoAppreciations.emojiType,
      count: sql<number>`COUNT(*)::int`,
      points: sql<number>`SUM(points)::int`,
    })
      .from(sheekoAppreciations)
      .where(eq(sheekoAppreciations.receiverId, userId))
      .groupBy(sheekoAppreciations.emojiType);
    
    const hearts = result.find(r => r.emojiType === 'heart');
    const claps = result.find(r => r.emojiType === 'clap');
    
    return {
      hearts: hearts?.count || 0,
      claps: claps?.count || 0,
      heartPoints: hearts?.points || 0,
      clapPoints: claps?.points || 0,
    };
  }

  async getRecentAppreciationsReceived(userId: string, limit = 10): Promise<SheekoAppreciation[]> {
    return await db.select()
      .from(sheekoAppreciations)
      .where(eq(sheekoAppreciations.receiverId, userId))
      .orderBy(desc(sheekoAppreciations.createdAt))
      .limit(limit);
  }

  // Voice Room Bans
  async banFromVoiceRoom(roomId: string, parentId: string, bannedById: string, reason?: string): Promise<VoiceRoomBan> {
    // Check if already banned
    const [existing] = await db.select().from(voiceRoomBans)
      .where(and(
        eq(voiceRoomBans.roomId, roomId),
        eq(voiceRoomBans.parentId, parentId)
      ));
    
    if (existing) {
      return existing;
    }

    const [ban] = await db.insert(voiceRoomBans)
      .values({
        roomId,
        parentId,
        bannedById,
        reason: reason || null,
      })
      .returning();
    return ban;
  }

  async unbanFromVoiceRoom(roomId: string, parentId: string): Promise<void> {
    await db.delete(voiceRoomBans)
      .where(and(
        eq(voiceRoomBans.roomId, roomId),
        eq(voiceRoomBans.parentId, parentId)
      ));
  }

  async isParentBannedFromRoom(roomId: string, parentId: string): Promise<boolean> {
    const [ban] = await db.select().from(voiceRoomBans)
      .where(and(
        eq(voiceRoomBans.roomId, roomId),
        eq(voiceRoomBans.parentId, parentId)
      ));
    return !!ban;
  }

  async getVoiceRoomBans(roomId: string): Promise<VoiceRoomBan[]> {
    return await db.select().from(voiceRoomBans)
      .where(eq(voiceRoomBans.roomId, roomId))
      .orderBy(desc(voiceRoomBans.createdAt));
  }

  // Voice Room RSVPs (Scheduled room attendance)
  async addVoiceRoomRsvp(roomId: string, parentId: string): Promise<VoiceRoomRsvp> {
    // Check if already RSVP'd
    const existing = await db.select()
      .from(voiceRoomRsvps)
      .where(and(
        eq(voiceRoomRsvps.roomId, roomId),
        eq(voiceRoomRsvps.parentId, parentId)
      ))
      .limit(1);
    
    if (existing.length > 0) {
      return existing[0];
    }

    const [rsvp] = await db.insert(voiceRoomRsvps)
      .values({ roomId, parentId })
      .returning();
    return rsvp;
  }

  async removeVoiceRoomRsvp(roomId: string, parentId: string): Promise<void> {
    await db.delete(voiceRoomRsvps)
      .where(and(
        eq(voiceRoomRsvps.roomId, roomId),
        eq(voiceRoomRsvps.parentId, parentId)
      ));
  }

  async getVoiceRoomRsvps(roomId: string): Promise<(VoiceRoomRsvp & { parent: Parent })[]> {
    const result = await db.select()
      .from(voiceRoomRsvps)
      .innerJoin(parents, eq(voiceRoomRsvps.parentId, parents.id))
      .where(eq(voiceRoomRsvps.roomId, roomId))
      .orderBy(voiceRoomRsvps.createdAt);
    
    return result.map(r => ({
      ...r.voice_room_rsvps,
      parent: r.parents
    }));
  }

  async hasParentRsvpd(roomId: string, parentId: string): Promise<boolean> {
    const [rsvp] = await db.select()
      .from(voiceRoomRsvps)
      .where(and(
        eq(voiceRoomRsvps.roomId, roomId),
        eq(voiceRoomRsvps.parentId, parentId)
      ))
      .limit(1);
    return !!rsvp;
  }

  // Content Reports
  async createContentReport(report: InsertContentReport): Promise<ContentReport> {
    const [created] = await db.insert(contentReports)
      .values(report)
      .returning();
    return created;
  }

  async getContentReports(status: string): Promise<ContentReport[]> {
    return await db.select()
      .from(contentReports)
      .where(eq(contentReports.status, status))
      .orderBy(desc(contentReports.createdAt));
  }

  async updateContentReport(id: string, data: Partial<ContentReport>): Promise<ContentReport | undefined> {
    const [updated] = await db.update(contentReports)
      .set(data)
      .where(eq(contentReports.id, id))
      .returning();
    return updated || undefined;
  }

  // Moderation Actions
  async createModerationAction(action: InsertModerationAction): Promise<ModerationAction> {
    const [created] = await db.insert(moderationActions)
      .values(action)
      .returning();
    return created;
  }

  async getModerationActions(parentId: string): Promise<ModerationAction[]> {
    return await db.select()
      .from(moderationActions)
      .where(eq(moderationActions.parentId, parentId))
      .orderBy(desc(moderationActions.createdAt));
  }

  // User Consent
  async getUserConsent(parentId: string): Promise<UserConsent | undefined> {
    const [consent] = await db.select()
      .from(userConsent)
      .where(eq(userConsent.parentId, parentId))
      .limit(1);
    return consent || undefined;
  }

  async updateUserConsent(parentId: string, data: Partial<InsertUserConsent>): Promise<UserConsent> {
    const [existing] = await db.select()
      .from(userConsent)
      .where(eq(userConsent.parentId, parentId))
      .limit(1);

    if (existing) {
      const [updated] = await db.update(userConsent)
        .set({
          ...data,
          termsAcceptedAt: data.termsAccepted ? new Date() : existing.termsAcceptedAt,
          privacyAcceptedAt: data.privacyAccepted ? new Date() : existing.privacyAcceptedAt,
          guidelinesAcceptedAt: data.guidelinesAccepted ? new Date() : existing.guidelinesAcceptedAt,
          marketingConsentAt: data.marketingConsent ? new Date() : existing.marketingConsentAt,
          updatedAt: new Date(),
        })
        .where(eq(userConsent.parentId, parentId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(userConsent)
        .values({
          parentId,
          termsAccepted: data.termsAccepted || false,
          termsAcceptedAt: data.termsAccepted ? new Date() : null,
          privacyAccepted: data.privacyAccepted || false,
          privacyAcceptedAt: data.privacyAccepted ? new Date() : null,
          guidelinesAccepted: data.guidelinesAccepted || false,
          guidelinesAcceptedAt: data.guidelinesAccepted ? new Date() : null,
          marketingConsent: data.marketingConsent || false,
          marketingConsentAt: data.marketingConsent ? new Date() : null,
        })
        .returning();
      return created;
    }
  }

  // GDPR Account Deletion
  async markParentForDeletion(parentId: string): Promise<void> {
    // Soft delete implementation - assuming there's a deletedAt column on parents
    // If not, we can add it or just perform immediate deletion if requested
    // For now, let's just delete the parent record as requested by GDPR
    await db.delete(parents).where(eq(parents.id, parentId));
  }

  // Voice Recordings (Google Drive stored)
  async createVoiceRecording(recording: InsertVoiceRecording): Promise<VoiceRecording> {
    const [created] = await db.insert(voiceRecordings)
      .values(recording)
      .returning();
    return created;
  }

  async getVoiceRecordings(publishedOnly: boolean = true): Promise<(VoiceRecording & { host: Parent })[]> {
    let query = db.select()
      .from(voiceRecordings)
      .innerJoin(parents, eq(voiceRecordings.hostId, parents.id));
    
    if (publishedOnly) {
      query = query.where(eq(voiceRecordings.isPublished, true)) as any;
    }
    
    const result = await query.orderBy(desc(voiceRecordings.recordedAt));
    
    return result.map(r => ({
      ...r.voice_recordings,
      host: r.parents
    }));
  }

  async getVoiceRecording(id: string): Promise<(VoiceRecording & { host: Parent }) | undefined> {
    const result = await db.select()
      .from(voiceRecordings)
      .innerJoin(parents, eq(voiceRecordings.hostId, parents.id))
      .where(eq(voiceRecordings.id, id))
      .limit(1);
    
    if (result.length === 0) return undefined;
    
    return {
      ...result[0].voice_recordings,
      host: result[0].parents
    };
  }

  async updateVoiceRecording(id: string, data: Partial<VoiceRecording>): Promise<VoiceRecording | undefined> {
    const [updated] = await db.update(voiceRecordings)
      .set(data)
      .where(eq(voiceRecordings.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteVoiceRecording(id: string): Promise<void> {
    await db.delete(voiceRecordings).where(eq(voiceRecordings.id, id));
  }

  // AI Moderation
  async createAiModerationReport(report: InsertAiModerationReport): Promise<AiModerationReport> {
    const [created] = await db.insert(aiModerationReports)
      .values(report)
      .returning();
    return created;
  }

  async getAiModerationReports(status?: string): Promise<AiModerationReport[]> {
    if (status) {
      return await db.select()
        .from(aiModerationReports)
        .where(eq(aiModerationReports.status, status))
        .orderBy(desc(aiModerationReports.createdAt));
    }
    return await db.select()
      .from(aiModerationReports)
      .orderBy(desc(aiModerationReports.createdAt));
  }

  async updateAiModerationReport(id: string, data: Partial<AiModerationReport>): Promise<AiModerationReport | undefined> {
    const [updated] = await db.update(aiModerationReports)
      .set(data)
      .where(eq(aiModerationReports.id, id))
      .returning();
    return updated || undefined;
  }

  async updateVoiceRoomMessage(id: string, data: Partial<VoiceRoomMessage>): Promise<VoiceRoomMessage | undefined> {
    const [updated] = await db.update(voiceRoomMessages)
      .set(data)
      .where(eq(voiceRoomMessages.id, id))
      .returning();
    return updated || undefined;
  }

  // Bedtime Stories (Maaweelada Caruurta)
  async createBedtimeStory(story: InsertBedtimeStory): Promise<BedtimeStory> {
    const [created] = await db.insert(bedtimeStories)
      .values(story)
      .returning();
    return created;
  }

  async getBedtimeStories(limit: number = 30): Promise<BedtimeStory[]> {
    // Return thumbnailUrl for list view (lightweight), exclude base64 images array
    const results = await db.select({
      id: bedtimeStories.id,
      title: bedtimeStories.title,
      titleSomali: bedtimeStories.titleSomali,
      content: bedtimeStories.content,
      characterName: bedtimeStories.characterName,
      characterType: bedtimeStories.characterType,
      moralLesson: bedtimeStories.moralLesson,
      ageRange: bedtimeStories.ageRange,
      images: sql<string[]>`ARRAY[]::text[]`, // Empty for list view - use thumbnailUrl instead
      thumbnailUrl: bedtimeStories.thumbnailUrl,
      audioUrl: bedtimeStories.audioUrl,
      storyDate: bedtimeStories.storyDate,
      generatedAt: bedtimeStories.generatedAt,
      updatedAt: bedtimeStories.updatedAt,
      isPublished: bedtimeStories.isPublished,
    })
      .from(bedtimeStories)
      .where(eq(bedtimeStories.isPublished, true))
      .orderBy(desc(bedtimeStories.storyDate))
      .limit(limit);
    return results as BedtimeStory[];
  }

  async getAllBedtimeStories(limit: number = 30): Promise<BedtimeStory[]> {
    return await db.select()
      .from(bedtimeStories)
      .orderBy(desc(bedtimeStories.generatedAt))
      .limit(limit);
  }

  async getBedtimeStory(id: string): Promise<BedtimeStory | undefined> {
    const [story] = await db.select()
      .from(bedtimeStories)
      .where(eq(bedtimeStories.id, id));
    return story || undefined;
  }

  async getTodayBedtimeStory(): Promise<BedtimeStory | undefined> {
    const today = new Date().toISOString().split('T')[0];
    const [story] = await db.select()
      .from(bedtimeStories)
      .where(and(
        eq(bedtimeStories.storyDate, today),
        eq(bedtimeStories.isPublished, true)
      ))
      .orderBy(desc(bedtimeStories.updatedAt))
      .limit(1);
    return story || undefined;
  }

  async getBedtimeStoryByDate(date: string): Promise<BedtimeStory | undefined> {
    const [story] = await db.select()
      .from(bedtimeStories)
      .where(eq(bedtimeStories.storyDate, date));
    return story || undefined;
  }

  async updateBedtimeStory(id: string, data: Partial<InsertBedtimeStory>): Promise<BedtimeStory | undefined> {
    const [updated] = await db.update(bedtimeStories)
      .set(data)
      .where(eq(bedtimeStories.id, id))
      .returning();
    return updated || undefined;
  }

  async updateBedtimeStoryWithTimestamp(id: string, data: Partial<InsertBedtimeStory>): Promise<BedtimeStory | undefined> {
    const [updated] = await db.update(bedtimeStories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(bedtimeStories.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteBedtimeStory(id: string): Promise<void> {
    await db.delete(bedtimeStories).where(eq(bedtimeStories.id, id));
  }

  // Parent Messages (Dhambaalka Waalidka) implementations
  async createParentMessage(message: InsertParentMessage): Promise<ParentMessage> {
    const [created] = await db.insert(parentMessages)
      .values(message)
      .returning();
    return created;
  }

  async getParentMessages(limit: number = 30): Promise<ParentMessage[]> {
    // Return thumbnailUrl for list view (lightweight), exclude base64 images array
    const results = await db.select({
      id: parentMessages.id,
      title: parentMessages.title,
      content: parentMessages.content,
      topic: parentMessages.topic,
      keyPoints: parentMessages.keyPoints,
      images: sql<string[]>`ARRAY[]::text[]`, // Empty for list view - use thumbnailUrl instead
      thumbnailUrl: parentMessages.thumbnailUrl,
      audioUrl: parentMessages.audioUrl,
      messageDate: parentMessages.messageDate,
      generatedAt: parentMessages.generatedAt,
      updatedAt: parentMessages.updatedAt,
      isPublished: parentMessages.isPublished,
      authorName: parentMessages.authorName,
    })
      .from(parentMessages)
      .where(eq(parentMessages.isPublished, true))
      .orderBy(desc(parentMessages.messageDate))
      .limit(limit);
    return results as ParentMessage[];
  }

  async getAllParentMessages(limit: number = 30): Promise<ParentMessage[]> {
    return await db.select()
      .from(parentMessages)
      .orderBy(desc(parentMessages.generatedAt))
      .limit(limit);
  }

  async getParentMessage(id: string): Promise<ParentMessage | undefined> {
    const [message] = await db.select()
      .from(parentMessages)
      .where(eq(parentMessages.id, id));
    return message || undefined;
  }

  async getTodayParentMessage(): Promise<ParentMessage | undefined> {
    const today = new Date().toISOString().split('T')[0];
    const [message] = await db.select()
      .from(parentMessages)
      .where(and(
        eq(parentMessages.messageDate, today),
        eq(parentMessages.isPublished, true)
      ))
      .orderBy(desc(parentMessages.updatedAt))
      .limit(1);
    return message || undefined;
  }

  async getParentMessageByDate(date: string): Promise<ParentMessage | undefined> {
    const [message] = await db.select()
      .from(parentMessages)
      .where(eq(parentMessages.messageDate, date));
    return message || undefined;
  }

  async updateParentMessage(id: string, data: Partial<InsertParentMessage>): Promise<ParentMessage | undefined> {
    const [updated] = await db.update(parentMessages)
      .set(data)
      .where(eq(parentMessages.id, id))
      .returning();
    return updated || undefined;
  }

  async updateParentMessageWithTimestamp(id: string, data: Partial<InsertParentMessage>): Promise<ParentMessage | undefined> {
    const [updated] = await db.update(parentMessages)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(parentMessages.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteParentMessage(id: string): Promise<void> {
    await db.delete(parentMessages).where(eq(parentMessages.id, id));
  }

  // Content Reactions & Comments implementations
  async getContentReactions(contentType: string, contentId: string, parentId?: string): Promise<{ counts: Record<string, number>; userReaction: string | null }> {
    const allReactions = await db.select()
      .from(contentReactions)
      .where(and(
        eq(contentReactions.contentType, contentType),
        eq(contentReactions.contentId, contentId)
      ));
    
    // Initialize all reaction types to 0
    const counts: Record<string, number> = {
      love: 0,
      like: 0,
      dislike: 0,
      sparkle: 0
    };
    
    // Count reactions
    allReactions.forEach(r => {
      counts[r.reactionType] = (counts[r.reactionType] || 0) + 1;
    });
    
    const userReaction = parentId ? allReactions.find(r => r.parentId === parentId)?.reactionType || null : null;
    
    return { counts, userReaction };
  }

  async upsertContentReaction(parentId: string, contentType: string, contentId: string, reactionType: string): Promise<ContentReaction> {
    const existing = await db.select()
      .from(contentReactions)
      .where(and(
        eq(contentReactions.parentId, parentId),
        eq(contentReactions.contentType, contentType),
        eq(contentReactions.contentId, contentId)
      ));
    
    if (existing.length > 0) {
      const [updated] = await db.update(contentReactions)
        .set({ reactionType })
        .where(eq(contentReactions.id, existing[0].id))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(contentReactions)
      .values({ parentId, contentType, contentId, reactionType })
      .returning();
    return created;
  }

  async removeContentReaction(parentId: string, contentType: string, contentId: string): Promise<void> {
    await db.delete(contentReactions)
      .where(and(
        eq(contentReactions.parentId, parentId),
        eq(contentReactions.contentType, contentType),
        eq(contentReactions.contentId, contentId)
      ));
  }

  async getContentComments(contentType: string, contentId: string): Promise<(ContentComment & { parent: { id: string; name: string; picture: string | null }; replyTo?: ContentComment & { parent: { id: string; name: string } } })[]> {
    const comments = await db.select()
      .from(contentComments)
      .where(and(
        eq(contentComments.contentType, contentType),
        eq(contentComments.contentId, contentId),
        eq(contentComments.isHidden, false)
      ))
      .orderBy(asc(contentComments.createdAt));
    
    const parentIds = Array.from(new Set(comments.map(c => c.parentId)));
    const parentsList = parentIds.length > 0 
      ? await db.select({ id: parents.id, name: parents.name, picture: parents.picture })
          .from(parents)
          .where(inArray(parents.id, parentIds))
      : [];
    
    const parentsMap = new Map(parentsList.map(p => [p.id, p]));
    const commentsMap = new Map(comments.map(c => [c.id, c]));
    
    return comments.map(comment => {
      const parentData = parentsMap.get(comment.parentId) || { id: comment.parentId, name: 'Unknown', picture: null };
      const result: any = { ...comment, parent: parentData };
      
      if (comment.replyToId) {
        const replyToComment = commentsMap.get(comment.replyToId);
        if (replyToComment) {
          const replyToParent = parentsMap.get(replyToComment.parentId) || { id: replyToComment.parentId, name: 'Unknown' };
          result.replyTo = { ...replyToComment, parent: replyToParent };
        }
      }
      
      return result;
    });
  }

  async createContentComment(data: InsertContentComment): Promise<ContentComment> {
    const [created] = await db.insert(contentComments)
      .values(data)
      .returning();
    return created;
  }

  async deleteContentComment(id: string, parentId: string): Promise<void> {
    await db.delete(contentComments)
      .where(and(
        eq(contentComments.id, id),
        eq(contentComments.parentId, parentId)
      ));
  }

  async getCommentReactions(commentId: string, parentId?: string): Promise<{ counts: Record<string, number>; userReaction: string | null }> {
    const reactions = await db.select({
      reactionType: commentReactions.reactionType,
      count: sql<number>`count(*)::int`,
    })
      .from(commentReactions)
      .where(eq(commentReactions.commentId, commentId))
      .groupBy(commentReactions.reactionType);
    
    const counts: Record<string, number> = {
      love: 0,
      like: 0,
      dislike: 0,
      sparkle: 0,
    };
    
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
    
    return { counts, userReaction };
  }

  async upsertCommentReaction(parentId: string, commentId: string, reactionType: string): Promise<CommentReaction> {
    const [existing] = await db.select()
      .from(commentReactions)
      .where(and(
        eq(commentReactions.parentId, parentId),
        eq(commentReactions.commentId, commentId)
      ));
    
    if (existing) {
      const [updated] = await db.update(commentReactions)
        .set({ reactionType })
        .where(eq(commentReactions.id, existing.id))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(commentReactions)
      .values({ parentId, commentId, reactionType })
      .returning();
    return created;
  }

  async removeCommentReaction(parentId: string, commentId: string): Promise<void> {
    await db.delete(commentReactions)
      .where(and(
        eq(commentReactions.parentId, parentId),
        eq(commentReactions.commentId, commentId)
      ));
  }

  async getCommentById(commentId: string): Promise<ContentComment | undefined> {
    const [comment] = await db.select()
      .from(contentComments)
      .where(eq(contentComments.id, commentId));
    return comment || undefined;
  }

  async followParent(followerId: string, followingId: string): Promise<ParentFollow> {
    const [follow] = await db
      .insert(parentFollows)
      .values({ followerId, followingId })
      .onConflictDoNothing()
      .returning();
    
    if (!follow) {
      const [existing] = await db
        .select()
        .from(parentFollows)
        .where(and(eq(parentFollows.followerId, followerId), eq(parentFollows.followingId, followingId)));
      return existing;
    }
    return follow;
  }

  async unfollowParent(followerId: string, followingId: string): Promise<void> {
    await db
      .delete(parentFollows)
      .where(and(eq(parentFollows.followerId, followerId), eq(parentFollows.followingId, followingId)));
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(parentFollows)
      .where(and(eq(parentFollows.followerId, followerId), eq(parentFollows.followingId, followingId)));
    return !!result;
  }

  async getFollowers(parentId: string): Promise<{ id: string; name: string; picture: string | null }[]> {
    const result = await db
      .select({
        id: parents.id,
        name: parents.name,
        picture: parents.picture,
      })
      .from(parentFollows)
      .innerJoin(parents, eq(parentFollows.followerId, parents.id))
      .where(eq(parentFollows.followingId, parentId))
      .orderBy(desc(parentFollows.createdAt));
    return result;
  }

  async getFollowing(parentId: string): Promise<{ id: string; name: string; picture: string | null }[]> {
    const result = await db
      .select({
        id: parents.id,
        name: parents.name,
        picture: parents.picture,
      })
      .from(parentFollows)
      .innerJoin(parents, eq(parentFollows.followingId, parents.id))
      .where(eq(parentFollows.followerId, parentId))
      .orderBy(desc(parentFollows.createdAt));
    return result;
  }

  async getFollowCounts(parentId: string): Promise<{ followersCount: number; followingCount: number }> {
    const [followersResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(parentFollows)
      .where(eq(parentFollows.followingId, parentId));
    
    const [followingResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(parentFollows)
      .where(eq(parentFollows.followerId, parentId));
    
    return {
      followersCount: followersResult?.count || 0,
      followingCount: followingResult?.count || 0,
    };
  }

  async createSocialNotification(notification: Omit<InsertSocialNotification, 'id' | 'createdAt'>): Promise<SocialNotification> {
    const [result] = await db.insert(socialNotifications).values(notification).returning();
    return result;
  }

  async getSocialNotifications(parentId: string): Promise<(SocialNotification & { actor: { id: string; name: string; picture: string | null } })[]> {
    const result = await db
      .select({
        id: socialNotifications.id,
        parentId: socialNotifications.parentId,
        type: socialNotifications.type,
        actorId: socialNotifications.actorId,
        referenceId: socialNotifications.referenceId,
        isRead: socialNotifications.isRead,
        createdAt: socialNotifications.createdAt,
        actor: {
          id: parents.id,
          name: parents.name,
          picture: parents.picture,
        },
      })
      .from(socialNotifications)
      .innerJoin(parents, eq(socialNotifications.actorId, parents.id))
      .where(eq(socialNotifications.parentId, parentId))
      .orderBy(desc(socialNotifications.createdAt))
      .limit(50);
    return result;
  }

  async markSocialNotificationsAsRead(parentId: string): Promise<void> {
    await db
      .update(socialNotifications)
      .set({ isRead: true })
      .where(eq(socialNotifications.parentId, parentId));
  }

  async getUnreadSocialNotificationCount(parentId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(socialNotifications)
      .where(and(eq(socialNotifications.parentId, parentId), eq(socialNotifications.isRead, false)));
    return result?.count || 0;
  }

  // Direct Messages implementation
  async sendDirectMessage(senderId: string, receiverId: string, body: string, audioUrl?: string): Promise<DirectMessage> {
    const [message] = await db
      .insert(directMessages)
      .values({ senderId, receiverId, body, audioUrl: audioUrl || null })
      .returning();
    return message;
  }

  async getConversations(parentId: string): Promise<{ partnerId: string; partnerName: string; partnerPicture: string | null; lastMessage: string; lastMessageAt: Date; unreadCount: number }[]> {
    const allMessages = await db
      .select()
      .from(directMessages)
      .where(or(eq(directMessages.senderId, parentId), eq(directMessages.receiverId, parentId)))
      .orderBy(desc(directMessages.createdAt));
    
    const conversationMap = new Map<string, { partnerId: string; lastMessage: string; lastMessageAt: Date; unreadCount: number }>();
    
    for (const msg of allMessages) {
      const partnerId = msg.senderId === parentId ? msg.receiverId : msg.senderId;
      
      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          partnerId,
          lastMessage: msg.body,
          lastMessageAt: msg.createdAt,
          unreadCount: 0,
        });
      }
      
      if (msg.receiverId === parentId && !msg.isRead) {
        const existing = conversationMap.get(partnerId)!;
        existing.unreadCount++;
      }
    }
    
    const partnerIds = Array.from(conversationMap.keys());
    if (partnerIds.length === 0) return [];
    
    const partners = await db
      .select({ id: parents.id, name: parents.name, picture: parents.picture })
      .from(parents)
      .where(inArray(parents.id, partnerIds));
    
    const partnerMap = new Map(partners.map(p => [p.id, p]));
    
    return Array.from(conversationMap.values())
      .map(conv => ({
        ...conv,
        partnerName: partnerMap.get(conv.partnerId)?.name || "Unknown",
        partnerPicture: partnerMap.get(conv.partnerId)?.picture || null,
      }))
      .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
  }

  async getMessagesWithParent(parentId: string, partnerId: string, limit = 50): Promise<DirectMessage[]> {
    return db
      .select()
      .from(directMessages)
      .where(
        or(
          and(eq(directMessages.senderId, parentId), eq(directMessages.receiverId, partnerId)),
          and(eq(directMessages.senderId, partnerId), eq(directMessages.receiverId, parentId))
        )
      )
      .orderBy(desc(directMessages.createdAt))
      .limit(limit);
  }

  async markMessagesAsRead(receiverId: string, senderId: string): Promise<void> {
    await db
      .update(directMessages)
      .set({ isRead: true })
      .where(
        and(
          eq(directMessages.senderId, senderId),
          eq(directMessages.receiverId, receiverId),
          eq(directMessages.isRead, false)
        )
      );
  }

  async getUnreadMessageCount(parentId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(directMessages)
      .where(and(eq(directMessages.receiverId, parentId), eq(directMessages.isRead, false)));
    return result?.count || 0;
  }

  // Parent Posts (Social Feed) implementation
  async createParentPost(post: Omit<InsertParentPost, 'id'>): Promise<ParentPost> {
    const [newPost] = await db.insert(parentPosts).values(post).returning();
    return newPost;
  }

  async getParentPostById(id: string): Promise<ParentPost | null> {
    const [post] = await db.select().from(parentPosts).where(eq(parentPosts.id, id));
    return post || null;
  }

  async listParentPosts(limit = 20, cursor?: string, parentId?: string): Promise<ParentPost[]> {
    if (cursor) {
      const cursorPost = await this.getParentPostById(cursor);
      if (cursorPost) {
        if (parentId) {
          return db
            .select()
            .from(parentPosts)
            .where(and(
              eq(parentPosts.parentId, parentId),
              lte(parentPosts.createdAt, cursorPost.createdAt)
            ))
            .orderBy(desc(parentPosts.createdAt))
            .limit(limit + 1);
        }
        return db
          .select()
          .from(parentPosts)
          .where(lte(parentPosts.createdAt, cursorPost.createdAt))
          .orderBy(desc(parentPosts.createdAt))
          .limit(limit + 1);
      }
    }
    if (parentId) {
      return db
        .select()
        .from(parentPosts)
        .where(eq(parentPosts.parentId, parentId))
        .orderBy(desc(parentPosts.createdAt))
        .limit(limit);
    }
    return db
      .select()
      .from(parentPosts)
      .orderBy(desc(parentPosts.createdAt))
      .limit(limit);
  }

  async listLatestParentPosts(limit = 5): Promise<ParentPost[]> {
    return db
      .select()
      .from(parentPosts)
      .orderBy(desc(parentPosts.createdAt))
      .limit(limit);
  }

  async deleteParentPost(id: string): Promise<void> {
    await db.delete(parentPosts).where(eq(parentPosts.id, id));
  }

  async updateParentPost(id: string, data: { title?: string; content?: string; visibility?: string }): Promise<ParentPost | null> {
    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.visibility !== undefined) updateData.visibility = data.visibility;
    
    const [updated] = await db
      .update(parentPosts)
      .set(updateData)
      .where(eq(parentPosts.id, id))
      .returning();
    return updated || null;
  }

  async addPostImage(image: Omit<InsertParentPostImage, 'id'>): Promise<ParentPostImage> {
    const [newImage] = await db.insert(parentPostImages).values(image).returning();
    return newImage;
  }

  async getPostImages(postId: string): Promise<ParentPostImage[]> {
    return db
      .select()
      .from(parentPostImages)
      .where(eq(parentPostImages.postId, postId))
      .orderBy(asc(parentPostImages.displayOrder));
  }

  async deletePostImage(id: string): Promise<void> {
    await db.delete(parentPostImages).where(eq(parentPostImages.id, id));
  }

  // Course Promotions (sidebar ads)
  async createCoursePromotion(data: InsertCoursePromotion): Promise<CoursePromotion> {
    const [promotion] = await db.insert(coursePromotions).values(data).returning();
    return promotion;
  }

  async getCoursePromotion(id: string): Promise<CoursePromotion | null> {
    const [promotion] = await db.select().from(coursePromotions).where(eq(coursePromotions.id, id));
    return promotion || null;
  }

  async listActivePromotions(): Promise<(CoursePromotion & { course: Course })[]> {
    const now = new Date();
    const results = await db
      .select({
        id: coursePromotions.id,
        courseId: coursePromotions.courseId,
        headline: coursePromotions.headline,
        description: coursePromotions.description,
        imageUrl: coursePromotions.imageUrl,
        priority: coursePromotions.priority,
        isActive: coursePromotions.isActive,
        startDate: coursePromotions.startDate,
        endDate: coursePromotions.endDate,
        createdAt: coursePromotions.createdAt,
        updatedAt: coursePromotions.updatedAt,
        course: courses,
      })
      .from(coursePromotions)
      .innerJoin(courses, eq(coursePromotions.courseId, courses.id))
      .where(
        and(
          eq(coursePromotions.isActive, true),
          or(isNull(coursePromotions.startDate), lte(coursePromotions.startDate, now)),
          or(isNull(coursePromotions.endDate), gte(coursePromotions.endDate, now))
        )
      )
      .orderBy(desc(coursePromotions.priority), desc(coursePromotions.createdAt));
    
    return results.map(r => ({
      ...r,
      course: r.course,
    }));
  }

  async listAllPromotions(): Promise<(CoursePromotion & { course: Course })[]> {
    const results = await db
      .select({
        id: coursePromotions.id,
        courseId: coursePromotions.courseId,
        headline: coursePromotions.headline,
        description: coursePromotions.description,
        imageUrl: coursePromotions.imageUrl,
        priority: coursePromotions.priority,
        isActive: coursePromotions.isActive,
        startDate: coursePromotions.startDate,
        endDate: coursePromotions.endDate,
        createdAt: coursePromotions.createdAt,
        updatedAt: coursePromotions.updatedAt,
        course: courses,
      })
      .from(coursePromotions)
      .innerJoin(courses, eq(coursePromotions.courseId, courses.id))
      .orderBy(desc(coursePromotions.priority), desc(coursePromotions.createdAt));
    
    return results.map(r => ({
      ...r,
      course: r.course,
    }));
  }

  async updateCoursePromotion(id: string, data: Partial<InsertCoursePromotion>): Promise<CoursePromotion | null> {
    const [updated] = await db
      .update(coursePromotions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(coursePromotions.id, id))
      .returning();
    return updated || null;
  }

  async deleteCoursePromotion(id: string): Promise<void> {
    await db.delete(coursePromotions).where(eq(coursePromotions.id, id));
  }

  // Post Reactions
  async togglePostReaction(postId: string, parentId: string, reactionType: string): Promise<{ action: 'added' | 'changed' | 'removed'; reaction?: ParentPostReaction }> {
    const existing = await db
      .select()
      .from(parentPostReactions)
      .where(and(eq(parentPostReactions.postId, postId), eq(parentPostReactions.parentId, parentId)));
    
    if (existing.length > 0) {
      if (existing[0].reactionType === reactionType) {
        await db.delete(parentPostReactions).where(eq(parentPostReactions.id, existing[0].id));
        await db.update(parentPosts).set({ likeCount: sql`GREATEST(0, ${parentPosts.likeCount} - 1)` }).where(eq(parentPosts.id, postId));
        return { action: 'removed' };
      } else {
        const [updated] = await db
          .update(parentPostReactions)
          .set({ reactionType })
          .where(eq(parentPostReactions.id, existing[0].id))
          .returning();
        return { action: 'changed', reaction: updated };
      }
    } else {
      const [reaction] = await db.insert(parentPostReactions).values({ postId, parentId, reactionType }).returning();
      await db.update(parentPosts).set({ likeCount: sql`${parentPosts.likeCount} + 1` }).where(eq(parentPosts.id, postId));
      return { action: 'added', reaction };
    }
  }

  async getPostReactions(postId: string): Promise<{ counts: Record<string, number>; userReaction: string | null }> {
    const reactions = await db.select().from(parentPostReactions).where(eq(parentPostReactions.postId, postId));
    const counts: Record<string, number> = {};
    reactions.forEach(r => {
      counts[r.reactionType] = (counts[r.reactionType] || 0) + 1;
    });
    return { counts, userReaction: null };
  }

  async getPostReactionsWithParent(postId: string, parentId: string): Promise<{ counts: Record<string, number>; userReaction: string | null }> {
    const reactions = await db.select().from(parentPostReactions).where(eq(parentPostReactions.postId, postId));
    const counts: Record<string, number> = {};
    let userReaction: string | null = null;
    reactions.forEach(r => {
      counts[r.reactionType] = (counts[r.reactionType] || 0) + 1;
      if (r.parentId === parentId) userReaction = r.reactionType;
    });
    return { counts, userReaction };
  }

  // Post Comments
  async createPostComment(data: InsertParentPostComment): Promise<ParentPostComment> {
    const [comment] = await db.insert(parentPostComments).values(data).returning();
    return comment;
  }

  async getPostComments(postId: string): Promise<(ParentPostComment & { author: { id: string; name: string; picture: string | null }; parentCommentId: string | null; replies?: any[] })[]> {
    const comments = await db
      .select({
        id: parentPostComments.id,
        postId: parentPostComments.postId,
        parentId: parentPostComments.parentId,
        parentCommentId: parentPostComments.parentCommentId,
        body: parentPostComments.body,
        isEdited: parentPostComments.isEdited,
        createdAt: parentPostComments.createdAt,
        updatedAt: parentPostComments.updatedAt,
        authorId: parents.id,
        authorName: parents.name,
        authorPicture: parents.picture,
      })
      .from(parentPostComments)
      .innerJoin(parents, eq(parentPostComments.parentId, parents.id))
      .where(eq(parentPostComments.postId, postId))
      .orderBy(asc(parentPostComments.createdAt));
    
    // Map flat comments to structured format
    const flatComments = comments.map(c => ({
      id: c.id,
      postId: c.postId,
      parentId: c.parentId,
      parentCommentId: c.parentCommentId,
      body: c.body,
      isEdited: c.isEdited,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      author: {
        id: c.authorId,
        name: c.authorName || 'Waalid',
        picture: c.authorPicture,
      },
      replies: [] as any[],
    }));

    // Build nested structure - top-level comments first, then attach replies
    const topLevelComments = flatComments.filter(c => !c.parentCommentId);
    const replies = flatComments.filter(c => c.parentCommentId);
    
    // Attach replies to their parent comments
    replies.forEach(reply => {
      const parent = topLevelComments.find(c => c.id === reply.parentCommentId);
      if (parent) {
        parent.replies.push(reply);
      }
    });

    return topLevelComments;
  }

  async updatePostComment(id: string, parentId: string, body: string): Promise<ParentPostComment | null> {
    const [updated] = await db
      .update(parentPostComments)
      .set({ body, isEdited: true, updatedAt: new Date() })
      .where(and(eq(parentPostComments.id, id), eq(parentPostComments.parentId, parentId)))
      .returning();
    return updated || null;
  }

  async deletePostComment(id: string, parentId: string): Promise<void> {
    await db.delete(parentPostComments).where(and(eq(parentPostComments.id, id), eq(parentPostComments.parentId, parentId)));
  }

  async incrementCommentCount(postId: string): Promise<void> {
    await db.update(parentPosts).set({ commentCount: sql`${parentPosts.commentCount} + 1` }).where(eq(parentPosts.id, postId));
  }

  async decrementCommentCount(postId: string): Promise<void> {
    await db.update(parentPosts).set({ commentCount: sql`GREATEST(0, ${parentPosts.commentCount} - 1)` }).where(eq(parentPosts.id, postId));
  }

  // Comment Images
  async addCommentImage(data: InsertParentPostCommentImage): Promise<ParentPostCommentImage> {
    const [image] = await db.insert(parentPostCommentImages).values(data).returning();
    return image;
  }

  async getCommentImages(commentId: string): Promise<ParentPostCommentImage[]> {
    return await db.select().from(parentPostCommentImages).where(eq(parentPostCommentImages.commentId, commentId)).orderBy(asc(parentPostCommentImages.displayOrder));
  }

  // Comment Reactions
  async toggleCommentReaction(commentId: string, parentId: string, reactionType: string): Promise<{ action: 'added' | 'changed' | 'removed' }> {
    const existing = await db
      .select()
      .from(parentPostCommentReactions)
      .where(and(eq(parentPostCommentReactions.commentId, commentId), eq(parentPostCommentReactions.parentId, parentId)));
    
    if (existing.length > 0) {
      if (existing[0].reactionType === reactionType) {
        await db.delete(parentPostCommentReactions).where(eq(parentPostCommentReactions.id, existing[0].id));
        return { action: 'removed' };
      } else {
        await db
          .update(parentPostCommentReactions)
          .set({ reactionType })
          .where(eq(parentPostCommentReactions.id, existing[0].id));
        return { action: 'changed' };
      }
    } else {
      await db.insert(parentPostCommentReactions).values({ commentId, parentId, reactionType });
      return { action: 'added' };
    }
  }

  async getParentPostCommentReactions(commentId: string, parentId?: string): Promise<{ counts: Record<string, number>; userReaction: string | null }> {
    const reactions = await db.select().from(parentPostCommentReactions).where(eq(parentPostCommentReactions.commentId, commentId));
    const counts: Record<string, number> = {};
    let userReaction: string | null = null;
    reactions.forEach(r => {
      counts[r.reactionType] = (counts[r.reactionType] || 0) + 1;
      if (parentId && r.parentId === parentId) userReaction = r.reactionType;
    });
    return { counts, userReaction };
  }

  // Testimonial Reactions
  async toggleTestimonialReaction(testimonialId: string, parentId: string, reactionType: string): Promise<{ action: 'added' | 'changed' | 'removed' }> {
    const existing = await db
      .select()
      .from(testimonialReactions)
      .where(and(eq(testimonialReactions.testimonialId, testimonialId), eq(testimonialReactions.parentId, parentId)));
    
    if (existing.length > 0) {
      if (existing[0].reactionType === reactionType) {
        await db.delete(testimonialReactions).where(eq(testimonialReactions.id, existing[0].id));
        return { action: 'removed' };
      } else {
        await db
          .update(testimonialReactions)
          .set({ reactionType })
          .where(eq(testimonialReactions.id, existing[0].id));
        return { action: 'changed' };
      }
    } else {
      await db.insert(testimonialReactions).values({ testimonialId, parentId, reactionType });
      return { action: 'added' };
    }
  }

  async getTestimonialReactions(testimonialId: string, parentId?: string): Promise<{ counts: Record<string, number>; userReaction: string | null }> {
    const reactions = await db.select().from(testimonialReactions).where(eq(testimonialReactions.testimonialId, testimonialId));
    const counts: Record<string, number> = {};
    let userReaction: string | null = null;
    reactions.forEach(r => {
      counts[r.reactionType] = (counts[r.reactionType] || 0) + 1;
      if (parentId && r.parentId === parentId) userReaction = r.reactionType;
    });
    return { counts, userReaction };
  }

  async getAllTestimonialReactions(parentId?: string): Promise<Record<string, { counts: Record<string, number>; userReaction: string | null }>> {
    const reactions = await db.select().from(testimonialReactions);
    const result: Record<string, { counts: Record<string, number>; userReaction: string | null }> = {};
    reactions.forEach(r => {
      if (!result[r.testimonialId]) {
        result[r.testimonialId] = { counts: {}, userReaction: null };
      }
      result[r.testimonialId].counts[r.reactionType] = (result[r.testimonialId].counts[r.reactionType] || 0) + 1;
      if (parentId && r.parentId === parentId) {
        result[r.testimonialId].userReaction = r.reactionType;
      }
    });
    return result;
  }

  // Pricing Plans
  async getAllPricingPlans(): Promise<PricingPlan[]> {
    return await db.select().from(pricingPlans).orderBy(asc(pricingPlans.displayOrder));
  }

  async getActivePricingPlans(): Promise<PricingPlan[]> {
    return await db.select().from(pricingPlans)
      .where(eq(pricingPlans.isActive, true))
      .orderBy(asc(pricingPlans.displayOrder));
  }

  async getPricingPlanByType(planType: string): Promise<PricingPlan | undefined> {
    const [plan] = await db.select().from(pricingPlans).where(eq(pricingPlans.planType, planType));
    return plan || undefined;
  }

  async updatePricingPlan(id: string, data: Partial<InsertPricingPlan>): Promise<PricingPlan | undefined> {
    const [updated] = await db.update(pricingPlans)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(pricingPlans.id, id))
      .returning();
    return updated || undefined;
  }

  async markContentComplete(parentId: string, contentType: string, contentId: string): Promise<ContentProgress> {
    const [existing] = await db.select().from(contentProgress)
      .where(and(
        eq(contentProgress.parentId, parentId),
        eq(contentProgress.contentType, contentType),
        eq(contentProgress.contentId, contentId),
      ));
    if (existing) return existing;
    const [created] = await db.insert(contentProgress)
      .values({ parentId, contentType, contentId, completed: true })
      .returning();
    return created;
  }

  async getContentProgress(parentId: string, contentType: string): Promise<ContentProgress[]> {
    return await db.select().from(contentProgress)
      .where(and(
        eq(contentProgress.parentId, parentId),
        eq(contentProgress.contentType, contentType),
      ))
      .orderBy(desc(contentProgress.completedAt));
  }

  async getContentProgressSummary(parentId: string): Promise<{ dhambaalCount: number; sheekoCount: number }> {
    const all = await db.select().from(contentProgress)
      .where(eq(contentProgress.parentId, parentId));
    const dhambaalCount = all.filter(p => p.contentType === 'dhambaal').length;
    const sheekoCount = all.filter(p => p.contentType === 'sheeko').length;
    return { dhambaalCount, sheekoCount };
  }

  async isContentCompleted(parentId: string, contentType: string, contentId: string): Promise<boolean> {
    const [row] = await db.select().from(contentProgress)
      .where(and(
        eq(contentProgress.parentId, parentId),
        eq(contentProgress.contentType, contentType),
        eq(contentProgress.contentId, contentId),
      ));
    return !!row;
  }

  async getGoogleMeetEvents(): Promise<GoogleMeetEvent[]> {
    return await db.select().from(googleMeetEvents).orderBy(desc(googleMeetEvents.createdAt));
  }

  async getActiveGoogleMeetEvents(): Promise<GoogleMeetEvent[]> {
    return await db.select().from(googleMeetEvents)
      .where(and(eq(googleMeetEvents.isActive, true), eq(googleMeetEvents.isArchived, false)))
      .orderBy(desc(googleMeetEvents.createdAt));
  }

  async getArchivedGoogleMeetEvents(): Promise<GoogleMeetEvent[]> {
    return await db.select().from(googleMeetEvents)
      .where(eq(googleMeetEvents.isArchived, true))
      .orderBy(desc(googleMeetEvents.createdAt));
  }

  async archiveGoogleMeetEvent(id: string): Promise<GoogleMeetEvent | undefined> {
    const [updated] = await db.update(googleMeetEvents)
      .set({ isArchived: true, isActive: false })
      .where(eq(googleMeetEvents.id, id))
      .returning();
    return updated || undefined;
  }

  async getGoogleMeetEvent(id: string): Promise<GoogleMeetEvent | undefined> {
    const [event] = await db.select().from(googleMeetEvents).where(eq(googleMeetEvents.id, id));
    return event || undefined;
  }

  async createGoogleMeetEvent(event: InsertGoogleMeetEvent): Promise<GoogleMeetEvent> {
    const [created] = await db.insert(googleMeetEvents).values(event).returning();
    return created;
  }

  async updateGoogleMeetEvent(id: string, data: Partial<InsertGoogleMeetEvent>): Promise<GoogleMeetEvent | undefined> {
    const [updated] = await db.update(googleMeetEvents).set(data).where(eq(googleMeetEvents.id, id)).returning();
    return updated || undefined;
  }

  async deleteGoogleMeetEvent(id: string): Promise<void> {
    await db.delete(googleMeetEvents).where(eq(googleMeetEvents.id, id));
  }
}

export const storage = new DatabaseStorage();
