import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ClipboardList, Send, Loader2, CheckCircle, Clock, XCircle, RefreshCw } from "lucide-react";
import { Link, useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useParentAuth } from "@/contexts/ParentAuthContext";

export default function AssignmentView() {
  const [, params] = useRoute("/assignment/:id");
  const assignmentId = params?.id;
  const [, setLocation] = useLocation();
  const [submissionContent, setSubmissionContent] = useState("");
  const queryClient = useQueryClient();
  const { parent } = useParentAuth();

  const { data: assignment, isLoading } = useQuery({
    queryKey: ["assignment", assignmentId],
    queryFn: async () => {
      const res = await fetch(`/api/assignments/${assignmentId}`);
      if (!res.ok) throw new Error("Assignment not found");
      return res.json();
    },
  });

  const { data: courses } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const res = await fetch("/api/courses");
      if (!res.ok) throw new Error("Failed to fetch courses");
      return res.json();
    },
  });

  const { data: existingSubmission } = useQuery({
    queryKey: ["assignmentSubmission", assignmentId, parent?.id],
    queryFn: async () => {
      if (!parent?.id) return null;
      const res = await fetch(`/api/assignment-submissions?assignmentId=${assignmentId}&parentId=${parent.id}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.length > 0 ? data[0] : null;
    },
    enabled: !!parent?.id && !!assignmentId,
  });

  const submitMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch("/api/assignment-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          assignmentId,
          parentId: parent?.id,
          content,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Hawlgalkaaga waa la diray!");
      queryClient.invalidateQueries({ queryKey: ["assignmentSubmission", assignmentId] });
      setSubmissionContent("");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay. Fadlan isku day mar kale.");
    },
  });

  const course = courses?.find((c: any) => c.id === assignment?.lesson?.courseId);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <ClipboardList className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-700 mb-2">Hawlgalka lama helin</h2>
        <Link href="/courses">
          <Button variant="outline">Dib ugu noqo Koorsadaha</Button>
        </Link>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submissionContent.trim()) {
      toast.error("Fadlan qor wax hawlgalka ku saabsan");
      return;
    }
    if (!parent) {
      toast.error("Fadlan soo gal si aad u dirto hawlgalka");
      return;
    }
    submitMutation.mutate(submissionContent);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href={course ? `/course/${course.courseId}` : "/courses"}>
          <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-back">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-900 truncate text-sm" data-testid="text-assignment-title">
            Hawlgal: {assignment.title}
          </h1>
          {assignment.lesson && (
            <p className="text-xs text-gray-500 truncate">
              {assignment.lesson.title}
            </p>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4 pb-24">
        <Card className="border-none shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <ClipboardList className="w-5 h-5" />
              {assignment.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assignment.description ? (
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                {assignment.description}
              </div>
            ) : (
              <p className="text-gray-500 italic">Sharaxaad dheeraad ah lama bixin.</p>
            )}
          </CardContent>
        </Card>

        {existingSubmission ? (
          <Card className={`border-2 ${
            existingSubmission.status === "approved" ? "border-green-300 bg-green-50" :
            existingSubmission.status === "revision_needed" ? "border-red-300 bg-red-50" :
            "border-orange-300 bg-orange-50"
          }`}>
            <CardContent className="p-4">
              {existingSubmission.status === "approved" ? (
                <div className="flex items-center gap-2 text-green-700 mb-3">
                  <CheckCircle className="w-6 h-6" />
                  <span className="font-bold text-lg">Hambalyo! Hawlgalkaaga waa la aqbalay! 🎉</span>
                </div>
              ) : existingSubmission.status === "revision_needed" ? (
                <div className="flex items-center gap-2 text-red-700 mb-3">
                  <XCircle className="w-6 h-6" />
                  <span className="font-bold text-lg">Fadlan dib u eeg hawlgalkaaga</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-orange-700 mb-3">
                  <Clock className="w-6 h-6" />
                  <span className="font-bold text-lg">Hawlgalkaaga waa la sugayaa...</span>
                </div>
              )}

              {existingSubmission.status === "approved" && (
                <div className="bg-green-100 border border-green-300 rounded-lg p-3 mb-3 text-green-800">
                  <p className="font-medium">Macalinka ayaa ku bogaadiyay shaqadaada! Sii wad koorsada.</p>
                </div>
              )}

              {existingSubmission.status === "revision_needed" && existingSubmission.feedback && (
                <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-3 text-red-800">
                  <p className="font-medium mb-1">Jawaabta Macalinka:</p>
                  <p>{existingSubmission.feedback}</p>
                </div>
              )}

              <div className="bg-white rounded-lg p-3 text-gray-700 text-sm border">
                <p className="text-xs text-gray-500 mb-1">Qoraalkaagii:</p>
                {existingSubmission.content}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                La diray: {new Date(existingSubmission.submittedAt).toLocaleDateString('so-SO')}
              </p>

              {existingSubmission.status === "revision_needed" && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-2">Fadlan dib u qor oo soo dir:</p>
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <Textarea
                      placeholder="Halkan ku qor jawaabkaaga cusub..."
                      value={submissionContent}
                      onChange={(e) => setSubmissionContent(e.target.value)}
                      className="min-h-[100px] resize-none"
                      data-testid="input-assignment-resubmit"
                    />
                    <Button
                      type="submit"
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold"
                      disabled={submitMutation.isPending || !submissionContent.trim()}
                      data-testid="button-resubmit-assignment"
                    >
                      {submitMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Waa la dirayaa...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Dib u Dir Hawlgalka
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              )}
            </CardContent>
          </Card>
        ) : parent ? (
          <Card className="border-none shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-gray-700">Soo dir Jawaabkaaga</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Textarea
                  placeholder="Halkan ku qor jawaabkaaga hawlgalka..."
                  value={submissionContent}
                  onChange={(e) => setSubmissionContent(e.target.value)}
                  className="min-h-[150px] resize-none"
                  data-testid="input-assignment-content"
                />
                <Button
                  type="submit"
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold"
                  disabled={submitMutation.isPending || !submissionContent.trim()}
                  data-testid="button-submit-assignment"
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Waa la dirayaa...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Dir Hawlgalka
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardContent className="p-4 text-center">
              <p className="text-blue-700 mb-3">Fadlan soo gal si aad u dirto hawlgalka</p>
              <Link href="/profile">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Soo Gal
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
