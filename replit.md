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

### BSAv.1 Sheeko (Voice Spaces)
This feature provides Clubhouse/Twitter Spaces-like voice chat using LiveKit SFU for scalable audio and WebSockets for real-time events. Rooms can be scheduled, live, or ended, supporting roles like Listener, Speaker, Co-host, and Host. Features include hand-raising, one-tap session recording (to Google Drive), and moderation tools. AI content moderation via OpenAI flags harmful chat messages, with culturally sensitive analysis and admin review.

### Maaweelada Caruurta (Children's Bedtime Stories)
This section offers AI-generated Islamic bedtime stories in Somali for children aged 3-8, featuring Sahaba and Tabi'iyiin. Stories are generated daily using OpenAI GPT-4o for text and gpt-image-1 for images. Audio is generated using Azure TTS.

### Dhambaalka Waalidka (Daily Parenting Blog)
This feature provides AI-generated daily parenting blog articles in Somali for parents of children aged 0-7, combining modern parenting science with Islamic values. Articles are generated using OpenAI GPT-4o for text and gpt-image-1 for images. Admins can manually enter content and generate audio/images via Azure TTS.

### Learning Groups / Cohorts (Kooxaha Waxbarashada)
This feature enables cohort-based learning where parents can form groups to complete courses. Groups support text, audio, and image posts with likes and comments. Members can track each other's course progress. Private messaging and a follow system are integrated within groups.

### Discussion Groups
- **Lesson Discussion Groups (Aan ka wada hadalo Casharkan)**: Each lesson has an auto-created discussion group for text and user-recorded audio posts with emoji reactions and threaded replies.
- **Dhambaalka Waalidka Discussion (Aan ka wada hadalo)**: Each daily parenting blog post has a discussion section for text and user-recorded audio posts with emoji reactions and threaded replies.

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

### Mobile App Platform (PWA + Android TWA)
The app is **not** built with Flutter or React Native. It is a **React + TypeScript PWA (Progressive Web App)** that runs on all platforms from a single codebase:
- **Android**: Packaged as a Trusted Web Activity (TWA) using Bubblewrap CLI (`com.barbaarintasan.academy`), distributed via Google Play Store. Configuration is in `twa-manifest.json`. Digital Asset Links are served at `/.well-known/assetlinks.json`.
- **iOS**: Installed via Safari "Add to Home Screen" (PWA install).
- **Web**: Works on all modern browsers.

This approach keeps a single React codebase while allowing native-like installation on Android (Play Store) and iOS. See `docs/MOBILE_APP.md` for full details.

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