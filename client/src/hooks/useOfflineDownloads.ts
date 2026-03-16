import { useState, useEffect, useCallback } from 'react';
import {
  OfflineLesson,
  OfflineCourse,
  saveOfflineLesson,
  getOfflineLesson,
  getAllOfflineLessons,
  deleteOfflineLesson,
  saveOfflineCourse,
  getOfflineCourse,
  getAllOfflineCourses,
  deleteOfflineCourse,
  getOfflineLessonsByCourse,
  cacheAsset,
  getStorageUsage,
  formatBytes
} from '@/lib/offlineStorage';

interface DownloadProgress {
  lessonId: string;
  courseId: string;
  progress: number;
  status: 'pending' | 'downloading' | 'complete' | 'error';
}

interface UseOfflineDownloadsReturn {
  offlineCourses: OfflineCourse[];
  offlineLessons: OfflineLesson[];
  downloadQueue: DownloadProgress[];
  isDownloading: boolean;
  storageUsed: number;
  storageQuota: number;
  downloadLesson: (lesson: any, course: any) => Promise<void>;
  downloadCourse: (course: any, lessons: any[]) => Promise<void>;
  deleteDownloadedLesson: (lessonId: string) => Promise<void>;
  deleteDownloadedCourse: (courseId: string) => Promise<void>;
  isLessonDownloaded: (lessonId: string) => boolean;
  isCourseDownloaded: (courseId: string) => boolean;
  getLessonDownloadStatus: (lessonId: string) => 'none' | 'downloading' | 'complete' | 'error';
  getCourseDownloadProgress: (courseId: string) => number;
  refreshOfflineData: () => Promise<void>;
}

