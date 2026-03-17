// Admin component type definitions

export interface FlashcardCategory {
  id: string;
  name: string;
  nameEnglish: string | null;
  iconEmoji: string | null;
  description: string | null;
  order: number;
  createdAt: string;
}

export interface Flashcard {
  id: string;
  categoryId: string;
  nameSomali: string;
  nameEnglish: string | null;
  imageUrl: string;
  order: number;
  createdAt: string;
}

export interface Parent {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  isAdmin: boolean;
  isHost: boolean;
  country: string | null;
  createdAt: string;
}

export interface Course {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  order: number;
  priceOneTime: number | null;
  priceMonthly: number | null;
  priceYearly: number | null;
  durationWeeks: number | null;
  isPublished: boolean;
  createdAt: string;
}

export interface Lesson {
  id: string;
  courseId: string;
  moduleId: string | null;
  title: string;
  description: string | null;
  videoUrl: string | null;
  textContent: string | null;
  lessonType: "video" | "text" | "quiz" | "assignment" | "live" | "sawirro" | "audio";
  order: number;
  duration: number | null;
  unlockType: "immediate" | "date" | "days_after_enrollment" | "days_after_previous";
  unlockDate: string | null;
  unlockDaysAfter: number | null;
  videoWatchRequired: boolean;
  isPublished: boolean;
  createdAt: string;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  order: number;
  createdAt: string;
}

export interface Hadith {
  id: string;
  number: number;
  arabicText: string;
  somaliText: string;
  source: string | null;
  narrator: string | null;
  topic: string | null;
  bookName: string | null;
  createdAt: string;
}

export interface Reciter {
  id: string;
  name: string;
  nameSomali: string | null;
  audioBaseUrl: string;
  imageUrl: string | null;
  order: number;
  createdAt: string;
}

export interface ParentMessage {
  id: string;
  title: string;
  content: string;
  category: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
}

export interface BedtimeStory {
  id: string;
  title: string;
  content: string;
  audioUrl: string | null;
  imageUrl: string | null;
  ageRange: string | null;
  duration: number | null;
  isPublished: boolean;
  createdAt: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface OpenEndedQuestion {
  question: string;
  hint?: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  webViewLink: string;
  thumbnailLink: string | null;
  createdTime: string;
}

export interface LessonImage {
  id: string;
  lessonId: string;
  imageUrl: string;
  prompt: string | null;
  caption: string | null;
  order: number;
  createdAt: string;
}
