import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, CheckCircle, XCircle, RotateCcw, Trophy, Star, ChevronRight, Download } from "lucide-react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import jsPDF from "jspdf";

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function shuffleQuestions(questions: any[]): any[] {
  return shuffleArray(questions.map((q: any) => {
    if (q.questionType === "open_ended" || !q.options) return q;
    const options = JSON.parse(q.options);
    const correctOption = options[q.correctAnswer];
    const shuffledOptions = shuffleArray(options);
    const newCorrectIndex = shuffledOptions.indexOf(correctOption);
    return {
      ...q,
      options: JSON.stringify(shuffledOptions),
      correctAnswer: newCorrectIndex,
    };
  }));
}

export default function QuizPlayer() {
  const [, params] = useRoute("/quiz/:quizId");
  const quizId = params?.quizId;
  const [, setLocation] = useLocation();
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | string)[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [shuffledQuestions, setShuffledQuestions] = useState<any[]>([]);
  const hasShuffledRef = useRef<string | null>(null);

  const { data: quiz, isLoading } = useQuery({
    queryKey: ["quiz", quizId],
    queryFn: async () => {
      const res = await fetch(`/api/quiz/${quizId}`);
      if (!res.ok) throw new Error("Failed to fetch quiz");
      return res.json();
    },
  });

  const { data: currentLesson } = useQuery({
    queryKey: ["lesson", quiz?.lessonId],
    queryFn: async () => {
      const res = await fetch(`/api/lessons/${quiz.lessonId}`);
      if (!res.ok) throw new Error("Failed to fetch lesson");
      return res.json();
    },
    enabled: !!quiz?.lessonId,
  });

  const { data: allLessons } = useQuery({
    queryKey: ["lessons"],
    queryFn: async () => {
      const res = await fetch("/api/lessons");
      if (!res.ok) throw new Error("Failed to fetch lessons");
      return res.json();
    },
    enabled: !!currentLesson,
  });

  const { data: courses } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const res = await fetch("/api/courses");
      if (!res.ok) throw new Error("Failed to fetch courses");
      return res.json();
    },
    enabled: !!currentLesson,
  });

  const course = courses?.find((c: any) => c.id === currentLesson?.courseId);
  const courseSlug = course?.courseId;

  const courseLessons = (allLessons || [])
    .filter((l: any) => l.courseId === currentLesson?.courseId)
    .sort((a: any, b: any) => {
      if (a.moduleNumber !== b.moduleNumber) return (a.moduleNumber || 0) - (b.moduleNumber || 0);
      return (a.order || 0) - (b.order || 0);
    });

  const currentLessonIndex = courseLessons.findIndex((l: any) => l.id === currentLesson?.id);
  const nextLesson = currentLessonIndex >= 0 && currentLessonIndex < courseLessons.length - 1 
    ? courseLessons[currentLessonIndex + 1] 
    : null;
  const isLastLesson = currentLessonIndex === courseLessons.length - 1;

  useEffect(() => {
    if (quiz?.questions && hasShuffledRef.current !== quizId) {
      setShuffledQuestions(shuffleQuestions(quiz.questions));
      hasShuffledRef.current = quizId || null;
    }
  }, [quiz?.questions, quizId]);

  const playApplause = () => {
    const audio = new Audio("data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYAAAAAAAD/+9DEAAAH4ANpAAAAEyobLcwYAABAAADSAAAAEAAAANIAAAAQAAAE0gAAAIAAAATSAAAAhAAABNIAAAAYAAAE0AAAACgAAATSAAAAPAAABNIAAABUAAAE0AAAAHgAAATQAAAAoAAABNAAAADAAAAE0AAAANAAAATQAAABAAAABNAAAAEgAAAE0AAAAWAAAATQAAABoAAABNAAAAHwAAAE0AAAAkAAABNAAAAKAAAAE0AAAAtAAAATQAAAC8AAAE0AAAA0AAAATQAAADcAAABNAAAAQAAAAE0AAABGAAAATQAAAEwAAABNAAABNAAAATQAAAE0AAABNAAAATgAAAE4AAABPAAAATQAAAE8AAABQAAAAUAAAAFMAAABVAAAAVQAAAFYAAABXAAAAWAAAAF0AAABfAAAAYQAAAGQAAABpAAAAbgAAAHUAAAB9AAAAhgAAAJAAAACcAAAAqgAAALkAAADKAAAA3QAAAPAAAAD/+9DEIgPAAADSAAAAIAAANIAAAAT/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////+9DEzAPAAADSAAAAIAAANIAAAAT/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8=");
    audio.volume = 0.5;
    audio.play().catch(() => {});
  };

  useEffect(() => {
    if (showFeedback && !showResults) {
      const timer = setTimeout(() => {
        setShowFeedback(false);
        if (currentQuestion < shuffledQuestions.length - 1) {
          setCurrentQuestion(currentQuestion + 1);
        } else {
          setShowResults(true);
          playApplause();
          confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
        }
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [showFeedback, currentQuestion, shuffledQuestions.length, showResults]);

  if (isLoading) return <div className="p-4 text-center">Loading...</div>;
  if (!quiz) return <div className="p-4 text-center">Quiz not found</div>;
  if (shuffledQuestions.length === 0) return <div className="p-4 text-center">Loading questions...</div>;

  const questions = shuffledQuestions;
  const question = questions[currentQuestion];

  const handleSelectAnswer = (optionIndex: number) => {
    if (showFeedback) return;
    
    const updated = [...selectedAnswers];
    updated[currentQuestion] = optionIndex;
    setSelectedAnswers(updated);
    
    const correct = optionIndex === question.correctAnswer;
    setIsCorrect(correct);
    setShowFeedback(true);
  };

  const handleTextAnswer = (text: string) => {
    const updated = [...selectedAnswers];
    updated[currentQuestion] = text;
    setSelectedAnswers(updated);
  };

  const handleRetry = () => {
    setCurrentQuestion(0);
    setSelectedAnswers([]);
    setShowResults(false);
    setShowFeedback(false);
    if (quiz?.questions) {
      setShuffledQuestions(shuffleQuestions(quiz.questions));
    }
  };

  const handleNextLesson = () => {
    if (nextLesson) {
      setLocation(`/lesson/${nextLesson.id}`);
    } else if (courseSlug) {
      setLocation(`/course/${courseSlug}`);
    }
  };

  const handleBackToLesson = () => {
    if (currentLesson) {
      setLocation(`/lesson/${currentLesson.id}`);
    }
  };

  const exportToPdf = (correctCount: number, totalCount: number, percentageScore: number, didPass: boolean) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(20);
    doc.setTextColor(30, 64, 175);
    doc.text("Barbaarintasan Academy", pageWidth / 2, 20, { align: "center" });
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("Natiijada Quiz-ka", pageWidth / 2, 35, { align: "center" });
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Quiz: ${quiz?.title || "Quiz"}`, 20, 50);
    doc.text(`Taariikh: ${new Date().toLocaleDateString("so-SO")}`, 20, 60);
    
    doc.setFontSize(40);
    doc.setTextColor(didPass ? 34 : 234, didPass ? 197 : 88, didPass ? 94 : 12);
    doc.text(`${percentageScore}%`, pageWidth / 2, 90, { align: "center" });
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`Saxan: ${correctCount} / ${totalCount}`, pageWidth / 2, 105, { align: "center" });
    doc.text(`Khalad: ${totalCount - correctCount}`, pageWidth / 2, 115, { align: "center" });
    
    doc.setFontSize(16);
    doc.setTextColor(didPass ? 34 : 234, didPass ? 197 : 88, didPass ? 94 : 12);
    doc.text(didPass ? "Hambalyo! Waad Guulaysatay!" : "Isku Day Mar Kale", pageWidth / 2, 135, { align: "center" });
    
    let yPos = 160;
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("Su'aalaha iyo Jawaabaha:", 20, yPos);
    yPos += 10;
    
    questions.forEach((q: any, idx: number) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      const questionText = `${idx + 1}. ${q.question}`;
      const splitQuestion = doc.splitTextToSize(questionText, pageWidth - 40);
      doc.text(splitQuestion, 20, yPos);
      yPos += splitQuestion.length * 6;
      
      if (q.questionType !== "open_ended" && q.options) {
        const opts = JSON.parse(q.options);
        const userAnswer = selectedAnswers[idx];
        const isUserCorrect = userAnswer === q.correctAnswer;
        
        doc.setFontSize(10);
        doc.setTextColor(isUserCorrect ? 34 : 220, isUserCorrect ? 197 : 38, isUserCorrect ? 94 : 38);
        doc.text(`Jawaab Saxan: ${opts[q.correctAnswer] || "N/A"}`, 25, yPos);
        yPos += 6;
        
        doc.setTextColor(isUserCorrect ? 34 : 220, isUserCorrect ? 197 : 38, isUserCorrect ? 94 : 38);
        const userAnswerText = typeof userAnswer === "number" ? opts[userAnswer] : "(Wax lama dooran)";
        doc.text(`Adiga: ${userAnswerText} ${isUserCorrect ? "✓" : "✗"}`, 25, yPos);
        yPos += 6;
      } else if (q.questionType === "open_ended") {
        const userText = selectedAnswers[idx] as string || "";
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        const splitAnswer = doc.splitTextToSize(`Jawaabtaada: ${userText || "(Wax lama qorin)"}`, pageWidth - 50);
        doc.text(splitAnswer, 25, yPos);
        yPos += splitAnswer.length * 5;
      }
      
      yPos += 8;
    });
    
    doc.save(`quiz-result-${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const isOpenEnded = question?.questionType === "open_ended";
  const allOpenEnded = questions.every((q: any) => q.questionType === "open_ended");

  const calculateScore = () => {
    let correct = 0;
    let mcQuestions = 0;
    questions.forEach((q: any, idx: number) => {
      if (q.questionType !== "open_ended") {
        mcQuestions++;
        if (selectedAnswers[idx] === q.correctAnswer) correct++;
      }
    });
    return { correct, total: mcQuestions, percentage: mcQuestions > 0 ? Math.round((correct / mcQuestions) * 100) : 100 };
  };

  if (showResults) {
    const { correct, total, percentage } = calculateScore();
    const passed = percentage >= 70;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center">
        <Card className="max-w-sm w-full shadow-xl border-0">
          <CardContent className="p-6 text-center space-y-4">
            {passed ? (
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full mx-auto flex items-center justify-center shadow-lg">
                <Trophy className="w-10 h-10 text-white" />
              </div>
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full mx-auto flex items-center justify-center shadow-lg">
                <Star className="w-10 h-10 text-white" />
              </div>
            )}

            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                {allOpenEnded ? "Mahadsanid!" : `${percentage}%`}
              </h2>
              <p className="text-gray-600">
                {allOpenEnded 
                  ? "Waad dhamaysay" 
                  : `${correct}/${total} su'aalood`
                }
              </p>
            </div>

            {passed ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-xl font-bold text-green-600">🎉 Hambalyo!</p>
              </div>
            ) : (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                <p className="text-lg font-bold text-orange-600">💪 Isku day mar kale</p>
              </div>
            )}

            <div className="bg-gray-50 rounded-xl p-3 flex justify-center gap-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-bold text-green-600">{correct}</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="font-bold text-red-600">{total - correct}</span>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              {nextLesson ? (
                <Button 
                  onClick={handleNextLesson}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 h-12 text-base font-bold"
                  data-testid="button-next-lesson"
                >
                  <ChevronRight className="w-4 h-4 mr-1" />
                  Sii Wad Casharka
                </Button>
              ) : isLastLesson ? (
                <Button 
                  onClick={() => courseSlug && setLocation(`/course/${courseSlug}`)}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 h-12 text-base font-bold"
                  data-testid="button-finish-course"
                >
                  <Trophy className="w-4 h-4 mr-1" />
                  Koorsada Dhamaysay
                </Button>
              ) : null}
              
              <Button 
                onClick={handleRetry}
                className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Ku Noqo Quiz-ka
              </Button>
              
              <Button 
                onClick={() => exportToPdf(correct, total, percentage, passed)}
                variant="outline"
                className="w-full h-12 text-base border-green-500 text-green-600 hover:bg-green-50"
                data-testid="button-export-pdf"
              >
                <Download className="w-4 h-4 mr-1" />
                Download PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!question) return null;

  const options = question.options ? JSON.parse(question.options) : [];
  const currentAnswer = selectedAnswers[currentQuestion];
  const hasAnswer = isOpenEnded 
    ? typeof currentAnswer === "string" && currentAnswer.trim().length > 0
    : typeof currentAnswer === "number";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-3">
      <div className="max-w-md mx-auto">
        <Button variant="ghost" size="sm" className="mb-2" onClick={handleBackToLesson}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          Dib u noqo
        </Button>

        <Card className="shadow-lg border-0 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-3 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold">
                  {currentQuestion + 1}
                </div>
                <span className="font-medium">{currentQuestion + 1}/{questions.length}</span>
              </div>
              <div className="text-right text-sm">
                {Math.round((currentQuestion + 1) / questions.length * 100)}%
              </div>
            </div>
            <div className="mt-2 w-full bg-white/20 rounded-full h-1.5">
              <div
                className="bg-white h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${(currentQuestion + 1) / questions.length * 100}%` }}
              ></div>
            </div>
          </div>

          <CardContent className="p-4 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">{question.question}</h2>

            {isOpenEnded ? (
              <Textarea
                placeholder="Qor jawaabta halkan..."
                value={(currentAnswer as string) || ""}
                onChange={(e) => handleTextAnswer(e.target.value)}
                rows={3}
                className="text-base"
                data-testid="textarea-answer"
              />
            ) : (
              <div className="space-y-2">
                {options.map((option: string, idx: number) => {
                  const isSelected = selectedAnswers[currentQuestion] === idx;
                  
                  let buttonClass = "w-full p-3 text-left rounded-lg border-2 transition-all text-sm ";
                  
                  if (showFeedback) {
                    if (isSelected && isCorrect) {
                      buttonClass += "border-green-500 bg-green-50";
                    } else if (isSelected && !isCorrect) {
                      buttonClass += "border-red-500 bg-red-50";
                    } else {
                      buttonClass += "border-gray-200 opacity-50";
                    }
                  } else {
                    buttonClass += isSelected
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200";
                  }
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectAnswer(idx)}
                      disabled={showFeedback}
                      className={buttonClass}
                      data-testid={`button-option-${idx}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                          showFeedback && isSelected && isCorrect 
                            ? 'bg-green-500 text-white' 
                            : showFeedback && isSelected && !isCorrect
                            ? 'bg-red-500 text-white'
                            : isSelected 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {showFeedback && isSelected && isCorrect ? <CheckCircle className="w-4 h-4" /> : 
                           showFeedback && isSelected && !isCorrect ? <XCircle className="w-4 h-4" /> :
                           String.fromCharCode(65 + idx)}
                        </div>
                        <span className="font-medium text-gray-900">{option}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {showFeedback && !isOpenEnded && (
              <div className={`p-3 rounded-lg text-center ${
                isCorrect 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                {isCorrect ? (
                  <p className="text-lg font-bold text-green-600">✓ Jawaabta waad saxday!</p>
                ) : (
                  <p className="text-lg font-bold text-red-600">✗ Jawaabta waad khaladay</p>
                )}
              </div>
            )}

            {!showFeedback && !isOpenEnded && (
              <p className="text-center text-gray-400 text-sm">Dooro jawaab</p>
            )}

            {isOpenEnded && (
              <Button
                className="w-full h-10 bg-blue-600"
                onClick={() => {
                  setShowFeedback(true);
                  setTimeout(() => {
                    setShowFeedback(false);
                    if (currentQuestion < questions.length - 1) {
                      setCurrentQuestion(currentQuestion + 1);
                    } else {
                      setShowResults(true);
                      playApplause();
                      confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
                    }
                  }, 500);
                }}
                disabled={!hasAnswer}
                data-testid="button-next"
              >
                {currentQuestion === questions.length - 1 ? "Dhamaystir" : "Xiga →"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
