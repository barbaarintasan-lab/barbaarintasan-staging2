import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Video, Volume2, Calendar, Clock, Loader2, Play, RefreshCw, ExternalLink } from "lucide-react";
import tarbiyaddaLogo from "@assets/logo_1770622897660.png";

export default function MeetWatch() {
  const { id } = useParams<{ id: string }>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadingTimeoutRef.current = setTimeout(() => {
      setVideoLoading(false);
    }, 8000);
    return () => {
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    };
  }, []);

  const { data: event, isLoading } = useQuery<any>({
    queryKey: ["/api/meet-events", id],
    queryFn: async () => {
      const res = await fetch(`/api/meet-events`);
      if (!res.ok) throw new Error("Failed to fetch");
      const events = await res.json();
      return events.find((e: any) => e.id === id) || null;
    },
    enabled: !!id,
  });

  const { data: archivedEvent } = useQuery<any>({
    queryKey: ["/api/meet-events/archived", id],
    queryFn: async () => {
      const res = await fetch(`/api/meet-events/archived`);
      if (!res.ok) return null;
      const events = await res.json();
      return events.find((e: any) => e.id === id) || null;
    },
    enabled: !!id && !event,
  });

  const meetEvent = event || archivedEvent;

  const formatSomaliDate = (dateStr: string) => {
    const months = ["Janaayo", "Febraayo", "Maarso", "Abriil", "May", "Juun", "Luuliyo", "Ogost", "Sebtembar", "Oktoobar", "Nofembar", "Desembar"];
    const days = ["Axad", "Isniin", "Talaado", "Arbaco", "Khamiis", "Jimce", "Sabti"];
    const d = new Date(dateStr + "T00:00:00");
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const formatTime12 = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    const ampm = h >= 12 ? "GD" : "SN";
    const hr = h % 12 || 12;
    return `${hr}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  const handleVideoError = () => {
    const video = videoRef.current;
    const error = video?.error;
    let errorMessage = "Video-ga ma soo dejin karo";
    if (error) {
      switch (error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorMessage = "Video-ga waa la joojiyey";
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          errorMessage = "Internet-ka ayaa dhibaato ka jirta. Fadlan hubi xiriirkaaga";
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorMessage = "Video-ga qaab khaldan ayuu leeyahay";
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = "Video-ga qaabkiisa ma la taageerin";
          break;
      }
    }
    setVideoError(errorMessage);
    setVideoLoading(false);
  };

  const handleVideoLoaded = () => {
    setVideoLoading(false);
    setVideoError(null);
    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
  };

  const handleRetry = () => {
    setVideoError(null);
    setVideoLoading(true);
    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    loadingTimeoutRef.current = setTimeout(() => {
      setVideoLoading(false);
    }, 8000);
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!meetEvent) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <Video className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-lg font-bold text-gray-900 mb-2">Kulanka lama helin</h2>
        <p className="text-gray-500 text-sm mb-6">Kulanka aad raadinayso ma jiro ama waa la tiray.</p>
        <Link href="/">
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all" data-testid="btn-back-home">
            <ArrowLeft className="w-4 h-4" /> Ku noqo Bogga Hore
          </button>
        </Link>
      </div>
    );
  }

  const isVideo = meetEvent.mediaType !== "audio";
  const streamUrl = `/api/meet-events/${meetEvent.id}/stream`;
  const displayTitle = meetEvent.mediaTitle || meetEvent.title;
  const driveFileId = meetEvent.driveFileId;
  
  // Use Google Drive embed as primary for better reliability, or fallback if stream fails
  const driveEmbedUrl = driveFileId ? `https://drive.google.com/file/d/${driveFileId}/preview` : null;
  const driveViewUrl = driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view` : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 safe-top">
        <div className="px-4 py-3 flex items-center gap-3 max-w-4xl mx-auto">
          <Link href="/">
            <button className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all" data-testid="btn-back">
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
          </Link>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <img src={tarbiyaddaLogo} alt="Logo" className="w-7 h-7 rounded-lg object-cover" />
            <h1 className="font-bold text-gray-900 text-sm truncate">{displayTitle}</h1>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-6">
        {isVideo ? (
          <div className="w-full max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-none sm:rounded-2xl p-0 sm:p-3 sm:mt-4 shadow-xl">
              <div className="mb-0 sm:mb-3 px-3 pt-3 sm:px-0 sm:pt-0">
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                  <Play className="w-3 h-3" /> Muuqaal
                </span>
              </div>

              <div className="relative rounded-none sm:rounded-xl overflow-hidden shadow-lg bg-black">
                {driveEmbedUrl ? (
                  <div className="relative w-full aspect-video">
                    <iframe
                      src={driveEmbedUrl}
                      className="absolute top-0 left-0 w-full h-full border-0"
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                      sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 text-center text-white bg-gray-900 aspect-video">
                    <Video className="w-12 h-12 text-gray-500 mb-4" />
                    <p className="font-medium text-lg">Muuqaalka lama helin</p>
                    <p className="text-gray-400 text-sm mt-2">Ma jiro File ID Google Drive ah oo lala xiriiriyay kulankan.</p>
                  </div>
                )}
              </div>

              {driveViewUrl && (
                <div className="mt-4 px-3 pb-3 sm:px-0">
                  <a
                    href={driveViewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg"
                  >
                    <ExternalLink className="w-5 h-5" />
                    Ku Daawo Google Drive (Hadii uu sare ka shaqayn waayo)
                  </a>
                </div>
              )}

              <div className="mt-3 flex items-center justify-between text-white/70 text-sm px-3 pb-3 sm:px-0 sm:pb-0">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  <span>Daawo iyo Dhageyso</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-4xl mx-auto px-4 pt-6">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-3 shadow-xl">
              <div className="mb-3">
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500 text-white text-xs font-bold rounded-full">
                  <Volume2 className="w-3 h-3" /> Cod
                </span>
              </div>
              <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 rounded-xl p-6 border border-purple-500/20">
                <div className="flex flex-col items-center mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mb-3 shadow-2xl shadow-purple-500/30">
                    <Volume2 className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-white font-bold text-base text-center">{displayTitle}</h2>
                  <p className="text-purple-300 text-xs mt-1">Dhageyso duubista kulankii</p>
                </div>
                <audio
                  ref={audioRef}
                  className="w-full"
                  controls
                  preload="auto"
                  src={streamUrl}
                  data-testid="meet-audio-player"
                  onLoadedMetadata={handleVideoLoaded}
                  onCanPlay={handleVideoLoaded}
                  onPlaying={handleVideoLoaded}
                >
                  Browser-kaagu ma taageero audio-ga.
                </audio>
              </div>
              <div className="mt-3 flex items-center text-white/70 text-sm">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  <span>Dhageyso</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="w-full max-w-4xl mx-auto px-4 space-y-4 pb-8">
          <div>
            <h2 className="text-xl font-bold text-gray-900 font-display mb-1">{displayTitle}</h2>
            {meetEvent.mediaTitle && meetEvent.title !== meetEvent.mediaTitle && (
              <p className="text-gray-500 text-sm">{meetEvent.title}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span className="flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-full">
              <Calendar className="w-3 h-3 text-blue-500" />
              {formatSomaliDate(meetEvent.eventDate)}
            </span>
            <span className="flex items-center gap-1 bg-indigo-50 px-2.5 py-1 rounded-full">
              <Clock className="w-3 h-3 text-indigo-500" />
              {formatTime12(meetEvent.startTime)} - {formatTime12(meetEvent.endTime)}
            </span>
            <span className="flex items-center gap-1 bg-gray-100 px-2.5 py-1 rounded-full">
              {isVideo ? <Video className="w-3 h-3 text-red-500" /> : <Volume2 className="w-3 h-3 text-purple-500" />}
              {isVideo ? "Muuqaal" : "Cod"}
            </span>
          </div>

          {meetEvent.description && (
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <p className="text-gray-700 text-sm leading-relaxed">{meetEvent.description}</p>
            </div>
          )}

          <div className="pt-2">
            <Link href="/">
              <button className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all" data-testid="btn-back-to-app">
                <ArrowLeft className="w-4 h-4" /> Ku noqo App-ka
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
