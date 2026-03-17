import { useState } from "react";
import { useParentAuth } from "@/contexts/ParentAuthContext";
import { ChatList } from "@/components/ChatList";
import { ChatRoom } from "@/components/ChatRoom";
import { VoiceSpaces } from "@/components/VoiceSpaces";
import { MessageSquare, ArrowLeft, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface ConversationInfo {
  id: string;
  participantName: string;
  participantPicture: string | null;
}

type ActiveTab = "messages" | "sheeko";

export default function MessengerPage() {
  const { parent, isLoading } = useParentAuth();
  const [selectedConversation, setSelectedConversation] = useState<ConversationInfo | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("messages");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Soo dejinaya...</div>
      </div>
    );
  }

  if (!parent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <MessageSquare className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Fadlan gal</h2>
        <p className="text-muted-foreground text-center">
          Waa inaad gasho si aad u isticmaasho messenger-ka
        </p>
        <Link href="/login">
          <Button>Gal</Button>
        </Link>
      </div>
    );
  }

  const handleSelectConversation = (conversationId: string, participantName?: string, participantPicture?: string | null) => {
    setSelectedConversation({
      id: conversationId,
      participantName: participantName || "Unknown",
      participantPicture: participantPicture || null,
    });
  };

  const handleBack = () => {
    setSelectedConversation(null);
  };

  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col">
      <div className="h-14 flex items-center gap-3 px-4 border-b bg-white shrink-0">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <MessageSquare className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold">Fariimaha</h1>
      </div>

      {/* Tab bar */}
      <div className="flex border-b bg-white shrink-0">
        <button
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            activeTab === "messages" 
              ? "text-primary border-b-2 border-primary" 
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("messages")}
          data-testid="tab-messages"
        >
          <MessageSquare className="w-4 h-4" />
          Fariimaha
        </button>
        <button
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            activeTab === "sheeko" 
              ? "text-primary border-b-2 border-primary" 
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("sheeko")}
          data-testid="tab-sheeko"
        >
          <Radio className="w-4 h-4" />
          Sheeko
        </button>
      </div>

      {activeTab === "messages" ? (
        <div className="flex flex-1 min-h-0">
          <div className={`md:w-80 md:border-r overflow-y-auto ${selectedConversation ? "hidden md:block" : "w-full"}`}>
            <ChatListWithSelect 
              currentUserId={parent.id} 
              onSelectConversation={handleSelectConversation}
              selectedConversationId={selectedConversation?.id}
            />
          </div>

          <div className={`flex-1 ${selectedConversation ? "block" : "hidden md:flex md:items-center md:justify-center"}`}>
            {selectedConversation ? (
              <ChatRoom
                conversationId={selectedConversation.id}
                participantName={selectedConversation.participantName}
                participantPicture={selectedConversation.participantPicture}
                currentUserId={parent.id}
                onBack={handleBack}
              />
            ) : (
              <div className="text-center text-muted-foreground p-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Dooro wadahadal si aad u bilowdo</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <VoiceSpaces />
        </div>
      )}
    </div>
  );
}

function ChatListWithSelect({ 
  currentUserId, 
  onSelectConversation,
  selectedConversationId 
}: { 
  currentUserId: string;
  onSelectConversation: (id: string, name?: string, picture?: string | null) => void;
  selectedConversationId?: string;
}) {
  return (
    <div className="h-full overflow-y-auto">
      <ChatList
        currentUserId={currentUserId}
        selectedConversationId={selectedConversationId}
        onSelectConversation={(id) => {
          onSelectConversation(id);
        }}
      />
    </div>
  );
}
