import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParentAuth } from "@/contexts/ParentAuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Mic, 
  MicOff, 
  Hand, 
  Users, 
  Radio, 
  Calendar, 
  PhoneOff, 
  Volume2, 
  VolumeX,
  Star,
  UserX,
  Crown,
  Check,
  X,
  StopCircle,
  Share2,
  LogIn,
  MessageCircle,
  Send,
  Eye,
  EyeOff,
  ChevronLeft,
  Circle,
  Heart,
  Smile,
  Headphones,
  Trash2,
  Pin,
  PinOff,
  UserPlus,
  UserCheck,
  Plus,
  Download,
  Pencil
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useLiveKitRoom } from "@/hooks/useLiveKitRoom";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useLiveKitRecording } from "@/hooks/useLiveKitRecording";
import { useMediaPermissions } from "@/hooks/useMediaPermissions";
import { useWakeLock } from "@/hooks/useWakeLock";
import { format } from "date-fns";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { useSearchString } from "@/hooks/useBrowserLocation";
import bsaAppIcon from "@assets/generated_images/bsa_app_icon_orange_gradient.png";
import sheekoAppIcon from "@assets/generated_images/sheeko_app_icon_purple_gradient.png";

interface VoiceRoom {
  id: string;
  title: string;
  description: string | null;
  hostId: string;
  host?: {
    id: string;
    name: string;
    picture: string | null;
  };
  status: "scheduled" | "live" | "ended";
  scheduledAt: string | null;
  startedAt: string | null;
  maxSpeakers: number;
  createdAt: string;
  participants?: VoiceParticipant[];
  participantCount?: number;
  speakerCount?: number;
  pinnedMessageId?: string | null;
}

function FollowButton({ hostId, initialCount = 0 }: { hostId: string, initialCount?: number }) {
  const { parent } = useParentAuth();
  const queryClient = useQueryClient();

  const { data: followData } = useQuery({
    queryKey: ["/api/hosts", hostId, "following"],
    queryFn: () => fetch(`/api/hosts/${hostId}/following`, { credentials: 'include' }).then(r => r.json()),
    enabled: !!hostId && !!parent,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/hosts/${hostId}/follow`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to follow');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hosts", hostId, "following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-following"] });
      toast.success("Waad Follow gareysay!");
    },
    onError: () => toast.error("Wax qalad ah ayaa dhacay")
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/hosts/${hostId}/follow`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to unfollow');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hosts", hostId, "following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-following"] });
      toast.success("Waad ka laabatay Follow-ka");
    },
    onError: () => toast.error("Wax qalad ah ayaa dhacay")
  });

  if (!parent || parent.id === hostId) return null;

  const isFollowing = followData?.isFollowing;
  const count = followData?.followerCount ?? initialCount;

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`h-7 rounded-full text-[10px] px-2 ${
        isFollowing 
          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
          : 'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20'
      }`}
      onClick={(e) => {
        e.stopPropagation();
        if (isFollowing) unfollowMutation.mutate();
        else followMutation.mutate();
      }}
      disabled={followMutation.isPending || unfollowMutation.isPending}
    >
      {isFollowing ? (
        <><UserCheck className="w-3 h-3 mr-1" /> Following</>
      ) : (
        <><UserPlus className="w-3 h-3 mr-1" /> Follow</>
      )}
      {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
    </Button>
  );
}

function SheekoFollowButton({ userId }: { userId: string }) {
  const { parent } = useParentAuth();
  const queryClient = useQueryClient();

  const { data: followData } = useQuery({
    queryKey: ["/api/sheeko/users", userId, "following"],
    queryFn: () => fetch(`/api/sheeko/users/${userId}/following`, { credentials: 'include' }).then(r => r.json()),
    enabled: !!userId && !!parent,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/sheeko/users/${userId}/follow`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to follow');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheeko/users", userId, "following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sheeko/my-following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sheeko/my-followers"] });
      toast.success("You are now following this user!");
    },
    onError: () => toast.error("Something went wrong")
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/sheeko/users/${userId}/follow`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to unfollow');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheeko/users", userId, "following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sheeko/my-following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sheeko/my-followers"] });
      toast.success("You unfollowed this user");
    },
    onError: () => toast.error("Something went wrong")
  });

  if (!parent || parent.id === userId) return null;

  const isFollowing = followData?.isFollowing;
  const followerCount = followData?.followerCount ?? 0;

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`h-7 rounded-full text-[10px] px-2 ${
        isFollowing 
          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
          : 'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20'
      }`}
      onClick={(e) => {
        e.stopPropagation();
        if (isFollowing) unfollowMutation.mutate();
        else followMutation.mutate();
      }}
      disabled={followMutation.isPending || unfollowMutation.isPending}
    >
      {isFollowing ? (
        <><UserCheck className="w-3 h-3 mr-1" /> Following</>
      ) : (
        <><UserPlus className="w-3 h-3 mr-1" /> Follow</>
      )}
      {followerCount > 0 && <span className="ml-1 opacity-70">({followerCount})</span>}
    </Button>
  );
}

interface VoiceParticipant {
  id: string;
  roomId: string;
  parentId: string;
  role: "listener" | "speaker" | "co-host";
  isMuted: boolean;
  handRaised: boolean;
  handRaisedAt: string | null;
  parent: {
    id: string;
    name: string;
    picture: string | null;
    isYearlySubscriber?: boolean;
  };
}

interface VoiceRoomMessage {
  id: string;
  roomId: string;
  parentId: string | null;
  guestId: string | null;
  displayName: string;
  message: string;
  createdAt: string;
}

interface VoiceSpacesProps {
  initialRoomId?: string;
  fromAdmin?: boolean;
}

interface FloatingReaction {
  id: string;
  emoji: string;
  x: number;
}

const CHAT_EMOJIS = ['👍', '❤️', '👏', '😊', '😂', '🙌', '💯', '🔥'];
const REACTION_EMOJIS = ['👍', '❤️', '👏', '😮', '🔥'];

function FloatingEmoji({ emoji, x, onComplete }: { emoji: string; x: number; onComplete: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 0.5 }}
      animate={{ opacity: 0, y: -120, scale: 1.5 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 2, ease: "easeOut" }}
      onAnimationComplete={onComplete}
      className="fixed pointer-events-none z-[200] text-4xl"
      style={{ left: `${x}%`, bottom: '140px' }}
    >
      {emoji}
    </motion.div>
  );
}

