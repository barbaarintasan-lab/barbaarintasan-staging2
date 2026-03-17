# Barbaarintasan Academy - Somali Parenting Education Platform

## Overview
Barbaarintasan Academy is a web-based educational platform designed for Somali parents, offering structured courses on child development and parenting. The platform provides culturally relevant educational resources through video lessons, text content, interactive quizzes, and progress tracking. Its core mission is to empower Somali parents by making essential parenting knowledge accessible. The project aims to improve child-rearing practices within the Somali community by offering specialized topics like child intelligence and autism awareness, leveraging technology to deliver engaging and effective learning experiences.

## User Preferences
Preferred communication style: Simple, everyday language.

Islamic honorifics: When mentioning the Prophet Muhammad (scw/PBUH), always write the full Somali phrase "Nabadgalyo iyo Naxariisi korkiisa ha ahaatee" instead of abbreviations.

## System Architecture

### Core Platform
The platform uses React 18 with TypeScript and Vite for the frontend, incorporating `shadcn/ui` for components, Wouter for routing, and TanStack Query for server state management. Tailwind CSS is used for styling with a mobile-first, educational aesthetic. The backend is built with Express.js, Node.js, and TypeScript, featuring a RESTful API and cookie-based session management. Drizzle ORM handles type-safe database interactions with a Neon serverless PostgreSQL database. Authentication is session-based with bcrypt for password hashing and a simple role-based access control (`isAdmin` flag). Content management supports static assets, external video URLs, and interactive quizzes from static JSON data.

### Subscription & Payments
A subscription-based access model offers monthly and yearly plans with manual upgrade options. Access control is based on subscription status, including hourly expiration checks and reminder notifications. A custom manual payment workflow supports mobile money and bank transfers, requiring admin approval for course access.

### Learning & Engagement Features
The platform includes a Duolingo-style daily streak system for lesson completion, downloadable PDF certificates, and dynamic management of 14 homepage sections by admins.

### Weekly Drip-Release System
Courses "Koorsada Ilmo Is-Dabira" and "0-6 Bilood Jir" use a drip-release system: enrolled users get 2 lessons unlocked per week starting from their enrollment start date. Previously completed lessons remain accessible regardless of drip schedule. The system uses `dripEnabled` and `dripLessonsPerWeek` fields on the `courses` table, and `firstLessonAt` on the `enrollments` table. Users click "Bilow Koorsada" to start the drip clock. API endpoints: `GET /api/course/:courseId/drip-status` and `POST /api/enrollments/:id/start`.

### BSAv.1 Sheeko (Voice Spaces)
This feature provides Clubhouse/Twitter Spaces-like voice chat using LiveKit SFU for scalable audio and WebSockets for real-time events. Rooms can be scheduled, live, or ended, supporting roles like Listener, Speaker, Co-host, and Host. Features include hand-raising, one-tap session recording (to Google Drive), and moderation tools. AI content moderation via OpenAI flags harmful chat messages, with culturally sensitive analysis and admin review.

### Maaweelada Caruurta (Children's Bedtime Stories)
This section offers AI-generated Islamic bedtime stories in Somali for children aged 6 months to 13 years, featuring Sahaba and Tabi'iyiin. Stories are generated daily using dual AI engines: **Gemini 2.5 Flash** (primary) with **GPT-4o** fallback for text, and **Gemini Image** (primary) with **gpt-image-1** fallback for illustrations. Audio uses **Gemini TTS (Zephyr voice)** as primary with **Azure TTS (so-SO-UbaxNeural)** fallback. The UI features a cinematic dark theme (`#1a1a1a` background, `#FFD93D` accent, glass morphism cards), fullscreen hero images (50-65vh), favorites system (localStorage), animated stars background, and progress tracking with badges. Requires `GEMINI_API_KEY` env var for Gemini features (falls back to OpenAI/Azure when not set). Package: `@google/genai`.

### Dhambaalka Waalidka (Daily Parenting Blog)
This feature provides AI-generated daily parenting blog articles in Somali for parents of children aged 0-7, combining modern parenting science with Islamic values. Articles are generated using OpenAI GPT-4o for text and gpt-image-1 for images. Admins can manually enter content and generate audio/images via Azure TTS.

### Learning Groups / Cohorts (Kooxaha Waxbarashada)
This feature enables cohort-based learning where parents can form groups to complete courses. Groups support text, audio, and image posts with likes and comments. Members can track each other's course progress. Private messaging and a follow system are integrated within groups.

### Discussion Groups
- **Lesson Discussion Groups (Aan ka wada hadalo Casharkan)**: Each lesson has an auto-created discussion group for text and user-recorded audio posts with emoji reactions and threaded replies.
- **Dhambaalka Waalidka Discussion (Aan ka wada hadalo)**: Each daily parenting blog post has a discussion section for text and user-recorded audio posts with emoji reactions and threaded replies.

