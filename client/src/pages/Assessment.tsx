import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Brain, Sparkles, Baby, Loader2, Heart, Users } from "lucide-react";

export default function Assessment() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"age" | "childQuestions" | "transition" | "parentQuestions" | "analyzing">("age");
  
  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate("/");
    }
  };
  const [selectedAge, setSelectedAge] = useState<string>("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [childResponses, setChildResponses] = useState<Record<string, string>>({});
  const [parentResponses, setParentResponses] = useState<Record<string, string>>({});
  const [assessmentId, setAssessmentId] = useState<string | null>(null);

  const AGE_RANGES = [
    { value: "0-6", label: `0 - 6 ${t("assessment.months")}`, icon: "👶" },
    { value: "6-12", label: `6 - 12 ${t("assessment.months")}`, icon: "🍼" },
    { value: "1-2", label: `1 - 2 ${t("assessment.years")}`, icon: "🧒" },
    { value: "2-4", label: `2 - 4 ${t("assessment.years")}`, icon: "👧" },
    { value: "4-7", label: `4 - 7 ${t("assessment.years")}`, icon: "🧒" },
  ];

  const CHILD_SCALE_OPTIONS = [
    { value: "1", label: t("assessment.scale.veryWeak"), color: "bg-red-100 border-red-300 hover:bg-red-200" },
    { value: "2", label: t("assessment.scale.weak"), color: "bg-orange-100 border-orange-300 hover:bg-orange-200" },
    { value: "3", label: t("assessment.scale.average"), color: "bg-yellow-100 border-yellow-300 hover:bg-yellow-200" },
    { value: "4", label: t("assessment.scale.good"), color: "bg-lime-100 border-lime-300 hover:bg-lime-200" },
    { value: "5", label: t("assessment.scale.excellent"), color: "bg-green-100 border-green-300 hover:bg-green-200" },
  ];

  const PARENT_SCALE_OPTIONS = [
    { value: "1", label: t("assessment.parentScale.never"), color: "bg-red-100 border-red-300 hover:bg-red-200" },
    { value: "2", label: t("assessment.parentScale.rarely"), color: "bg-orange-100 border-orange-300 hover:bg-orange-200" },
    { value: "3", label: t("assessment.parentScale.sometimes"), color: "bg-yellow-100 border-yellow-300 hover:bg-yellow-200" },
    { value: "4", label: t("assessment.parentScale.often"), color: "bg-lime-100 border-lime-300 hover:bg-lime-200" },
    { value: "5", label: t("assessment.parentScale.always"), color: "bg-green-100 border-green-300 hover:bg-green-200" },
  ];

  const { data: childQuestions = [], isLoading: childQuestionsLoading } = useQuery({
    queryKey: ["assessmentQuestions", selectedAge],
    queryFn: async () => {
      const res = await fetch(`/api/assessment/questions?ageRange=${selectedAge}`);
      if (!res.ok) throw new Error("Failed to fetch questions");
      return res.json();
    },
    enabled: step === "childQuestions" && !!selectedAge,
  });

  const { data: parentQuestions = [], isLoading: parentQuestionsLoading } = useQuery({
    queryKey: ["assessmentQuestions", "parent"],
    queryFn: async () => {
      const res = await fetch(`/api/assessment/questions?ageRange=parent`);
      if (!res.ok) throw new Error("Failed to fetch questions");
      return res.json();
    },
    enabled: step === "parentQuestions",
  });

  const startAssessment = useMutation({
    mutationFn: async (childAgeRange: string) => {
      const res = await fetch("/api/assessment/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ childAgeRange }),
      });
      if (!res.ok) throw new Error("Failed to start assessment");
      return res.json();
    },
    onSuccess: (data) => {
      setAssessmentId(data.id);
      setStep("childQuestions");
    },
  });

  const submitAssessment = useMutation({
    mutationFn: async () => {
      if (!assessmentId) throw new Error("No assessment ID");
      const allResponses = [
        ...Object.entries(childResponses).map(([questionId, response]) => ({
          questionId,
          response,
        })),
        ...Object.entries(parentResponses).map(([questionId, response]) => ({
          questionId,
          response,
        })),
      ];
      const res = await fetch(`/api/assessment/${assessmentId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ responses: allResponses }),
      });
      if (!res.ok) throw new Error("Failed to submit assessment");
      return res.json();
    },
    onSuccess: () => {
      navigate("/learning-path");
    },
  });

  const handleAgeSelect = (age: string) => {
    setSelectedAge(age);
    startAssessment.mutate(age);
  };

  const handleChildResponse = (value: string) => {
    const question = childQuestions[currentQuestionIndex];
    setChildResponses((prev) => ({ ...prev, [question.id]: value }));

    if (currentQuestionIndex < childQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handleParentResponse = (value: string) => {
    const question = parentQuestions[currentQuestionIndex];
    setParentResponses((prev) => ({ ...prev, [question.id]: value }));

    if (currentQuestionIndex < parentQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleChildComplete = () => {
    setStep("transition");
    setCurrentQuestionIndex(0);
  };

  const handleStartParentQuestions = () => {
    setStep("parentQuestions");
  };

  const handleSubmit = () => {
    setStep("analyzing");
    submitAssessment.mutate();
  };

  const currentChildQuestion = childQuestions[currentQuestionIndex];
  const currentParentQuestion = parentQuestions[currentQuestionIndex];
  const childProgress = childQuestions.length > 0 ? ((currentQuestionIndex + 1) / childQuestions.length) * 100 : 0;
  const parentProgress = parentQuestions.length > 0 ? ((currentQuestionIndex + 1) / parentQuestions.length) * 100 : 0;
  const allChildAnswered = childQuestions.length > 0 && Object.keys(childResponses).length === childQuestions.length;
  const allParentAnswered = parentQuestions.length > 0 && Object.keys(parentResponses).length === parentQuestions.length;

  if (step === "age") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 font-body pb-24">
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
            <h1 className="text-lg font-bold text-gray-800">{t("assessment.title")}</h1>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {t("assessment.getPersonalizedPlan")}
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              {t("assessment.description")}
            </p>
          </div>

          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="font-bold text-gray-800 mb-4 text-center">
                {t("assessment.childAge")}
              </h3>
              <div className="grid gap-3">
                {AGE_RANGES.map((age) => (
                  <Button
                    key={age.value}
                    variant="outline"
                    className={`h-14 text-lg justify-start gap-4 ${
                      selectedAge === age.value ? "border-indigo-500 bg-indigo-50" : ""
                    }`}
                    onClick={() => handleAgeSelect(age.value)}
                    disabled={startAssessment.isPending}
                    data-testid={`button-age-${age.value}`}
                  >
                    <span className="text-2xl">{age.icon}</span>
                    <span>{age.label}</span>
                    {startAssessment.isPending && selectedAge === age.value && (
                      <Loader2 className="w-4 h-4 animate-spin ml-auto" />
                    )}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="bg-white/70 rounded-xl p-4 border border-indigo-200">
            <p className="text-sm text-gray-700 italic mb-2">
              "{t("assessment.quote")}"
            </p>
            <p className="text-xs font-bold text-gray-800">— {t("signature.name")}</p>
            <p className="text-[10px] text-gray-500">{t("signature.title")}</p>
          </div>
        </main>
      </div>
    );
  }

  if (step === "analyzing" || submitAssessment.isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 font-body flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-24 h-24 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Sparkles className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {t("assessment.analyzing")}
          </h2>
          <p className="text-gray-600 mb-4">
            {t("assessment.preparingPlan")}
          </p>
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
        </div>
      </div>
    );
  }

  if (step === "transition") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-100 font-body pb-24">
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
            <h1 className="text-lg font-bold text-gray-800">{t("assessment.stage2Title")}</h1>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="flex justify-center gap-2 mb-4">
              <span className="text-4xl">✅</span>
            </div>
            <h2 className="text-xl font-bold text-green-600 mb-4">
              {t("assessment.stage1Complete")}
            </h2>
          </div>

          <Card className="mb-6 border-2 border-purple-300">
            <CardContent className="p-6 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">
                {t("assessment.parentAssessmentTitle")}
              </h3>
              <p className="text-gray-600 mb-6">
                {t("assessment.parentAssessmentDesc")}
              </p>
              <Button
                onClick={handleStartParentQuestions}
                className="gap-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white px-8 py-3"
                data-testid="button-start-parent-assessment"
              >
                <Users className="w-5 h-5" />
                {t("assessment.startParentAssessment")}
              </Button>
            </CardContent>
          </Card>

          <div className="bg-white/70 rounded-xl p-4 border border-purple-200">
            <p className="text-sm text-gray-700 italic mb-2">
              "{t("assessment.parentQuote")}"
            </p>
            <p className="text-xs font-bold text-gray-800">— {t("signature.name")}</p>
            <p className="text-[10px] text-gray-500">{t("signature.title")}</p>
          </div>
        </main>
      </div>
    );
  }

  if (childQuestionsLoading || parentQuestionsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 font-body flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (step === "childQuestions") {
    return (
      <div className="flex flex-col h-[calc(100vh-3rem)] bg-gradient-to-b from-blue-50 to-indigo-100 font-body">
        <header className="bg-white shadow-sm flex-shrink-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center gap-4 mb-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="rounded-full"
                data-testid="button-back-home-questions"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Baby className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs text-indigo-600 font-medium">{t("assessment.stage1Label")}</span>
                </div>
                <h1 className="text-lg font-bold text-gray-800">
                  {t("assessment.question")} {currentQuestionIndex + 1} / {childQuestions.length}
                </h1>
              </div>
            </div>
            <Progress value={childProgress} className="h-2" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-4xl mx-auto">
            {currentChildQuestion && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3 mb-6">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Baby className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-800">
                        {currentChildQuestion.questionSomali}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {currentChildQuestion.question}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {CHILD_SCALE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleChildResponse(option.value)}
                        className={`w-full p-4 rounded-xl border-2 text-left font-medium transition-all ${
                          childResponses[currentChildQuestion.id] === option.value
                            ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200"
                            : option.color
                        }`}
                        data-testid={`button-scale-${option.value}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{option.value}</span>
                          <span>{option.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>

        <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lg z-50">
          <div className="max-w-4xl mx-auto flex justify-between items-center gap-4">
            <Button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="gap-2 flex-1 bg-gray-600 hover:bg-gray-700 text-white"
              data-testid="button-previous"
            >
              <ChevronLeft className="w-4 h-4" />
              {t("common.previous")}
            </Button>

            {currentQuestionIndex === childQuestions.length - 1 ? (
              <Button
                onClick={handleChildComplete}
                disabled={!allChildAnswered}
                className="gap-2 flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                data-testid="button-next-stage"
              >
                <Sparkles className="w-4 h-4" />
                {t("assessment.continueToParent")}
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                disabled={!childResponses[currentChildQuestion?.id]}
                className="gap-2 flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="button-next"
              >
                {t("common.next")}
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (step === "parentQuestions") {
    return (
      <div className="flex flex-col h-[calc(100vh-3rem)] bg-gradient-to-b from-pink-50 to-purple-100 font-body">
        <header className="bg-white shadow-sm flex-shrink-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center gap-4 mb-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setStep("transition")}
                className="rounded-full"
                data-testid="button-back-transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-purple-600" />
                  <span className="text-xs text-purple-600 font-medium">{t("assessment.stage2Label")}</span>
                </div>
                <h1 className="text-lg font-bold text-gray-800">
                  {t("assessment.question")} {currentQuestionIndex + 1} / {parentQuestions.length}
                </h1>
              </div>
            </div>
            <Progress value={parentProgress} className="h-2 [&>div]:bg-purple-500" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-4xl mx-auto">
            {currentParentQuestion && (
              <Card className="mb-6 border-purple-200">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3 mb-6">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Heart className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-800">
                        {currentParentQuestion.questionSomali}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {currentParentQuestion.question}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {PARENT_SCALE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleParentResponse(option.value)}
                        className={`w-full p-4 rounded-xl border-2 text-left font-medium transition-all ${
                          parentResponses[currentParentQuestion.id] === option.value
                            ? "border-purple-500 bg-purple-50 ring-2 ring-purple-200"
                            : option.color
                        }`}
                        data-testid={`button-parent-scale-${option.value}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{option.value}</span>
                          <span>{option.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>

        <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lg z-50">
          <div className="max-w-4xl mx-auto flex justify-between items-center gap-4">
            <Button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="gap-2 flex-1 bg-gray-600 hover:bg-gray-700 text-white"
              data-testid="button-previous-parent"
            >
              <ChevronLeft className="w-4 h-4" />
              {t("common.previous")}
            </Button>

            {currentQuestionIndex === parentQuestions.length - 1 ? (
              <Button
                onClick={handleSubmit}
                disabled={!allParentAnswered}
                className="gap-2 flex-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                data-testid="button-submit"
              >
                <Sparkles className="w-4 h-4" />
                {t("assessment.analyze")}
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                disabled={!parentResponses[currentParentQuestion?.id]}
                className="gap-2 flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                data-testid="button-next-parent"
              >
                {t("common.next")}
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
