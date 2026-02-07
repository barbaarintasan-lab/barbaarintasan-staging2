import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultipleChoiceExerciseProps {
  question: string;
  options: string[];
  correctAnswer: number;
  onAnswer: (isCorrect: boolean, selectedAnswer: number) => void;
  disabled?: boolean;
  showFeedback?: boolean;
  selectedAnswer?: number;
}

export function MultipleChoiceExercise({
  question,
  options,
  correctAnswer,
  onAnswer,
  disabled = false,
  showFeedback = false,
  selectedAnswer,
}: MultipleChoiceExerciseProps) {
  const [selected, setSelected] = useState<number | null>(selectedAnswer ?? null);
  const [submitted, setSubmitted] = useState(showFeedback);

  const handleSelect = (index: number) => {
    if (disabled || submitted) return;
    setSelected(index);
  };

  const handleSubmit = () => {
    if (selected === null || disabled) return;
    setSubmitted(true);
    onAnswer(selected === correctAnswer, selected);
  };

  const getOptionStyle = (index: number) => {
    if (!submitted) {
      return selected === index
        ? "border-primary bg-primary/5"
        : "border-gray-200 hover:border-primary/50";
    }
    
    if (index === correctAnswer) {
      return "border-green-500 bg-green-50";
    }
    if (index === selected && index !== correctAnswer) {
      return "border-red-500 bg-red-50";
    }
    return "border-gray-200 opacity-50";
  };

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium text-gray-900">{question}</p>
      
      <div className="space-y-2">
        {options.map((option, index) => (
          <Card
            key={index}
            data-testid={`option-${index}`}
            className={cn(
              "p-4 cursor-pointer transition-all border-2",
              getOptionStyle(index),
              disabled && "cursor-not-allowed"
            )}
            onClick={() => handleSelect(index)}
          >
            <div className="flex items-center gap-3">
              {submitted ? (
                index === correctAnswer ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : index === selected ? (
                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 flex-shrink-0" />
                )
              ) : (
                <Circle
                  className={cn(
                    "h-5 w-5 flex-shrink-0",
                    selected === index ? "text-primary fill-primary" : "text-gray-300"
                  )}
                />
              )}
              <span className={cn(
                "text-base",
                submitted && index === correctAnswer && "font-semibold text-green-700",
                submitted && index === selected && index !== correctAnswer && "text-red-700"
              )}>
                {option}
              </span>
            </div>
          </Card>
        ))}
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
            : "Khalad. Jawaabta saxda ah waa: " + options[correctAnswer]}
        </div>
      )}
    </div>
  );
}
