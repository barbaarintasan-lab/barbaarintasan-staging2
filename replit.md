# Barbaarintasan Academy - Somali Parenting Education Platform

## Overview
Barbaarintasan Academy is a web-based educational platform designed for Somali parents, offering structured courses on child development and parenting. The platform provides culturally relevant educational resources through video lessons, text content, interactive quizzes, and progress tracking. Its core mission is to empower Somali parents by making essential parenting knowledge accessible. The project aims to improve child-rearing practices within the Somali community by offering specialized topics like child intelligence and autism awareness, leveraging technology to deliver engaging and effective learning experiences.

## User Preferences
Preferred communication style: Simple, everyday language.

Islamic honorifics: When mentioning the Prophet Muhammad (scw/PBUH), always write the full Somali phrase "Nabadgalyo iyo Naxariisi korkiisa ha ahaatee" instead of abbreviations.

## System Architecture

### Frontend
The frontend uses React 18 with TypeScript and Vite. It incorporates `shadcn/ui` (built on Radix UI) for components, Wouter for routing, and TanStack Query for server state management. Tailwind CSS is used for styling with a mobile-first, educational aesthetic.

### Backend
The backend is built with Express.js, Node.js, and TypeScript, featuring a RESTful API, cookie-based session management for authentication, and custom middleware for request logging.

### Database
Drizzle ORM is used for type-safe database interactions with a Neon serverless PostgreSQL database. The schema includes users (admins), courses, and lessons, with Drizzle Kit managing migrations.

### Authentication & Authorization
The platform uses session-based authentication with bcrypt for password hashing. A simple role-based access control system (`isAdmin` flag) manages admin dashboard access. Security measures include HTTP-only and secure cookies, environment variable-based session secrets, and CSRF protection.

### Content Management
Static assets are managed locally, and video content uses external URLs. The platform supports both video and text-based lessons and interactive quizzes using static JSON data.

### Subscription & Payments
A subscription-based access model offers monthly and yearly plans, with manual upgrade options and precise display rules for upgrade banners. Access control is based on subscription status, with hourly expiration checks and reminder notifications. A custom manual payment workflow supports mobile money and bank transfers, with admin approval required to grant course access.

### Learning & Engagement
A Duolingo-style daily streak system tracks lesson completion. Users can download PDF certificates upon course completion. Admins can dynamically manage the visibility and order of 14 homepage sections.

### BSAv.1 Sheeko (Voice Spaces)
This feature provides Clubhouse/Twitter Spaces-like voice chat. It uses LiveKit SFU for scalable audio (supporting 70+ participants) and WebSockets for chat and real-time events. Rooms can be scheduled, live, or ended, with roles like Listener, Speaker, Co-host, and Host. Features include hand-raising, one-tap session recording (uploaded to Google Drive), and moderation tools (kick, ban, delete messages, end room). AI content moderation via OpenAI flags harmful chat messages, with culturally sensitive analysis and admin review. A host permission system (`canHostSheeko` flag) controls who can create rooms. Engagement features include live emoji reactions, pinned messages, and host follow functionality. A 2-minute connection grace period allows users to rejoin seamlessly after temporary disconnections.

### Maaweelada Caruurta (Children's Bedtime Stories)
This section offers AI-generated Islamic bedtime stories in Somali for children aged 3-8, featuring Sahaba and Tabi'iyiin. Stories are generated daily using OpenAI GPT-4o for text and gpt-image-1 for images (2 images per story). The frontend displays these stories with an image carousel and moral lessons. Daily story generation runs via Replit Scheduled Deployments. Audio is generated using Azure TTS and saved to Google Drive. Thumbnails are stored in Google Drive for fast list loading.

### Dhambaalka Waalidka (Daily Parenting Blog)
This feature provides AI-generated daily parenting blog articles in Somali for parents of children aged 0-7. Articles (400-600 words) are generated using OpenAI GPT-4o for text and gpt-image-1 for images (2 images per article), combining modern parenting science with Islamic values across 15 rotating topics. Admins can manually enter content and generate audio/images. Daily generation runs via Replit Scheduled Deployments and attributed to the academy's founder. Audio is generated using Azure TTS and saved to Google Drive. Thumbnails are stored in Google Drive for fast list loading.

