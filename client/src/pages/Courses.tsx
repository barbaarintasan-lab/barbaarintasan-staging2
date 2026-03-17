import { Button } from "@/components/ui/button";
import { ChevronLeft, BookOpen, Baby, Brain, Sparkles, Gift, Clock } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";

const courseImages: Record<string, string> = {
  "0-6":          "/course-images/0-6-bilood.png",
  "6-12":         "/course-images/6-12-bilood.png",
  "1-2":          "/course-images/1-2-sano.png",
  "2-4":          "/course-images/2-4-sano.png",
  "4-7":          "/course-images/4-7-sano.png",
  "intellect":    "/course-images/caqli-sare.png",
  "independence": "/course-images/ilmo-is-dabira.png",
  "father":       "/course-images/aabe-baraarugay.png",
  "autism":       "/course-images/hadalka-daaho.png",
  "family":       "/course-images/badqabka-qoyska.png",
  "discipline":   "/course-images/badqabka-qoyska.png",
  "speech":       "/course-images/hadalka-daaho.png",
  "fatherhood":   "/course-images/aabe-baraarugay.png",
  "safety":       "/course-images/ilmo-is-dabira.png",
  "free-trial":   "/course-images/0-6-bilood.png",
  "free-general": "/course-images/4-7-sano.png",
};

