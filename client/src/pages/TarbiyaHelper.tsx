import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Send, Bot, User, Sparkles, Loader2, Heart, Clock, Plus, MessageSquare, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useParentAuth } from "@/contexts/ParentAuthContext";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  audioUrl?: string;
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

  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const MAX_INPUT_LENGTH = 300;

  const handleBack = () => {
    if (messages.length > 0 || currentConversationId) {
      setMessages([]);
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
    };
  }, []);

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
      setMessages(data.messages);
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
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: data.answer,
        createdAt: new Date().toISOString()
      }]);

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

  const handleSubmit = () => {
    if (!input.trim() || askMutation.isPending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    askMutation.mutate(input.trim());
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
    setCurrentConversationId(null);
    setSelectedTopic("");
    setShowNewChat(true);
  };

  const isPending = askMutation.isPending;

  if (!parent) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex flex-col items-center justify-center px-4">
        <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
          <Bot className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Tarbiyada & Waalidnimada</h2>
        <p className="text-gray-600 mb-6 text-center max-w-sm">
          Fadlan gal akoonkaaga si aad u isticmaasho Caawiyaha Tarbiyada.
        </p>
        <Link href="/register">
          <Button className="bg-gradient-to-r from-emerald-500 to-teal-500">
            Gal ama Isdiiwaangeli
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex flex-col pb-20">
      <header className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white sticky top-0 z-40 shadow-lg">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-white hover:bg-white/20"
              data-testid="button-back"
              onClick={handleBack}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Heart className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Tarbiyada & Waalidnimada</h1>
                <p className="text-xs text-white/70">AI-ka ku caawinaya tarbiyadda ilmahaaga</p>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-white hover:bg-white/20"
            onClick={startNewConversation}
            data-testid="button-new-chat"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {usageData && (
          <div className="px-4 pb-2">
            <div className="flex items-center justify-between text-xs text-white/70">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Su'aalo maanta: {usageData.questionsAsked}/{usageData.limit}
              </span>
              <span>Haray: {usageData.remaining}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-1.5 mt-1">
              <div
                className="bg-white rounded-full h-1.5 transition-all"
                style={{ width: `${(usageData.questionsAsked / usageData.limit) * 100}%` }}
              />
            </div>
          </div>
        )}
      </header>

      {accessStatus && (
        <div className="px-4 py-2 text-center" data-testid="trial-banner">
          {accessStatus.plan === "trial" ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
              Tijaabadaadu waxay kaa dhamaanaysaa {accessStatus.trialDaysRemaining} Maalmood ka dib
            </span>
          ) : accessStatus.plan === "gold" ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
              Xubin Dahabi 💛
            </span>
          ) : null}
        </div>
      )}

      <div className="flex-1 overflow-auto p-4 space-y-4 pb-36">
        {showNewChat && messages.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Bot className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Caawiyaha Tarbiyada</h2>
            <p className="text-gray-600 mb-6 max-w-sm mx-auto">
              Weydii wax kasta oo ku saabsan tarbiyadda ilmahaaga — Islaamka, dhaqanka, iyo cilmiga casriga ah.
            </p>

            <div className="max-w-sm mx-auto mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                Dooro mawduuca (optional)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TOPICS.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => setSelectedTopic(topic.id)}
                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                      selectedTopic === topic.id
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-emerald-200"
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
                <p className="text-sm font-medium text-gray-500 mb-3 text-left">Wada-hadalladii hore:</p>
                <div className="space-y-2">
                  {conversations.slice(0, 3).map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => loadConversation(conv.id)}
                      className="w-full text-left p-3 bg-white rounded-xl border border-gray-100 hover:border-emerald-200 transition-colors"
                      data-testid={`conversation-${conv.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-medium text-gray-700">{conv.topic}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
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
              <div className="flex items-center gap-2 text-sm text-gray-500 bg-white/50 rounded-lg px-3 py-2">
                <Heart className="w-4 h-4" />
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
                      ? "bg-blue-500"
                      : "bg-gradient-to-br from-emerald-400 to-teal-500"
                  }`}>
                    {message.role === "user" ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className={`p-3 rounded-2xl ${
                    message.role === "user"
                      ? "bg-blue-500 text-white rounded-tr-sm"
                      : "bg-white border border-gray-100 shadow-sm rounded-tl-sm"
                  }`}>
                    <p className={`text-base whitespace-pre-wrap leading-relaxed ${message.role === "user" ? "text-white" : "text-gray-700"}`}>
                      {message.content}
                    </p>
                    {message.role === "assistant" && message.audioUrl && (
                      <button
                        onClick={() => playAudio(message.audioUrl!, message.id)}
                        className="mt-2 flex items-center gap-2 text-xs text-emerald-600 hover:text-emerald-700 bg-emerald-50 rounded-full px-3 py-1.5 transition-colors"
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
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {isPending && (
          <div className="flex justify-start">
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="p-3 bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm">
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Waan ka fikiraa...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="fixed bottom-[4.5rem] left-0 right-0 bg-white border-t border-gray-200 p-4 px-5 max-w-2xl mx-auto shadow-[0_-4px_12px_rgba(0,0,0,0.1)] z-50">
        <div className="flex items-end gap-3">
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
              className="flex-1 min-h-[52px] max-h-36 resize-none rounded-2xl border-2 border-gray-300 focus:border-emerald-400 focus:ring-emerald-400 pr-16 text-[16px] leading-relaxed py-3.5 px-4"
              rows={1}
              maxLength={MAX_INPUT_LENGTH}
              data-testid="input-question"
            />
            <span className={`absolute bottom-3.5 right-4 text-xs ${input.length >= MAX_INPUT_LENGTH ? 'text-red-500' : 'text-gray-400'}`}>
              {input.length}/{MAX_INPUT_LENGTH}
            </span>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || isPending || (usageData?.remaining === 0)}
            className="h-[52px] w-[52px] rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 flex-shrink-0"
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
  );
}
