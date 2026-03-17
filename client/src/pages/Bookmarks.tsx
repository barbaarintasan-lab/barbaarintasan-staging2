import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookmarkCheck, ChevronLeft, Play, Trash2, FileText } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface BookmarkWithLesson {
  id: string;
  lessonId: string;
  createdAt: string;
  lesson: {
    id: string;
    title: string;
    description: string | null;
    videoUrl: string | null;
    courseId: string;
    duration: string | null;
  };
  course: {
    id: string;
    title: string;
    imageUrl: string | null;
  } | null;
}

export default function Bookmarks() {
  const queryClient = useQueryClient();

  const { data: bookmarks = [], isLoading } = useQuery<BookmarkWithLesson[]>({
    queryKey: ["bookmarks"],
    queryFn: async () => {
      const res = await fetch("/api/parent/bookmarks", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch bookmarks");
      return res.json();
    },
  });

  const removeBookmark = useMutation({
    mutationFn: async (lessonId: string) => {
      const res = await fetch(`/api/parent/bookmarks/${lessonId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove bookmark");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      toast.success("Casharkan waa laga saaray keydka");
    },
    onError: () => {
      toast.error("Wax khalad ah ayaa dhacay");
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white font-body pb-24">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/profile">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-orange-50" data-testid="button-back">
              <ChevronLeft className="w-5 h-5 text-orange-600" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <BookmarkCheck className="w-6 h-6 text-orange-500" />
            <h1 className="text-xl font-bold text-gray-900 font-display">Casharradayda La Keydiyay</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : bookmarks.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-200">
            <CardContent className="p-8 text-center">
              <BookmarkCheck className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-bold text-gray-700 mb-2">Wali cashar lama keydin</h3>
              <p className="text-gray-500 mb-6">
                Casharrada aad jeceshahay ku kaydi si aad degdeg ugu heli karto.
              </p>
              <Link href="/courses">
                <Button className="bg-orange-500 hover:bg-orange-600" data-testid="button-browse-courses">
                  Koorsooyin Fiiiri
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 mb-4">
              {bookmarks.length} cashar ayaad la keydisay
            </p>
            
            {bookmarks.map((bookmark) => (
              <Card key={bookmark.id} className="overflow-hidden hover:shadow-md transition-shadow" data-testid={`bookmark-card-${bookmark.id}`}>
                <CardContent className="p-0">
                  <div className="flex items-center gap-4">
                    {bookmark.course?.imageUrl && (
                      <div className="w-24 h-20 flex-shrink-0">
                        <img
                          src={bookmark.course.imageUrl}
                          alt={bookmark.course.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 py-3 pr-2">
                      <p className="text-xs text-orange-600 font-medium mb-1">
                        {bookmark.course?.title || "Koorso"}
                      </p>
                      <h3 className="font-bold text-gray-900 line-clamp-1 mb-1">
                        {bookmark.lesson.title}
                      </h3>
                      {bookmark.lesson.duration && (
                        <p className="text-xs text-gray-500">
                          {bookmark.lesson.duration}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 pr-3">
                      <Link href={`/lesson/${bookmark.lessonId}`}>
                        <Button 
                          size="sm" 
                          className="bg-orange-500 hover:bg-orange-600 rounded-full"
                          data-testid={`button-view-lesson-${bookmark.id}`}
                        >
                          {bookmark.lesson.videoUrl ? (
                            <Play className="w-4 h-4" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full"
                        onClick={() => removeBookmark.mutate(bookmark.lessonId)}
                        disabled={removeBookmark.isPending}
                        data-testid={`button-remove-bookmark-${bookmark.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
