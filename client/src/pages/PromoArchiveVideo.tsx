import { useMemo, useRef, useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, Play, Share2, Video, X } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/queryClient";
import { ContentComments, ContentReactions } from "@/components/engagement";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import BottomNav from "@/components/BottomNav";

type PromoArchiveVideo = {
  id: string;
  title: string;
  description?: string | null;
  videoUrl: string;
  thumbnailUrl?: string | null;
  viewCount?: number;
};

export default function PromoArchiveVideoPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [openComments, setOpenComments] = useState(false);
  const viewedInSession = useRef<Set<string>>(new Set());

  const { data: archivedVideos = [], isLoading } = useQuery<PromoArchiveVideo[]>({
    queryKey: ["/api/promo-videos/archive"],
    queryFn: async () => {
      const res = await fetch("/api/promo-videos/archive", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch archived promo videos");
      return res.json();
    },
    staleTime: 5_000,
    refetchOnWindowFocus: false,
    refetchInterval: 5_000,
    refetchIntervalInBackground: true,
  });

  const video = useMemo(
    () => archivedVideos.find((v) => v.id === id) || null,
    [archivedVideos, id],
  );

  const trackViewMutation = useMutation({
    mutationFn: async (videoId: string) => {
      await apiRequest("POST", `/api/promo-videos/${videoId}/view`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promo-videos/archive"] });
    },
  });

  const getGDriveFileId = (url: string) => {
    const m1 = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (m1) return m1[1];
    const m2 = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
    if (m2) return m2[1];
    const m3 = url.match(/drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/);
    if (m3) return m3[1];
    return null;
  };

  const getEmbedUrl = (url: string) => {
    const gdriveId = getGDriveFileId(url);
    if (gdriveId) return `https://drive.google.com/file/d/${gdriveId}/preview`;
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
    return url;
  };

  const getThumb = (v: PromoArchiveVideo) => {
    if (v.thumbnailUrl) return v.thumbnailUrl;
    const gdriveId = getGDriveFileId(v.videoUrl);
    if (gdriveId) return `https://drive.google.com/thumbnail?id=${gdriveId}&sz=w720`;
    const ytMatch = v.videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
    return null;
  };

  const handleShare = async (v: PromoArchiveVideo) => {
    const shareData = {
      title: v.title,
      text: v.description || "Muuqaaladii hore ee bogga hore",
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link-ga waa la guuriyay");
      }
    } catch {
      // user canceled share
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Waa la soo dejinayaa...</div>;
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-slate-50 pb-24">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Link href="/resources" className="inline-flex items-center gap-2 text-blue-600 font-medium mb-4">
            <ArrowLeft className="w-4 h-4" /> Ku laabo Maktabada
          </Link>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h1 className="text-lg font-bold text-slate-900">Muuqaal lama helin</h1>
            <p className="text-sm text-slate-600 mt-2">Muuqaalkan ma jiro ama lagama helin Maktabada.</p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Link href="/resources#promo-archive" className="inline-flex items-center gap-2 text-blue-600 font-medium mb-4">
          <ArrowLeft className="w-4 h-4" /> Muuqaaladii hore halka ka daawo
        </Link>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {activeVideo === video.id ? (
            <div className="relative aspect-video bg-black">
              <iframe
                src={getEmbedUrl(video.videoUrl)}
                className="w-full h-full"
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
              />
              <button
                onClick={() => setActiveVideo(null)}
                className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white z-10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setActiveVideo(video.id);
                if (!viewedInSession.current.has(video.id)) {
                  viewedInSession.current.add(video.id);
                  trackViewMutation.mutate(video.id);
                }
              }}
              className="relative w-full aspect-video bg-gradient-to-br from-blue-50 to-sky-100 group"
            >
              {getThumb(video) ? (
                <img src={getThumb(video)!} alt={video.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Video className="w-16 h-16 text-blue-300" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-all">
                <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Play className="w-7 h-7 text-blue-600 ml-1" />
                </div>
              </div>
            </button>
          )}

          <div className="p-4">
            <h1 className="text-lg font-bold text-slate-900">{video.title}</h1>
            {video.description && <p className="text-sm text-slate-600 mt-1">{video.description}</p>}

            <div className="mt-3 flex items-center gap-4 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {video.viewCount || 0}
              </span>
              <button onClick={() => handleShare(video)} className="inline-flex items-center gap-1 hover:text-blue-600">
                <Share2 className="w-4 h-4" />
                La wadaag
              </button>
            </div>

            <div className="mt-4 bg-slate-900 rounded-xl p-3">
              <ContentReactions contentType="promo_video" contentId={video.id} />
            </div>

            <div className="mt-3">
              <button onClick={() => setOpenComments(true)} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                Arag faallooyinka
              </button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={openComments} onOpenChange={setOpenComments}>
        <DialogContent className="max-w-2xl bg-slate-950 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Faallooyinka Muuqaalka</DialogTitle>
          </DialogHeader>
          <ContentComments contentType="promo_video" contentId={video.id} />
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
