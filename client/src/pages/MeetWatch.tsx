import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Video, Volume2, Calendar, Clock, Loader2, Play, RefreshCw } from "lucide-react";
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

              {videoError ? (
                <div className="relative rounded-none sm:rounded-xl overflow-hidden shadow-lg bg-gray-900 aspect-video flex flex-col items-center justify-center p-6 text-center">
                  <div className="text-red-400 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-white font-medium mb-2">{videoError}</p>
                  <p className="text-gray-400 text-sm mb-4">
                    Haddii dhibaatadu sii jirto, fadlan refresh garee bogga ama soo laabo mar dambe
                  </p>
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                    data-testid="button-retry-video"
                  >
                    <RefreshCw className="w-4 h-4" /> Isku day mar kale
                  </button>
                </div>
              ) : (
                <div className="relative rounded-none sm:rounded-xl overflow-hidden shadow-lg bg-black">
                  {videoLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 animate-spin text-white" />
                        <p className="text-white/70 text-sm">Muuqaalka waa la soo dejinayaa...</p>
                      </div>
                    </div>
                  )}
                  <video
                    key={streamUrl}
                    ref={videoRef}
                    controls
                    controlsList="nodownload noremoteplayback"
                    disablePictureInPicture
                    className="w-full aspect-video bg-black"
                    data-testid="meet-video-player"
                    playsInline
                    preload="auto"
                    onContextMenu={(e) => e.preventDefault()}
                    onError={handleVideoError}
                    onLoadedMetadata={handleVideoLoaded}
                    onLoadedData={handleVideoLoaded}
                    onCanPlay={handleVideoLoaded}
                    onPlaying={handleVideoLoaded}
                  >
                    <source src={streamUrl} type="video/mp4" />
                    Browser-kaagu ma taageero video-ga HTML5
                  </video>
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
