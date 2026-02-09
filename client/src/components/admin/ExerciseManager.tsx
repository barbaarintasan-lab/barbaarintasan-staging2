import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Brain, Save, ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Exercise {
  id: string;
  lessonId: string;
  exerciseType: string;
  question: string;
  options: any;
  correctAnswer: any;
  order: number;
}

interface Lesson {
  id: string;
  title: string;
  courseId: string;
}

interface Course {
  id: string;
  title: string;
}

export function ExerciseManager() {
  const queryClient = useQueryClient();
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  
  const [exerciseType, setExerciseType] = useState<string>("multiple_choice");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState<number>(0);
  const [trueFalseAnswer, setTrueFalseAnswer] = useState<boolean>(true);
  const [fillBlankAnswer, setFillBlankAnswer] = useState("");
  const [dragItems, setDragItems] = useState<{ id: string; text: string }[]>([]);
  const [dragTargets, setDragTargets] = useState<{ id: string; text: string }[]>([]);
  const [dragMatches, setDragMatches] = useState<Record<string, string>>({});

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ["courses"],
    queryFn: async () => {
      const res = await fetch("/api/courses", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch courses");
      return res.json();
    },
  });

  const { data: lessons = [] } = useQuery<Lesson[]>({
    queryKey: ["lessons"],
    queryFn: async () => {
      const res = await fetch("/api/lessons", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch lessons");
      return res.json();
    },
  });

  const { data: exercises = [], refetch: refetchExercises } = useQuery<Exercise[]>({
    queryKey: ["adminExercises", selectedLesson],
    queryFn: async () => {
      if (!selectedLesson) return [];
      const res = await fetch(`/api/admin/exercises/${selectedLesson}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedLesson,
  });

  const createExercise = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create exercise");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Exercise cusub lagu daray!");
      refetchExercises();
      resetForm();
    },
    onError: () => {
      toast.error("Waa la waayay in la daro exercise-ka");
    },
  });

  const deleteExercise = useMutation({
    mutationFn: async (exerciseId: string) => {
      const res = await fetch(`/api/admin/exercises/${exerciseId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete exercise");
    },
    onSuccess: () => {
      toast.success("Exercise-ka waa la tirtiray");
      refetchExercises();
    },
    onError: () => {
      toast.error("Waa la waayay in la tirtiro exercise-ka");
    },
  });

  const resetForm = () => {
    setQuestion("");
    setOptions(["", "", "", ""]);
    setCorrectAnswer(0);
    setTrueFalseAnswer(true);
    setFillBlankAnswer("");
    setDragItems([]);
    setDragTargets([]);
    setDragMatches({});
  };

  const handleAddOption = () => {
    setOptions([...options, ""]);
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
    if (correctAnswer >= newOptions.length) {
      setCorrectAnswer(0);
    }
  };

  const handleAddDragItem = () => {
    const id = `item_${Date.now()}`;
    setDragItems([...dragItems, { id, text: "" }]);
  };

  const handleAddDragTarget = () => {
    const id = `target_${Date.now()}`;
    setDragTargets([...dragTargets, { id, text: "" }]);
  };

  const handleSubmitExercise = () => {
    if (!selectedLesson || !question.trim()) {
      toast.error("Fadlan dooro cashar oo ku qor su'aal");
      return;
    }

    let exerciseData: any = {
      lessonId: String(selectedLesson),
      exerciseType,
      question,
      title: question.substring(0, 100),
      options: null,
      correctAnswer: null,
    };

    switch (exerciseType) {
      case "multiple_choice":
        if (options.filter(o => o.trim()).length < 2) {
          toast.error("U baahan tahay ugu yaraan 2 doorasho");
          return;
        }
        exerciseData.options = JSON.stringify(options.filter(o => o.trim()));
        exerciseData.correctAnswer = JSON.stringify(correctAnswer);
        break;
        
      case "true_false":
        exerciseData.correctAnswer = JSON.stringify(trueFalseAnswer);
        break;
        
      case "fill_blank":
        if (!fillBlankAnswer.trim()) {
          toast.error("Fadlan ku qor jawaabta saxda ah");
          return;
        }
        exerciseData.correctAnswer = JSON.stringify(fillBlankAnswer.trim());
        break;
        
      case "drag_drop":
        if (dragItems.length < 2 || dragTargets.length < 2) {
          toast.error("U baahan tahay ugu yaraan 2 item iyo 2 target");
          return;
        }
        exerciseData.options = JSON.stringify({
          items: dragItems.filter(i => i.text.trim()),
          targets: dragTargets.filter(t => t.text.trim()),
        });
        exerciseData.correctAnswer = JSON.stringify(dragMatches);
        break;
    }

    createExercise.mutate(exerciseData);
  };

  const filteredLessons = selectedCourse
    ? lessons.filter(l => l.courseId === selectedCourse)
    : lessons;

  const getExerciseTypeLabel = (type: string) => {
    switch (type) {
      case "multiple_choice": return "Doorasho Badan";
      case "true_false": return "Run ama Been";
      case "fill_blank": return "Meel Faaruq";
      case "drag_drop": return "Jiid oo Dhig";
      default: return type;
    }
  };

  return (
    <Card className="border-none shadow-md bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          Maaraynta Exercise-yada
        </CardTitle>
        <CardDescription>Ku dar exercises interactive casharada</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Dooro Koorso</Label>
            <Select
              value={selectedCourse || ""}
              onValueChange={(val) => {
                setSelectedCourse(val);
                setSelectedLesson(null);
              }}
            >
              <SelectTrigger data-testid="select-course-exercises">
                <SelectValue placeholder="Dooro koorso..." />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Dooro Cashar</Label>
            <Select
              value={selectedLesson || ""}
              onValueChange={(val) => setSelectedLesson(val)}
              disabled={!selectedCourse}
            >
              <SelectTrigger data-testid="select-lesson-exercises">
                <SelectValue placeholder="Dooro cashar..." />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                {filteredLessons.map((lesson) => (
                  <SelectItem key={lesson.id} value={lesson.id}>
                    {lesson.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedLesson && (
          <>
            <div className="border-t pt-6">
              <h3 className="font-bold text-lg mb-4">Abuur Exercise Cusub</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nooca Exercise</Label>
                  <Select value={exerciseType} onValueChange={setExerciseType}>
                    <SelectTrigger data-testid="select-exercise-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple_choice">Doorasho Badan (Multiple Choice)</SelectItem>
                      <SelectItem value="true_false">Run ama Been (True/False)</SelectItem>
                      <SelectItem value="fill_blank">Meel Faaruq (Fill in Blank)</SelectItem>
                      <SelectItem value="drag_drop">Jiid oo Dhig (Drag & Drop)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Su'aasha</Label>
                  <Textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ku qor su'aasha halkan..."
                    rows={2}
                    data-testid="input-exercise-question"
                  />
                  {exerciseType === "fill_blank" && (
                    <p className="text-xs text-gray-500">Isticmaal ___ (saddex sariiqo) meesha banaan ee jawaabta</p>
                  )}
                </div>

                {exerciseType === "multiple_choice" && (
                  <div className="space-y-3">
                    <Label>Doorashoyinka</Label>
                    {options.map((option, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correctAnswer"
                          checked={correctAnswer === index}
                          onChange={() => setCorrectAnswer(index)}
                          className="w-4 h-4"
                        />
                        <Input
                          value={option}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          placeholder={`Doorasho ${index + 1}`}
                          className="flex-1"
                          data-testid={`input-option-${index}`}
                        />
                        {options.length > 2 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveOption(index)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={handleAddOption} data-testid="button-add-option">
                      <Plus className="w-4 h-4 mr-1" /> Ku dar doorasho
                    </Button>
                  </div>
                )}

                {exerciseType === "true_false" && (
                  <div className="space-y-2">
                    <Label>Jawaabta Saxda ah</Label>
                    <div className="flex gap-4">
                      <Button
                        variant={trueFalseAnswer ? "default" : "outline"}
                        onClick={() => setTrueFalseAnswer(true)}
                        data-testid="button-true"
                      >
                        Waa Run
                      </Button>
                      <Button
                        variant={!trueFalseAnswer ? "default" : "outline"}
                        onClick={() => setTrueFalseAnswer(false)}
                        data-testid="button-false"
                      >
                        Waa Been
                      </Button>
                    </div>
                  </div>
                )}

                {exerciseType === "fill_blank" && (
                  <div className="space-y-2">
                    <Label>Jawaabta Saxda ah</Label>
                    <Input
                      value={fillBlankAnswer}
                      onChange={(e) => setFillBlankAnswer(e.target.value)}
                      placeholder="Jawaabta saxda ah..."
                      data-testid="input-fill-blank-answer"
                    />
                  </div>
                )}

                {exerciseType === "drag_drop" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Items (Waxyaalaha la jiido)</Label>
                        {dragItems.map((item, index) => (
                          <div key={item.id} className="flex items-center gap-2">
                            <GripVertical className="w-4 h-4 text-gray-400" />
                            <Input
                              value={item.text}
                              onChange={(e) => {
                                const newItems = [...dragItems];
                                newItems[index].text = e.target.value;
                                setDragItems(newItems);
                              }}
                              placeholder={`Item ${index + 1}`}
                              className="flex-1"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDragItems(dragItems.filter(i => i.id !== item.id))}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={handleAddDragItem}>
                          <Plus className="w-4 h-4 mr-1" /> Ku dar Item
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label>Targets (Meesha lagu dhigo)</Label>
                        {dragTargets.map((target, index) => (
                          <div key={target.id} className="flex items-center gap-2">
                            <Input
                              value={target.text}
                              onChange={(e) => {
                                const newTargets = [...dragTargets];
                                newTargets[index].text = e.target.value;
                                setDragTargets(newTargets);
                              }}
                              placeholder={`Target ${index + 1}`}
                              className="flex-1"
                            />
                            <Select
                              value={dragMatches[target.id] || ""}
                              onValueChange={(val) => {
                                setDragMatches({ ...dragMatches, [target.id]: val });
                              }}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue placeholder="Match..." />
                              </SelectTrigger>
                              <SelectContent>
                                {dragItems.filter(i => i.text.trim()).map((item) => (
                                  <SelectItem key={item.id} value={item.id}>
                                    {item.text}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDragTargets(dragTargets.filter(t => t.id !== target.id));
                                const newMatches = { ...dragMatches };
                                delete newMatches[target.id];
                                setDragMatches(newMatches);
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={handleAddDragTarget}>
                          <Plus className="w-4 h-4 mr-1" /> Ku dar Target
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleSubmitExercise}
                  disabled={createExercise.isPending}
                  className="w-full"
                  data-testid="button-save-exercise"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {createExercise.isPending ? "Kaydinaya..." : "Kaydi Exercise"}
                </Button>
              </div>
            </div>

            {exercises.length > 0 && (
              <div className="border-t pt-6">
                <h3 className="font-bold text-lg mb-4">Exercises-ka Jira ({exercises.length})</h3>
                <div className="space-y-3">
                  {exercises.sort((a, b) => a.order - b.order).map((exercise, index) => (
                    <Card key={exercise.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary">{index + 1}</Badge>
                              <Badge variant="outline">{getExerciseTypeLabel(exercise.exerciseType)}</Badge>
                            </div>
                            <p className="text-sm font-medium">{exercise.question}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedExercise(
                                expandedExercise === exercise.id ? null : exercise.id
                              )}
                            >
                              {expandedExercise === exercise.id ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteExercise.mutate(exercise.id)}
                              data-testid={`delete-exercise-${exercise.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                        
                        {expandedExercise === exercise.id && (
                          <div className="mt-4 pt-4 border-t text-sm text-gray-600">
                            <p><strong>Jawaabta:</strong> {JSON.stringify(exercise.correctAnswer)}</p>
                            {exercise.options && (
                              <p><strong>Doorashoyinka:</strong> {JSON.stringify(exercise.options)}</p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
