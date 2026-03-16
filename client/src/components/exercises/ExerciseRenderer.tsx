import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MultipleChoiceExercise } from "./MultipleChoiceExercise";
import { TrueFalseExercise } from "./TrueFalseExercise";
import { FillBlankExercise } from "./FillBlankExercise";
import { DragDropExercise } from "./DragDropExercise";
import { Brain, ChevronLeft, ChevronRight, CheckCircle2, Trophy, RefreshCw } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

interface Exercise {
  id: number | string;
  lessonId: number | string;
  exerciseType: string;
  question: string;
  options: any;
  correctAnswer: any;
  order: number;
}

interface ExerciseProgress {
  exerciseId: number | string;
  isCorrect: boolean;
  userAnswer: any;
}

interface ExerciseRendererProps {
  exercises: Exercise[];
  lessonId: string;
  existingProgress?: ExerciseProgress[];
}

export function ExerciseRenderer({ exercises, lessonId, existingProgress = [] }: ExerciseRendererProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { isCorrect: boolean; userAnswer: any }>>(() => {
    const initial: Record<string, { isCorrect: boolean; userAnswer: any }> = {};
    existingProgress.forEach(p => {
      initial[String(p.exerciseId)] = { isCorrect: p.isCorrect, userAnswer: p.userAnswer };
    });
    return initial;
  });
  const [showComplete, setShowComplete] = useState(false);

  const queryClient = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: async ({ exerciseId, answer }: { exerciseId: number | string; answer: any }) => {
      return apiRequest("POST", `/api/exercises/${exerciseId}/submit`, { answer });
    },
  });

  const handleAnswer = (exerciseId: number | string, isCorrect: boolean, userAnswer: any) => {
    const idStr = String(exerciseId);
    setAnswers(prev => ({
      ...prev,
      [idStr]: { isCorrect, userAnswer }
    }));
    
    submitMutation.mutate({ exerciseId, answer: userAnswer });
    
    const answeredCount = Object.keys(answers).length + 1;
    if (answeredCount === exercises.length) {
      const allCorrect = Object.values({ ...answers, [idStr]: { isCorrect, userAnswer } })
        .every(a => a.isCorrect);
      
      if (allCorrect) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
      
      setTimeout(() => setShowComplete(true), 1000);
    }
  };

  const handleNext = () => {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleReset = () => {
    setAnswers({});
    setCurrentIndex(0);
    setShowComplete(false);
  };

  if (!exercises.length) {
    return null;
  }

  const currentExercise = exercises[currentIndex];
  const isAnswered = !!answers[String(currentExercise.id)];
  const answeredCount = Object.keys(answers).length;
  const correctCount = Object.values(answers).filter(a => a.isCorrect).length;
  const progress = (answeredCount / exercises.length) * 100;

  const renderExercise = (exercise: Exercise) => {
    const existingAnswer = answers[String(exercise.id)];
    
    switch (exercise.exerciseType) {
      case "multiple_choice":
        return (
          <MultipleChoiceExercise
            question={exercise.question}
            options={exercise.options}
            correctAnswer={exercise.correctAnswer}
            onAnswer={(isCorrect, selected) => handleAnswer(exercise.id, isCorrect, selected)}
            showFeedback={!!existingAnswer}
            selectedAnswer={existingAnswer?.userAnswer}
          />
        );
        
      case "true_false":
        return (
          <TrueFalseExercise
            question={exercise.question}
            correctAnswer={exercise.correctAnswer}
            onAnswer={(isCorrect, selected) => handleAnswer(exercise.id, isCorrect, selected)}
            showFeedback={!!existingAnswer}
            selectedAnswer={existingAnswer?.userAnswer}
          />
        );
        
      case "fill_blank":
        return (
          <FillBlankExercise
            question={exercise.question}
            correctAnswer={exercise.correctAnswer}
            acceptableAnswers={exercise.options?.acceptableAnswers}
            onAnswer={(isCorrect, userAnswer) => handleAnswer(exercise.id, isCorrect, userAnswer)}
            showFeedback={!!existingAnswer}
            userAnswer={existingAnswer?.userAnswer}
          />
        );
        
      case "drag_drop":
        return (
          <DragDropExercise
            question={exercise.question}
            items={exercise.options?.items || []}
            targets={exercise.options?.targets || []}
            correctMatches={exercise.correctAnswer}
            onAnswer={(isCorrect, matches) => handleAnswer(exercise.id, isCorrect, matches)}
            showFeedback={!!existingAnswer}
            userMatches={existingAnswer?.userAnswer}
          />
        );
        
      default:
        return <p className="text-gray-500">Nooca exercise-ka lama aqoon: {exercise.exerciseType}</p>;
    }
  };

  if (showComplete) {
    const percentage = Math.round((correctCount / exercises.length) * 100);
    
    return (
      <Card className="mt-6 border-2 border-primary/20">
        <CardContent className="pt-6 text-center space-y-4">
          <div className={cn(
            "w-20 h-20 rounded-full mx-auto flex items-center justify-center",
            percentage >= 80 ? "bg-green-100" : percentage >= 50 ? "bg-yellow-100" : "bg-orange-100"
          )}>
            <Trophy className={cn(
              "h-10 w-10",
              percentage >= 80 ? "text-green-600" : percentage >= 50 ? "text-yellow-600" : "text-orange-600"
            )} />
          </div>
          
          <h3 className="text-xl font-bold text-gray-900">
            {percentage >= 80 ? "Aad ayaad u fiican tahay Maasha Allah!" : percentage >= 50 ? "Waa hagaag!" : "Isku day mar kale!"}
          </h3>
          
          <p className="text-gray-600">
            Waxaad saxday Jawaabaha <span className="font-bold text-primary">{correctCount}</span> ka mid ah <span className="font-bold">{exercises.length}</span> su'aalaha.
          </p>
          
          <div className="text-4xl font-bold text-primary">{percentage}%</div>
          
          <Button onClick={handleReset} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Dib u bilow
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6 border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-primary" />
            Is tijaabi
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <CheckCircle2 className="h-4 w-4" />
            {answeredCount}/{exercises.length}
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">Hadda inaad casharka fahamtay, ka jawaab su'aalahan hoos ku qoran.</p>
        <Progress value={progress} className="h-2 mt-3" />
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Su'aal {currentIndex + 1} / {exercises.length}</span>
          {isAnswered && (
            <span className={answers[String(currentExercise.id)]?.isCorrect ? "text-green-600" : "text-red-600"}>
              {answers[String(currentExercise.id)]?.isCorrect ? "✓ Saxan" : "✗ Khalad"}
            </span>
          )}
        </div>
        
        {renderExercise(currentExercise)}
        
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="gap-1"
            data-testid="prev-exercise"
          >
            <ChevronLeft className="h-4 w-4" />
            Hore
          </Button>
          
          <div className="flex gap-1">
            {exercises.map((ex, idx) => {
              const exAnswer = answers[String(ex.id)];
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={cn(
                    "w-2.5 h-2.5 rounded-full transition-colors",
                    idx === currentIndex
                      ? "bg-primary"
                      : exAnswer
                        ? exAnswer.isCorrect
                          ? "bg-green-400"
                          : "bg-red-400"
                        : "bg-gray-300"
                  )}
                  data-testid={`exercise-dot-${idx}`}
                />
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={currentIndex === exercises.length - 1}
            className="gap-1"
            data-testid="next-exercise"
          >
            Xiga
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