### Quraanka Caruurta (Children's Quran)
Children can have sub-accounts under their parent. Parents manage child profiles (create, edit, delete) from the Profile page via the ChildrenManager component. Each child has a name, age, username, password, and avatar color. Children log in at `/child-login` with a dark, kid-friendly UI (animated stars, moon icon). Auth uses separate session fields (`childId`). Database tables: `children`, `child_sessions`, `child_progress`, `quran_lesson_progress`. API: CRUD at `/api/children`, auth at `/api/auth/child/*`.

**Quran Lesson System**: Ayah-by-ayah learning through progressive Juz Amma curriculum (38 surahs in 5 phases). Children listen to real Sheikh recitations from EveryAyah.com CDN (two reciters: Al-Husary Muallim for teaching, Abdul Basit Mujawwad for tajweed — child selects preference, persisted in localStorage). Listen-first flow enforced: child must hear the Sheikh before recording. After recording, AI-powered correction feedback in Somali (Whisper STT + GPT-4o comparison). Score >=70% marks ayah complete; >=85% awards bonus game token. Replay button allows re-listening. Next-ayah preloading for instant UX. Audio failure fallback shows retry/skip options. **Progressive 5-Phase Curriculum**: Phase 1 (Ultra Beginner: Al-Faatiha, An-Naas, Al-Falaq, Al-Ikhlaas), Phase 2 (Beginner Expansion: Al-Masad through Quraish), Phase 3 (Intermediate: Al-Fiil through Al-Qaari'a), Phase 4 (Moving Up: Al-Aadiyaat through Al-Alaq), Phase 5 (Advanced: At-Tiin through An-Naba). Curriculum module: `server/quranLessons.ts`. Routes: `GET /api/quran/curriculum`, `GET /api/quran/reciters`, `GET /api/quran/surah/:n/progress`, `POST /api/quran/recite` (returns EveryAyah URL), `POST /api/quran/check`. UI: `/child-dashboard` (3-tab with phase-grouped surahs), `/quran-lesson/:surahNumber` (lesson page with 60-min session timer, Sheikh picker, step indicators). Amiri font for Arabic text rendering.

**Quran Games & Rewards (Ciyaaraha & Abaalmarino)**: Three mini-games unlocked after completing surahs: Word Puzzle (🧩 `QuranWordPuzzle.tsx` - arrange ayah words with hint system costing 1 point), Memory Match (🃏 `QuranMemoryMatch.tsx` - progressive difficulty: 4/8/12 cards), Surah Quiz (⚡ `QuranSurahQuiz.tsx` - timed ayah-identification with streak combo x2/x3). Token economy: 1 completed surah = 1 game token, ≥85% accuracy = bonus token, max 5 tokens. Daily limits: 3 games/day, 45 min per game session. Streak multiplier: 3 consecutive days = x1.2 coins, 7 days = x2.0 coins. DB tables: `child_game_scores`, `child_badges`. API: `GET /api/quran/rewards`, `GET /api/quran/games/available`, `GET /api/quran/games/data/:gameType/:surahNumber`, `POST /api/quran/games/score`, `GET /api/quran/badges`, `GET /api/quran/leaderboard` (family-only with streak/weekly stats). Dashboard shows streak, weekly progress, daily game counter, and family leaderboard with personal best streak.

### AI Caawiye (AI Assistant with Voice)
A two-mode AI assistant for Somali parents: Homework Helper and Tarbiyada & Waalidnimada (Parenting/Tarbiya advisor). Both modes support text chat and a Somali voice interface (OpenAI Whisper for STT, GPT-4o-mini for AI, OpenAI TTS for text-to-speech). Access is gated by a Trial + Gold Membership system.

### Content Progress Tracking
The platform tracks read/listened content for Dhambaalka Waalidka posts and Maaweelada Caruurta stories, showing progress bars and awarding milestone badges.

### Google Meet Events (Kulannada Tooska ah)
Admins can schedule and manage live Google Meet sessions. Events display on the homepage with smart join logic, "Add to Calendar" functionality, and admin CRUD capabilities.

### WordPress Integration
-   **Plugin**: `barbaarintasan-sync.php` (WordPress side)
-   **Endpoint**: `/api/wordpress/purchase` (App side)
-   **Logic**: Syncs WooCommerce order status 'completed' to enroll users in courses automatically.
-   **Auth**: Secure API key check (`WORDPRESS_API_KEY`).

## External Dependencies

-   **Frontend Libraries**: React 18, Vite, Wouter, TanStack Query, Radix UI, shadcn/ui, Tailwind CSS, Lucide React
-   **Backend & Database**: Express.js, PostgreSQL (Neon serverless), Drizzle ORM, @neondatabase/serverless, express-session
-   **Authentication & Validation**: bcrypt, Zod, drizzle-zod
-   **AI Services**: OpenAI GPT-4o (text), OpenAI DALL-E 3 / gpt-image-1 (image), OpenAI Whisper (STT), OpenAI TTS (TTS)
-   **Live Communication**: LiveKit SFU
-   **Cloud Storage**: Google Drive (recordings), Cloudflare R2 (audio uploads)
-   **Notifications**: nodemailer (email), Telegram Bot API
-   **Payment Gateways**: Stripe (for Gold membership), Flutterwave (via WordPress integration)
-   **External APIs**: Google Calendar, Google Meet
-   **TTS**: Azure TTS