export function useOfflineDownloads(): UseOfflineDownloadsReturn {
  const [offlineCourses, setOfflineCourses] = useState<OfflineCourse[]>([]);
  const [offlineLessons, setOfflineLessons] = useState<OfflineLesson[]>([]);
  const [downloadQueue, setDownloadQueue] = useState<DownloadProgress[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [storageUsed, setStorageUsed] = useState(0);
  const [storageQuota, setStorageQuota] = useState(0);

  const refreshOfflineData = useCallback(async () => {
    try {
      const [courses, lessons, storage] = await Promise.all([
        getAllOfflineCourses(),
        getAllOfflineLessons(),
        getStorageUsage()
      ]);
      setOfflineCourses(courses);
      setOfflineLessons(lessons);
      setStorageUsed(storage.used);
      setStorageQuota(storage.quota);
    } catch (error) {
      console.error('Failed to refresh offline data:', error);
    }
  }, []);

  useEffect(() => {
    refreshOfflineData();
  }, [refreshOfflineData]);

  const downloadLesson = useCallback(async (lesson: any, course: any) => {
    const lessonId = lesson.id;
    const courseId = course.id;

    setDownloadQueue(prev => [...prev, {
      lessonId,
      courseId,
      progress: 0,
      status: 'downloading'
    }]);
    setIsDownloading(true);

    try {
      let size = 0;
      
      if (lesson.videoUrl) {
        size = await cacheAsset(lesson.videoUrl, courseId);
      }
      
      if (lesson.textContent) {
        size += new Blob([lesson.textContent]).size;
      }

      const offlineLesson: OfflineLesson = {
        id: lessonId,
        courseId,
        courseName: course.name || course.title,
        lessonTitle: lesson.title,
        lessonOrder: lesson.order || 0,
        contentType: lesson.videoUrl ? 'video' : 'text',
        videoUrl: lesson.videoUrl,
        textContent: lesson.textContent,
        downloadedAt: new Date(),
        size,
        status: 'complete',
        progress: 100
      };

      await saveOfflineLesson(offlineLesson);

      setDownloadQueue(prev => prev.map(item => 
        item.lessonId === lessonId 
          ? { ...item, progress: 100, status: 'complete' }
          : item
      ));

      const courseLessons = await getOfflineLessonsByCourse(courseId);
      const existingCourse = await getOfflineCourse(courseId);
      
      const offlineCourseData: OfflineCourse = {
        id: courseId,
        name: course.name || course.title,
        description: course.description,
        thumbnailUrl: course.thumbnailUrl,
        totalLessons: existingCourse?.totalLessons || 1,
        downloadedLessons: courseLessons.filter(l => l.status === 'complete').length,
        totalSize: courseLessons.reduce((acc, l) => acc + l.size, 0),
        downloadedAt: new Date(),
        status: courseLessons.length >= (existingCourse?.totalLessons || 1) ? 'complete' : 'partial'
      };

      await saveOfflineCourse(offlineCourseData);
      await refreshOfflineData();

    } catch (error) {
      console.error('Failed to download lesson:', error);
      setDownloadQueue(prev => prev.map(item => 
        item.lessonId === lessonId 
          ? { ...item, status: 'error' }
          : item
      ));
    } finally {
      setTimeout(() => {
        setDownloadQueue(prev => prev.filter(item => item.lessonId !== lessonId));
        setIsDownloading(prev => downloadQueue.length > 1);
      }, 2000);
    }
  }, [downloadQueue.length, refreshOfflineData]);

  const downloadCourse = useCallback(async (course: any, lessons: any[]) => {
    const courseId = course.id;
    
    const offlineCourseData: OfflineCourse = {
      id: courseId,
      name: course.name || course.title,
      description: course.description,
      thumbnailUrl: course.thumbnailUrl,
      totalLessons: lessons.length,
      downloadedLessons: 0,
      totalSize: 0,
      downloadedAt: new Date(),
      status: 'partial'
    };
    await saveOfflineCourse(offlineCourseData);

    for (const lesson of lessons) {
      await downloadLesson(lesson, course);
    }

    const updatedLessons = await getOfflineLessonsByCourse(courseId);
    offlineCourseData.downloadedLessons = updatedLessons.filter(l => l.status === 'complete').length;
    offlineCourseData.totalSize = updatedLessons.reduce((acc, l) => acc + l.size, 0);
    offlineCourseData.status = offlineCourseData.downloadedLessons >= lessons.length ? 'complete' : 'partial';
    
    await saveOfflineCourse(offlineCourseData);
    await refreshOfflineData();
  }, [downloadLesson, refreshOfflineData]);

  const deleteDownloadedLesson = useCallback(async (lessonId: string) => {
    try {
      const lesson = await getOfflineLesson(lessonId);
      if (lesson) {
        await deleteOfflineLesson(lessonId);
        
        const courseLessons = await getOfflineLessonsByCourse(lesson.courseId);
        if (courseLessons.length === 0) {
          await deleteOfflineCourse(lesson.courseId);
        } else {
          const course = await getOfflineCourse(lesson.courseId);
          if (course) {
            course.downloadedLessons = courseLessons.length;
            course.totalSize = courseLessons.reduce((acc, l) => acc + l.size, 0);
            course.status = 'partial';
            await saveOfflineCourse(course);
          }
        }
      }
      await refreshOfflineData();
    } catch (error) {
      console.error('Failed to delete lesson:', error);
    }
  }, [refreshOfflineData]);

  const deleteDownloadedCourse = useCallback(async (courseId: string) => {
    try {
      await deleteOfflineCourse(courseId);
      await refreshOfflineData();
    } catch (error) {
      console.error('Failed to delete course:', error);
    }
  }, [refreshOfflineData]);

  const isLessonDownloaded = useCallback((lessonId: string): boolean => {
    return offlineLessons.some(l => l.id === lessonId && l.status === 'complete');
  }, [offlineLessons]);

  const isCourseDownloaded = useCallback((courseId: string): boolean => {
    return offlineCourses.some(c => c.id === courseId && c.status === 'complete');
  }, [offlineCourses]);

  const getLessonDownloadStatus = useCallback((lessonId: string): 'none' | 'downloading' | 'complete' | 'error' => {
    const inQueue = downloadQueue.find(q => q.lessonId === lessonId);
    if (inQueue) {
      return inQueue.status === 'downloading' ? 'downloading' : 
             inQueue.status === 'complete' ? 'complete' : 
             inQueue.status === 'error' ? 'error' : 'none';
    }
    
    const offline = offlineLessons.find(l => l.id === lessonId);
    if (offline) {
      return offline.status === 'complete' ? 'complete' : 
             offline.status === 'error' ? 'error' : 'none';
    }
    
    return 'none';
  }, [downloadQueue, offlineLessons]);

  const getCourseDownloadProgress = useCallback((courseId: string): number => {
    const course = offlineCourses.find(c => c.id === courseId);
    if (!course) return 0;
    
    const downloading = downloadQueue.filter(q => q.courseId === courseId);
    if (downloading.length > 0) {
      const avgProgress = downloading.reduce((acc, d) => acc + d.progress, 0) / downloading.length;
      return (course.downloadedLessons / course.totalLessons) * 100 + 
             (avgProgress / course.totalLessons);
    }
    
    return (course.downloadedLessons / course.totalLessons) * 100;
  }, [downloadQueue, offlineCourses]);

  return {
    offlineCourses,
    offlineLessons,
    downloadQueue,
    isDownloading,
    storageUsed,
    storageQuota,
    downloadLesson,
    downloadCourse,
    deleteDownloadedLesson,
    deleteDownloadedCourse,
    isLessonDownloaded,
    isCourseDownloaded,
    getLessonDownloadStatus,
    getCourseDownloadProgress,
    refreshOfflineData
  };
}

export { formatBytes };
