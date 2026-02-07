import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Sparkles, Target, CheckCircle, AlertCircle, BookOpen, Loader2, Heart, Lightbulb, RefreshCw, Clock } from "lucide-react";

export default function LearningPath() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate("/");
    }
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["learningPath"],
    queryFn: async () => {
      const res = await fetch("/api/learning-path", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch learning path");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-indigo-100 font-body flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const handleRetryAnalysis = async () => {
    if (!data?.assessment?.id) return;
    try {
      const res = await fetch(`/api/assessment/${data.assessment.id}/reanalyze`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {
      console.error("Retry failed:", err);
    }
  };

  if (error || !data?.hasAssessment) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-indigo-100 font-body">
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="rounded-full"
              data-testid="button-back-home"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold text-gray-800">{t("learningPath.title")}</h1>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Target className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {t("learningPath.noAssessment")}
          </h2>
          <p className="text-gray-600 mb-6">
            {t("learningPath.noAssessmentDesc")}
          </p>
          <Button
            onClick={() => navigate("/assessment")}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-12 px-8"
            data-testid="button-start-assessment"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            {t("learningPath.startAssessment")}
          </Button>
        </main>
      </div>
    );
  }

  if (data?.aiPending && !data?.insights) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-indigo-100 font-body">
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="rounded-full"
              data-testid="button-back-home"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold text-gray-800">{t("learningPath.title")}</h1>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {t("learningPath.aiPendingTitle")}
          </h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {t("learningPath.aiPendingDesc")}
          </p>
          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <Button
              onClick={handleRetryAnalysis}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-12"
              data-testid="button-retry-analysis"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              {t("learningPath.retryAnalysis")}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/courses")}
              data-testid="button-view-courses-pending"
            >
              {t("learningPath.viewAllCourses")}
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const { insights, recommendations: allRecommendations } = data;
  
  // Only show courses that are currently available (0-6-bilood and ilmo-is-dabira)
  const allowedCourseIds = ["0-6-bilood", "ilmo-is-dabira"];
  const recommendations = allRecommendations?.filter((rec: any) => 
    rec.course && allowedCourseIds.includes(rec.course.courseId)
  ) || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-indigo-100 font-body pb-24">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="rounded-full"
            data-testid="button-back-home"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-gray-800">{t("learningPath.title")}</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="text-center mb-2">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">
            {t("learningPath.planForChild")}
          </h2>
        </div>

        {insights?.summary && (
          <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
            <CardContent className="p-4">
              <p className="text-gray-700">{insights.summary}</p>
            </CardContent>
          </Card>
        )}

        {insights?.strengths && insights.strengths.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-bold text-green-700 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                {t("learningPath.strengths")}
              </h3>
              <ul className="space-y-2">
                {insights.strengths.map((strength: string, index: number) => (
                  <li key={index} className="flex items-start gap-2 text-gray-700">
                    <span className="text-green-500 mt-1">✓</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {insights?.needsImprovement && insights.needsImprovement.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-bold text-amber-700 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {t("learningPath.needsImprovement")}
              </h3>
              <ul className="space-y-2">
                {insights.needsImprovement.map((item: string, index: number) => (
                  <li key={index} className="flex items-start gap-2 text-gray-700">
                    <span className="text-amber-500 mt-1">→</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {insights?.focusAreas && insights.focusAreas.length > 0 && (
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
            <CardContent className="p-4">
              <h3 className="font-bold text-blue-700 mb-3 flex items-center gap-2">
                <Target className="w-5 h-5" />
                {t("learningPath.focusAreas")}
              </h3>
              <div className="flex flex-wrap gap-2">
                {insights.focusAreas.map((area: string, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {insights?.parentingStyle && (
          <Card className="bg-gradient-to-br from-pink-50 to-purple-50 border-pink-200">
            <CardContent className="p-4">
              <h3 className="font-bold text-pink-700 mb-3 flex items-center gap-2">
                <Heart className="w-5 h-5" />
                {t("learningPath.parentingStyle")}
              </h3>
              <div className="flex items-center gap-3">
                <span className="px-4 py-2 bg-pink-100 text-pink-700 rounded-lg text-lg font-semibold">
                  {insights.parentingStyle}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {insights?.parentingTips && insights.parentingTips.length > 0 && (
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="p-4">
              <h3 className="font-bold text-amber-700 mb-3 flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                {t("learningPath.parentingTips")}
              </h3>
              <ul className="space-y-2">
                {insights.parentingTips.map((tip: string, index: number) => (
                  <li key={index} className="flex items-start gap-2 text-gray-700">
                    <span className="text-amber-500 mt-1">💡</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {recommendations && recommendations.length > 0 && (
          <div>
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              {t("learningPath.recommendedCourses")}
            </h3>
            <div className="space-y-3">
              {recommendations.map((rec: any, index: number) => (
                <Link
                  key={rec.id}
                  href={`/course/${rec.course?.courseId}`}
                  data-testid={`link-course-${rec.course?.courseId}`}
                >
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-800 truncate">
                            {rec.course?.title || "Koorso"}
                          </h4>
                          <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                            {rec.reason}
                          </p>
                          {rec.focusArea && (
                            <span className="inline-block mt-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">
                              {rec.focusArea}
                            </span>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white/70 rounded-xl p-4 border border-indigo-200 mt-6">
          <p className="text-sm text-gray-700 italic mb-2">
            "{t("learningPath.quote")}"
          </p>
          <p className="text-xs font-bold text-gray-800">— {t("signature.name")}</p>
          <p className="text-[10px] text-gray-500">{t("signature.title")}</p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/assessment")}
            className="flex-1"
            data-testid="button-retake-assessment"
          >
            {t("learningPath.retakeAssessment")}
          </Button>
          <Button
            onClick={() => navigate("/courses")}
            className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500"
            data-testid="button-view-courses"
          >
            {t("learningPath.viewAllCourses")}
          </Button>
        </div>
      </main>
    </div>
  );
}
