import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Languages,
  Play,
  RefreshCw,
  XCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  BarChart3,
  FileText,
  BookOpen,
  GraduationCap,
  MessageSquare,
  Moon,
} from "lucide-react";

interface BatchJob {
  id: string;
  batchId: string | null;
  type: string;
  status: string;
  inputFileId: string | null;
  outputFileId: string | null;
  totalRequests: number;
  completedRequests: number;
  failedRequests: number;
  metadata: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500",
  processing: "bg-blue-500",
  completed: "bg-green-500",
  failed: "bg-red-500",
  cancelled: "bg-gray-500",
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4" />,
  processing: <Loader2 className="h-4 w-4 animate-spin" />,
  completed: <CheckCircle2 className="h-4 w-4" />,
  failed: <AlertCircle className="h-4 w-4" />,
  cancelled: <XCircle className="h-4 w-4" />,
};

const entityTypeIcons: Record<string, React.ReactNode> = {
  course: <BookOpen className="h-4 w-4" />,
  module: <GraduationCap className="h-4 w-4" />,
  lesson: <FileText className="h-4 w-4" />,
  quiz_question: <BarChart3 className="h-4 w-4" />,
  parent_message: <MessageSquare className="h-4 w-4" />,
  bedtime_story: <Moon className="h-4 w-4" />,
};

