import { VoiceSpaces } from "@/components/VoiceSpaces";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function Sheeko() {
  const [location] = useLocation();
  const [isStandalone, setIsStandalone] = useState(false);
  const [initialRoomId, setInitialRoomId] = useState<string | undefined>();
  const [fromAdmin, setFromAdmin] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const standaloneParam = searchParams.get('standalone') === '1';
    const displayModeStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const iosStandalone = (window.navigator as any).standalone === true;
    
    // Check for room and admin parameters
    const roomParam = searchParams.get('room');
    const adminParam = searchParams.get('admin') === '1';
    
    setIsStandalone(standaloneParam || displayModeStandalone || iosStandalone);
    setInitialRoomId(roomParam || undefined);
    setFromAdmin(adminParam);
  }, [location]);

  if (isStandalone) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-950 to-slate-900">
        <VoiceSpaces initialRoomId={initialRoomId} fromAdmin={fromAdmin} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 pb-20">
      <VoiceSpaces initialRoomId={initialRoomId} fromAdmin={fromAdmin} />
    </div>
  );
}
