import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle, XCircle, Shield, Bot, Clock, User, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AiModerationReport {
  id: string;
  contentType: string;
  contentId: string;
  roomId: string | null;
  userId: string | null;
  displayName: string | null;
  originalContent: string;
  violationType: string;
  confidenceScore: number;
  aiExplanation: string | null;
  actionTaken: string;
  status: string;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  adminNotes: string | null;
  userNotified: boolean;
  createdAt: Date;
}

interface ModerationStats {
  pending: number;
  approved: number;
  dismissed: number;
  falsePositiveRate: string | number;
}

const violationLabels: Record<string, { label: string; color: string }> = {
  hate_speech: { label: "Nacayb-Hadal", color: "bg-red-600" },
  harassment: { label: "Dhibaato", color: "bg-orange-600" },
  threat: { label: "Hanjabad", color: "bg-red-700" },
  sexual: { label: "Galmo", color: "bg-pink-600" },
  spam: { label: "Spam", color: "bg-yellow-600" },
  harmful_to_children: { label: "Dhibaato Carruurta", color: "bg-purple-600" },
  unknown: { label: "Aan la aqoon", color: "bg-gray-600" },
};

export default function AIModerationPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("pending");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [actionTaken, setActionTaken] = useState("none");

  const { data: stats } = useQuery<ModerationStats>({
    queryKey: ["/api/admin/ai-moderation/stats"],
  });

  const { data: reports = [], isLoading } = useQuery<AiModerationReport[]>({
    queryKey: ["/api/admin/ai-moderation", selectedTab],
    queryFn: async () => {
      const res = await fetch(`/api/admin/ai-moderation?status=${selectedTab}`);
      if (!res.ok) throw new Error("Failed to fetch reports");
      return res.json();
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, restoreMessage }: { id: string; status: string; restoreMessage?: boolean }) => {
      const res = await fetch(`/api/admin/ai-moderation/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          adminNotes,
          actionTaken,
          restoreMessage,
        }),
      });
      if (!res.ok) throw new Error("Failed to update report");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-moderation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-moderation/stats"] });
      toast({ title: "Waa la cusbooneysiiyay", description: "Warbixinta waa la dib u eegay" });
      setReviewingId(null);
      setAdminNotes("");
      setActionTaken("none");
    },
  });

  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return "text-red-600";
    if (score >= 0.8) return "text-orange-500";
    if (score >= 0.7) return "text-yellow-500";
    return "text-green-500";
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("so-SO", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">AI Moderation</h2>
            <p className="text-sm text-muted-foreground">Fariimaha AI-ga qabsaday</p>
          </div>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold text-yellow-700">{stats.pending}</div>
                <div className="text-xs text-yellow-600">Sugaya</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-700">{stats.approved}</div>
                <div className="text-xs text-green-600">Xaqiijiyay</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
            <CardContent className="p-4 flex items-center gap-3">
              <XCircle className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-700">{stats.dismissed}</div>
                <div className="text-xs text-blue-600">Khalad AI</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200">
            <CardContent className="p-4 flex items-center gap-3">
              <Shield className="h-8 w-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold text-purple-700">{stats.falsePositiveRate}%</div>
                <div className="text-xs text-purple-600">False Positive</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Sugaya ({stats?.pending || 0})
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Xaqiijiyay
          </TabsTrigger>
          <TabsTrigger value="dismissed" className="gap-2">
            <XCircle className="h-4 w-4" />
            Khalad AI
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : reports.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Wax warbixin ah ma jiraan</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <Card key={report.id} className="overflow-hidden">
                  <CardHeader className="py-3 px-4 bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        <div>
                          <Badge 
                            className={`${violationLabels[report.violationType]?.color || 'bg-gray-500'} text-white`}
                          >
                            {violationLabels[report.violationType]?.label || report.violationType}
                          </Badge>
                          <span className={`ml-2 text-sm font-medium ${getConfidenceColor(report.confidenceScore)}`}>
                            {(report.confidenceScore * 100).toFixed(0)}% yaqiin
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(report.createdAt)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <div className="text-sm font-medium">{report.displayName || "Unknown"}</div>
                        {report.userId && (
                          <div className="text-xs text-muted-foreground">ID: {report.userId.slice(0, 8)}...</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200">
                        <p className="text-sm">{report.originalContent}</p>
                      </div>
                    </div>

                    {report.aiExplanation && (
                      <div className="flex items-start gap-3">
                        <Bot className="h-5 w-5 text-purple-500 mt-0.5" />
                        <div className="flex-1 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                          <p className="text-sm text-purple-700 dark:text-purple-300">
                            {report.aiExplanation}
                          </p>
                        </div>
                      </div>
                    )}

                    {report.status === "pending" && (
                      <>
                        {reviewingId === report.id ? (
                          <div className="space-y-3 pt-3 border-t">
                            <Textarea
                              placeholder="Qoraalkaaga (ikhtiyaari)..."
                              value={adminNotes}
                              onChange={(e) => setAdminNotes(e.target.value)}
                              rows={2}
                            />
                            <Select value={actionTaken} onValueChange={setActionTaken}>
                              <SelectTrigger>
                                <SelectValue placeholder="Tallaabo..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Wax tallaabo ah</SelectItem>
                                <SelectItem value="warning">Dig</SelectItem>
                                <SelectItem value="muted">Aammus (1 saac)</SelectItem>
                                <SelectItem value="suspended">Hakid (1 maalin)</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => reviewMutation.mutate({ id: report.id, status: "approved" })}
                                disabled={reviewMutation.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Xaqiiji (Xafid)
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => reviewMutation.mutate({ id: report.id, status: "dismissed", restoreMessage: true })}
                                disabled={reviewMutation.isPending}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Khalad AI (Soo celi)
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setReviewingId(null)}
                              >
                                Ka noqo
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => setReviewingId(report.id)}
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            Dib u eeg
                          </Button>
                        )}
                      </>
                    )}

                    {report.status !== "pending" && report.adminNotes && (
                      <div className="pt-3 border-t">
                        <div className="text-xs text-muted-foreground mb-1">Qoraalka Admin:</div>
                        <p className="text-sm">{report.adminNotes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
