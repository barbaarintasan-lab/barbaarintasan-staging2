import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FillBlankExerciseProps {
  question: string;
  correctAnswer: string;
  acceptableAnswers?: string[];
  onAnswer: (isCorrect: boolean, userAnswer: string) => void;
  disabled?: boolean;
  showFeedback?: boolean;
  userAnswer?: string;
}

export function FillBlankExercise({
  question,
  correctAnswer,
  acceptableAnswers = [],
  onAnswer,
  disabled = false,
  showFeedback = false,
  userAnswer,
}: FillBlankExerciseProps) {
  const [answer, setAnswer] = useState(userAnswer ?? "");
  const [submitted, setSubmitted] = useState(showFeedback);

  const normalizeAnswer = (text: string) => {
    return text.trim().toLowerCase().replace(/\s+/g, " ");
  };

  const checkAnswer = (input: string) => {
    const normalized = normalizeAnswer(input);
    const allAcceptable = [correctAnswer, ...acceptableAnswers].map(normalizeAnswer);
    return allAcceptable.includes(normalized);
  };

  const handleSubmit = () => {
    if (!answer.trim() || disabled) return;
    const isCorrect = checkAnswer(answer);
    setSubmitted(true);
    onAnswer(isCorrect, answer);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && answer.trim() && !disabled && !submitted) {
      handleSubmit();
    }
  };

  const isCorrect = checkAnswer(answer);

  const parts = question.split("___");

  return (
    <div className="space-y-4">
      <div className="text-lg text-gray-900">
        {parts.length === 2 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{parts[0]}</span>
            <div className="relative inline-flex items-center">
              <Input
                data-testid="fill-blank-input"
                value={answer}
                onChange={(e) => !submitted && !disabled && setAnswer(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={disabled || submitted}
                className={cn(
                  "w-40 text-center font-medium",
                  submitted && isCorrect && "border-green-500 bg-green-50 text-green-700",
                  submitted && !isCorrect && "border-red-500 bg-red-50 text-red-700"
                )}
                placeholder="..."
              />
              {submitted && (
                isCorrect ? (
                  <CheckCircle2 className="absolute -right-6 h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="absolute -right-6 h-5 w-5 text-red-500" />
                )
              )}
            </div>
            <span className="font-medium">{parts[1]}</span>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="font-medium">{question}</p>
            <div className="relative">
              <Input
                data-testid="fill-blank-input"
                value={answer}
                onChange={(e) => !submitted && !disabled && setAnswer(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={disabled || submitted}
                className={cn(
                  "text-center font-medium text-lg py-3",
                  submitted && isCorrect && "border-green-500 bg-green-50 text-green-700",
                  submitted && !isCorrect && "border-red-500 bg-red-50 text-red-700"
                )}
                placeholder="Jawaabta halkan ku qor..."
              />
              {submitted && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {!submitted && (
        <Button
          data-testid="submit-answer"
          onClick={handleSubmit}
          disabled={!answer.trim() || disabled}
          className="w-full"
        >
          Jawaab
        </Button>
      )}

      {submitted && (
        <div className={cn(
          "p-3 rounded-lg text-center font-medium",
          isCorrect
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800"
        )}>
          {isCorrect
            ? "Saxan! Waa ku fiicantahay! ✓"
            : `Khalad. Jawaabta saxda ah waa: "${correctAnswer}"`}
        </div>
      )}
    </div>
  );
}
