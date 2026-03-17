import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, Download, Trash2, Wifi, WifiOff, HardDrive, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useOfflineDownloads, formatBytes } from "@/hooks/useOfflineDownloads";
import { useOffline } from "@/contexts/OfflineContext";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { toast } from "sonner";

export default function Downloads() {
  const { t, i18n } = useTranslation();
  const isSomali = i18n.language === "so";
  const { isOnline } = useOffline();
  const {
    offlineCourses,
    offlineLessons,
    downloadQueue,
    isDownloading,
    storageUsed,
    storageQuota,
    deleteDownloadedCourse,
    deleteDownloadedLesson,
    refreshOfflineData
  } = useOfflineDownloads();

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteCourse = async (courseId: string, courseName: string) => {
    if (confirm(isSomali ? `Ma hubtaa inaad tirtirto "${courseName}" casharradiisa la keydiyey?` : `Are you sure you want to delete downloaded content for "${courseName}"?`)) {
      setDeletingId(courseId);
      try {
        await deleteDownloadedCourse(courseId);
        toast.success(isSomali ? "Casharrada la keydiyey waa la tirtiray" : "Downloaded content deleted");
      } catch (error) {
        toast.error(isSomali ? "Waa la waayay in la tirtiro" : "Failed to delete");
      } finally {
        setDeletingId(null);
      }
    }
  };

  const storagePercentage = storageQuota > 0 ? (storageUsed / storageQuota) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-8">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/profile">
            <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-back">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">
              {isSomali ? "Casharrada La Keydiyey" : "Downloaded Content"}
            </h1>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {isOnline ? (isSomali ? "Online" : "Online") : (isSomali ? "Offline" : "Offline")}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Storage Usage */}
        <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <HardDrive className="w-6 h-6" />
              <span className="font-semibold text-lg">
                {isSomali ? "Kaydka Isticmaalka" : "Storage Usage"}
              </span>
            </div>
            <Progress value={storagePercentage} className="h-3 mb-3 bg-white/30" />
            <div className="flex justify-between text-sm text-white/90">
              <span>{formatBytes(storageUsed)} {isSomali ? "la isticmaalay" : "used"}</span>
              <span>{formatBytes(storageQuota)} {isSomali ? "guud ahaan" : "total"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Offline Mode Info */}
        {!isOnline && (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <WifiOff className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800">
                    {isSomali ? "Adigoo Offline ah" : "You're Offline"}
                  </p>
                  <p className="text-sm text-amber-600">
                    {isSomali 
                      ? "Casharrada hoose ayaad arki kartaa adigoo aan internet lahayn" 
                      : "You can view the downloaded lessons below without internet"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Downloaded Courses */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Download className="w-5 h-5 text-indigo-600" />
            {isSomali ? "Koorsooyin La Keydiyey" : "Downloaded Courses"}
            {offlineCourses.length > 0 && (
              <span className="text-sm font-normal text-gray-500">({offlineCourses.length})</span>
            )}
          </h2>

          {offlineCourses.length === 0 ? (
            <Card className="bg-white">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Download className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  {isSomali ? "Wax la keydiyey ma jiraan" : "No Downloaded Content"}
                </h3>
                <p className="text-gray-500 text-sm mb-4">
                  {isSomali 
                    ? "Casharrada koorsada ka soo degso si aad offline u daawato" 
                    : "Download course lessons to watch offline"}
                </p>
                <Link href="/courses">
                  <Button className="bg-indigo-600 hover:bg-indigo-700">
                    {isSomali ? "Koorsooyin Fiiri" : "Browse Courses"}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {offlineCourses.map(course => {
                const courseLessons = offlineLessons.filter(l => l.courseId === course.id);
                const isDeleting = deletingId === course.id;
                const downloadingLessons = downloadQueue.filter(q => q.courseId === course.id);
                
                return (
                  <Card key={course.id} className="bg-white overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 mb-1 truncate">
                            {course.name}
                          </h3>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              {course.status === 'complete' ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-amber-500" />
                              )}
                              {course.downloadedLessons}/{course.totalLessons} {isSomali ? "cashar" : "lessons"}
                            </span>
                            <span>•</span>
                            <span>{formatBytes(course.totalSize)}</span>
                          </div>
                          
                          {/* Download progress */}
                          {downloadingLessons.length > 0 && (
                            <div className="mt-3">
                              <div className="flex items-center gap-2 text-sm text-indigo-600 mb-1">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {isSomali ? "Waa la soo dejinayaa..." : "Downloading..."}
                              </div>
                              <Progress 
                                value={(downloadingLessons.filter(d => d.status === 'complete').length / downloadingLessons.length) * 100} 
                                className="h-2"
                              />
                            </div>
                          )}
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCourse(course.id, course.name)}
                          disabled={isDeleting}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          data-testid={`button-delete-course-${course.id}`}
                        >
                          {isDeleting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Trash2 className="w-5 h-5" />
                          )}
                        </Button>
                      </div>

                      {/* Lesson list */}
                      {courseLessons.length > 0 && (
                        <div className="mt-4 border-t pt-4 space-y-2">
                          {courseLessons.map(lesson => (
                            <Link key={lesson.id} href={`/lesson/${lesson.id}`}>
                              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    lesson.status === 'complete' ? 'bg-green-100' : 'bg-amber-100'
                                  }`}>
                                    {lesson.status === 'complete' ? (
                                      <CheckCircle className="w-4 h-4 text-green-600" />
                                    ) : (
                                      <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{lesson.lessonTitle}</p>
                                    <p className="text-xs text-gray-500">{formatBytes(lesson.size)}</p>
                                  </div>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Tips */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <h3 className="font-semibold text-blue-800 mb-2">
              {isSomali ? "Talooyin" : "Tips"}
            </h3>
            <ul className="text-sm text-blue-700 space-y-1.5">
              <li>• {isSomali ? "Ka soo degso casharrada markii aad internet ku jirto" : "Download lessons when you have internet"}</li>
              <li>• {isSomali ? "Casharrada la keydiyey waxaad arki kartaa markasta" : "Downloaded lessons are available anytime"}</li>
              <li>• {isSomali ? "Ka tirtir casharrada kuu loogu baahnayn si aad meel u bannaaysato" : "Delete unused content to free up space"}</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