### Learning Groups / Cohorts (Kooxaha Waxbarashada)
This feature enables cohort-based learning where parents can form small groups to complete courses together. Groups support text, audio recording (uploaded to R2 `group-audio/` folder), and image posts with likes and comments. Members can track each other's course progress via progress bars. The backend uses membership-based authorization to ensure only group members can access group content. Four default content-linked groups: Guruubka Koorsada 0-6 Bilood Jir (course), Guruubka Koorsada Ilmo Is-Dabira (course), Guruubka Dhambaalka Waalidka (dhambaal), Guruubka Sheekada Cawayska Caruurta (sheeko). The `contentType` (course/dhambaal/sheeko) and `contentId` columns link groups to specific content. Audio posts use the `/api/groups/:id/posts/audio` endpoint with multer + R2 storage. Group access links are embedded in CourseDetail.tsx, Dhambaal.tsx, and Maaweelo.tsx pages. Database tables: `learning_groups`, `group_members`, `group_posts`, `group_post_likes`, `group_post_comments`. Routes are registered in `server/learningGroups.ts`. Frontend page at `client/src/pages/LearningGroups.tsx` with route `/groups`.

**Private Messaging (DM) & Follow System within Groups**: Parents can click any member's name/avatar (in Posts or Members tab) to open a profile dialog showing followers/following counts, follow/unfollow button, and "Fariin dir" (Send message) button. The "Fariin" tab in GroupDashboard shows conversations with group members and allows direct messaging with WhatsApp-like chat bubbles, read receipts (✓/✓✓), and 5-second auto-refresh. The follow system uses the unified `parent_follows` table. DMs use the `direct_messages` table. Backend APIs: `/api/parents/:id/follow` (POST/DELETE), `/api/parents/:id/follow-status`, `/api/parents/:id/follow-counts`, `/api/messages/conversations`, `/api/messages/:partnerId` (GET/POST).

### Lesson Discussion Groups (Aan ka wada hadalo Casharkan)
Each lesson has an auto-created discussion group where parents can post text and user-recorded audio. No TTS is used; parents record their own voice. Audio uploads go to Cloudflare R2 (`dhambaal` bucket, `lesson-groups/` folder). Posts support emoji reactions (❤️, 👍, 😂, 🤲, 👏, 💡) with optimistic UI updates. Groups are auto-created on first access (no manual join needed). Threaded replies supported via `parent_post_id` column — users can reply to any top-level post with text and/or audio. Database tables: `lesson_groups`, `lesson_group_posts`, `lesson_group_post_reactions`. Backend routes in `server/lessonGroups.ts`. Frontend component at `client/src/components/LessonDiscussionGroup.tsx`, embedded in `LessonView.tsx` as a collapsible section.

### Dhambaalka Waalidka Discussion (Aan ka wada hadalo)
Each daily parenting blog post has a discussion section where authenticated parents can post text and user-recorded audio. Audio uploads go to Cloudflare R2 (`dhambaal` bucket, `dhambaal-discussions/` folder). Posts support emoji reactions (❤️, 👍, 😂, 🤲, 👏, 💡) with optimistic UI updates. No enrollment check required — only authentication. Threaded replies supported via `parent_post_id` column — users can reply to any top-level post with text and/or audio. Database tables: `dhambaal_discussion_posts`, `dhambaal_discussion_reactions`. Backend routes in `server/dhambaalDiscussion.ts`. Frontend component at `client/src/components/DhambaalDiscussionGroup.tsx`, embedded in `Dhambaal.tsx` within the selected message detail view. Dark theme styling matches the Dhambaal page aesthetic (slate/emerald colors).

### AI Caawiye (AI Assistant with Voice)
Two-mode AI assistant for Somali parents: (1) Homework Helper for children's schoolwork, (2) Tarbiyada & Waalidnimada (Parenting/Tarbiya advisor following Islam > Dhaqan > Cilmi priority). Both modes support text chat and Somali voice interface (Speech-to-Text via OpenAI Whisper, AI logic via GPT-4o-mini, Text-to-Speech via OpenAI TTS with calm elder tone). Cost controls: max 300 char text input, temperature 0.3, max 300 token output, max 60 sec voice input. Access is gated by a Trial + Gold Membership system:
- **Free**: No AI access until trial starts
- **Trial**: 14 days free, auto-starts on first AI use, max 20 requests/day across all modes
- **Gold**: $114/year via Stripe, unlimited AI access for a full year
When trial expires, AI gives polite Somali membership advice instead of real answers. Database columns: `ai_plan`, `ai_trial_started_at`, `ai_trial_ends_at`, `ai_gold_expires_at` on parents table. Backend: `server/ai/access-guard.ts` for trial/gold logic. Endpoints: `/api/ai/access-status`, `/api/ai/start-trial`, `/api/voice/ask`, `/api/ai/gold-checkout`, `/api/homework/ask`, `/api/tarbiya/ask`. Frontend: `AiCaawiye.tsx` (mode selector + trial/gold UI), `HomeworkHelper.tsx`, `TarbiyaHelper.tsx` (both with voice recording).

