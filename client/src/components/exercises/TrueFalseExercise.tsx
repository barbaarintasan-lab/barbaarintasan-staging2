import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrueFalseExerciseProps {
  question: string;
  correctAnswer: boolean;
  onAnswer: (isCorrect: boolean, selectedAnswer: boolean) => void;
  disabled?: boolean;
  showFeedback?: boolean;
  selectedAnswer?: boolean;
}

export function TrueFalseExercise({
  question,
  correctAnswer,
  onAnswer,
  disabled = false,
  showFeedback = false,
  selectedAnswer,
}: TrueFalseExerciseProps) {
  const [selected, setSelected] = useState<boolean | null>(selectedAnswer ?? null);
  const [submitted, setSubmitted] = useState(showFeedback);

  const handleSelect = (value: boolean) => {
    if (disabled || submitted) return;
    setSelected(value);
  };

  const handleSubmit = () => {
    if (selected === null || disabled) return;
    setSubmitted(true);
    onAnswer(selected === correctAnswer, selected);
  };

  const getButtonStyle = (value: boolean) => {
    if (!submitted) {
      return selected === value
        ? value ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"
        : "border-gray-200 hover:border-gray-400";
    }
    
    if (value === correctAnswer) {
      return "border-green-500 bg-green-100";
    }
    if (value === selected && value !== correctAnswer) {
      return "border-red-500 bg-red-100";
    }
    return "border-gray-200 opacity-50";
  };

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium text-gray-900">{question}</p>
      
      <div className="grid grid-cols-2 gap-4">
        <Card
          data-testid="option-true"
          className={cn(
            "p-6 cursor-pointer transition-all border-2 flex flex-col items-center gap-2",
            getButtonStyle(true),
            disabled && "cursor-not-allowed"
          )}
          onClick={() => handleSelect(true)}
        >
          {submitted && correctAnswer === true ? (
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          ) : submitted && selected === true && correctAnswer !== true ? (
            <XCircle className="h-8 w-8 text-red-500" />
          ) : (
            <ThumbsUp className={cn(
              "h-8 w-8",
              selected === true ? "text-green-500" : "text-gray-400"
            )} />
          )}
          <span className="font-semibold text-lg">Waa Run</span>
        </Card>
        
        <Card
          data-testid="option-false"
          className={cn(
            "p-6 cursor-pointer transition-all border-2 flex flex-col items-center gap-2",
            getButtonStyle(false),
            disabled && "cursor-not-allowed"
          )}
          onClick={() => handleSelect(false)}
        >
          {submitted && correctAnswer === false ? (
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          ) : submitted && selected === false && correctAnswer !== false ? (
            <XCircle className="h-8 w-8 text-red-500" />
          ) : (
            <ThumbsDown className={cn(
              "h-8 w-8",
              selected === false ? "text-red-500" : "text-gray-400"
            )} />
          )}
          <span className="font-semibold text-lg">Waa Been</span>
        </Card>
      </div>

      {!submitted && (
        <Button
          data-testid="submit-answer"
          onClick={handleSubmit}
          disabled={selected === null || disabled}
          className="w-full"
        >
          Jawaab
        </Button>
      )}

      {submitted && (
        <div className={cn(
          "p-3 rounded-lg text-center font-medium",
          selected === correctAnswer
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800"
        )}>
          {selected === correctAnswer
            ? "Saxan! Waa ku fiicantahay! ✓"
            : `Khalad. Jawaabta saxda ah waa: ${correctAnswer ? "Waa Run" : "Waa Been"}`}
        </div>
      )}
    </div>
  );
}
