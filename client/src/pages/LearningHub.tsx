import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, BookOpen, MessageCircle, Moon, Library, Bot, Users, Target, Award, Play, ChevronRight, Crown, ExternalLink, Lightbulb } from "lucide-react";

interface Course {
  id: number;
  courseId: string;
  title: string;
  description: string;
  imageUrl: string | null;
  category: string;
  isLive: boolean;
  isFree: boolean;
  duration: string | null;
  order: number;
}

const AVAILABLE_COURSES = ["0-6-bilood", "ilmo-is-dabira"];

export default function LearningHub() {
  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  const availableCourses = courses.filter(c => 
    c.isLive && AVAILABLE_COURSES.some(id => c.courseId.toLowerCase().includes(id.toLowerCase()))
  ).sort((a, b) => a.order - b.order);

  const sections = [
    {
      id: "courses",
      type: "courses" as const,
    },
    {
      id: "parent-tips",
      title: "Horumarka Da'da Ilmaha",
      description: "Talooyinka Barbaarintasan Akademi",
      icon: Lightbulb,
      href: "/parent-tips",
      gradient: "from-orange-500 to-amber-600",
      bgGradient: "from-orange-50 to-amber-50",
      borderColor: "border-orange-200",
    },
    {
      id: "dhambaal",
      title: "Dhambaalka Waalidka",
      description: "Maqaallada maalinlaha ah ee waalidiinta",
      icon: MessageCircle,
      href: "/dhambaal",
      gradient: "from-emerald-500 to-teal-600",
      bgGradient: "from-emerald-50 to-teal-50",
      borderColor: "border-emerald-200",
    },
    {
      id: "maaweelo",
      title: "Sheekada Caruurta",
      description: "Maaweelada habeen ee caruurta",
      icon: Moon,
      href: "/maaweelo",
      gradient: "from-purple-500 to-indigo-600",
      bgGradient: "from-purple-50 to-indigo-50",
      borderColor: "border-purple-200",
    },
    {
      id: "resources",
      title: "Maktabada",
      description: "Buugaag, maqaallo, iyo ilaha waxbarashada",
      icon: Library,
      href: "/resources",
      gradient: "from-blue-500 to-indigo-600",
      bgGradient: "from-blue-50 to-indigo-50",
      borderColor: "border-blue-200",
    },
    {
      id: "ai-caawiye",
      title: "AI Caawiye",
      description: "Talo iyo caawimo AI ah oo ku saabsan tarbiyada",
      icon: Bot,
      href: "/ai-caawiye",
      gradient: "from-violet-500 to-purple-600",
      bgGradient: "from-violet-50 to-purple-50",
      borderColor: "border-violet-200",
    },
    {
      id: "groups",
      title: "Kooxaha Waxbarashada",
      description: "Waalidka kale la wadaag fikradahaaga",
      icon: Users,
      href: "/groups",
      gradient: "from-indigo-500 to-blue-600",
      bgGradient: "from-indigo-50 to-blue-50",
      borderColor: "border-indigo-200",
    },
    {
      id: "milestones",
      title: "Horumarka ilmaha",
      description: "Su'aalaha horumarinta ilmaha",
      icon: Target,
      href: "/milestones",
      gradient: "from-green-500 to-emerald-600",
      bgGradient: "from-green-50 to-emerald-50",
      borderColor: "border-green-200",
    },
    {
      id: "badges",
      title: "Abaalmarinta",
      description: "Shahaadooyinka iyo badges-kaaga",
      icon: Award,
      href: "/badges",
      gradient: "from-amber-500 to-orange-600",
      bgGradient: "from-amber-50 to-orange-50",
      borderColor: "border-amber-200",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50 pb-24">
      <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 px-4 py-3 safe-top">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/">
            <button className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center" data-testid="button-back">
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white">Goobta Waxbarashada</h1>
            <p className="text-xs text-white/70">Dhammaan waxyaabaha la baran karo</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Ku soo dhawoow Goobta Waxbarashada</h2>
          <p className="text-gray-600 text-sm mt-1">Halkaan waxaad ka heli kartaa dhammaan agabka waxbarashada</p>
        </div>

        {availableCourses.length > 0 && (
          <div data-testid="section-courses">
            <h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Play className="w-4 h-4 text-blue-600" />
              Koorsooyinka Diyaarka ah
            </h3>
            <div className="space-y-3">
              {availableCourses.map((course) => (
                <Link key={course.id} href={`/course/${course.courseId}`}>
                  <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-4 flex items-center gap-4 active:scale-[0.98] transition-all cursor-pointer hover:shadow-md" data-testid={`course-card-${course.courseId}`}>
                    {course.imageUrl ? (
                      <img src={course.imageUrl} alt={course.title} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Play className="w-7 h-7 text-white" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 text-sm">{course.title}</h4>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{course.description}</p>
                      {course.duration && (
                        <p className="text-xs text-blue-600 font-medium mt-1">{course.duration}</p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2">
          <h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            Agabka Waxbarashada
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {sections.filter(s => s.type !== "courses").map((section) => {
              if (!('title' in section)) return null;
              const Icon = section.icon;
              return (
                <Link key={section.id} href={section.href}>
                  <div className={`bg-gradient-to-br ${section.bgGradient} rounded-xl border ${section.borderColor} p-3 shadow-sm active:scale-[0.97] transition-all cursor-pointer hover:shadow-md h-full`} data-testid={`hub-card-${section.id}`}>
                    <div className={`w-9 h-9 bg-gradient-to-br ${section.gradient} rounded-lg flex items-center justify-center mb-2 shadow-md`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="font-bold text-gray-900 text-[13px] leading-tight">{section.title}</h4>
                    <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">{section.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="pt-2">
          <div 
            onClick={() => { import("@/lib/api").then(m => m.openSSOLink()); }}
            className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 rounded-2xl p-4 shadow-lg cursor-pointer active:scale-[0.98] transition-transform hover:shadow-xl"
            data-testid="hub-gold-membership"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-base">Xubin Dahabi ah Noqo 💛</h3>
                <p className="text-white/90 text-xs">Ku hel dhammaan koorsooyinka</p>
              </div>
              <div className="flex-shrink-0 bg-white/20 rounded-lg px-3 py-1.5">
                <span className="text-white text-xs font-semibold flex items-center gap-1">
                  Booqo <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
