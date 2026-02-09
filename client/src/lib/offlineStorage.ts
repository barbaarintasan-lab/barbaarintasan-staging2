const DB_NAME = 'barbaarintasan-offline';
const DB_VERSION = 1;

export interface OfflineLesson {
  id: string;
  courseId: string;
  courseName: string;
  lessonTitle: string;
  lessonOrder: number;
  contentType: 'video' | 'text';
  videoUrl?: string;
  textContent?: string;
  downloadedAt: Date;
  size: number;
  status: 'downloading' | 'complete' | 'error';
  progress: number;
}

export interface OfflineCourse {
  id: string;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  totalLessons: number;
  downloadedLessons: number;
  totalSize: number;
  downloadedAt: Date;
  status: 'partial' | 'complete';
}

export interface OfflineProgress {
  lessonId: string;
  progress: number;
  completed: boolean;
  timestamp: Date;
  synced: boolean;
}

let db: IDBDatabase | null = null;

export async function initOfflineDB(): Promise<IDBDatabase> {
  if (db) return db;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      
      if (!database.objectStoreNames.contains('lessons')) {
        const lessonsStore = database.createObjectStore('lessons', { keyPath: 'id' });
        lessonsStore.createIndex('courseId', 'courseId', { unique: false });
        lessonsStore.createIndex('status', 'status', { unique: false });
      }
      
      if (!database.objectStoreNames.contains('courses')) {
        database.createObjectStore('courses', { keyPath: 'id' });
      }
      
      if (!database.objectStoreNames.contains('progress')) {
        const progressStore = database.createObjectStore('progress', { keyPath: 'lessonId' });
        progressStore.createIndex('synced', 'synced', { unique: false });
      }
      
      if (!database.objectStoreNames.contains('assets')) {
        database.createObjectStore('assets', { keyPath: 'url' });
      }
    };
  });
}

export async function saveOfflineLesson(lesson: OfflineLesson): Promise<void> {
  const database = await initOfflineDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['lessons'], 'readwrite');
    const store = transaction.objectStore('lessons');
    const request = store.put(lesson);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getOfflineLesson(lessonId: string): Promise<OfflineLesson | null> {
  const database = await initOfflineDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['lessons'], 'readonly');
    const store = transaction.objectStore('lessons');
    const request = store.get(lessonId);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

export async function getOfflineLessonsByCourse(courseId: string): Promise<OfflineLesson[]> {
  const database = await initOfflineDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['lessons'], 'readonly');
    const store = transaction.objectStore('lessons');
    const index = store.index('courseId');
    const request = index.getAll(courseId);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

export async function getAllOfflineLessons(): Promise<OfflineLesson[]> {
  const database = await initOfflineDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['lessons'], 'readonly');
    const store = transaction.objectStore('lessons');
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

export async function deleteOfflineLesson(lessonId: string): Promise<void> {
  const database = await initOfflineDB();
  
  if ('caches' in window) {
    const cache = await caches.open('offline-lessons');
    const keys = await cache.keys();
    for (const key of keys) {
      if (key.url.includes(lessonId)) {
        await cache.delete(key);
      }
    }
  }
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['lessons'], 'readwrite');
    const store = transaction.objectStore('lessons');
    const request = store.delete(lessonId);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function saveOfflineCourse(course: OfflineCourse): Promise<void> {
  const database = await initOfflineDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['courses'], 'readwrite');
    const store = transaction.objectStore('courses');
    const request = store.put(course);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getOfflineCourse(courseId: string): Promise<OfflineCourse | null> {
  const database = await initOfflineDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['courses'], 'readonly');
    const store = transaction.objectStore('courses');
    const request = store.get(courseId);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

export async function getAllOfflineCourses(): Promise<OfflineCourse[]> {
  const database = await initOfflineDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['courses'], 'readonly');
    const store = transaction.objectStore('courses');
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

export async function deleteOfflineCourse(courseId: string): Promise<void> {
  const database = await initOfflineDB();
  
  const lessons = await getOfflineLessonsByCourse(courseId);
  for (const lesson of lessons) {
    await deleteOfflineLesson(lesson.id);
  }
  
  if ('caches' in window) {
    await caches.delete(`offline-course-${courseId}`);
  }
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['courses'], 'readwrite');
    const store = transaction.objectStore('courses');
    const request = store.delete(courseId);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function saveProgress(progress: OfflineProgress): Promise<void> {
  const database = await initOfflineDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['progress'], 'readwrite');
    const store = transaction.objectStore('progress');
    const request = store.put(progress);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getUnsyncedProgress(): Promise<OfflineProgress[]> {
  const database = await initOfflineDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['progress'], 'readonly');
    const store = transaction.objectStore('progress');
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const allProgress = request.result || [];
      resolve(allProgress.filter((p: OfflineProgress) => !p.synced));
    };
  });
}

export async function markProgressSynced(lessonId: string): Promise<void> {
  const database = await initOfflineDB();
  
  return new Promise(async (resolve, reject) => {
    const progress = await new Promise<OfflineProgress | null>((res, rej) => {
      const tx = database.transaction(['progress'], 'readonly');
      const store = tx.objectStore('progress');
      const req = store.get(lessonId);
      req.onerror = () => rej(req.error);
      req.onsuccess = () => res(req.result || null);
    });
    
    if (progress) {
      progress.synced = true;
      const transaction = database.transaction(['progress'], 'readwrite');
      const store = transaction.objectStore('progress');
      const request = store.put(progress);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    } else {
      resolve();
    }
  });
}

export async function getStorageUsage(): Promise<{ used: number; quota: number }> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      used: estimate.usage || 0,
      quota: estimate.quota || 0
    };
  }
  return { used: 0, quota: 0 };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export async function cacheAsset(url: string, courseId: string): Promise<number> {
  if (!('caches' in window)) return 0;
  
  try {
    const cache = await caches.open(`offline-course-${courseId}`);
    const response = await fetch(url, { mode: 'cors' });
    
    if (!response.ok) throw new Error('Failed to fetch asset');
    
    const blob = await response.blob();
    const size = blob.size;
    
    await cache.put(url, new Response(blob, {
      headers: response.headers
    }));
    
    return size;
  } catch (error) {
    console.error('Failed to cache asset:', error);
    return 0;
  }
}

export async function getCachedAsset(url: string, courseId: string): Promise<Response | null> {
  if (!('caches' in window)) return null;
  
  try {
    const cache = await caches.open(`offline-course-${courseId}`);
    return await cache.match(url) || null;
  } catch {
    return null;
  }
}
