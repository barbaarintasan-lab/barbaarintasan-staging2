import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParentAuth } from "@/contexts/ParentAuthContext";
import { ArrowLeft, Video, Calendar, Clock, Users, CheckCircle, ExternalLink, Play, Lock, X } from "lucide-react";
import { Link } from "wouter";
import BottomNav from "@/components/BottomNav";

function getGoogleDriveEmbedUrl(url: string): string | null {
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match) {
    return `https://drive.google.com/file/d/${match[1]}/preview`;
  }
  return null;
}

interface LiveEvent {
  id: string;
  title: string;
  description: string | null;
  eventType: string;
  courseId: string | null;
  hostName: string | null;
  scheduledAt: string;
  duration: number | null;
  meetingUrl: string | null;
  recordingUrl: string | null;
  isPublished: boolean;
}

interface EventRsvp {
  id: string;
  eventId: string;
  parentId: string;
  rsvpAt: string;
  attended: boolean;
}

interface Enrollment {
  id: string;
  courseId: string;
  status: string;
}

export default function Events() {
  const { parent } = useParentAuth();
  const queryClient = useQueryClient();
  const [playingEventId, setPlayingEventId] = useState<string | null>(null);

  const { data: events = [] } = useQuery<LiveEvent[]>({
    queryKey: ["liveEvents"],
    queryFn: async () => {
      const res = await fetch("/api/events");
      return res.json();
    },
  });

  const { data: myRsvps = [] } = useQuery<EventRsvp[]>({
    queryKey: ["myRsvps"],
    queryFn: async () => {
      const res = await fetch("/api/events/my-rsvps", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!parent,
  });

  const { data: enrollments = [] } = useQuery<Enrollment[]>({
    queryKey: ["parentEnrollments"],
    queryFn: async () => {
      const res = await fetch("/api/parent/enrollments", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!parent,
  });

  const hasAnyCourseAccess = enrollments.some(e => e.status === "active");

  const rsvpMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: "POST",
        credentials: "include",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myRsvps"] });
    },
  });

  const rsvpEventIds = new Set(myRsvps.map(r => r.eventId));
  const now = new Date();

  const upcomingEvents = events.filter(e => new Date(e.scheduledAt) > now);
  const pastEvents = events.filter(e => new Date(e.scheduledAt) <= now);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("so-SO", { 
      weekday: "short", 
      month: "short", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const eventTypeLabels: Record<string, string> = {
    qa: "Su'aal & Jawaab",
    webinar: "Webinar",
    workshop: "Warshad",
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 z-40 bg-gradient-to-r from-red-500 to-rose-600 safe-top shadow-lg">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <button className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center" data-testid="button-back">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            </Link>
            <div>
              <h1 className="font-bold text-white text-lg">Live Q&A iyo Dhacdooyinka</h1>
              <p className="text-red-100 text-sm">Ku soo biir wareysiyada tooska ah</p>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-4">
        {upcomingEvents.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Dhacdooyinka Soo Socda
            </h2>
            <div className="space-y-3">
              {upcomingEvents.map(event => {
                const hasRsvp = rsvpEventIds.has(event.id);
                return (
                  <div
                    key={event.id}
                    className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                    data-testid={`event-${event.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Video className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                          {eventTypeLabels[event.eventType] || event.eventType}
                        </span>
                        <h3 className="font-semibold text-gray-900 mt-1">{event.title}</h3>
                        {event.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mt-1">{event.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(event.scheduledAt)}
                          </span>
                          {event.duration && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {event.duration} daqiiqo
                            </span>
                          )}
                          {event.hostName && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {event.hostName}
                            </span>
                          )}
                        </div>
                        {parent && (
                          <div className="mt-3 space-y-2">
                            {hasRsvp ? (
                              <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-sm font-medium">Waxaad is diwaangelisay!</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => rsvpMutation.mutate(event.id)}
                                disabled={rsvpMutation.isPending}
                                className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all disabled:opacity-50"
                                data-testid={`button-rsvp-${event.id}`}
                              >
                                Is Diwaangeli
                              </button>
                            )}
                            {event.meetingUrl && (
                              hasAnyCourseAccess ? (
                                <a
                                  href={event.meetingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all"
                                  data-testid={`button-join-${event.id}`}
                                >
                                  <Video className="w-4 h-4" />
                                  Ku biir Meeting-ka
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <div className="flex items-center gap-2 bg-gray-100 text-gray-500 text-sm px-4 py-2 rounded-lg">
                                  <Lock className="w-4 h-4" />
                                  <span>Koorso iibso si aad meeting-ka ugu biirto</span>
                                </div>
                              )
                            )}
                          </div>
                        )}
                        {!parent && event.meetingUrl && (
                          <div className="mt-3 flex items-center gap-2 bg-gray-100 text-gray-500 text-sm px-4 py-2 rounded-lg">
                            <Lock className="w-4 h-4" />
                            <span>Gal akoonkaaga si aad meeting-ka ugu biirto</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {pastEvents.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Dhacdooyinkii Hore</h2>
            <div className="space-y-3">
              {pastEvents.map(event => (
                <div
                  key={event.id}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 opacity-80"
                  data-testid={`event-past-${event.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Video className="w-6 h-6 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-700">{event.title}</h3>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(event.scheduledAt)}</p>
                      {event.recordingUrl && (
                        <>
                          {playingEventId === event.id ? (
                            <div className="mt-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">Recording-ka</span>
                                <button
                                  onClick={() => setPlayingEventId(null)}
                                  className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center"
                                  data-testid={`button-close-player-${event.id}`}
                                >
                                  <X className="w-4 h-4 text-gray-600" />
                                </button>
                              </div>
                              {getGoogleDriveEmbedUrl(event.recordingUrl) ? (
                                <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ paddingBottom: "56.25%" }}>
                                  <iframe
                                    src={getGoogleDriveEmbedUrl(event.recordingUrl)!}
                                    className="absolute top-0 left-0 w-full h-full"
                                    allow="autoplay; encrypted-media"
                                    allowFullScreen
                                    data-testid={`video-player-${event.id}`}
                                  />
                                </div>
                              ) : (
                                <a
                                  href={event.recordingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  Fur Recording-ka
                                </a>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => setPlayingEventId(event.id)}
                              className="inline-flex items-center gap-1 mt-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-all"
                              data-testid={`button-play-${event.id}`}
                            >
                              <Play className="w-4 h-4" />
                              Daawo Recording-ka
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {events.length === 0 && (
          <div className="bg-white rounded-xl p-8 text-center">
            <Video className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Wali ma jiraan dhacdooyin la qorsheeyay</p>
          </div>
        )}

        {!parent && events.length > 0 && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-red-800 text-sm">Fadlan gal akoonkaaga si aad u is diwaangeliso dhacdooyinka</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
