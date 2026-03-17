import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Send, Bot, User, Sparkles, Loader2, BookOpen, Calculator, Globe, Beaker, History, Clock, Plus, MessageSquare, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useParentAuth } from "@/contexts/ParentAuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  audioUrl?: string;
}

interface Conversation {
  id: string;
  subject: string;
  childAge: string | null;
  createdAt: string;
}

const SUBJECTS = [
  { id: "Xisaab", icon: Calculator, label: "Xisaab", labelEn: "Math" },
  { id: "Aqrinta", icon: BookOpen, label: "Aqrinta iyo Qoraalka", labelEn: "Reading & Writing" },
  { id: "Sayniska", icon: Beaker, label: "Sayniska", labelEn: "Science" },
  { id: "Taariikhda", icon: History, label: "Taariikhda", labelEn: "History" },
  { id: "Luuqadaha", icon: Globe, label: "Luuqadaha", labelEn: "Languages" },
  { id: "Guud", icon: MessageSquare, label: "Guud", labelEn: "General" },
];

const AGE_RANGES = [
  { id: "4-6", label: "4-6 sano" },
  { id: "7-9", label: "7-9 sano" },
  { id: "10-12", label: "10-12 sano" },
  { id: "13-15", label: "13-15 sano" },
  { id: "16+", label: "16+ sano" },
];

