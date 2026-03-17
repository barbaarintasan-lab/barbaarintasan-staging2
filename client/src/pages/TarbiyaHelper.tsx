import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Send, Bot, User, Sparkles, Loader2, Heart, Clock, Plus, MessageSquare, Play, Pause, Mic, Square, ThumbsUp, ThumbsDown, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useParentAuth } from "@/contexts/ParentAuthContext";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  audioUrl?: string;
  conversationId?: string;
}

interface Conversation {
  id: string;
  topic: string;
  createdAt: string;
}

const TOPICS = [
  { id: "Tarbiyada", label: "Tarbiyada Carruurta" },
  { id: "Akhlaaqda", label: "Akhlaaqda & Edbinta" },
  { id: "Xiriirka", label: "Xiriirka Waalid & Ilmo" },
  { id: "Diinta", label: "Diinta & Islaamka" },
  { id: "Dabeecadda", label: "Dabeecadda Ilmaha" },
  { id: "Guud", label: "Su'aal Guud" },
];

export default function TarbiyaHelper() {
  const { parent } = useParentAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showNewChat, setShowNewChat] = useState(true);
  const [messageFeedback, setMessageFeedback] = useState<Record<string, "up" | "down">>({});

  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceStatus, setVoiceStatus] = useState<string>("");
  const [autoPlayVoice, setAutoPlayVoice] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const recordingIntervalRef = useRef<number | null>(null);

  const MAX_INPUT_LENGTH = 300;
  const MAX_RECORD_SECONDS = 45;

  useEffect(() => {
    const saved = localStorage.getItem("tarbiya-auto-play-voice");
    if (saved === "false") {
      setAutoPlayVoice(false);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("tarbiya-auto-play-voice", autoPlayVoice ? "true" : "false");
  }, [autoPlayVoice]);

  const handleBack = () => {
    if (messages.length > 0 || currentConversationId) {
      setMessages([]);
      setMessageFeedback({});
      setCurrentConversationId(null);
      setSelectedTopic("");
      setShowNewChat(true);
      return;
    }
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/ai-caawiye");
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }

      if (recordingIntervalRef.current) {
        window.clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isRecording) return;

    recordingIntervalRef.current = window.setInterval(() => {
      setRecordingSeconds(prev => {
        const next = prev + 1;
        if (next >= MAX_RECORD_SECONDS) {
          stopRecording();
        }
        return next;
      });
    }, 1000);

    return () => {
      if (recordingIntervalRef.current) {
        window.clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    };
  }, [isRecording]);

  const { data: usageData } = useQuery({
    queryKey: ["tarbiya-usage"],
    queryFn: async () => {
      const res = await fetch("/api/tarbiya/usage", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch usage");
      return res.json();
    },
    enabled: !!parent,
  });

  const { data: accessStatus } = useQuery({
    queryKey: ["ai-access-status"],
    queryFn: async () => {
      const res = await fetch("/api/ai/access-status", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch access status");
      return res.json();
    },
    enabled: !!parent,
  });

  const { data: conversations } = useQuery({
    queryKey: ["tarbiya-conversations"],
    queryFn: async () => {
      const res = await fetch("/api/tarbiya/conversations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return res.json() as Promise<Conversation[]>;
    },
    enabled: !!parent,
  });

  const loadConversation = async (conversationId: string) => {
    try {
      const res = await fetch(`/api/tarbiya/conversations/${conversationId}/messages`, {
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to load messages");
      const data = await res.json();
      const safeMessages: Message[] = (data.messages || []).map((m: any) => ({
        ...m,
        conversationId,
      }));
      setMessages(safeMessages);
      setMessageFeedback(data.feedbackByMessage || {});
      setCurrentConversationId(conversationId);
      setSelectedTopic(data.conversation.topic);
      setShowNewChat(false);
    } catch (error) {
      console.error("Error loading conversation:", error);
    }
  };

  const askMutation = useMutation({
    mutationFn: async (question: string) => {
      const res = await fetch("/api/tarbiya/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          question,
          conversationId: currentConversationId,
          topic: selectedTopic || "Guud",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw { ...data, status: res.status };
      }
      return data;
    },
    onSuccess: (data) => {
      const assistantMessageId = data.assistantMessageId || `${Date.now()}-assistant`;
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: "assistant",
        content: data.answer,
        createdAt: new Date().toISOString(),
        conversationId: data.conversationId || currentConversationId || undefined,
      }]);

      void generateSpeechForMessage(assistantMessageId, data.answer);

      if (data.conversationId && !currentConversationId) {
        setCurrentConversationId(data.conversationId);
        setShowNewChat(false);
      }

      queryClient.invalidateQueries({ queryKey: ["tarbiya-usage"] });
      queryClient.invalidateQueries({ queryKey: ["tarbiya-conversations"] });
    },
    onError: (error: any) => {
      const errorMessage = error.answer || "Waan ka xumahay, cilad ayaa dhacday. Fadlan isku day mar kale.";
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: errorMessage,
        createdAt: new Date().toISOString()
      }]);
    },
  });

  const playAudio = useCallback((audioUrl: string, messageId: string) => {
    if (playingAudioId === messageId && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setPlayingAudioId(null);
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    const audio = new Audio(audioUrl);
    audioPlayerRef.current = audio;
    setPlayingAudioId(messageId);

    audio.onended = () => {
      setPlayingAudioId(null);
      audioPlayerRef.current = null;
    };

    audio.onerror = () => {
      setPlayingAudioId(null);
      audioPlayerRef.current = null;
    };

    audio.play().catch(() => {
      setPlayingAudioId(null);
      audioPlayerRef.current = null;
    });
  }, [playingAudioId]);

  const generateSpeechForMessage = useCallback(async (messageId: string, text: string) => {
    const cleanText = text?.trim();
    if (!cleanText) return;

    try {
      setIsSynthesizing(true);

      const speakRes = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: cleanText, voice: "zephyr" }),
      });

      const speakData = await speakRes.json();
      if (!speakRes.ok || !speakData?.audioUrl) {
        return;
      }

      setMessages(prev => prev.map(msg => (
        msg.id === messageId ? { ...msg, audioUrl: speakData.audioUrl } : msg
      )));

      if (autoPlayVoice) {
        playAudio(speakData.audioUrl, messageId);
      }
    } catch (error) {
      console.error("TTS generation error:", error);
    } finally {
      setIsSynthesizing(false);
    }
  }, [autoPlayVoice, playAudio]);

  const pushUserMessage = (content: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
      conversationId: currentConversationId || undefined,
    }]);
  };

  const submitFeedback = async (message: Message, rating: "up" | "down") => {
    const conversationId = message.conversationId || currentConversationId;
    if (!conversationId || !message?.id || messageFeedback[message.id]) return;

    try {
      const res = await fetch("/api/tarbiya/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          conversationId,
          messageId: message.id,
          rating,
        }),
      });

      if (!res.ok) return;
      setMessageFeedback((prev) => ({ ...prev, [message.id]: rating }));
    } catch (error) {
      console.error("Feedback submit error:", error);
    }
  };

  const askForSevenDayPlan = () => {
    if (askMutation.isPending || isRecording || isVoiceProcessing) return;

    const topicLabel = TOPICS.find((t) => t.id === selectedTopic)?.label || "tarbiyadda guud";
    const visibleUserPrompt = `Iisamee qorshe 7 maalmood ah oo ku saabsan ${topicLabel}.`;
    const aiPrompt = `Iisamee qorshe 7 maalmood ah oo aad u kooban, wax-ku-ool ah, oo waalidku si sahlan u fulin karo, mawduucuna yahay ${topicLabel}. Maalin kasta sii: hal yool, hal ficil, iyo hal duco/weedh dhiirigelin ah.`;

    pushUserMessage(visibleUserPrompt);
    askMutation.mutate(aiPrompt);
  };

  const startRecording = async () => {
    if (isRecording || isVoiceProcessing || askMutation.isPending) return;

    setVoiceStatus("");
    setRecordingSeconds(0);

    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceStatus("Browser-kaagu ma taageerayo duubista codka.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const preferredTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
      ];
      const mimeType = preferredTypes.find(type => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      recordedChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        try {
          const blob = new Blob(recordedChunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });

          if (!blob.size) {
            setVoiceStatus("Cod lama duubin. Fadlan mar kale isku day.");
            return;
          }

          setIsVoiceProcessing(true);
          setVoiceStatus("Codkaaga ayaan qoraal u beddelayaa...");

          const fileExt = (recorder.mimeType || "audio/webm").includes("mp4") ? "mp4" : "webm";
          const formData = new FormData();
          formData.append("audio", blob, `tarbiya-recording.${fileExt}`);

          const transcribeRes = await fetch("/api/voice/transcribe", {
            method: "POST",
            credentials: "include",
            body: formData,
          });

          const transcribeData = await transcribeRes.json();
          if (!transcribeRes.ok) {
            setVoiceStatus(transcribeData?.text || transcribeData?.error || "Codka lama fahmi karin. Isku day mar kale.");
            return;
          }

          if (transcribeData?.trialExpired) {
            setVoiceStatus(transcribeData?.membershipAdvice || "Tijaabadaadu way dhammaatay.");
            return;
          }

          const transcript = (transcribeData?.text || "").trim();
          if (!transcript) {
            setVoiceStatus("Codka lagama helin qoraal sax ah. Isku day mar kale.");
            return;
          }

          pushUserMessage(transcript);
          setVoiceStatus("Jawaabta AI-ga ayaan soo saarayaa...");
          askMutation.mutate(transcript, {
            onSettled: () => setVoiceStatus("")
          });
        } catch (error) {
          console.error("Voice processing error:", error);
          setVoiceStatus("Cilad ayaa dhacday intii codka la farsameynayay.");
        } finally {
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
          }

          setIsVoiceProcessing(false);
          recordedChunksRef.current = [];
        }
      };

      recorder.onerror = () => {
        setVoiceStatus("Duubista codka way fashilantay. Fadlan mar kale isku day.");
        setIsRecording(false);
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setIsRecording(true);
      setVoiceStatus("Waan ku dhagaysanayaa... hadalkaaga sii wad.");
    } catch (error) {
      console.error("Microphone access error:", error);
      setVoiceStatus("Fadlan oggolow microphone-ka si aad cod ugu dirtid caawiyaha.");
    }
  };

  const stopRecording = () => {
    if (recordingIntervalRef.current) {
      window.clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);
  };

  const handleSubmit = () => {
    if (!input.trim() || askMutation.isPending || isRecording || isVoiceProcessing) return;

    const text = input.trim();
    pushUserMessage(text);
    askMutation.mutate(text);
    setInput("");

    textareaRef.current?.blur();
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setMessageFeedback({});
    setCurrentConversationId(null);
    setSelectedTopic("");
    setShowNewChat(true);
  };

  const isPending = askMutation.isPending || isVoiceProcessing;

  if (!parent) {
    return (
      <div className="min-h-screen bg-[radial-gradient(1200px_500px_at_10%_0%,#fff7ed,transparent),linear-gradient(180deg,#fffaf4_0%,#fff_100%)] flex flex-col items-center justify-center px-4">
        <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-orange-200">
          <Bot className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-xl font-bold text-orange-950 mb-2">Tarbiyada & Waalidnimada</h2>
        <p className="text-orange-900/70 mb-6 text-center max-w-sm">
          Fadlan gal akoonkaaga si aad u isticmaasho Caawiyaha Tarbiyada.
        </p>
        <Link href="/register">
          <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
            Gal ama Isdiiwaangeli
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(1100px_420px_at_0%_0%,#fff1dd,transparent),radial-gradient(900px_360px_at_100%_0%,#ffedd5,transparent),linear-gradient(180deg,#fffaf4_0%,#fff_100%)] flex flex-col pb-24 sm:pb-20">
      <header className="bg-white/85 backdrop-blur-md text-orange-950 sticky top-0 z-40 border-b border-orange-100 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-orange-900 hover:bg-orange-50"
              data-testid="button-back"
              onClick={handleBack}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shadow-md shadow-orange-200">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Tarbiyada & Waalidnimada</h1>
                <p className="text-xs text-orange-700/70">AI-ka ku caawinaya tarbiyadda ilmahaaga</p>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-orange-900 hover:bg-orange-50"
            onClick={startNewConversation}
            data-testid="button-new-chat"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {usageData && (
          <div className="px-4 pb-2">
            <div className="flex items-center justify-between text-xs text-orange-700/80">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Su'aalo maanta: {usageData.questionsAsked}/{usageData.limit}
              </span>
              <span>Haray: {usageData.remaining}</span>
            </div>
            <div className="w-full bg-orange-100 rounded-full h-1.5 mt-1">
              <div
                className="bg-orange-500 rounded-full h-1.5 transition-all"
                style={{ width: `${(usageData.questionsAsked / usageData.limit) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="px-4 pb-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={askForSevenDayPlan}
            disabled={isPending || isRecording || isVoiceProcessing || (usageData?.remaining === 0)}
            className="text-xs font-semibold rounded-full px-3 py-1.5 border border-orange-200 text-orange-800 bg-orange-50 hover:bg-orange-100 transition-colors disabled:opacity-50"
            data-testid="button-seven-day-plan"
          >
            <CalendarDays className="w-3.5 h-3.5 inline mr-1" />
            Qorshe 7 Maalmood
          </button>
          <button
            type="button"
            onClick={() => setAutoPlayVoice(prev => !prev)}
            className={`text-xs font-semibold rounded-full px-3 py-1.5 border transition-colors ${
              autoPlayVoice
                ? "bg-orange-500 text-white border-orange-500"
                : "bg-white text-orange-700 border-orange-200"
            }`}
            data-testid="toggle-auto-play-voice"
          >
            Auto-Play Voice: {autoPlayVoice ? "ON" : "OFF"}
          </button>
        </div>
      </header>

      {accessStatus && (
        <div className="px-4 py-2 text-center" data-testid="trial-banner">
          {accessStatus.plan === "trial" ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-3 py-1">
              Tijaabadaadu waxay kaa dhamaanaysaa {accessStatus.trialDaysRemaining} Maalmood ka dib
            </span>
          ) : accessStatus.plan === "gold" ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
              Xubin Dahabi 💛
            </span>
          ) : null}
        </div>
      )}

      <div className="flex-1 overflow-auto p-4 space-y-4 pb-52 sm:pb-48 max-w-3xl w-full mx-auto">
        {showNewChat && messages.length === 0 ? (
          <div className="text-center py-6 bg-white/80 border border-orange-100 rounded-3xl shadow-sm">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-200">
              <Bot className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-bold text-orange-950 mb-2">Caawiyaha Tarbiyada</h2>
            <p className="text-orange-900/70 mb-6 max-w-sm mx-auto">
              Weydii wax kasta oo ku saabsan tarbiyadda ilmahaaga — Islaamka, dhaqanka, iyo cilmiga casriga ah.
            </p>

            <div className="max-w-sm mx-auto mb-4">
              <label className="block text-sm font-medium text-orange-900 mb-2 text-left">
                Dooro mawduuca (optional)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TOPICS.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => setSelectedTopic(topic.id)}
                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                      selectedTopic === topic.id
                        ? "border-orange-500 bg-orange-50 text-orange-800"
                        : "border-orange-100 bg-white text-orange-800/80 hover:border-orange-300"
                    }`}
                    data-testid={`topic-${topic.id}`}
                  >
                    <span className="text-sm font-medium">{topic.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {conversations && conversations.length > 0 && (
              <div className="mt-8 max-w-sm mx-auto">
                <p className="text-sm font-medium text-orange-700/80 mb-3 text-left">Wada-hadalladii hore:</p>
                <div className="space-y-2">
                  {conversations.slice(0, 3).map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => loadConversation(conv.id)}
                      className="w-full text-left p-3 bg-white rounded-xl border border-orange-100 hover:border-orange-300 transition-colors"
                      data-testid={`conversation-${conv.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-medium text-orange-900">{conv.topic}</span>
                      </div>
                      <p className="text-xs text-orange-700/60 mt-1">
                        {new Date(conv.createdAt).toLocaleDateString('so-SO')}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {selectedTopic && (
              <div className="flex items-center gap-2 text-sm text-orange-800 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
                <Heart className="w-4 h-4 text-orange-500" />
                <span>Mawduuca: {selectedTopic}</span>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                data-testid={`message-${message.role}-${message.id}`}
              >
                <div className={`flex items-start gap-2 max-w-[85%] ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === "user"
                      ? "bg-orange-500"
                      : "bg-gradient-to-br from-orange-400 to-amber-500"
                  }`}>
                    {message.role === "user" ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className={`p-3 rounded-2xl ${
                    message.role === "user"
                      ? "bg-orange-500 text-white rounded-tr-sm"
                      : "bg-white border border-orange-100 shadow-sm rounded-tl-sm"
                  }`}>
                    <p className={`text-base whitespace-pre-wrap leading-relaxed ${message.role === "user" ? "text-white" : "text-orange-950"}`}>
                      {message.content}
                    </p>
                    {message.role === "assistant" && message.audioUrl && (
                      <button
                        onClick={() => playAudio(message.audioUrl!, message.id)}
                        className="mt-2 flex items-center gap-2 text-xs text-orange-700 hover:text-orange-800 bg-orange-50 rounded-full px-3 py-1.5 transition-colors"
                        data-testid={`button-play-audio-${message.id}`}
                      >
                        {playingAudioId === message.id ? (
                          <>
                            <Pause className="w-3.5 h-3.5" />
                            <span>Jooji</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            <span>Dhageyso</span>
                          </>
                        )}
                      </button>
                    )}
                    {message.role === "assistant" && (
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => submitFeedback(message, "up")}
                          disabled={!!messageFeedback[message.id]}
                          className={`flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 border transition-colors ${
                            messageFeedback[message.id] === "up"
                              ? "bg-green-50 text-green-700 border-green-300"
                              : "bg-white text-orange-700 border-orange-200 hover:bg-orange-50"
                          } disabled:opacity-70`}
                          data-testid={`button-feedback-up-${message.id}`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>Waxtar leh</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => submitFeedback(message, "down")}
                          disabled={!!messageFeedback[message.id]}
                          className={`flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 border transition-colors ${
                            messageFeedback[message.id] === "down"
                              ? "bg-rose-50 text-rose-700 border-rose-300"
                              : "bg-white text-orange-700 border-orange-200 hover:bg-orange-50"
                          } disabled:opacity-70`}
                          data-testid={`button-feedback-down-${message.id}`}
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                          <span>Wanaajin u baahan</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {isPending && (
          <div className="flex justify-start">
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="p-3 bg-white border border-orange-100 shadow-sm rounded-2xl rounded-tl-sm">
                <div className="flex items-center gap-2 text-orange-700/80">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Waan ka fikiraa...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] sm:bottom-[calc(4.5rem+env(safe-area-inset-bottom))] inset-x-0 z-50 px-2 sm:px-4">
        <div className="max-w-2xl md:max-w-3xl mx-auto bg-white/95 backdrop-blur border border-orange-100 p-3 sm:p-4 shadow-[0_-4px_16px_rgba(249,115,22,0.15)] rounded-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between mb-1.5 px-1">
          <p className="text-xs text-orange-700/80">
            {isRecording ? `Duubis socota... ${recordingSeconds}s / ${MAX_RECORD_SECONDS}s` : "Qor ama ku hadal su'aashaada"}
          </p>
          {voiceStatus ? (
            <p className="text-xs text-orange-700 font-medium">{voiceStatus}</p>
          ) : isSynthesizing ? (
            <p className="text-xs text-orange-700 font-medium">
              {autoPlayVoice ? "Jawaabta codkeeda ayaan diyaarinayaa..." : "Codka waa la diyaarinayaa (Auto-Play OFF)."}
            </p>
          ) : null}
        </div>
        <div className="flex items-end gap-2.5 sm:gap-3">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                if (e.target.value.length <= MAX_INPUT_LENGTH) {
                  setInput(e.target.value);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Su'aashaada halkan ku qor..."
              className="flex-1 min-h-[48px] sm:min-h-[52px] max-h-36 resize-none rounded-2xl border-2 border-orange-200 focus:border-orange-400 focus:ring-orange-300 pr-16 text-[16px] leading-relaxed py-3 px-4"
              rows={1}
              maxLength={MAX_INPUT_LENGTH}
              data-testid="input-question"
            />
            <span className={`absolute bottom-3 right-4 text-xs ${input.length >= MAX_INPUT_LENGTH ? 'text-red-500' : 'text-orange-700/60'}`}>
              {input.length}/{MAX_INPUT_LENGTH}
            </span>
          </div>
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isVoiceProcessing || askMutation.isPending || (usageData?.remaining === 0)}
            className={`h-[48px] w-[48px] sm:h-[52px] sm:w-[52px] rounded-2xl flex-shrink-0 ${
              isRecording
                ? "bg-red-500 hover:bg-red-600"
                : "bg-orange-500 hover:bg-orange-600"
            }`}
            data-testid="button-voice"
          >
            {isVoiceProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isRecording ? (
              <Square className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || isPending || isRecording || (usageData?.remaining === 0)}
            className="h-[48px] w-[48px] sm:h-[52px] sm:w-[52px] rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 flex-shrink-0"
            data-testid="button-send"
          >
            {isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>

        {usageData?.remaining === 0 && (
          <p className="text-sm text-red-500 mt-2 text-center font-medium">
            Waxaad gaartay xadka maalintii. Fadlan soo noqo berri.
          </p>
        )}
        </div>
      </div>
    </div>
  );
}