function parseMetadata(metadata: string | null): Record<string, any> {
  if (!metadata) return {};
  try {
    return JSON.parse(metadata);
  } catch {
    return {};
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("so-SO", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BatchTranslationAdmin() {
  const [batchLimit, setBatchLimit] = useState(20);
  const [directLimit, setDirectLimit] = useState(10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading: jobsLoading } = useQuery<BatchJob[]>({
    queryKey: ["/api/admin/batch-jobs"],
    refetchInterval: 10000,
  });

  const { data: coverageReport, isLoading: coverageLoading } = useQuery({
    queryKey: ["/api/admin/batch-jobs/translation-coverage"],
  });

  const { data: directStats, isLoading: directStatsLoading } = useQuery({
    queryKey: ["/api/admin/direct-translate/stats"],
    refetchInterval: 30000,
  });

  const directTranslateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/direct-translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: directLimit }),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Turjumaad la dhammeeyay!",
        description: `${data.total} field la turjumay`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/direct-translate/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/batch-jobs/translation-coverage"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Khalad",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const comprehensiveTranslationMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/batch-jobs/translation-comprehensive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: batchLimit }),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Turjumaad la bilaabay!",
        description: data.message || `${data.count} batch jobs la sameeyay`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/batch-jobs"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Khalad",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const checkAllStatusMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/batch-jobs/check-all-status", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Status-ka la hubsaday" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/batch-jobs"] });
    },
    onError: (err: Error) => {
      toast({ title: "Khalad", description: err.message, variant: "destructive" });
    },
  });

  const cancelJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await fetch(`/api/admin/batch-jobs/${jobId}/cancel`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Job la joojiyay" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/batch-jobs"] });
    },
    onError: (err: Error) => {
      toast({ title: "Khalad", description: err.message, variant: "destructive" });
    },
  });

  const processResultsMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await fetch(`/api/admin/batch-jobs/${jobId}/process-results`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Natiijada la kaydiyay!" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/batch-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/batch-jobs/translation-coverage"] });
    },
    onError: (err: Error) => {
      toast({ title: "Khalad", description: err.message, variant: "destructive" });
    },
  });

  const activeJobs = jobs.filter((j) => j.status === "processing" || j.status === "pending");
  const completedJobs = jobs.filter((j) => j.status === "completed");
  const failedJobs = jobs.filter((j) => j.status === "failed");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Languages className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold" data-testid="text-batch-title">Batch Translation Manager</h2>
          <p className="text-muted-foreground">
            Content-ka Soomaaliga turjun Ingiriisiga - OpenAI Batch API (50% dhimis)
          </p>
        </div>
      </div>

      {coverageReport && !coverageLoading && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Translation Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.entries(coverageReport as Record<string, any>).map(([type, data]: [string, any]) => {
                if (typeof data !== "object" || !data.total) return null;
                const pct = data.total > 0 ? Math.round((data.translated / data.total) * 100) : 0;
                return (
                  <div key={type} className="text-center p-3 rounded-lg border">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      {entityTypeIcons[type] || <FileText className="h-4 w-4" />}
                      <span className="text-xs font-medium capitalize">{type.replace("_", " ")}</span>
                    </div>
                    <Progress value={pct} className="h-2 mb-1" />
                    <span className="text-xs text-muted-foreground">
                      {data.translated}/{data.total} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-green-200 bg-green-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Languages className="h-5 w-5 text-green-600" />
            Direct Translation (Replit AI)
          </CardTitle>
          <CardDescription>
            Content-ka toos u turjun - OPENAI_API_KEY looma baahna. Replit AI ayuu isticmaalaa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4 mb-4">
            <div>
              <Label htmlFor="direct-limit">Items per content type</Label>
              <Input
                id="direct-limit"
                type="number"
                value={directLimit}
                onChange={(e) => setDirectLimit(parseInt(e.target.value) || 10)}
                className="w-24"
                min={1}
                max={50}
                data-testid="input-direct-limit"
              />
            </div>
            <Button
              onClick={() => directTranslateMutation.mutate()}
              disabled={directTranslateMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
              data-testid="btn-direct-translate"
            >
              {directTranslateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Toos u Turjun
            </Button>
          </div>
          {directStats && !directStatsLoading && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {((directStats as any).totals || []).map((item: any) => {
                const translatedCount = ((directStats as any).translated || []).find((t: any) => t.entity_type === item.type)?.count || 0;
                const pct = item.total > 0 ? Math.round((Number(translatedCount) / Number(item.total)) * 100) : 0;
                return (
                  <div key={item.type} className="text-center p-3 rounded-lg border bg-white">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      {entityTypeIcons[item.type] || <FileText className="h-4 w-4" />}
                      <span className="text-xs font-medium capitalize">{item.type.replace("_", " ")}</span>
                    </div>
                    <Progress value={pct} className="h-2 mb-1" />
                    <span className="text-xs text-muted-foreground">
                      {translatedCount}/{item.total} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Batch Translation (OpenAI Batch API)</CardTitle>
          <CardDescription>
            Content-ka oo dhan oo aan weli la turjumin Ingiriisiga loo turjumaa - OPENAI_API_KEY u baahan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label htmlFor="batch-limit">Items per content type</Label>
              <Input
                id="batch-limit"
                type="number"
                value={batchLimit}
                onChange={(e) => setBatchLimit(parseInt(e.target.value) || 20)}
                className="w-24"
                min={1}
                max={100}
                data-testid="input-batch-limit"
              />
            </div>
            <Button
              onClick={() => comprehensiveTranslationMutation.mutate()}
              disabled={comprehensiveTranslationMutation.isPending}
              data-testid="btn-start-translation"
            >
              {comprehensiveTranslationMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Turjumaad Bilow (Dhammaan Content)
            </Button>
            <Button
              variant="outline"
              onClick={() => checkAllStatusMutation.mutate()}
              disabled={checkAllStatusMutation.isPending}
              data-testid="btn-check-status"
            >
              {checkAllStatusMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Status Hubso
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-blue-500" data-testid="text-active-count">{activeJobs.length}</div>
            <div className="text-sm text-muted-foreground">Socda</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-green-500" data-testid="text-completed-count">{completedJobs.length}</div>
            <div className="text-sm text-muted-foreground">La dhammeeyay</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-red-500" data-testid="text-failed-count">{failedJobs.length}</div>
            <div className="text-sm text-muted-foreground">Fashilmay</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Batch Jobs ({jobs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {jobsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Wali batch job la ma sameynin. Ku bilow button-ka "Turjumaad Bilow"
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => {
                const meta = parseMetadata(job.metadata);
                const progress = job.totalRequests > 0 ? Math.round((job.completedRequests / job.totalRequests) * 100) : 0;
                return (
                  <div
                    key={job.id}
                    className="border rounded-lg p-4"
                    data-testid={`batch-job-${job.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="flex items-center gap-1">
                          {statusIcons[job.status]}
                          <span className="capitalize">{job.status}</span>
                        </Badge>
                        <Badge variant="secondary" className="capitalize">
                          {job.type}
                        </Badge>
                        {meta.entityType && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            {entityTypeIcons[meta.entityType]}
                            <span className="capitalize">{meta.entityType?.replace("_", " ")}</span>
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {(job.status === "pending" || job.status === "processing") && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => cancelJobMutation.mutate(job.id)}
                            disabled={cancelJobMutation.isPending}
                            data-testid={`btn-cancel-${job.id}`}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Jooji
                          </Button>
                        )}
                        {job.status === "completed" && job.outputFileId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => processResultsMutation.mutate(job.id)}
                            disabled={processResultsMutation.isPending}
                            data-testid={`btn-process-${job.id}`}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Kaydi
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {meta.description || `${job.type} - ${job.totalRequests} requests`}
                    </p>
                    <div className="flex items-center gap-3">
                      <Progress value={progress} className="flex-1 h-2" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {job.completedRequests}/{job.totalRequests} ({progress}%)
                      </span>
                    </div>
                    {job.failedRequests > 0 && (
                      <p className="text-xs text-red-500 mt-1">
                        {job.failedRequests} fashilmay
                      </p>
                    )}
                    {job.error && (
                      <p className="text-xs text-red-500 mt-1">{job.error}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDate(job.createdAt)}
                      {job.completedAt && ` → ${formatDate(job.completedAt)}`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
