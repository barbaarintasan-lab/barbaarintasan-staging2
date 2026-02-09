import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Plus, Trash2, ChevronLeft } from "lucide-react";
import { Link, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export default function QuizCreator() {
  const [, params] = useRoute("/admin/quiz/:lessonId");
  const lessonId = params?.lessonId;
  
  const [quizTitle, setQuizTitle] = useState("");
  const [passingScore, setPassingScore] = useState(70);
  const [questions, setQuestions] = useState([
    { question: "", options: ["", "", "", ""], correctAnswer: 0 }
  ]);

  const createQuizMutation = useMutation({
    mutationFn: async () => {
      if (!quizTitle.trim() || !lessonId) {
        throw new Error("Quiz title and lesson required");
      }

      const quizRes = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          title: quizTitle,
          passingScore,
        }),
      });

      if (!quizRes.ok) throw new Error("Failed to create quiz");
      const quiz = await quizRes.json();

      for (const q of questions) {
        if (q.question.trim()) {
          await fetch("/api/quiz-questions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              quizId: quiz.id,
              question: q.question,
              options: JSON.stringify(q.options),
              correctAnswer: q.correctAnswer,
              order: questions.indexOf(q),
            }),
          });
        }
      }

      return quiz;
    },
    onSuccess: () => {
      toast.success("Quiz created successfully!");
      setQuizTitle("");
      setQuestions([{ question: "", options: ["", "", "", ""], correctAnswer: 0 }]);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create quiz");
    },
  });

  const handleAddQuestion = () => {
    setQuestions([...questions, { question: "", options: ["", "", "", ""], correctAnswer: 0 }]);
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index: number, field: string, value: any) => {
    const updated = [...questions];
    if (field === "question") {
      updated[index].question = value;
    } else if (field === "correctAnswer") {
      updated[index].correctAnswer = value;
    }
    setQuestions(updated);
  };

  const handleOptionChange = (qIndex: number, oIndex: number, value: string) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/admin">
          <Button variant="ghost" className="mb-6">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Ku Noqo Admin
          </Button>
        </Link>

        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <h2 className="text-2xl font-bold">Abuuri Quiz Cusub</h2>
            <CardDescription className="text-blue-100">Buufi su'aalaha 5 oo keli ah</CardDescription>
          </CardHeader>

          <CardContent className="p-8 space-y-8">
            {/* Quiz Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Cinwaanka Quiz-ka</Label>
              <Input
                id="title"
                placeholder="Tusaale: Quiz - Koorsada Bisha Kowaad"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                data-testid="input-quiz-title"
              />
            </div>

            {/* Passing Score */}
            <div className="space-y-2">
              <Label htmlFor="passing">Dereje Guulaynta (%)</Label>
              <Input
                id="passing"
                type="number"
                min="0"
                max="100"
                value={passingScore}
                onChange={(e) => setPassingScore(Number(e.target.value))}
                data-testid="input-passing-score"
              />
            </div>

            {/* Questions */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-900">Su'aalaha</h3>
              {questions.map((q, qIndex) => (
                <Card key={qIndex} className="border-2 border-gray-200">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <Label className="text-base font-semibold">Su'aal {qIndex + 1}</Label>
                      {questions.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveQuestion(qIndex)}
                          data-testid={`button-remove-question-${qIndex}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>

                    <Input
                      placeholder="Gali su'aalahaaga hoose"
                      value={q.question}
                      onChange={(e) => handleQuestionChange(qIndex, "question", e.target.value)}
                      data-testid={`input-question-${qIndex}`}
                    />

                    {/* Options */}
                    <div className="space-y-2">
                      {q.options.map((option, oIndex) => (
                        <div key={oIndex} className="flex gap-2 items-center">
                          <input
                            type="radio"
                            name={`correct-${qIndex}`}
                            checked={q.correctAnswer === oIndex}
                            onChange={() => handleQuestionChange(qIndex, "correctAnswer", oIndex)}
                            data-testid={`radio-correct-${qIndex}-${oIndex}`}
                          />
                          <Input
                            placeholder={`Jawaab ${oIndex + 1}`}
                            value={option}
                            onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                            data-testid={`input-option-${qIndex}-${oIndex}`}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={handleAddQuestion}
                data-testid="button-add-question"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ku Dar Su'aal
              </Button>

              <Button
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600"
                onClick={() => createQuizMutation.mutate()}
                disabled={createQuizMutation.isPending}
                data-testid="button-save-quiz"
              >
                {createQuizMutation.isPending ? "Kaydinta..." : "Kaydiso Quiz-ka"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