### Content Progress Tracking (Dhambaal & Sheeko)
Tracks which Dhambaalka Waalidka posts and Maaweelada Caruurta stories each parent has read/listened to. Auto-marks content as read when a parent opens it. Shows progress bars on both pages and a summary card on the Profile page. Awards milestone badges at 1, 7, 30, and 100 items for both content types. Database table: `content_progress` with unique index on (parent_id, content_type, content_id). Badge trigger types: `dhambaal_read` and `sheeko_read`. API routes: POST `/api/content-progress`, GET `/api/content-progress?type=dhambaal|sheeko`, GET `/api/content-progress/summary`.

### WordPress Integration
The platform integrates with the WordPress marketing website via a REST API. This allows for user lookup, access checking, recording purchases (including Flutterwave webhooks for subscriptions), and syncing course catalogs. It translates WordPress course slugs to internal database IDs for enrollment processing and distinguishes between all-access subscriptions and single-course enrollments.

## External Dependencies

-   **UI/UX**: React 18, Vite, Wouter, TanStack Query, Radix UI, shadcn/ui, Tailwind CSS, Lucide React
-   **Backend & Database**: Express.js, PostgreSQL (Neon serverless), Drizzle ORM, @neondatabase/serverless, express-session
-   **Authentication & Validation**: bcrypt, Zod, drizzle-zod
-   **Utilities**: canvas-confetti, class-variance-authority, clsx, tailwind-merge, nanoid, React Hook Form
-   **AI Services**: OpenAI GPT-4o (text generation), OpenAI DALL-E 3 (image generation)
-   **Live Communication**: LiveKit SFU
-   **Notifications**: nodemailer (for email), Telegram Bot API
-   **Cloud Storage**: Google Drive (for voice recordings)

## Scheduled Deployments

### Daily Content Generation (Dhambaal + Maaweelada)
- **Script**: `scheduled/dailyContent.ts`
- **Run Command**: `npx tsx scheduled/dailyContent.ts`
- **Schedule**: 5:00 AM UTC = 8:00 AM East Africa Time (daily)
- **Timezone**: Africa/Nairobi
- **Cron Expression**: `0 5 * * *`
- **Purpose**: Generates daily Dhambaalka Waalidka (parenting blog) and Maaweelada Caruurta (bedtime stories) content using OpenAI GPT-4o and gpt-image-1
- **Required Secrets**: DATABASE_URL, OPENAI_API_KEY
- **AI Integration**: Uses Replit AI Integrations (AI_INTEGRATIONS_OPENAI_API_KEY, AI_INTEGRATIONS_OPENAI_BASE_URL)
- **Image Model**: gpt-image-1 (2 images per content, ~4 min total generation time)
- **Monitoring**: Telegram notifications on success/failure (requires TELEGRAM_BOT_TOKEN, TELEGRAM_GROUP_CHAT_ID)

### Fly.io Deployment Notes
- **App Name**: `barbaarintasan-staging`
- **Region**: `sin` (Singapore), 2 machines
- **Dockerfile**: Multi-stage build (builder + production)
- **Important**: When frontend build or asset pipeline changes, use `fly deploy --no-cache` to avoid stale Docker layer cache serving old JS bundles
- **Health Check**: `/api/health` on port 8080
- **JS Asset Verification**: After deploy, verify JS serves with `Content-Type: application/javascript` (not `text/html` which indicates SPA fallback serving HTML instead of the actual JS file)
- **Known Issue (Fixed Feb 2026)**: Stale Docker build cache caused JS bundle filename mismatch — HTML referenced old `index-*.js` that didn't exist in new build, causing SPA fallback to serve HTML as JS