export function VoiceSpaces({ initialRoomId, fromAdmin = false }: VoiceSpacesProps = {}) {
  const { parent } = useParentAuth();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  
  // Use the custom search string hook that tracks query string changes
  const searchString = useSearchString();
  const searchParams = new URLSearchParams(searchString);
  
  // Parse URL params from search params
  const getUrlParams = useCallback(() => {
    const params = new URLSearchParams(searchString);
    return {
      roomId: params.get('room') || initialRoomId,
      isAdmin: params.get('admin') === '1' || fromAdmin,
    };
  }, [initialRoomId, fromAdmin, searchString]);
  
  // State for admin status that gets set during auto-join
  const [adminJoinStatus, setAdminJoinStatus] = useState<boolean | null>(null);
  
  const [activeRoom, setActiveRoom] = useState<VoiceRoom | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newRoom, setNewRoom] = useState({
    title: "",
    description: "",
    scheduledAt: "",
    maxSpeakers: 10,
  });
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [followTab, setFollowTab] = useState<'following' | 'followers'>('following');
  const [pendingRoom, setPendingRoom] = useState<VoiceRoom | null>(null);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [showMicPermissionDialog, setShowMicPermissionDialog] = useState(false);
  
  const { microphoneStatus, requestMicrophone, error: micError } = useMediaPermissions();

  const hasAcceptedTerms = () => {
    return localStorage.getItem('sheeko-terms-accepted') === 'true';
  };

  const handleRoomClick = (room: VoiceRoom) => {
    if (!hasAcceptedTerms()) {
      setPendingRoom(room);
      setShowTermsDialog(true);
    } else if (microphoneStatus === 'prompt' || microphoneStatus === 'checking') {
      setPendingRoom(room);
      setShowMicPermissionDialog(true);
    } else if (microphoneStatus === 'denied') {
      toast.error("Microphone access is required. Please enable it in your browser settings.");
    } else {
      setActiveRoom(room);
    }
  };

  const handleAcceptTerms = () => {
    localStorage.setItem('sheeko-terms-accepted', 'true');
    setShowTermsDialog(false);
    if (pendingRoom) {
      if (microphoneStatus === 'prompt' || microphoneStatus === 'checking') {
        setShowMicPermissionDialog(true);
      } else if (microphoneStatus === 'granted') {
        setActiveRoom(pendingRoom);
        setPendingRoom(null);
      } else {
        toast.error("Microphone access is required to join voice rooms.");
        setPendingRoom(null);
      }
    }
  };

  const handleGrantMicrophone = async () => {
    const granted = await requestMicrophone();
    setShowMicPermissionDialog(false);
    if (granted && pendingRoom) {
      setActiveRoom(pendingRoom);
      setPendingRoom(null);
    } else if (!granted) {
      toast.error("Microphone access is required to join voice rooms. Please enable it in your browser settings.");
      setPendingRoom(null);
    }
  };

  useEffect(() => {
    const displayMode = window.matchMedia('(display-mode: standalone)');
    setIsInstalled(displayMode.matches || (window.navigator as any).standalone === true);

    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
      toast.success("Sheeko has been installed!");
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      toast.info(
        <div className="text-sm">
          <p className="font-medium mb-1">Sheeko iOS-ka ku install-garee:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Riix Share button-ka 📤</li>
            <li>Dooro "Add to Home Screen"</li>
          </ol>
        </div>,
        { duration: 8000 }
      );
    } else if (isAndroid) {
      toast.info(
        <div className="text-sm">
          <p className="font-medium mb-1">Sheeko Android-ka ku install-garee:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Riix menu-ga ⋮ sare midig</li>
            <li>Dooro "Install app" ama "Add to Home Screen"</li>
          </ol>
        </div>,
        { duration: 8000 }
      );
    } else {
      toast.info("Use your browser menu to install Sheeko");
    }
  };

  const canHost = parent?.isAdmin || parent?.canHostSheeko;

  const { data: rooms = [], isLoading } = useQuery<VoiceRoom[]>({
    queryKey: ["/api/voice-rooms"],
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof newRoom) => 
      apiRequest("POST", "/api/voice-rooms", data),
    onSuccess: () => {
      toast.success("Sheeko cusub ayaa la abuuray!");
      queryClient.invalidateQueries({ queryKey: ["/api/voice-rooms"] });
      setShowCreateDialog(false);
      setNewRoom({ title: "", description: "", scheduledAt: "", maxSpeakers: 10 });
    },
    onError: () => {
      toast.error("Waa la waayay in la abuuro Sheekada");
    },
  });

  // Convert Somalia local time (from datetime-local input) to UTC for storage
  const convertSomaliaLocalToUtc = (dateTimeLocalStr: string): string | null => {
    // datetime-local gives us "2024-01-15T14:30"
    // We interpret this as Somalia wall clock time (UTC+3)
    if (!dateTimeLocalStr || !dateTimeLocalStr.includes('T')) {
      return null;
    }
    
    const [datePart, timePart] = dateTimeLocalStr.split('T');
    if (!datePart || !timePart) return null;
    
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);
    
    // Validate parsed values
    if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) {
      return null;
    }
    
    // Create a Date object representing Somalia local time
    // Then subtract 3 hours to get UTC (Somalia is UTC+3)
    // Use milliseconds to handle hour underflow correctly (e.g., 02:00 Somalia → 23:00 previous day UTC)
    const somaliaTimeMs = Date.UTC(year, month - 1, day, hour, minute);
    const utcMs = somaliaTimeMs - (3 * 60 * 60 * 1000); // Subtract 3 hours in milliseconds
    const utcDate = new Date(utcMs);
    
    return utcDate.toISOString();
  };

  const handleCreate = () => {
    if (!newRoom.title.trim()) {
      toast.error("Fadlan ku dar cinwaanka");
      return;
    }
    
    // Convert scheduledAt from Somalia timezone (UTC+3) to UTC for storage
    const scheduledAtUtc = newRoom.scheduledAt 
      ? convertSomaliaLocalToUtc(newRoom.scheduledAt)
      : null;
    
    createMutation.mutate({ ...newRoom, scheduledAt: scheduledAtUtc || "" });
  };

  // State for focused scheduled room (when navigating from homepage)
  const [focusedScheduledRoom, setFocusedScheduledRoom] = useState<VoiceRoom | null>(null);
  
  // State for editing scheduled room
  const [isEditingScheduledRoom, setIsEditingScheduledRoom] = useState(false);
  const [editingRoomData, setEditingRoomData] = useState({
    title: "",
    description: "",
    scheduledAt: ""
  });

  // Mutation to update scheduled room
  const updateRoomMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; scheduledAt: string }) => {
      if (!focusedScheduledRoom) throw new Error("No room selected");
      const scheduledAtUtc = data.scheduledAt 
        ? convertSomaliaLocalToUtc(data.scheduledAt)
        : null;
      return apiRequest("PATCH", `/api/voice-rooms/${focusedScheduledRoom.id}`, {
        title: data.title,
        description: data.description,
        scheduledAt: scheduledAtUtc
      });
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/voice-rooms"] });
      toast.success("Qolka waa la cusboonaysiiyay!");
      setIsEditingScheduledRoom(false);
      // Update focused room with new data from editingRoomData
      if (focusedScheduledRoom) {
        const updatedRoom = {
          ...focusedScheduledRoom,
          title: editingRoomData.title,
          description: editingRoomData.description || null,
          scheduledAt: editingRoomData.scheduledAt 
            ? convertSomaliaLocalToUtc(editingRoomData.scheduledAt)
            : focusedScheduledRoom.scheduledAt
        };
        setFocusedScheduledRoom(updatedRoom);
      }
    },
    onError: () => {
      toast.error("Wax qalad ah ayaa dhacay");
    }
  });

  // Helper to convert UTC to Somalia local time for editing
  const convertUtcToSomaliaLocal = (utcDateString: string): string => {
    const utcDate = new Date(utcDateString);
    // Add 3 hours to get Somalia time (UTC+3)
    const somaliaMs = utcDate.getTime() + (3 * 60 * 60 * 1000);
    const somaliaDate = new Date(somaliaMs);
    // Format as datetime-local input value: YYYY-MM-DDTHH:mm
    const year = somaliaDate.getUTCFullYear();
    const month = String(somaliaDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(somaliaDate.getUTCDate()).padStart(2, '0');
    const hour = String(somaliaDate.getUTCHours()).padStart(2, '0');
    const minute = String(somaliaDate.getUTCMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hour}:${minute}`;
  };

  const handleStartEdit = () => {
    if (!focusedScheduledRoom) return;
    setEditingRoomData({
      title: focusedScheduledRoom.title,
      description: focusedScheduledRoom.description || "",
      scheduledAt: focusedScheduledRoom.scheduledAt 
        ? convertUtcToSomaliaLocal(focusedScheduledRoom.scheduledAt)
        : ""
    });
    setIsEditingScheduledRoom(true);
  };

  const handleSaveEdit = () => {
    if (!editingRoomData.title.trim()) {
      toast.error("Fadlan ku dar cinwaanka");
      return;
    }
    if (!editingRoomData.scheduledAt) {
      toast.error("Fadlan dooro wakhtiga");
      return;
    }
    updateRoomMutation.mutate(editingRoomData);
  };

  useEffect(() => {
    // Parse URL params fresh on each effect run to avoid stale closures
    const params = getUrlParams();
    if (params.roomId && rooms.length > 0) {
      const targetRoom = rooms.find((r) => r.id === params.roomId);
      if (targetRoom) {
        if (targetRoom.status === "live" && !activeRoom) {
          // Capture admin status at join time
          setAdminJoinStatus(params.isAdmin);
          setActiveRoom(targetRoom);
        } else if (targetRoom.status === "scheduled") {
          // Show scheduled room details panel (always update for scheduled rooms)
          setFocusedScheduledRoom(targetRoom);
        }
      }
    } else {
      // No room param, clear focused scheduled room
      setFocusedScheduledRoom(null);
    }
  }, [getUrlParams, rooms, activeRoom, searchString]);

  const { connect, disconnect } = useWebSocket({
    onVoiceRoomUpdate: (update) => {
      queryClient.invalidateQueries({ queryKey: ["/api/voice-rooms"] });
      if (activeRoom && update.id === activeRoom.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/voice-rooms", activeRoom.id] });
      }
      // Dispatch custom event for components that need to react to specific room events
      window.dispatchEvent(new CustomEvent('voice-room-update', { detail: update }));
    },
  });

  useEffect(() => {
    if (parent?.id) {
      connect(parent.id);
    }
    return () => disconnect();
  }, [parent?.id, connect, disconnect]);

  const { data: followingHosts = [] } = useQuery<{ id: string; name: string; picture: string | null; followerCount: number }[]>({
    queryKey: ["/api/my-following"],
    queryFn: () => fetch("/api/my-following", { credentials: 'include' }).then(r => r.json()),
    enabled: !!parent,
  });

  const { data: sheekoFollowing = [] } = useQuery<{ id: string; name: string; picture: string | null; followedAt: string }[]>({
    queryKey: ["/api/sheeko/my-following"],
    queryFn: () => fetch("/api/sheeko/my-following", { credentials: 'include' }).then(r => r.json()),
    enabled: !!parent,
  });

  const { data: sheekoFollowers = [] } = useQuery<{ id: string; name: string; picture: string | null; followedAt: string }[]>({
    queryKey: ["/api/sheeko/my-followers"],
    queryFn: () => fetch("/api/sheeko/my-followers", { credentials: 'include' }).then(r => r.json()),
    enabled: !!parent,
  });

  if (isLoading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Soo dejinaya...
      </div>
    );
  }

  if (activeRoom) {
    return (
      <ActiveVoiceRoom 
        room={activeRoom} 
        fromAdmin={adminJoinStatus ?? getUrlParams().isAdmin}
        onLeave={() => {
          setActiveRoom(null);
          setAdminJoinStatus(null);
          queryClient.invalidateQueries({ queryKey: ["/api/voice-rooms"] });
        }}
      />
    );
  }

  const liveRooms = rooms.filter((r) => r.status === "live");
  const scheduledRooms = rooms.filter((r) => r.status === "scheduled");

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between mb-2">
        <Link href="/" className="flex flex-col items-center" data-testid="link-bsa-app-sheeko">
          <img src={bsaAppIcon} alt="BSA" className="w-10 h-10 rounded-xl shadow-lg border-2 border-gray-200" />
          <span className="text-gray-700 text-[10px] font-bold mt-0.5">BSA</span>
        </Link>
        
        <div className="flex items-center gap-2">
          <a 
            href="/"
            className="p-2 rounded-full hover:bg-muted transition-colors"
            data-testid="close-sheeko-button"
          >
            <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
          </a>
          {!isInstalled && (
            <Button 
              onClick={handleInstallClick}
              size="sm"
              variant="outline"
              className="border-purple-500/30 text-purple-600 hover:bg-purple-500/10"
              data-testid="install-sheeko-button"
            >
              <Download className="w-4 h-4 mr-1" />
              Install Sheeko
            </Button>
          )}
          {canHost && (
            <Button 
              onClick={() => setShowCreateDialog(true)} 
              size="sm"
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              data-testid="create-sheeko-button"
            >
              <Plus className="w-4 h-4 mr-1" />
              Abuur
            </Button>
          )}
        </div>
        
        <Link href="/sheeko" className="flex flex-col items-center" data-testid="link-sheeko-app-sheeko">
          <img src={sheekoAppIcon} alt="Sheeko" className="w-10 h-10 rounded-xl shadow-lg border-2 border-gray-200" />
          <span className="text-gray-700 text-[10px] font-bold mt-0.5">Sheeko</span>
        </Link>
      </div>
      
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
        <p className="text-sm text-amber-800 dark:text-amber-200 font-semibold mb-2">
          Live Audio Chat Rooms
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-300 mb-2">
          Live audio rooms are moderated and restricted to verified parent accounts. Moderators may mute, remove, or ban users at their discretion.
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-1">Do not:</p>
        <ul className="text-xs text-amber-700 dark:text-amber-300 list-disc list-inside space-y-0.5 mb-3">
          <li>Post or transmit hate speech, discrimination, harassment, abuse, or threats</li>
          <li>Promote violence, extremism, or harmful ideologies</li>
          <li>Share sensitive personal data, especially relating to children</li>
          <li>Use insulting, defamatory, or socially harmful language</li>
        </ul>
        
        <p className="text-sm text-amber-800 dark:text-amber-200 font-semibold mb-2">
          Qolalka Codka Tooska ah (Sheeko Toos ah)
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-300 mb-2">
          Qolalkan codka tooska ah waxaa loo oggol yahay kaliya Akoomada Waalidiinta ee la xaqiijiyay. Waxaa jira dad maamula (kormeerayaal) oo hubiya in wada sheekaysigu noqdo mid edeb leh oo ammaan ah.
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-300 mb-1">
          Kormeerayaashu waxay awood u leeyihiin inay: qof aamusiiyaan, qof ka saaraan qolka, ama qof ka xannibaan gebi ahaanba.
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-1">Fadlan ha sameynin arrimahan:</p>
        <ul className="text-xs text-amber-700 dark:text-amber-300 list-disc list-inside space-y-0.5">
          <li>Ha isticmaalin hadal xun, naceyb, ama aflagaaddo</li>
          <li>Ha handadin ama ha dhibin dadka kale</li>
          <li>Ha dhiirrigelin rabshad ama fikrado waxyeello leh</li>
          <li>Ha wadaagin xog shaqsiyeed, gaar ahaan tan la xiriirta carruurta</li>
        </ul>
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 italic">
          Ujeeddadu waa in Sheeko noqoto meel ammaan ah oo waalidiintu si kalsooni leh ugu wada hadli karaan.
        </p>
      </div>

      {liveRooms.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <h3 className="font-semibold text-lg">Hadda Socda</h3>
          </div>
          
          {liveRooms.map((room) => (
            <Card 
              key={room.id} 
              className="cursor-pointer hover:border-primary transition-colors overflow-hidden"
              onClick={() => handleRoomClick(room)}
              data-testid={`voice-room-card-${room.id}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{room.title}</CardTitle>
                    {room.host && (
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={room.host.picture || undefined} />
                          <AvatarFallback className="text-[8px]">{room.host.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground truncate">{room.host.name}</span>
                        <FollowButton hostId={room.hostId} />
                      </div>
                    )}
                  </div>
                  <Badge variant="destructive" className="animate-pulse shrink-0">
                    <Radio className="w-3 h-3 mr-1" />
                    LIVE
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {room.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{room.description}</p>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{room.participantCount || room.participants?.length || 0} qof</span>
                  {(room.speakerCount || 0) > 0 && (
                    <span className="text-primary">({room.speakerCount} hadlaya)</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {scheduledRooms.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-lg">Soo socda</h3>
          </div>
          
          {scheduledRooms.map((room) => (
            <Card 
              key={room.id}
              className="bg-muted/30 overflow-hidden cursor-pointer hover:border-blue-400 transition-colors"
              onClick={() => {
                // Update URL so back/forward navigation works
                setLocation(`/sheeko?room=${room.id}`);
                setFocusedScheduledRoom(room);
              }}
              data-testid={`scheduled-room-card-${room.id}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{room.title}</CardTitle>
                    {room.host && (
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={room.host.picture || undefined} />
                          <AvatarFallback className="text-[8px]">{room.host.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground truncate">{room.host.name}</span>
                        <FollowButton hostId={room.hostId} />
                      </div>
                    )}
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    <Calendar className="w-3 h-3 mr-1" />
                    La qorsheeyay
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {room.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{room.description}</p>
                )}
                {room.scheduledAt && (
                  <p className="text-sm font-medium text-primary">
                    {new Date(room.scheduledAt).toLocaleString('so-SO', { 
                      timeZone: 'Africa/Mogadishu',
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    })}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {(sheekoFollowing.length > 0 || sheekoFollowers.length > 0) && (
        <div className="space-y-3">
          <div className="flex items-center gap-4 border-b pb-2">
            <button
              onClick={() => setFollowTab('following')}
              className={`flex items-center gap-2 pb-2 border-b-2 transition-colors ${
                followTab === 'following' ? 'border-purple-500 text-purple-600' : 'border-transparent text-muted-foreground'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span className="text-sm font-medium">Following ({sheekoFollowing.length})</span>
            </button>
            <button
              onClick={() => setFollowTab('followers')}
              className={`flex items-center gap-2 pb-2 border-b-2 transition-colors ${
                followTab === 'followers' ? 'border-purple-500 text-purple-600' : 'border-transparent text-muted-foreground'
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">Followers ({sheekoFollowers.length})</span>
            </button>
          </div>
          
          {followTab === 'following' && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {sheekoFollowing.length > 0 ? sheekoFollowing.map((user) => (
                <div 
                  key={user.id} 
                  className="flex flex-col items-center gap-1 min-w-[80px]"
                >
                  <Avatar className="w-12 h-12 ring-2 ring-purple-500/30">
                    <AvatarImage src={user.picture || undefined} />
                    <AvatarFallback className="bg-purple-500/20 text-purple-600">{user.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-center truncate w-full">{user.name?.split(' ')[0]}</span>
                  <SheekoFollowButton userId={user.id} />
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">You are not following anyone yet</p>
              )}
            </div>
          )}

          {followTab === 'followers' && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {sheekoFollowers.length > 0 ? sheekoFollowers.map((user) => (
                <div 
                  key={user.id} 
                  className="flex flex-col items-center gap-1 min-w-[80px]"
                >
                  <Avatar className="w-12 h-12 ring-2 ring-blue-500/30">
                    <AvatarImage src={user.picture || undefined} />
                    <AvatarFallback className="bg-blue-500/20 text-blue-600">{user.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-center truncate w-full">{user.name?.split(' ')[0]}</span>
                  <SheekoFollowButton userId={user.id} />
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">No followers yet</p>
              )}
            </div>
          )}
        </div>
      )}

      {rooms.length === 0 && (
        <div className="text-center py-12">
          <Radio className="w-16 h-16 mx-auto text-red-400 mb-4" />
          <h3 className="font-bold text-2xl mb-3 text-blue-500">Sheeko hadda ma Socoto...</h3>
          <p className="text-muted-foreground text-base mb-4">
            Eego marka la soo dhajiyo wakhti Sheeko.
          </p>
          {canHost && (
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              data-testid="create-sheeko-empty-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Abuur Sheeko
            </Button>
          )}
        </div>
      )}

      {/* Create Room Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abuuro Sheeko Cusub</DialogTitle>
            <DialogDescription>
              Samee Voice Space cusub oo waalidku ay ku soo biiri karaan
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="title">Cinwaanka</Label>
              <Input
                id="title"
                placeholder="Tusaale: Su'aalaha Waalidka"
                value={newRoom.title}
                onChange={(e) => setNewRoom({ ...newRoom, title: e.target.value })}
                data-testid="voice-room-title-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Sharaxaad (ikhtiyaari)</Label>
              <Textarea
                id="description"
                placeholder="Waa maxay ujeedada kulanka?"
                value={newRoom.description}
                onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                data-testid="voice-room-description-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduledAt">Wakhtiga (ama ka tag oo hadda bilaab)</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={newRoom.scheduledAt}
                onChange={(e) => setNewRoom({ ...newRoom, scheduledAt: e.target.value })}
                data-testid="voice-room-schedule-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxSpeakers">Tirada ugu badan ee hadlayaasha</Label>
              <Input
                id="maxSpeakers"
                type="number"
                min={1}
                max={20}
                value={newRoom.maxSpeakers}
                onChange={(e) => setNewRoom({ ...newRoom, maxSpeakers: parseInt(e.target.value) || 10 })}
                data-testid="voice-room-max-speakers-input"
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Jooji
              </Button>
              <Button 
                onClick={handleCreate} 
                disabled={createMutation.isPending}
                data-testid="confirm-create-voice-room-button"
              >
                {createMutation.isPending ? "Abuuraya..." : newRoom.scheduledAt ? "La Qorshee" : "Hadda Bilaab"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Terms Acceptance Dialog */}
      <Dialog open={showTermsDialog} onOpenChange={(open) => {
        setShowTermsDialog(open);
        if (!open) setPendingRoom(null);
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center">Live Audio Chat Rooms</DialogTitle>
            <DialogDescription className="text-center">
              Please read and accept the community guidelines
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 text-sm">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-amber-800 dark:text-amber-200 mb-2">
                Live audio rooms are moderated and restricted to verified parent accounts. Moderators may mute, remove, or ban users at their discretion.
              </p>
              <p className="text-amber-700 dark:text-amber-300 font-medium mb-1">Do not:</p>
              <ul className="text-amber-700 dark:text-amber-300 list-disc list-inside space-y-1 text-xs">
                <li>Post or transmit hate speech, discrimination, harassment, abuse, or threats</li>
                <li>Promote violence, extremism, or harmful ideologies</li>
                <li>Share sensitive personal data, especially relating to children</li>
                <li>Use insulting, defamatory, or socially harmful language</li>
              </ul>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                Qolalka Codka Tooska ah (Sheeko Toos ah)
              </p>
              <p className="text-blue-700 dark:text-blue-300 mb-2 text-xs">
                Qolalkan codka tooska ah waxaa loo oggol yahay kaliya Akoomada Waalidiinta ee la xaqiijiyay. Waxaa jira dad maamula (kormeerayaal) oo hubiya in wada sheekaysigu noqdo mid edeb leh oo ammaan ah.
              </p>
              <p className="text-blue-700 dark:text-blue-300 mb-2 text-xs">
                Kormeerayaashu waxay awood u leeyihiin inay: qof aamusiiyaan, qof ka saaraan qolka, ama qof ka xannibaan gebi ahaanba.
              </p>
              <p className="text-blue-700 dark:text-blue-300 font-medium mb-1 text-xs">Fadlan ha sameynin arrimahan:</p>
              <ul className="text-blue-700 dark:text-blue-300 list-disc list-inside space-y-1 text-xs">
                <li>Ha isticmaalin hadal xun, naceyb, ama aflagaaddo</li>
                <li>Ha handadin ama ha dhibin dadka kale</li>
                <li>Ha dhiirrigelin rabshad ama fikrado waxyeello leh</li>
                <li>Ha wadaagin xog shaqsiyeed, gaar ahaan tan la xiriirta carruurta</li>
              </ul>
              <p className="text-blue-600 dark:text-blue-400 mt-2 italic text-xs">
                Ujeeddadu waa in Sheeko noqoto meel ammaan ah oo waalidiintu si kalsooni leh ugu wada hadli karaan.
              </p>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => {
              setShowTermsDialog(false);
              setPendingRoom(null);
            }}>
              Jooji
            </Button>
            <Button onClick={handleAcceptTerms} data-testid="accept-terms-button">
              Waan aqbalay, Ku biir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showMicPermissionDialog} onOpenChange={(open) => {
        if (!open) {
          setShowMicPermissionDialog(false);
          setPendingRoom(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-red-500" />
              Microphone Access / Oggolaanshaha Microphone-ka
            </DialogTitle>
            <DialogDescription className="pt-2">
              <span className="block mb-2">
                Sheeko needs microphone access to let you speak in voice rooms.
              </span>
              <span className="block text-sm text-muted-foreground">
                Sheeko wuxuu u baahan yahay oggolaanshaha microphone-ka si aad qolalka codka ugu hadli kartid.
              </span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                  <Mic className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Why we need this</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    To speak in live audio rooms, your browser needs to access your microphone. You can always mute yourself in the room.
                  </p>
                </div>
              </div>
            </div>

            {micError && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-red-700 dark:text-red-300 text-sm">{micError}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => {
              setShowMicPermissionDialog(false);
              setPendingRoom(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleGrantMicrophone} data-testid="grant-mic-button">
              <Mic className="h-4 w-4 mr-2" />
              Allow Microphone
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Scheduled Room Details Dialog */}
      <Dialog open={!!focusedScheduledRoom} onOpenChange={(open) => {
        if (!open) {
          setFocusedScheduledRoom(null);
          setIsEditingScheduledRoom(false);
          setLocation('/sheeko', { replace: true });
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              {isEditingScheduledRoom ? "Wax ka Badal Qolka" : focusedScheduledRoom?.title}
            </DialogTitle>
            {!isEditingScheduledRoom && focusedScheduledRoom?.scheduledAt && (
              <DialogDescription className="pt-2">
                <span className="block text-sm font-medium text-blue-600">
                  {new Date(focusedScheduledRoom.scheduledAt).toLocaleString([], {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  })}
                </span>
              </DialogDescription>
            )}
          </DialogHeader>
          
          {isEditingScheduledRoom ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Cinwaanka</Label>
                <Input
                  id="edit-title"
                  value={editingRoomData.title}
                  onChange={(e) => setEditingRoomData({ ...editingRoomData, title: e.target.value })}
                  placeholder="Magaca sheekada"
                  data-testid="edit-room-title-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Sharaxaad (ikhtiyaari)</Label>
                <Textarea
                  id="edit-description"
                  value={editingRoomData.description}
                  onChange={(e) => setEditingRoomData({ ...editingRoomData, description: e.target.value })}
                  placeholder="Wax ku saabsan sheekada..."
                  rows={3}
                  data-testid="edit-room-description-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-scheduledAt">Wakhtiga</Label>
                <Input
                  id="edit-scheduledAt"
                  type="datetime-local"
                  value={editingRoomData.scheduledAt}
                  onChange={(e) => setEditingRoomData({ ...editingRoomData, scheduledAt: e.target.value })}
                  data-testid="edit-room-schedule-input"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditingScheduledRoom(false)}
                  data-testid="cancel-edit-room-button"
                >
                  Ka noqo
                </Button>
                <Button 
                  onClick={handleSaveEdit}
                  disabled={updateRoomMutation.isPending}
                  data-testid="save-edit-room-button"
                >
                  {updateRoomMutation.isPending ? "Kaydinayaa..." : "Kaydi"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                {focusedScheduledRoom?.description ? (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-foreground">{focusedScheduledRoom.description}</p>
                  </div>
                ) : (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground italic">Sharaxaad lama gelin</p>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>Martida: {focusedScheduledRoom?.host?.name || 'Unknown'}</span>
                </div>
              </div>

              <div className="flex gap-2 justify-end flex-wrap">
                {parent && focusedScheduledRoom && (parent.isAdmin || parent.id === focusedScheduledRoom.hostId) && (
                  <Button 
                    variant="outline"
                    onClick={handleStartEdit}
                    data-testid="edit-scheduled-room-button"
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Wax ka Badal
                  </Button>
                )}
                <Button 
                  variant="outline"
                  onClick={async () => {
                    const roomUrl = `${window.location.origin}/sheeko?room=${focusedScheduledRoom?.id}`;
                    if (navigator.share) {
                      try {
                        await navigator.share({
                          title: focusedScheduledRoom?.title || 'Sheeko Room',
                          text: `Ka soo qayb gal sheekada: ${focusedScheduledRoom?.title}`,
                          url: roomUrl
                        });
                      } catch (err) {
                        // User cancelled or error
                      }
                    } else {
                      try {
                        await navigator.clipboard.writeText(roomUrl);
                        toast.success("Linkiga waa la nuqulay!");
                      } catch (err) {
                        toast.error("Ma nuquli karin linkiga");
                      }
                    }
                  }}
                  data-testid="share-scheduled-room-button"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button variant="outline" onClick={() => {
                  setFocusedScheduledRoom(null);
                  setLocation('/sheeko', { replace: true });
                }}>
                  Xir
                </Button>
                {parent && focusedScheduledRoom && (
                  <ScheduledRoomRsvpButton roomId={focusedScheduledRoom.id} />
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Separate component for RSVP button with its own query
function ScheduledRoomRsvpButton({ roomId }: { roomId: string }) {
  const queryClient = useQueryClient();
  const { parent } = useParentAuth();
  
  const { data: rsvpData } = useQuery<{ count: number; hasRsvpd: boolean }>({
    queryKey: [`/api/voice-rooms/${roomId}/rsvps`],
    enabled: !!parent,
  });

  // Don't render for logged-out users
  if (!parent) return null;

  const rsvpMutation = useMutation({
    mutationFn: async () => {
      if (rsvpData?.hasRsvpd) {
        await apiRequest("DELETE", `/api/voice-rooms/${roomId}/rsvp`);
      } else {
        await apiRequest("POST", `/api/voice-rooms/${roomId}/rsvp`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/voice-rooms/${roomId}/rsvps`] });
      toast.success(rsvpData?.hasRsvpd ? "Waxaad ka baxday" : "Waxaad iska qortay!");
    },
  });

  return (
    <Button 
      onClick={() => rsvpMutation.mutate()}
      disabled={rsvpMutation.isPending}
      className={rsvpData?.hasRsvpd 
        ? "bg-green-600 hover:bg-green-700" 
        : "bg-blue-600 hover:bg-blue-700"
      }
      data-testid={`rsvp-dialog-button-${roomId}`}
    >
      {rsvpData?.hasRsvpd ? (
        <>
          <Check className="w-4 h-4 mr-2" />
          Waan imaanayaa
        </>
      ) : (
        "Waan ka qayb geli"
      )}
    </Button>
  );
}

function ActiveVoiceRoom({ room, onLeave, fromAdmin = false }: { room: VoiceRoom; onLeave: () => void; fromAdmin?: boolean }) {
  const { parent } = useParentAuth();
  const queryClient = useQueryClient();
  const [handRaised, setHandRaised] = useState(false);
  const [isGuestListening, setIsGuestListening] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [guestDisplayName, setGuestDisplayName] = useState("");
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [isHiddenMode, setIsHiddenMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [speakerSessionPoints, setSpeakerSessionPoints] = useState<Record<string, number>>({});
  const [mySessionPoints, setMySessionPoints] = useState(0);
  const chatContainerRef = React.useRef<HTMLDivElement>(null);
  
  // Reset session points when joining a new room
  useEffect(() => {
    setSpeakerSessionPoints({});
    setMySessionPoints(0);
  }, [room.id]);
  

  // WebSocket for real-time reactions and appreciation
  const { send } = useWebSocket({
    onReaction: (reaction) => {
      if (reaction.roomId === room.id && reaction.senderId !== parent?.id) {
        const id = `${Date.now()}-${Math.random()}`;
        const x = 20 + Math.random() * 60;
        setFloatingReactions(prev => [...prev, { id, emoji: reaction.emoji, x }]);
      }
    },
    onAppreciation: (appreciation) => {
      if (appreciation.roomId === room.id) {
        setSpeakerSessionPoints(prev => ({
          ...prev,
          [appreciation.receiverId]: (prev[appreciation.receiverId] || 0) + appreciation.points
        }));
        if (appreciation.receiverId === parent?.id) {
          setMySessionPoints(prev => prev + appreciation.points);
        }
      }
    },
  });

  const handleAddReaction = useCallback((emoji: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    const x = 20 + Math.random() * 60;
    setFloatingReactions(prev => [...prev, { id, emoji, x }]);
    
    send({
      type: "reaction",
      roomId: room.id,
      emoji,
      senderName: parent?.name || "Someone"
    });
  }, [room.id, send, parent?.name]);

  const handleRemoveReaction = useCallback((id: string) => {
    setFloatingReactions(prev => prev.filter(r => r.id !== id));
  }, []);

  const handleAppreciateSpeaker = useCallback(async (speakerId: string, type: 'heart' | 'clap') => {
    // Only logged-in users can appreciate
    if (!parent) {
      toast.error("Fadlan gal si aad u siiso qiimeyn");
      return;
    }
    
    // Can't appreciate yourself
    if (speakerId === parent.id) {
      return;
    }
    
    try {
      const res = await fetch('/api/sheeko/appreciate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          receiverId: speakerId,
          roomId: room.id,
          emojiType: type,
        }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to save appreciation');
      }
      
      // Points are updated via WebSocket broadcast - no local update needed
      queryClient.invalidateQueries({ queryKey: ["/api/sheeko/users", speakerId, "points"] });
    } catch (error) {
      console.error('Error saving appreciation:', error);
    }
  }, [parent, room.id, queryClient]);

  const insertEmoji = useCallback((emoji: string) => {
    setChatMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  }, []);
  
  // Generate stable guest ID for non-logged in users
  const guestId = useMemo(() => {
    if (parent) return null;
    let id = localStorage.getItem("sheeko_guest_id");
    if (!id) {
      id = `guest-${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem("sheeko_guest_id", id);
    }
    return id;
  }, [parent]);

  const isGuest = !parent;
  const effectiveUserId = parent?.id || guestId || "";

  const { data: roomData, refetch } = useQuery<VoiceRoom & { participants: VoiceParticipant[] }>({
    queryKey: ["/api/voice-rooms", room.id],
    refetchInterval: 3000,
  });

  const {
    room: liveKitRoom,
    isConnected,
    isJoined,
    isMuted,
    isListenerOnly,
    connect,
    disconnect,
    reconnect,
    toggleMute,
    raiseHand,
    connectionError,
  } = useLiveKitRoom({
    roomId: room.id,
    userId: effectiveUserId,
    onParticipantJoined: (joinedUserId: string) => {
      setSpeakerSessionPoints(prev => {
        const updated = { ...prev };
        delete updated[joinedUserId];
        return updated;
      });
      refetch();
    },
    onParticipantLeft: (leftUserId: string) => {
      setSpeakerSessionPoints(prev => {
        const updated = { ...prev };
        delete updated[leftUserId];
        return updated;
      });
      refetch();
    },
  });

  useWakeLock(isJoined);

  const joinMutation = useMutation({
    mutationFn: (isHidden: boolean = false) => apiRequest("POST", `/api/voice-rooms/${room.id}/join`, { isHidden, fromAdmin }),
    onSuccess: async (data: any) => {
      setIsHiddenMode(data.isHidden || false);
      setMySessionPoints(0);
      setSpeakerSessionPoints({});
      try {
        await connect();
      } catch (error: any) {
        console.error("[Sheeko] LiveKit connection failed:", error);
        toast.error(error?.message || "Codka xiriirka khalad ayaa ka dhacay");
      }
      refetch();
    },
  });

  const revealMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/voice-rooms/${room.id}/reveal`),
    onSuccess: () => {
      setIsHiddenMode(false);
      refetch();
      toast.success("Hadda dadka ayaa ku arki karaa!");
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/voice-rooms/${room.id}/leave`),
    onSuccess: () => {
      disconnect();
      onLeave();
    },
  });

  const handMutation = useMutation({
    mutationFn: (raised: boolean) => 
      apiRequest("POST", `/api/voice-rooms/${room.id}/hand`, { raised }),
    onSuccess: () => {
      refetch();
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ parentId, role }: { parentId: string; role: string }) =>
      apiRequest("POST", `/api/voice-rooms/${room.id}/role`, { parentId, role }),
    onSuccess: async (_data, variables) => {
      refetch();
      if (variables.parentId === parent?.id && isJoined) {
        try {
          await reconnect();
          toast.success(variables.role === 'speaker' || variables.role === 'co-host' 
            ? "Hadda waad hadli kartaa!" 
            : "Role-kaaga waa la beddelay");
        } catch (error) {
          console.error("[Sheeko] Failed to reconnect after role change:", error);
        }
      }
    },
    onError: (error: any) => {
      const message = error?.message || "Hadlayaasha ugu badnaan 10 ayaa la ogol yahay.";
      toast.error(message);
    },
  });

  const muteMutation = useMutation({
    mutationFn: ({ parentId, muted }: { parentId: string; muted: boolean }) =>
      apiRequest("POST", `/api/voice-rooms/${room.id}/mute`, { parentId, muted }),
    onSuccess: () => {
      refetch();
    },
  });

  // Handle mute toggle - sync local state with server
  const handleToggleMute = useCallback(() => {
    toggleMute(); // Toggle local audio track
    // Also sync with server so other participants see the correct state
    if (parent?.id) {
      muteMutation.mutate({ parentId: parent.id, muted: !isMuted });
    }
  }, [toggleMute, parent?.id, isMuted, muteMutation]);

  // Handle page refresh/close - keep participant in room
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Store that we're refreshing, not leaving
      sessionStorage.setItem(`sheeko_active_${room.id}`, effectiveUserId);
    };
    
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [room.id, effectiveUserId]);

  // Auto-rejoin on page refresh
  useEffect(() => {
    const wasActive = sessionStorage.getItem(`sheeko_active_${room.id}`);
    if (wasActive === effectiveUserId && parent && !isJoined) {
      // User was in the room before refresh, rejoin automatically
      joinMutation.mutate(isHiddenMode);
      sessionStorage.removeItem(`sheeko_active_${room.id}`);
    }
  }, [room.id, effectiveUserId, parent, isJoined, isHiddenMode]);

  const kickMutation = useMutation({
    mutationFn: ({ parentId }: { parentId: string }) =>
      apiRequest("POST", `/api/voice-rooms/${room.id}/kick`, { parentId }),
    onSuccess: () => {
      refetch();
      toast.success("Qofka waa la saaray!");
    },
  });

  const banMutation = useMutation({
    mutationFn: ({ parentId, reason }: { parentId: string; reason?: string }) =>
      apiRequest("POST", `/api/voice-rooms/${room.id}/ban`, { parentId, reason }),
    onSuccess: () => {
      refetch();
      toast.success("Qofka waa la mamnuucay qolkan!");
    },
  });

  const endRoomMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/voice-rooms/${room.id}/end`),
    onSuccess: () => {
      disconnect();
      onLeave();
    },
  });

  // Handle being kicked, banned, demoted, or room ending via WebSocket
  useEffect(() => {
    const handleVoiceRoomUpdate = (event: CustomEvent) => {
      const update = event.detail;
      if (update.id !== room.id) return;
      
      if (update.event === 'room-ended') {
        toast.info("Qolku wuu dhamaaday");
        disconnect();
        onLeave();
      } else if (update.event === 'participant-kicked' && update.targetParentId === parent?.id) {
        toast.error("Waxaa lagu saaray qolka");
        disconnect();
        onLeave();
      } else if (update.event === 'participant-banned' && update.targetParentId === parent?.id) {
        toast.error("Waxaa lagaa mamnuucay qolkan");
        disconnect();
        onLeave();
      } else if (update.event === 'speaker-demoted' && update.targetParentId === parent?.id) {
        toast.info("Waxaad noqotay dhagaysane (listener)");
        disconnect();
        refetch();
      } else if (update.event === 'speaker-added' && update.targetParentId === parent?.id) {
        toast.success("Hadda waxaad noqotay hadlaye (speaker)!");
        refetch();
      } else if (update.event === 'speaker-demoted' || update.event === 'speaker-added' || update.event === 'role-changed') {
        refetch();
      }
    };
    
    window.addEventListener('voice-room-update', handleVoiceRoomUpdate as unknown as EventListener);
    return () => {
      window.removeEventListener('voice-room-update', handleVoiceRoomUpdate as unknown as EventListener);
    };
  }, [room.id, parent?.id, disconnect, onLeave, refetch]);

  const handleRecordingComplete = useCallback(async (blob: Blob, duration: number) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      formData.append('title', room.title);
      formData.append('roomId', room.id);
      formData.append('duration', duration.toString());
      formData.append('participantCount', (allParticipants?.length || 1).toString());

      const response = await fetch('/api/voice-recordings/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (response.ok) {
        const recording = await response.json();
        toast.success("Recording waa la kaydiyey! ✅");
        
        // Ask if they want to publish to Maktabada
        const shouldPublish = window.confirm(
          "Ma rabtaa inaad recording-kan ku daabacdo Maktabada si dadka kale ay u dhagaystaan?\n\n" +
          "Haa = Dadka oo dhan waxay arki karaan\n" +
          "Maya = Adiga kaliya ayaa arki kara"
        );
        
        if (shouldPublish && recording.id) {
          try {
            const publishResponse = await fetch(`/api/voice-recordings/${recording.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ isPublished: true }),
              credentials: 'include',
            });
            if (publishResponse.ok) {
              toast.success("Recording waa la daabacay Maktabada! 📚");
            }
          } catch (err) {
            console.error("Publish error:", err);
          }
        }
      } else {
        const error = await response.json();
        toast.error(error.error || "Recording lama kaydin karin");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Recording lama kaydin karin");
    } finally {
      setIsUploading(false);
    }
  }, [room.title, room.id]);

  const { 
    isRecording, 
    duration: recordingDuration, 
    startRecording, 
    stopRecording, 
    error: recordingError 
  } = useLiveKitRecording({
    room: liveKitRoom,
    onRecordingComplete: handleRecordingComplete,
    onError: (err) => toast.error(err.message),
  });

  // Chat messages
  const { data: chatMessages = [], refetch: refetchMessages } = useQuery<VoiceRoomMessage[]>({
    queryKey: ["/api/voice-rooms", room.id, "messages"],
    queryFn: () => fetch(`/api/voice-rooms/${room.id}/messages`).then(r => r.json()),
    refetchInterval: 2000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (message: string) => 
      apiRequest("POST", `/api/voice-rooms/${room.id}/messages`, { 
        message, 
        displayName: guestDisplayName || undefined,
        guestId: guestId || undefined,
      }),
    onSuccess: () => {
      setChatMessage("");
      refetchMessages();
    },
    onError: (error: any) => {
      toast.error(error?.message || "Fariinta lama dirin");
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: ({ messageId }: { messageId: string }) =>
      fetch(`/api/voice-rooms/${room.id}/messages/${messageId}`, { 
        method: 'DELETE',
        credentials: 'include' 
      }),
    onSuccess: () => {
      refetchMessages();
    },
  });

  const pinMessageMutation = useMutation({
    mutationFn: ({ messageId }: { messageId: string }) =>
      fetch(`/api/voice-rooms/${room.id}/pin/${messageId}`, { 
        method: 'POST',
        credentials: 'include' 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/voice-rooms", room.id] });
      toast.success("Fariinta waa la dhajiyay");
    },
  });

  const unpinMessageMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/voice-rooms/${room.id}/pin`, { 
        method: 'DELETE',
        credentials: 'include' 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/voice-rooms", room.id] });
      toast.success("Fariinta waa la qaaday");
    },
  });

  // Host follow system
  const { data: followData, refetch: refetchFollow } = useQuery({
    queryKey: ["/api/hosts", room.hostId, "following"],
    queryFn: () => fetch(`/api/hosts/${room.hostId}/following`, { credentials: 'include' }).then(r => r.json()),
    enabled: !!room.hostId && !!parent,
  });

  const followMutation = useMutation({
    mutationFn: () => fetch(`/api/hosts/${room.hostId}/follow`, { 
      method: 'POST', 
      credentials: 'include' 
    }),
    onSuccess: () => {
      refetchFollow();
      toast.success("Host-ka waad Follow gareysay!");
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: () => fetch(`/api/hosts/${room.hostId}/follow`, { 
      method: 'DELETE', 
      credentials: 'include' 
    }),
    onSuccess: () => {
      refetchFollow();
      toast.success("Follow waa la joojiyay");
    },
  });

  // Get the pinned message content
  const pinnedMessage = chatMessages.find(m => m.id === room.pinnedMessageId);

  // Handle message-deleted events via WebSocket
  useEffect(() => {
    const handleMessageDeleted = (event: CustomEvent) => {
      const update = event.detail;
      if (update.id === room.id && update.event === 'message-deleted') {
        refetchMessages();
      }
    };
    
    window.addEventListener('voice-room-update', handleMessageDeleted as EventListener);
    return () => {
      window.removeEventListener('voice-room-update', handleMessageDeleted as EventListener);
    };
  }, [room.id, refetchMessages]);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatMessage.trim()) {
      sendMessageMutation.mutate(chatMessage.trim());
    }
  };

  const handleRaiseHand = () => {
    const newState = !handRaised;
    setHandRaised(newState);
    raiseHand(newState);
    handMutation.mutate(newState);
  };

  const handleAcceptHand = (participantId: string) => {
    roleMutation.mutate({ parentId: participantId, role: "speaker" });
  };

  const handleRejectHand = (participantId: string) => {
    apiRequest("POST", `/api/voice-rooms/${room.id}/role`, { parentId: participantId, role: "listener" })
      .then(() => refetch());
  };

  const allParticipants = roomData?.participants || [];
  const hostId = roomData?.hostId || room.hostId;
  
  // Filter out hidden participants for display (except for moderators who can see all)
  const participants = allParticipants.filter((p: any) => !p.isHidden || p.parentId === parent?.id);
  
  const isHost = parent?.id === hostId;
  const myParticipant = allParticipants.find((p) => p.parentId === parent?.id);
  const isCoHost = myParticipant?.role === "co-host";
  const isModerator = isHost || isCoHost;
  const isSpeaker = myParticipant?.role === "speaker" || myParticipant?.role === "co-host" || isHost;
  const amIHidden = (myParticipant as any)?.isHidden || false;

  const previousRoleRef = React.useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!isJoined || !parent?.id || !myParticipant) return;
    
    const currentRole = myParticipant.role;
    const previousRole = previousRoleRef.current;
    
    if (previousRole !== undefined && previousRole !== currentRole) {
      console.log(`[Sheeko] Role changed from ${previousRole} to ${currentRole}, reconnecting...`);
      reconnect().catch(err => {
        console.error("[Sheeko] Failed to reconnect after role change:", err);
      });
    }
    
    previousRoleRef.current = currentRole;
  }, [myParticipant?.role, isJoined, parent?.id, reconnect]);

  const handleLeave = () => {
    // Clear session storage so user is not auto-rejoined
    sessionStorage.removeItem(`sheeko_active_${room.id}`);
    
    // Show toast with points earned if speaker
    if (isSpeaker && mySessionPoints > 0) {
      toast.success(`Mahadsanid! Waxaad heshay ${mySessionPoints} dhibcood 💎`, {
        duration: 4000,
      });
    }
    
    leaveMutation.mutate();
  };

  const speakers = participants.filter((p: any) => p.role === "speaker" || p.role === "co-host" || p.parentId === hostId);
  const listeners = participants.filter((p: any) => p.role === "listener" && p.parentId !== hostId);
  
  const handRaisedParticipants = participants
    .filter((p) => p.handRaised && p.parentId !== hostId)
    .sort((a, b) => {
      if (!a.handRaisedAt || !b.handRaisedAt) return 0;
      return new Date(a.handRaisedAt).getTime() - new Date(b.handRaisedAt).getTime();
    });

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-gradient-to-b from-purple-900 via-purple-800 to-indigo-900 h-[100dvh] overflow-hidden">
      {/* Connection Error Banner */}
      {connectionError && (
        <div className="bg-red-500/90 text-white px-4 py-2 text-center text-sm flex items-center justify-center gap-2">
          <span>Codka xiriirka: {connectionError}</span>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 h-6 px-2"
            onClick={() => {
              connect().catch(() => {});
            }}
          >
            Isku day mar kale
          </Button>
        </div>
      )}
      
      {/* Header */}
      <div className="p-4 bg-black/20 backdrop-blur-sm safe-area-top">
        <div className="flex items-center gap-3">
          {/* Back button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white shrink-0"
            onClick={handleLeave}
            data-testid="back-button"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-lg text-white truncate">{room.title}</h2>
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-2.5 py-1">
                <Users className="w-3.5 h-3.5 text-white/80" />
                <span className="text-xs font-medium text-white">
                  {allParticipants.length}
                  {allParticipants.filter((p: any) => p.isHidden).length > 0 && (
                    <span className="text-white/60 ml-1">
                      (+{allParticipants.filter((p: any) => p.isHidden).length} qarsoon)
                    </span>
                  )}
                </span>
              </div>
            </div>
            {room.description && (
              <p className="text-sm text-white/70 truncate">{room.description}</p>
            )}
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {isJoined && (
              <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full" title="Screen-ka ma dami doono">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-[10px] text-green-300 font-medium">ON</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white"
              onClick={() => {
                const shareUrl = `${window.location.origin}/sheeko/${room.id}`;
                if (navigator.share) {
                  navigator.share({
                    title: room.title,
                    text: `Ku soo biir Sheeko: ${room.title}`,
                    url: shareUrl
                  }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(shareUrl);
                  toast.success("Link-ka waa la koobiyeeyay!");
                }
              }}
              data-testid="share-room-button"
            >
              <Share2 className="w-4 h-4" />
            </Button>
            <Badge variant="destructive" className="animate-pulse bg-red-500">
              <Radio className="w-3 h-3 mr-1" />
              LIVE
            </Badge>
            {isHost && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => endRoomMutation.mutate()}
                disabled={endRoomMutation.isPending}
                data-testid="end-room-button"
                className="bg-red-600 hover:bg-red-700"
              >
                <StopCircle className="w-4 h-4 mr-1" />
                Jooji
              </Button>
            )}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4 pb-28">
        {/* Screen Lock Warning for iOS/Browser limitations */}
        {isJoined && (
          <div className="mb-4 p-3 bg-amber-500/20 backdrop-blur-sm rounded-xl border border-amber-400/30" data-testid="screen-lock-warning">
            <div className="flex items-start gap-2">
              <span className="text-amber-400 text-lg shrink-0">⚠️</span>
              <div className="text-xs text-amber-200/90">
                <p className="font-medium mb-1">Screen-ku wuu dami karaa (xaddidaad browser)</p>
                <p className="text-amber-200/70">
                  iOS: Settings → Display → Auto-Lock → Never (ku laab kadib)
                </p>
              </div>
            </div>
          </div>
        )}

        {isModerator && handRaisedParticipants.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-500/20 backdrop-blur-sm rounded-2xl border border-yellow-400/30">
            <h3 className="text-sm font-semibold text-yellow-300 mb-3 flex items-center gap-2">
              <Hand className="w-4 h-4" />
              Gacanta Taagayaasha ({handRaisedParticipants.length})
            </h3>
            <div className="space-y-2">
              {handRaisedParticipants.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-white/10 backdrop-blur-sm rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-10 h-10 ring-2 ring-yellow-400/50">
                      <AvatarImage src={p.parent.picture || undefined} />
                      <AvatarFallback className="text-sm bg-gradient-to-br from-yellow-400 to-orange-500 text-white">
                        {p.parent.name?.charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-white flex items-center gap-1">
                      {p.parent.isYearlySubscriber && <span title="Xubin Dahabi">👑</span>}
                      {p.parent.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="h-9 w-9 p-0 rounded-full bg-green-500/20 hover:bg-green-500/40 text-green-400"
                      onClick={() => handleAcceptHand(p.parentId)}
                      data-testid={`accept-hand-${p.parentId}`}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      className="h-9 w-9 p-0 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-400"
                      onClick={() => handleRejectHand(p.parentId)}
                      data-testid={`reject-hand-${p.parentId}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Speakers Section */}
        {speakers.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-gradient-to-br from-green-500/30 to-emerald-500/30 rounded-xl backdrop-blur-sm">
                <Volume2 className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="text-base font-bold text-white">Hadlayaasha</h3>
              <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                {speakers.length}
              </Badge>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {speakers.map((p) => (
                <ParticipantAvatar 
                  key={p.id} 
                  participant={p} 
                  hostId={hostId}
                  isHost={isHost}
                  isModerator={isModerator}
                  currentUserId={parent?.id}
                  onChangeRole={(role) => roleMutation.mutate({ parentId: p.parentId, role })}
                  onMute={(muted) => muteMutation.mutate({ parentId: p.parentId, muted })}
                  onKick={() => kickMutation.mutate({ parentId: p.parentId })}
                  onBan={() => banMutation.mutate({ parentId: p.parentId })}
                  appreciationCount={speakerSessionPoints[p.parentId] || 0}
                  onAppreciate={(type) => handleAppreciateSpeaker(p.parentId, type)}
                  isSpeaker 
                />
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Listeners Section */}
        {listeners.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-xl backdrop-blur-sm">
                <Headphones className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-base font-bold text-white">Dhagaystayaasha</h3>
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                {listeners.length}
              </Badge>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                {listeners.map((p) => (
                  <ParticipantAvatar 
                    key={p.id} 
                    participant={p}
                    hostId={hostId}
                    isHost={isHost}
                    isModerator={isModerator}
                    currentUserId={parent?.id}
                    onChangeRole={(role) => roleMutation.mutate({ parentId: p.parentId, role })}
                    onMute={(muted) => muteMutation.mutate({ parentId: p.parentId, muted })}
                    onKick={() => kickMutation.mutate({ parentId: p.parentId })}
                    onBan={() => banMutation.mutate({ parentId: p.parentId })}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Live Chat Section */}
        <div className="mt-6 bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-gradient-to-br from-blue-500/30 to-cyan-500/30 rounded-xl backdrop-blur-sm">
              <MessageCircle className="w-4 h-4 text-blue-400" />
            </div>
            <h3 className="text-sm font-bold text-white">Qoraalada</h3>
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
              {chatMessages.length}
            </Badge>
          </div>

          {/* Pinned Message Display */}
          {pinnedMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3 p-3 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/30 rounded-xl"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Pin className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs font-semibold text-amber-300">{pinnedMessage.displayName}:</span>
                  <span className="text-sm text-white truncate">{pinnedMessage.message}</span>
                </div>
                {isModerator && (
                  <button
                    onClick={() => unpinMessageMutation.mutate()}
                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-amber-300 shrink-0"
                    title="Ka saar dhajinta"
                    data-testid="unpin-message-button"
                  >
                    <PinOff className="w-3 h-3" />
                  </button>
                )}
              </div>
            </motion.div>
          )}

          <div 
            ref={chatContainerRef}
            className="h-44 overflow-y-auto space-y-2 mb-3 scrollbar-thin scrollbar-thumb-white/20"
          >
            {chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-white/50">
                <MessageCircle className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs">Weli qof fariin ma soo qorin</p>
              </div>
            ) : (
              chatMessages.map((msg) => {
                const isOwnMessage = msg.parentId === parent?.id;
                const canDeleteMessage = isModerator && !isOwnMessage;
                const isPinned = msg.id === room.pinnedMessageId;
                const canPinMessage = isModerator && !isPinned;
                return (
                  <motion.div 
                    key={msg.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center gap-2 group ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Moderator actions: delete and pin */}
                    {(canDeleteMessage || canPinMessage) && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canPinMessage && (
                          <button
                            onClick={() => pinMessageMutation.mutate({ messageId: msg.id })}
                            className="p-1 rounded-full bg-amber-500/20 hover:bg-amber-500/40 text-amber-400"
                            title="Dhaji fariintaan"
                            data-testid={`pin-message-${msg.id}`}
                          >
                            <Pin className="w-3 h-3" />
                          </button>
                        )}
                        {canDeleteMessage && (
                          <button
                            onClick={() => deleteMessageMutation.mutate({ messageId: msg.id })}
                            className="p-1 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-400"
                            data-testid={`delete-message-${msg.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                    <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl transition-all ${
                      isPinned
                        ? 'bg-gradient-to-r from-amber-500/30 to-orange-500/30 text-white rounded-bl-md border border-amber-400/30'
                        : isOwnMessage 
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-br-md shadow-lg shadow-purple-500/20' 
                          : 'bg-white/15 backdrop-blur-sm text-white rounded-bl-md border border-white/10 hover:bg-white/20'
                    }`}>
                      {!isOwnMessage && (
                        <span className="text-xs font-semibold text-purple-300 block mb-0.5">
                          {msg.displayName}
                        </span>
                      )}
                      <span className="text-sm break-words">
                        {msg.message}
                      </span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
          
          {/* Chat input with emoji picker */}
          <div className="relative">
            <form onSubmit={handleSendMessage} className="flex gap-2 p-2 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
              {isGuest && !guestDisplayName && (
                <Input
                  placeholder="Magacaaga..."
                  value={guestDisplayName}
                  onChange={(e) => setGuestDisplayName(e.target.value)}
                  className="w-24 text-xs border-0 bg-transparent text-white placeholder:text-white/50 focus-visible:ring-0"
                  data-testid="guest-name-input"
                />
              )}
              <Input
                placeholder="Fariin qor..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                className="flex-1 text-sm border-0 bg-transparent text-white placeholder:text-white/50 focus-visible:ring-0"
                maxLength={500}
                data-testid="chat-message-input"
              />
              <Button 
                type="button"
                size="icon"
                variant="ghost"
                className="text-white/70 hover:text-white hover:bg-white/10 rounded-xl h-10 w-10"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                data-testid="emoji-picker-button"
              >
                <Smile className="w-5 h-5" />
              </Button>
              <Button 
                type="submit" 
                size="icon"
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl h-10 w-10 shadow-lg shadow-purple-500/30"
                disabled={!chatMessage.trim() || sendMessageMutation.isPending}
                data-testid="send-message-button"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
            
            {/* Emoji Picker Dropdown */}
            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-full right-0 mb-2 p-3 bg-gray-900/95 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl"
                >
                  <div className="grid grid-cols-4 gap-2">
                    {CHAT_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="text-2xl p-2 hover:bg-white/10 rounded-xl transition-all hover:scale-110"
                        onClick={() => insertEmoji(emoji)}
                        data-testid={`emoji-${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Live Emoji Reactions Bar */}
        <div className="mt-4 bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/60 font-medium">React live!</span>
            <div className="flex gap-2">
              {REACTION_EMOJIS.map((emoji) => (
                <motion.button
                  key={emoji}
                  whileTap={{ scale: 0.8 }}
                  whileHover={{ scale: 1.2 }}
                  className="text-2xl p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                  onClick={() => handleAddReaction(emoji)}
                  data-testid={`reaction-${emoji}`}
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          </div>
        </div>

      </ScrollArea>

      {/* Floating Reactions - Outside ScrollArea for proper positioning */}
      <AnimatePresence>
        {floatingReactions.map((reaction) => (
          <FloatingEmoji
            key={reaction.id}
            emoji={reaction.emoji}
            x={reaction.x}
            onComplete={() => handleRemoveReaction(reaction.id)}
          />
        ))}
      </AnimatePresence>

      {/* Fixed Bottom Controls - Compact for better viewport fit */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-3 pb-5 bg-gradient-to-t from-black/90 via-black/70 to-transparent backdrop-blur-md safe-area-bottom">
        {isGuest ? (
          <div className="space-y-3 max-w-md mx-auto">
            <div className="flex gap-3">
              <Link href="/login" className="flex-1">
                <Button 
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/30 h-14 rounded-2xl text-base font-semibold" 
                  size="lg"
                  data-testid="guest-login-button"
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  Gal si aad u dhageysatid
                </Button>
              </Link>
              <Button
                variant="outline"
                size="lg"
                className="h-14 w-14 rounded-2xl border-white/30 bg-white/10 hover:bg-white/20 text-white"
                onClick={() => {
                  const url = `${window.location.origin}/sheeko/${room.id}`;
                  navigator.clipboard.writeText(url);
                  toast.success("Link-ga waa la koobiyey!");
                }}
                data-testid="share-room-button-guest"
              >
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-center text-xs text-white/70">
              Si aad codka u maqlid iyo aad uga hadashid, fadlan{" "}
              <Link href="/login" className="text-purple-300 underline">gal</Link>
              {" "}ama{" "}
              <Link href="/register" className="text-purple-300 underline">isdiiwaangeli</Link>
            </p>
          </div>
        ) : !isJoined ? (
          <div className="space-y-3 max-w-md mx-auto">
            {!showJoinDialog ? (
              <div className="flex gap-3">
                <Button 
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/30 h-14 rounded-2xl text-base font-semibold" 
                  size="lg"
                  onClick={() => setShowJoinDialog(true)}
                  data-testid="join-room-button"
                >
                  <Mic className="w-5 h-5 mr-2" />
                  Ku biir Sheekada
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-14 w-14 rounded-2xl border-white/30 bg-white/10 hover:bg-white/20 text-white"
                  onClick={() => {
                    const url = `${window.location.origin}/sheeko/${room.id}`;
                    navigator.clipboard.writeText(url);
                    toast.success("Link-ga waa la koobiyey!");
                  }}
                  data-testid="share-room-button"
                >
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 space-y-3 border border-white/20">
                <p className="text-sm font-medium text-center text-white mb-3">Sidee ayaad u biiri lahayd?</p>
                <div className="flex gap-3">
                  <Button 
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-12 rounded-xl" 
                    size="lg"
                    onClick={() => {
                      setShowJoinDialog(false);
                      joinMutation.mutate(false);
                    }}
                    disabled={joinMutation.isPending}
                    data-testid="join-visible-button"
                  >
                    <Users className="w-5 h-5 mr-2" />
                    Is muuji
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1 border-white/30 bg-white/10 hover:bg-white/20 text-white h-12 rounded-xl" 
                    size="lg"
                    onClick={() => {
                      setShowJoinDialog(false);
                      joinMutation.mutate(true);
                    }}
                    disabled={joinMutation.isPending}
                    data-testid="join-hidden-button"
                  >
                    <EyeOff className="w-5 h-5 mr-2" />
                    Si qarsoon
                  </Button>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => setShowJoinDialog(false)}
                >
                  Dib u laabo
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3 max-w-md mx-auto">
            {amIHidden && (
              <Button
                size="icon"
                className="h-14 w-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/30"
                onClick={() => revealMutation.mutate()}
                disabled={revealMutation.isPending}
                data-testid="reveal-button"
                title="Is muuji"
              >
                <Eye className="w-5 h-5" />
              </Button>
            )}
            
            {!amIHidden && (
              <Button
                size="icon"
                className={`h-14 w-14 rounded-full shadow-lg transition-all ${
                  handRaised 
                    ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-yellow-500/30' 
                    : 'bg-white/10 border border-white/30 text-white hover:bg-white/20'
                }`}
                onClick={handleRaiseHand}
                data-testid="raise-hand-button"
              >
                <Hand className="w-5 h-5" />
              </Button>
            )}
            
            {isSpeaker && (
              <Button
                size="icon"
                className={`h-16 w-16 rounded-full shadow-lg transition-all ${
                  isMuted 
                    ? 'bg-white/10 border-2 border-red-500/50 text-red-400' 
                    : 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-green-500/30'
                }`}
                onClick={handleToggleMute}
                data-testid="mute-button"
              >
                {isMuted ? (
                  <MicOff className="w-6 h-6" />
                ) : (
                  <Mic className="w-6 h-6" />
                )}
              </Button>
            )}
            
            {isHost && (
              <Button
                size="icon"
                className={`h-14 w-14 rounded-full shadow-lg transition-all ${
                  isRecording 
                    ? 'bg-gradient-to-br from-red-600 to-rose-700 text-white animate-pulse shadow-red-500/50' 
                    : isUploading
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                      : 'bg-white/10 border border-white/30 text-white hover:bg-white/20'
                }`}
                onClick={() => {
                  if (isRecording) {
                    stopRecording();
                    toast.success("Recording la joojiyey - waxaa la kaydinayaa...");
                  } else if (!isUploading) {
                    startRecording();
                    toast.success("Recording bilaabay! 🎙️");
                  }
                }}
                disabled={isUploading}
                data-testid="record-room-button"
                title={isRecording ? "Jooji Recording" : isUploading ? "Uploading..." : "Bilaaw Recording"}
              >
                {isUploading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Circle className={`w-5 h-5 ${isRecording ? 'fill-current' : ''}`} />
                )}
              </Button>
            )}
            
            <Button
              size="icon"
              className="h-14 w-14 rounded-full bg-white/10 border border-white/30 text-white hover:bg-white/20 shadow-lg"
              onClick={() => {
                const url = `${window.location.origin}/sheeko/${room.id}`;
                navigator.clipboard.writeText(url);
                toast.success("Link-ga waa la koobiyey!");
              }}
              data-testid="share-room-inside-button"
            >
              <Share2 className="w-5 h-5" />
            </Button>
            
            <Button
              size="icon"
              className="h-14 w-14 rounded-full bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/40"
              onClick={handleLeave}
              disabled={leaveMutation.isPending}
              data-testid="leave-room-button"
            >
              <PhoneOff className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>

    </div>
  );
}

function ParticipantAvatar({ 
  participant, 
  hostId,
  isHost,
  isModerator,
  currentUserId,
  onChangeRole,
  onMute,
  onKick,
  onBan,
  appreciationCount = 0,
  onAppreciate,
  isSpeaker = false 
}: { 
  participant: VoiceParticipant; 
  hostId: string;
  isHost: boolean;
  isModerator: boolean;
  currentUserId?: string;
  onChangeRole: (role: string) => void;
  onMute: (muted: boolean) => void;
  onKick: () => void;
  onBan: () => void;
  appreciationCount?: number;
  onAppreciate?: (type: 'heart' | 'clap') => void;
  isSpeaker?: boolean;
}) {
  const isParticipantHost = participant.parentId === hostId;
  const isParticipantCoHost = participant.role === "co-host";
  const isParticipantSpeaker = participant.role === "speaker" || isParticipantCoHost;
  const isSelf = participant.parentId === currentUserId;
  const canModerate = isModerator && !isSelf && !isParticipantHost;
  const isActivelySpeaking = isSpeaker && !participant.isMuted;

  const getRoleBadge = () => {
    if (isParticipantHost) {
      return (
        <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 rounded-full">
          <Crown className="w-3 h-3 text-yellow-400" />
          <span className="text-[10px] font-semibold text-yellow-300">Host</span>
        </div>
      );
    }
    if (isParticipantCoHost) {
      return (
        <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 rounded-full">
          <Star className="w-3 h-3 text-blue-400" />
          <span className="text-[10px] font-semibold text-blue-300">Co-host</span>
        </div>
      );
    }
    if (isParticipantSpeaker) {
      return (
        <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 rounded-full">
          <Mic className="w-3 h-3 text-green-400" />
          <span className="text-[10px] font-semibold text-green-300">Speaker</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 rounded-full">
        <Headphones className="w-3 h-3 text-purple-400" />
        <span className="text-[10px] font-semibold text-purple-300">Listening</span>
      </div>
    );
  };

  const avatarContent = (
    <motion.div 
      className={`flex flex-col items-center gap-1 ${isSpeaker ? 'p-2 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10' : ''}`}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400 }}
    >
      <div className="relative">
        {/* Animated glow ring for actively speaking */}
        {isActivelySpeaking && (
          <motion.div
            className="absolute -inset-2 rounded-full bg-gradient-to-r from-green-400 via-emerald-500 to-green-400 opacity-60"
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.4, 0.7, 0.4]
            }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{ filter: 'blur(8px)' }}
          />
        )}
        
        <Avatar className={`relative ${isSpeaker ? "w-14 h-14" : "w-10 h-10"} border-2 ${
          isParticipantHost 
            ? 'border-yellow-400 shadow-xl shadow-yellow-400/40' 
            : isParticipantCoHost 
              ? 'border-blue-400 shadow-xl shadow-blue-400/40'
              : isActivelySpeaking 
                ? 'border-green-400 shadow-xl shadow-green-400/40' 
                : 'border-white/40'
        } ${canModerate ? "cursor-pointer hover:border-purple-400 hover:shadow-purple-400/30 transition-all" : ""}`}>
          <AvatarImage src={participant.parent.picture || undefined} className="object-cover" />
          <AvatarFallback className={`text-lg font-bold ${
            isParticipantHost 
              ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white'
              : isParticipantCoHost
                ? 'bg-gradient-to-br from-blue-400 to-cyan-500 text-white'
                : 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
          }`}>
            {participant.parent.name?.charAt(0).toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        
        {participant.handRaised && (
          <motion.div 
            className="absolute -top-2 -right-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full p-2 shadow-lg"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity }}
          >
            <Hand className="w-3.5 h-3.5 text-white" />
          </motion.div>
        )}
        
        {isSpeaker && participant.isMuted && (
          <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-red-500 to-rose-600 rounded-full p-1.5 shadow-lg ring-2 ring-black/20">
            <MicOff className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
      
      <div className="flex flex-col items-center gap-1">
        <a 
          href={`/parent/${participant.parentId}`}
          onClick={(e) => e.stopPropagation()}
          className={`text-center truncate max-w-full text-white font-medium flex items-center gap-0.5 hover:text-indigo-300 transition-colors ${isSpeaker ? 'text-xs' : 'text-[10px]'}`}
          data-testid={`participant-profile-link-${participant.parentId}`}
        >
          {participant.parent.isYearlySubscriber && <span title="Xubin Dahabi">👑</span>}
          {participant.parent.name?.split(" ")[0] || "Qof"}
        </a>
        {getRoleBadge()}
        
        {/* Appreciation display for speakers */}
        {isSpeaker && (
          <div className="flex items-center gap-2 mt-1">
            {appreciationCount > 0 && (
              <motion.div 
                className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-pink-500/30 to-purple-500/30 rounded-full border border-pink-400/30"
                key={appreciationCount}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500 }}
              >
                <span className="text-xs">💎</span>
                <span className="text-xs font-bold text-pink-300">{appreciationCount}</span>
              </motion.div>
            )}
            
            {/* Appreciation buttons for others to click */}
            {!isSelf && onAppreciate && (
              <div className="flex gap-1">
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  whileHover={{ scale: 1.15 }}
                  className="p-1.5 bg-pink-500/20 hover:bg-pink-500/40 rounded-full transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAppreciate('heart');
                  }}
                  data-testid={`appreciate-heart-${participant.parentId}`}
                >
                  <Heart className="w-3 h-3 text-pink-400" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  whileHover={{ scale: 1.15 }}
                  className="p-1.5 bg-yellow-500/20 hover:bg-yellow-500/40 rounded-full transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAppreciate('clap');
                  }}
                  data-testid={`appreciate-clap-${participant.parentId}`}
                >
                  <span className="text-xs">👏</span>
                </motion.button>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );

  if (!canModerate) {
    return avatarContent;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div 
            role="button"
            tabIndex={0}
            className="touch-manipulation select-none outline-none cursor-pointer"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            data-testid={`participant-menu-${participant.parentId}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.currentTarget.click();
              }
            }}
          >
            {avatarContent}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-48 z-[200]">
          {isHost && !isParticipantCoHost && (
            <DropdownMenuItem 
              onClick={() => onChangeRole("co-host")}
              data-testid={`make-cohost-${participant.parentId}`}
            >
              <Star className="w-4 h-4 mr-2 text-blue-500" />
              Dhig Co-host
            </DropdownMenuItem>
          )}
          
          {!isParticipantSpeaker && (
            <DropdownMenuItem 
              onClick={() => onChangeRole("speaker")}
              data-testid={`make-speaker-${participant.parentId}`}
            >
              <Mic className="w-4 h-4 mr-2 text-green-500" />
              Dhig Speaker
            </DropdownMenuItem>
          )}
          
          {isParticipantSpeaker && (
            <DropdownMenuItem 
              onClick={() => onChangeRole("listener")}
              data-testid={`make-listener-${participant.parentId}`}
            >
              <Users className="w-4 h-4 mr-2" />
              Dhig Listener
            </DropdownMenuItem>
          )}
          
          {isParticipantSpeaker && (
            <>
              <DropdownMenuSeparator />
              {participant.isMuted ? (
                <DropdownMenuItem 
                  onClick={() => onMute(false)}
                  data-testid={`unmute-${participant.parentId}`}
                >
                  <Volume2 className="w-4 h-4 mr-2 text-green-500" />
                  Fur Codka
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem 
                  onClick={() => onMute(true)}
                  data-testid={`mute-${participant.parentId}`}
                >
                  <VolumeX className="w-4 h-4 mr-2 text-orange-500" />
                  Aamusi
                </DropdownMenuItem>
              )}
            </>
          )}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={onKick}
            className="text-orange-600 focus:text-orange-600"
            data-testid={`kick-${participant.parentId}`}
          >
            <UserX className="w-4 h-4 mr-2" />
            Ka saar
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={onBan}
            className="text-red-600 focus:text-red-600"
            data-testid={`ban-${participant.parentId}`}
          >
            <X className="w-4 h-4 mr-2" />
            Mamnuuc (Ban)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