const courseColors: Record<string, { bg: string; border: string; text: string; gradient: string }> = {
  "0-6": { bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-600", gradient: "from-pink-500 to-rose-500" },
  "6-12": { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-600", gradient: "from-blue-500 to-cyan-500" },
  "1-2": { bg: "bg-green-50", border: "border-green-200", text: "text-green-600", gradient: "from-green-500 to-emerald-500" },
  "2-4": { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-600", gradient: "from-purple-500 to-violet-500" },
  "4-7": { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-600", gradient: "from-orange-500 to-amber-500" },
  "discipline": { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-600", gradient: "from-indigo-500 to-blue-500" },
  "speech": { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-600", gradient: "from-teal-500 to-cyan-500" },
  "intellect": { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-600", gradient: "from-yellow-500 to-amber-500" },
  "fatherhood": { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-600", gradient: "from-sky-500 to-blue-500" },
  "safety": { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-600", gradient: "from-emerald-500 to-green-500" },
};

export default function Courses() {
  const { t } = useTranslation();
  const { apiLanguage } = useLanguage();
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const res = await fetch(`/api/courses?lang=${apiLanguage}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const courseList = Array.isArray(courses) ? courses : [];
  const generalCourses = courseList.filter((c: any) => c.category === "general").sort((a: any, b: any) => a.order - b.order);
  const specialCourses = courseList.filter((c: any) => c.category === "special").sort((a: any, b: any) => a.order - b.order);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-purple-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  const getImage = (course: any) => {
    // Use database imageUrl first if available
    if (course.imageUrl) {
      // Absolute paths or full URLs - use directly
      if (course.imageUrl.startsWith('/') || course.imageUrl.startsWith('http')) {
        return course.imageUrl;
      }
      // Legacy relative paths - wrap with object storage API
      return `/api/object-storage/file/${course.imageUrl}`;
    }
    // Fallback to hardcoded images
    return courseImages[course.courseId] || courseImages["0-6"];
  };
  const getColors = (courseId: string) => courseColors[courseId] || courseColors["0-6"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-purple-50 pb-24 lg:pb-8">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3 lg:px-8">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full text-gray-700 hover:bg-gray-100" data-testid="button-back">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-sky-600" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-sky-600 to-purple-600 bg-clip-text text-transparent">
              {t("courses.title")}
            </h1>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 pt-8 pb-6 lg:px-8">
        <div className="text-center mb-8">
          <p className="text-gray-600 max-w-xl mx-auto">
            Dooro koorsada aad jeclaan lahayd inaad barato. 5-da cashar ee ugu horreeya waa bilaash!
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 lg:px-8">
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Baby className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {t("courses.generalCourses")}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {generalCourses.map((course: any) => {
              const colors = getColors(course.courseId);
              return (
                <Link key={course.id} href={`/course/${course.courseId}`}>
                  <div className={`group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border ${colors.border} hover:scale-[1.02]`} data-testid={`card-course-${course.courseId}`}>
                    <div className="relative h-40 overflow-hidden">
                      <img 
                        src={getImage(course)} 
                        alt={course.title}
                        className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${!course.contentReady ? 'grayscale opacity-70' : ''}`}
                        onError={(e) => {
                          const fallback = courseImages[course.courseId] || courseImages["0-6"];
                          if ((e.currentTarget as HTMLImageElement).src !== new URL(fallback, window.location.origin).href) {
                            (e.currentTarget as HTMLImageElement).src = fallback;
                          }
                        }}
                      />
                      <div className={`absolute inset-0 bg-gradient-to-t ${colors.gradient} opacity-10`} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                      {!course.contentReady && (
                        <div className="absolute top-3 right-3">
                          <span className="inline-flex items-center gap-1 bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                            <Clock className="w-3 h-3" />
                            Waa Soo Socotaa
                          </span>
                        </div>
                      )}
                      <div className="absolute bottom-3 left-3 right-3">
                        <span className={`inline-flex items-center gap-1 ${colors.bg} px-3 py-1 rounded-full text-xs font-semibold ${colors.text}`}>
                          <BookOpen className="w-3 h-3" />
                          Da'da Ilmaha
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 text-lg mb-2 group-hover:text-sky-600 transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                        {course.description || "Baro sida loo barbaarinayo ilmahaaga"}
                      </p>
                      <div className="flex items-center justify-between">
                        {!course.contentReady && (
                          <span className="text-sm font-medium text-purple-600">Dhawaan ayey furmaysaa</span>
                        )}
                        <Button size="sm" className={`bg-gradient-to-r ${!course.contentReady ? 'from-purple-500 to-violet-500' : colors.gradient} text-white border-0 hover:opacity-90 ${course.contentReady ? 'ml-auto' : ''}`}>
                          {!course.contentReady ? 'Eeg' : 'Eeg Koorsada'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {t("courses.specialCourses")}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {specialCourses.map((course: any) => {
              const colors = getColors(course.courseId);
              return (
                <Link key={course.id} href={`/course/${course.courseId}`}>
                  <div className={`group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border ${colors.border} hover:scale-[1.02]`} data-testid={`card-course-${course.courseId}`}>
                    <div className="relative h-40 overflow-hidden">
                      <img 
                        src={getImage(course)} 
                        alt={course.title}
                        className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${!course.contentReady ? 'grayscale opacity-70' : ''}`}
                        onError={(e) => {
                          const fallback = courseImages[course.courseId] || courseImages["0-6"];
                          if ((e.currentTarget as HTMLImageElement).src !== new URL(fallback, window.location.origin).href) {
                            (e.currentTarget as HTMLImageElement).src = fallback;
                          }
                        }}
                      />
                      <div className={`absolute inset-0 bg-gradient-to-t ${colors.gradient} opacity-10`} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                      {!course.contentReady ? (
                        <div className="absolute top-3 right-3">
                          <span className="inline-flex items-center gap-1 bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                            <Clock className="w-3 h-3" />
                            Waa Soo Socotaa
                          </span>
                        </div>
                      ) : course.isFree && (
                        <div className="absolute top-3 right-3">
                          <span className="inline-flex items-center gap-1 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                            <Gift className="w-3 h-3" />
                            Bilaash
                          </span>
                        </div>
                      )}
                      <div className="absolute bottom-3 left-3 right-3">
                        <span className={`inline-flex items-center gap-1 ${colors.bg} px-3 py-1 rounded-full text-xs font-semibold ${colors.text}`}>
                          <Brain className="w-3 h-3" />
                          Koorso Gaar ah
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 text-lg mb-2 group-hover:text-orange-600 transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                        {course.description || "Koorso gaar ah oo la xiriirta mawduucan"}
                      </p>
                      <div className="flex items-center justify-between">
                        {!course.contentReady ? (
                          <span className="text-sm font-medium text-purple-600">Dhawaan ayey furmaysaa</span>
                        ) : course.isFree && (
                          <span className="text-lg font-bold text-green-600">Bilaash</span>
                        )}
                        <Button size="sm" className={`bg-gradient-to-r ${!course.contentReady ? 'from-purple-500 to-violet-500' : colors.gradient} text-white border-0 hover:opacity-90 ${!course.isFree && course.contentReady ? 'ml-auto' : ''}`}>
                          {!course.contentReady ? 'Eeg' : 'Eeg Koorsada'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
