import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send, Loader2, User, MapPin, Phone, Mail } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParentAuth } from "@/contexts/ParentAuthContext";
import { toast } from "sonner";

interface ChatSupportProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function ChatSupport({ isOpen: externalIsOpen, onOpenChange }: ChatSupportProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = onOpenChange || setInternalIsOpen;
  const [message, setMessage] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestLocation, setGuestLocation] = useState("");
  const [formSubmitted, setFormSubmitted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { parent } = useParentAuth();

  const sessionId = useRef(
    localStorage.getItem("chat_session_id") || 
    `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );

  useEffect(() => {
    localStorage.setItem("chat_session_id", sessionId.current);
    const savedInfo = localStorage.getItem("chat_guest_info_v2");
    if (savedInfo) {
      try {
        const info = JSON.parse(savedInfo);
        if (info.guestName && info.guestEmail && info.guestPhone && info.guestLocation) {
          const words = (info.guestName || "").trim().split(/\s+/);
          if (words.length >= 3 && info.guestEmail.includes("@")) {
            setGuestName(info.guestName);
            setGuestEmail(info.guestEmail);
            setGuestPhone(info.guestPhone);
            setGuestLocation(info.guestLocation);
            setFormSubmitted(true);
          }
        }
      } catch {
        // Invalid JSON in localStorage, ignore
      }
    }
  }, []);

  const { data: messages = [] } = useQuery({
    queryKey: ["supportMessages", sessionId.current],
    queryFn: async () => {
      const url = parent 
        ? "/api/support/messages" 
        : `/api/support/messages/guest?sessionId=${sessionId.current}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isOpen,
    refetchInterval: isOpen ? 2000 : false,
  });

  const sendMessage = useMutation({
    mutationFn: async (text: string) => {
      const body = parent 
        ? { message: text }
        : { 
            message: text, 
            sessionId: sessionId.current, 
            guestName: guestName.trim(), 
            guestEmail: guestEmail.trim(),
            guestPhone: guestPhone.trim(),
            guestLocation: guestLocation.trim()
          };
      
      const res = await fetch("/api/support/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to send");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supportMessages"] });
      setMessage("");
      if (!parent) {
        localStorage.setItem("chat_guest_info_v2", JSON.stringify({
          guestName: guestName.trim(),
          guestEmail: guestEmail.trim(),
          guestPhone: guestPhone.trim(),
          guestLocation: guestLocation.trim()
        }));
        setFormSubmitted(true);
      }
    },
  });

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const validateFullName = (name: string) => {
    const words = name.trim().split(/\s+/);
    return words.length >= 3;
  };

  const isFormValid = () => {
    return validateFullName(guestName) && 
           guestLocation.trim() && 
           guestPhone.trim() && 
           guestEmail.trim() && 
           guestEmail.includes("@");
  };

  const handleSend = () => {
    if (!message.trim()) return;
    
    if (!parent) {
      if (!validateFullName(guestName)) {
        toast.error("Fadlan geli magacaaga oo dhan (ugu yaraan 3 eray)");
        return;
      }
      if (!guestLocation.trim()) {
        toast.error("Fadlan geli meesha aad joogto");
        return;
      }
      if (!guestPhone.trim()) {
        toast.error("Fadlan geli telefoonkaaga");
        return;
      }
      if (!guestEmail.trim() || !guestEmail.includes("@")) {
        toast.error("Fadlan geli email sax ah");
        return;
      }
    }
    
    sendMessage.mutate(message.trim());
  };

  const canSend = parent || isFormValid();

  const isExternallyControlled = externalIsOpen !== undefined;

  return (
    <>

      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-[360px] shadow-2xl rounded-3xl overflow-hidden border border-gray-200">
          <div className="bg-[#075E54] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Barbaarintasan</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
                    <span className="text-green-100 text-xs">Online</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                data-testid="button-close-chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="bg-[#ECE5DD]">
            <div className="h-64 overflow-y-auto p-4 space-y-3">
              <div className="flex justify-start">
                <div className="bg-white shadow-sm px-4 py-3 rounded-lg rounded-tl-none max-w-[85%]">
                  <p className="text-gray-700 text-sm">Assalamu Calaykum! 👋</p>
                  <p className="text-gray-600 text-sm mt-1">Sidee kugu caawin karnaa?</p>
                </div>
              </div>

              {messages.map((msg: any) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isFromAdmin ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-2 text-sm shadow-sm ${
                      msg.isFromAdmin
                        ? "bg-white rounded-lg rounded-tl-none text-gray-700"
                        : "bg-[#DCF8C6] rounded-lg rounded-tr-none text-gray-800"
                    }`}
                  >
                    {msg.message}
                    <div className="text-[10px] text-gray-500 text-right mt-1">
                      {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {!parent && !formSubmitted && (
              <div className="px-4 pb-3 space-y-2 bg-white border-t pt-3">
                <p className="text-xs text-gray-600 font-medium mb-2">Fadlan buuxi xogtaada:</p>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Magacaaga oo dhan (3 eray) *"
                    className="h-9 text-sm pl-9 border-gray-300 rounded-lg"
                    data-testid="input-guest-name"
                  />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={guestLocation}
                    onChange={(e) => setGuestLocation(e.target.value)}
                    placeholder="Meesha aad joogto *"
                    className="h-9 text-sm pl-9 border-gray-300 rounded-lg"
                    data-testid="input-guest-location"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="Telefoonkaaga *"
                    className="h-9 text-sm pl-9 border-gray-300 rounded-lg"
                    data-testid="input-guest-phone"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="Email *"
                    type="email"
                    className="h-9 text-sm pl-9 border-gray-300 rounded-lg"
                    data-testid="input-guest-email"
                  />
                </div>
              </div>
            )}

            {!parent && formSubmitted && (
              <div className="px-4 py-2 bg-[#DCF8C6] border-t">
                <p className="text-xs text-gray-700">
                  <span className="font-medium">{guestName}</span> • {guestLocation} • {guestPhone}
                </p>
              </div>
            )}

            <div className="p-3 bg-[#F0F0F0] border-t">
              <div className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Qor fariintaada..."
                  className="flex-1 h-11 text-sm border-0 rounded-full bg-white shadow-sm"
                  onKeyPress={(e) => e.key === "Enter" && canSend && handleSend()}
                  data-testid="input-chat-message"
                />
                <Button
                  onClick={handleSend}
                  disabled={!message.trim() || sendMessage.isPending || !canSend}
                  className="h-11 w-11 p-0 bg-[#25D366] hover:bg-[#128C7E] rounded-full shadow-lg"
                  data-testid="button-send-message"
                >
                  {sendMessage.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
