import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, GripVertical, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DragDropExerciseProps {
  question: string;
  items: { id: string; text: string }[];
  targets: { id: string; text: string }[];
  correctMatches: Record<string, string>;
  onAnswer: (isCorrect: boolean, userMatches: Record<string, string>) => void;
  disabled?: boolean;
  showFeedback?: boolean;
  userMatches?: Record<string, string>;
}

export function DragDropExercise({
  question,
  items,
  targets,
  correctMatches,
  onAnswer,
  disabled = false,
  showFeedback = false,
  userMatches: initialMatches,
}: DragDropExerciseProps) {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>(initialMatches ?? {});
  const [submitted, setSubmitted] = useState(showFeedback);

  const handleItemClick = (itemId: string) => {
    if (disabled || submitted) return;
    
    const assignedTarget = Object.entries(matches).find(([_, v]) => v === itemId)?.[0];
    if (assignedTarget) {
      const newMatches = { ...matches };
      delete newMatches[assignedTarget];
      setMatches(newMatches);
      setSelectedItem(itemId);
    } else {
      setSelectedItem(selectedItem === itemId ? null : itemId);
    }
  };

  const handleTargetClick = (targetId: string) => {
    if (disabled || submitted || !selectedItem) return;
    
    const newMatches = { ...matches };
    
    const existingItemForTarget = newMatches[targetId];
    if (existingItemForTarget) {
      delete newMatches[targetId];
    }
    
    newMatches[targetId] = selectedItem;
    setMatches(newMatches);
    setSelectedItem(null);
  };

  const handleSubmit = () => {
    if (disabled || Object.keys(matches).length !== targets.length) return;
    
    const isCorrect = Object.entries(correctMatches).every(
      ([targetId, itemId]) => matches[targetId] === itemId
    );
    
    setSubmitted(true);
    onAnswer(isCorrect, matches);
  };

  const getItemStyle = (itemId: string) => {
    const isAssigned = Object.values(matches).includes(itemId);
    
    if (submitted) {
      const targetId = Object.entries(matches).find(([_, v]) => v === itemId)?.[0];
      if (targetId && correctMatches[targetId] === itemId) {
        return "border-green-500 bg-green-50";
      }
      if (targetId) {
        return "border-red-500 bg-red-50";
      }
      return "opacity-50";
    }
    
    if (selectedItem === itemId) {
      return "border-primary bg-primary/10 ring-2 ring-primary";
    }
    
    if (isAssigned) {
      return "opacity-50 cursor-not-allowed";
    }
    
    return "border-gray-200 hover:border-primary/50 cursor-pointer";
  };

  const getTargetStyle = (targetId: string) => {
    if (submitted) {
      if (correctMatches[targetId] === matches[targetId]) {
        return "border-green-500 bg-green-50";
      }
      if (matches[targetId]) {
        return "border-red-500 bg-red-50";
      }
      return "border-gray-300";
    }
    
    if (matches[targetId]) {
      return "border-primary bg-primary/5";
    }
    
    if (selectedItem) {
      return "border-dashed border-primary/50 bg-primary/5 cursor-pointer";
    }
    
    return "border-dashed border-gray-300";
  };

  const getMatchedItem = (targetId: string) => {
    const matchedItemId = matches[targetId];
    if (!matchedItemId) return null;
    return items.find(item => item.id === matchedItemId);
  };

  const allMatched = Object.keys(matches).length === targets.length;
  const correctCount = Object.entries(correctMatches).filter(
    ([targetId, itemId]) => matches[targetId] === itemId
  ).length;

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium text-gray-900">{question}</p>
      
      <div className="space-y-3">
        <p className="text-sm text-gray-500 font-medium">Dooro mid ka mid ah:</p>
        <div className="flex flex-wrap gap-2">
          {items.map((item) => {
            const isAssigned = Object.values(matches).includes(item.id);
            return (
              <Card
                key={item.id}
                data-testid={`item-${item.id}`}
                className={cn(
                  "px-4 py-2 transition-all border-2 flex items-center gap-2",
                  getItemStyle(item.id),
                  !isAssigned && !disabled && !submitted && "cursor-pointer"
                )}
                onClick={() => !isAssigned && handleItemClick(item.id)}
              >
                <GripVertical className="h-4 w-4 text-gray-400" />
                <span className="font-medium">{item.text}</span>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="flex justify-center py-2">
        <ArrowRight className="h-6 w-6 text-gray-400" />
      </div>

      <div className="space-y-3">
        <p className="text-sm text-gray-500 font-medium">Ku dhig meesha saxda ah:</p>
        <div className="space-y-2">
          {targets.map((target) => {
            const matchedItem = getMatchedItem(target.id);
            return (
              <div
                key={target.id}
                data-testid={`target-${target.id}`}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 transition-all",
                  getTargetStyle(target.id),
                  selectedItem && !matches[target.id] && "cursor-pointer"
                )}
                onClick={() => handleTargetClick(target.id)}
              >
                <div className="flex-1 font-medium text-gray-700">{target.text}</div>
                <div className="w-32 min-h-[2.5rem] flex items-center justify-center rounded border bg-white">
                  {matchedItem ? (
                    <span className="font-semibold text-primary">{matchedItem.text}</span>
                  ) : (
                    <span className="text-gray-400 text-sm">...</span>
                  )}
                </div>
                {submitted && (
                  correctMatches[target.id] === matches[target.id] ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>

      {!submitted && (
        <Button
          data-testid="submit-answer"
          onClick={handleSubmit}
          disabled={!allMatched || disabled}
          className="w-full"
        >
          Jawaab
        </Button>
      )}

      {submitted && (
        <div className={cn(
          "p-3 rounded-lg text-center font-medium",
          correctCount === targets.length
            ? "bg-green-100 text-green-800"
            : "bg-orange-100 text-orange-800"
        )}>
          {correctCount === targets.length
            ? "Saxan dhamaan! Waa ku fiicantahay! ✓"
            : `${correctCount}/${targets.length} saxan. Isku day mar kale!`}
        </div>
      )}
    </div>
  );
}