function AudioPlayButton({ audioUrl, messageId }: { audioUrl: string; messageId: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onerror = () => setIsPlaying(false);
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <button
      onClick={togglePlay}
      className="mt-2 flex items-center gap-1.5 text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full hover:bg-purple-200 transition-colors"
      data-testid={`button-play-audio-${messageId}`}
    >
      {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      <span>{isPlaying ? "Jooji" : "Dhageyso"}</span>
    </button>
  );
}

export default function HomeworkHelper() {
  const { t, i18n } = useTranslation();
  const { parent } = useParentAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const MAX_INPUT_LENGTH = 300;
  const [selectedAge, setSelectedAge] = useState<string>("");
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showNewChat, setShowNewChat] = useState(true);

  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: accessStatus } = useQuery({
    queryKey: ["ai-access-status"],
    queryFn: async () => {
      const res = await fetch("/api/ai/access-status", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch access status");
      return res.json();
    },
    enabled: !!parent,
  });
  
  const handleBack = () => {
    if (messages.length > 0 || currentConversationId) {
      setMessages([]);
      setCurrentConversationId(null);
      setSelectedSubject("");
      setSelectedAge("");
      setShowNewChat(true);
      return;
    }
    
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/");
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);


  const { data: usageData } = useQuery({
    queryKey: ["homework-usage"],
    queryFn: async () => {
      const res = await fetch("/api/homework/usage", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch usage");
      return res.json();
    },
    enabled: !!parent,
  });

  const { data: conversations } = useQuery({
    queryKey: ["homework-conversations"],
    queryFn: async () => {
      const res = await fetch("/api/homework/conversations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return res.json() as Promise<Conversation[]>;
    },
    enabled: !!parent,
  });

  const loadConversation = async (conversationId: string) => {
    try {
      const res = await fetch(`/api/homework/conversations/${conversationId}/messages`, { 
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to load messages");
      const data = await res.json();
      setMessages(data.messages);
      setCurrentConversationId(conversationId);
      setSelectedSubject(data.conversation.subject);
      setSelectedAge(data.conversation.childAge || "");
      setShowNewChat(false);
    } catch (error) {
      console.error("Error loading conversation:", error);
    }
  };

  const askMutation = useMutation({
    mutationFn: async (question: string) => {
      const res = await fetch("/api/homework/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          question,
          conversationId: currentConversationId,
          subject: selectedSubject || "Guud",
          childAge: selectedAge || null
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
      
      queryClient.invalidateQueries({ queryKey: ["homework-usage"] });
      queryClient.invalidateQueries({ queryKey: ["homework-conversations"] });
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
    setSelectedSubject("");
    setSelectedAge("");
    setShowNewChat(true);
  };

  if (!parent) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex flex-col items-center justify-center px-4">
        <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
          <Bot className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Laylisyada Guriga</h2>
        <p className="text-gray-600 mb-6 text-center max-w-sm">
          Fadlan gal akoonkaaga si aad u isticmaasho Laylisyada Guriga.
        </p>
        <Link href="/register">
          <Button className="bg-gradient-to-r from-purple-500 to-indigo-500">
            Gal ama Isdiiwaangeli
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex flex-col pb-20">
      <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white sticky top-0 z-40 shadow-lg">
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
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Laylisyada Guriga</h1>
                <p className="text-xs text-white/70">AI-ka ku caawinaya ilmahaaga laylisyada dugsiga</p>
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

        {accessStatus && (
          <div className="px-4 pb-1">
            <div className="text-xs text-center py-1 rounded-md bg-white/10">
              {accessStatus.plan === "gold" ? (
                <span data-testid="text-plan-badge">Xubin Dahabi 💛</span>
              ) : (
                <span data-testid="text-plan-badge">Tijaabadaadu waxay kaa dhamaanaysaa {accessStatus.trialDaysRemaining ?? accessStatus.dailyRemaining ?? 0} Maalmood ka dib</span>
              )}
            </div>
          </div>
        )}
        
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

      <div className="flex-1 overflow-auto p-4 space-y-4 pb-36">
        {showNewChat && messages.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Bot className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Ku soo dhawoow Laylisyada Guriga</h2>
            <p className="text-gray-600 mb-6 max-w-sm mx-auto">
              Weydii su'aal kasta oo la xiriira hawlaha guriga ilmahaaga - xisaab, aqris, sayniska, iyo wax kale!
            </p>
            
            <div className="max-w-sm mx-auto mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                Dooro mawduuca (optional)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {SUBJECTS.map((subject) => (
                  <button
                    key={subject.id}
                    onClick={() => setSelectedSubject(subject.id)}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      selectedSubject === subject.id
                        ? "border-purple-500 bg-purple-50 text-purple-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-purple-200"
                    }`}
                    data-testid={`subject-${subject.id}`}
                  >
                    <subject.icon className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-xs font-medium">{subject.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="max-w-sm mx-auto mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                Da'da ilmaha (optional)
              </label>
              <Select value={selectedAge} onValueChange={setSelectedAge}>
                <SelectTrigger className="w-full" data-testid="select-age">
                  <SelectValue placeholder="Dooro da'da" />
                </SelectTrigger>
                <SelectContent>
                  {AGE_RANGES.map((age) => (
                    <SelectItem key={age.id} value={age.id}>
                      {age.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {conversations && conversations.length > 0 && (
              <div className="mt-8 max-w-sm mx-auto">
                <p className="text-sm font-medium text-gray-500 mb-3 text-left">Wada-hadalladii hore:</p>
                <div className="space-y-2">
                  {conversations.slice(0, 3).map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => loadConversation(conv.id)}
                      className="w-full text-left p-3 bg-white rounded-xl border border-gray-100 hover:border-purple-200 transition-colors"
                      data-testid={`conversation-${conv.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-purple-500" />
                        <span className="text-sm font-medium text-gray-700">{conv.subject}</span>
                        {conv.childAge && (
                          <span className="text-xs text-gray-400">({conv.childAge})</span>
                        )}
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
            {selectedSubject && (
              <div className="flex items-center gap-2 text-sm text-gray-500 bg-white/50 rounded-lg px-3 py-2">
                <BookOpen className="w-4 h-4" />
                <span>Mawduuca: {selectedSubject}</span>
                {selectedAge && <span className="text-gray-400">• Da'da: {selectedAge}</span>}
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
                      : "bg-gradient-to-br from-purple-400 to-indigo-500"
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
                      <AudioPlayButton audioUrl={message.audioUrl} messageId={message.id} />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
        
        {askMutation.isPending && (
          <div className="flex justify-start">
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center">
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
              className="flex-1 min-h-[52px] max-h-36 resize-none rounded-2xl border-2 border-gray-300 focus:border-purple-400 focus:ring-purple-400 pr-16 text-[16px] leading-relaxed py-3.5 px-4"
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
            disabled={!input.trim() || askMutation.isPending || (usageData?.remaining === 0)}
            className="h-[52px] w-[52px] rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 flex-shrink-0"
            data-testid="button-send"
          >
            {askMutation.isPending ? (
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
