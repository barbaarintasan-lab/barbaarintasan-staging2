import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useParentAuth } from "@/contexts/ParentAuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search, Bell, ChevronRight, ChevronLeft, Play, Pause, Sparkles, LogOut, LogIn, Settings, Star, Lightbulb, Target, Award, BookOpen, Users, Video, X, Bot, Globe, Megaphone, UserPlus, ClipboardCheck, GraduationCap, User, CheckCircle, Radio, Calendar, Check, Plus, Moon, MessageCircle, RotateCcw, RotateCw, Volume2, Clock, ExternalLink, Crown } from "lucide-react";
import { openSSOLink } from "@/lib/api";
import { VoiceSpaces } from "@/components/VoiceSpaces";
import { InstallBanner } from "@/components/InstallBanner";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import useEmblaCarousel from "embla-carousel-react";
import logoImage from "@assets/NEW_LOGO-BSU_1_1768990258338.png";
import barahaWaalidiintaImg from "@assets/generated_images/somali_parents_community_gathering.png";
import bsaAppIcon from "@assets/generated_images/bsa_app_icon_orange_gradient.png";
import sheekoAppIcon from "@assets/generated_images/sheeko_app_icon_purple_gradient.png";
import tarbiyaddaLogo from "@assets/NEW_LOGO-BSU_1_1768990258338.png";
// Furud (Fruits) - 10 items
import bananaImg from "@assets/generated_images/banana_white_background.png";
import mangoImg from "@assets/generated_images/mango_white_background.png";
import appleImg from "@assets/generated_images/apple_white_background.png";
import grapesImg from "@assets/generated_images/grapes_white_background.png";
import lemonImg from "@assets/generated_images/lemon_white_background.png";
import orangeImg from "@assets/generated_images/orange_white_background.png";
import pineappleImg from "@assets/generated_images/pineapple_white_background.png";
import strawberryImg from "@assets/generated_images/strawberry_white_background.png";
import watermelonImg from "@assets/generated_images/watermelon_white_background.png";
import figsImg from "@assets/generated_images/figs_white_background.png";
// Khutaar (Vegetables) - 10 items
import lettuceImg from "@assets/generated_images/lettuce_white_background.png";
import cabbageImg from "@assets/generated_images/cabbage_white_background.png";
import pumpkinImg from "@assets/generated_images/pumpkin_white_background.png";
import onionImg from "@assets/generated_images/onion_white_background.png";
import garlicImg from "@assets/generated_images/garlic_white_background.png";
import carrotImg from "@assets/generated_images/carrot_white_background.png";
import potatoImg from "@assets/generated_images/potato_white_background.png";
import tomatoImg from "@assets/generated_images/tomato_white_background.png";
import chiliImg from "@assets/generated_images/chili_pepper_white_background.png";
import cucumberImg from "@assets/generated_images/cucumber_white_background.png";
// Alaab Guri (Household) - 10 items
import tableImg from "@assets/generated_images/table_white_background.png";
import chairImg from "@assets/generated_images/chair_white_background.png";
import bedImg from "@assets/generated_images/bed_white_background.png";
import doorImg from "@assets/generated_images/door_white_background.png";
import windowImg from "@assets/generated_images/window_white_background.png";
import lampImg from "@assets/generated_images/lamp_white_background.png";
import bookImg from "@assets/generated_images/book_white_background.png";
import mirrorImg from "@assets/generated_images/mirror_white_background.png";
import sofaImg from "@assets/generated_images/sofa_white_background.png";
import tvImg from "@assets/generated_images/television_white_background.png";
// Maacuun (Kitchen Utensils) - 10 items
import potImg from "@assets/generated_images/pot_white_background.png";
import knifeImg from "@assets/generated_images/knife_white_background.png";
import spoonImg from "@assets/generated_images/spoon_white_background.png";
import forkImg from "@assets/generated_images/fork_white_background.png";
import plateImg from "@assets/generated_images/plate_white_background.png";
import cupImg from "@assets/generated_images/cup_white_background.png";
import panImg from "@assets/generated_images/pan_white_background.png";
import ladleImg from "@assets/generated_images/ladle_white_background.png";
import mugImg from "@assets/generated_images/mug_white_background.png";
import bowlImg from "@assets/generated_images/bowl_white_background.png";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


function translateDuration(duration: string | null, t: (key: string) => string): string | null {
  if (!duration) return null;
  return duration
    .replace(/(\d+)\s*Bilood/gi, `$1 ${t("courses.lessons")}`)
    .replace(/(\d+)\s*Qaybood/gi, `$1 ${t("courses.sections")}`)
    .replace(/(\d+)\s*cashar/gi, `$1 ${t("courses.lessons")}`);
}

interface Course {
  id: number;
  courseId: string;
  title: string;
  description: string;
  imageUrl: string | null;
  category: string;
  isLive: boolean;
  isFree: boolean;
  duration: string | null;
  order: number;
}

// Koorsooyinka diyaar ah (0-6 Bilood iyo Ilmo Is-Dabira)
const AVAILABLE_COURSES = ["0-6-bilood", "ilmo-is-dabira"];

function isAvailableCourse(courseId: string): boolean {
  return AVAILABLE_COURSES.some(id => courseId.toLowerCase().includes(id.toLowerCase()));
}

// Animated counter component for stats
function AnimatedCounter({ value }: { value: number }) {
  const [displayCount, setDisplayCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const animationRef = useRef<number | null>(null);
  const hasAnimatedRef = useRef(false);
  const lastValueRef = useRef(0);

  useEffect(() => {
    // If value changed after animation, update immediately
    if (hasAnimatedRef.current && value !== lastValueRef.current) {
      setDisplayCount(value);
      lastValueRef.current = value;
      return;
    }
    
    if (value === 0) {
      setDisplayCount(0);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimatedRef.current && value > 0) {
          hasAnimatedRef.current = true;
          lastValueRef.current = value;
          const startTime = performance.now();
          const duration = 1200;
          const targetValue = value;
          
          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const currentCount = Math.floor(eased * targetValue);
            
            setDisplayCount(currentCount);
            
            if (progress < 1) {
              animationRef.current = requestAnimationFrame(animate);
            } else {
              setDisplayCount(targetValue);
            }
          };
          
          animationRef.current = requestAnimationFrame(animate);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);
    
    return () => {
      observer.disconnect();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [value]);

  // Show value directly if animation completed or data just loaded
  const finalDisplay = hasAnimatedRef.current ? displayCount : (value > 0 ? value : displayCount);

  return (
    <span ref={ref} className="text-3xl font-bold text-orange-500 tabular-nums">
      {finalDisplay}
    </span>
  );
}

interface VoiceRoom {
  id: string;
  title: string;
  description?: string;
  status: "scheduled" | "live" | "ended";
  scheduledAt?: string;
  participantCount?: number;
}

interface RsvpData {
  count: number;
  hasRsvpd: boolean;
}

function ScheduledSheekoCard({ room }: { room: VoiceRoom }) {
  const queryClient = useQueryClient();
  const { parent } = useParentAuth();
  const [countdown, setCountdown] = useState("");
  const [isOverdue, setIsOverdue] = useState(false);
  const [, setLocation] = useLocation();
  
  const { data: rsvpData } = useQuery<RsvpData>({
    queryKey: [`/api/voice-rooms/${room.id}/rsvps`],
    enabled: !!parent,
  });

  const rsvpMutation = useMutation({
    mutationFn: async () => {
      if (rsvpData?.hasRsvpd) {
        await apiRequest("DELETE", `/api/voice-rooms/${room.id}/rsvp`);
      } else {
        await apiRequest("POST", `/api/voice-rooms/${room.id}/rsvp`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/voice-rooms/${room.id}/rsvps`] });
    },
  });

  // Countdown timer effect
  useEffect(() => {
    if (!room.scheduledAt) return;
    
    const updateCountdown = () => {
      const now = new Date();
      const scheduled = new Date(room.scheduledAt!);
      const diff = scheduled.getTime() - now.getTime();
      
      const absDiff = Math.abs(diff);
      const hours = Math.floor(absDiff / (1000 * 60 * 60));
      const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);
      
      let countdownStr = "";
      if (hours > 0) {
        countdownStr = `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        countdownStr = `${minutes}m`;
      } else {
        countdownStr = `${seconds}s`;
      }
      
      if (diff < 0) {
        setIsOverdue(true);
        setCountdown(`-${countdownStr}`);
      } else {
        setIsOverdue(false);
        setCountdown(countdownStr);
      }
    };
    
    updateCountdown();
    const now = new Date();
    const scheduled = new Date(room.scheduledAt!);
    const absDiff = Math.abs(scheduled.getTime() - now.getTime());
    const tickMs = absDiff < 120000 ? 1000 : 30000;
    const interval = setInterval(updateCountdown, tickMs);
    return () => clearInterval(interval);
  }, [room.scheduledAt]);

  const formatScheduledTime = (dateStr: string) => {
    const date = new Date(dateStr);
    
    // Display in user's local timezone (their device timezone)
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    return timeStr;
  };

  const handleCardClick = () => {
    // Use SPA navigation - wouter now tracks query params via custom hook
    setLocation(`/sheeko?room=${room.id}`);
  };

  const handleRsvpClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    rsvpMutation.mutate();
  };

  return (
    <div 
      className={`bg-white rounded-xl p-3 shadow-sm cursor-pointer hover:shadow-md transition-all ${isOverdue ? 'border-2 border-red-300' : 'border border-blue-100'}`}
      onClick={handleCardClick}
      data-testid={`scheduled-sheeko-card-${room.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className={`w-4 h-4 flex-shrink-0 ${isOverdue ? 'text-red-500' : 'text-blue-500'}`} />
            <span className={`text-xs font-medium truncate ${isOverdue ? 'text-red-600' : 'text-blue-600'}`}>
              {room.scheduledAt && formatScheduledTime(room.scheduledAt)}
            </span>
            <span 
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                isOverdue 
                  ? 'bg-red-100 text-red-600' 
                  : 'bg-blue-100 text-blue-600'
              }`}
              data-testid={isOverdue ? `countdown-overdue-${room.id}` : `countdown-${room.id}`}
            >
              {countdown}
            </span>
          </div>
          <h4 className="font-semibold text-gray-900 text-sm truncate">{room.title}</h4>
          {room.description && (
            <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">{room.description}</p>
          )}
          {rsvpData && rsvpData.count > 0 && (
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <Users className="w-3 h-3" />
              {rsvpData.count} qof ayaa imaanaya
            </p>
          )}
        </div>
        {parent && (
          <button
            onClick={handleRsvpClick}
            disabled={rsvpMutation.isPending}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              rsvpData?.hasRsvpd
                ? "bg-green-100 text-green-700 border border-green-200"
                : "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm"
            }`}
            data-testid={`rsvp-button-${room.id}`}
          >
            {rsvpData?.hasRsvpd ? (
              <>
                <Check className="w-3 h-3 inline mr-1" />
                Waan imaanayaa
              </>
            ) : (
              "Waan ka qayb geli"
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function SheekoSection() {
  const { parent } = useParentAuth();
  const canHost = parent?.isAdmin || parent?.canHostSheeko;
  
  const { data: rooms = [] } = useQuery<VoiceRoom[]>({
    queryKey: ["/api/voice-rooms"],
  });

  const liveRooms = rooms.filter((r) => r.status === "live");
  const scheduledRooms = rooms.filter((r) => r.status === "scheduled");
  const liveCount = liveRooms.length;
  const scheduledCount = scheduledRooms.length;
  const isOffline = liveCount === 0 && scheduledCount === 0;

  // Calculate countdown for next scheduled room
  const nextRoom = scheduledRooms.length > 0 
    ? scheduledRooms.sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())[0]
    : null;

  const [countdown, setCountdown] = useState("");
  
  useEffect(() => {
    if (!nextRoom?.scheduledAt) return;
    
    const updateCountdown = () => {
      const now = new Date();
      const scheduled = new Date(nextRoom.scheduledAt!);
      const diff = scheduled.getTime() - now.getTime();
      
      if (diff <= 0) {
        setCountdown("Hadda");
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (days > 0) {
        setCountdown(`${days} maalmood, ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setCountdown(`${hours} saac, ${minutes} daqiiqo`);
      } else {
        setCountdown(`${minutes} daqiiqo`);
      }
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [nextRoom]);

  // Always show the section
  return (
    <div className="mt-4 px-4 max-w-7xl mx-auto lg:px-8">
      <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 rounded-2xl border border-purple-200 shadow-sm overflow-hidden" data-testid="sheeko-section">
          <div className="p-4 space-y-3">
            {/* Live rooms header */}
            {liveCount > 0 && (
              <div className="flex items-center justify-between">
                <Link href="/sheeko" className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" data-testid="sheeko-header-live">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Radio className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">Sheeko</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                      </span>
                      <span>{liveCount} sheeko socda</span>
                    </div>
                  </div>
                </Link>
                <div className="flex items-center gap-2">
                  {canHost && (
                    <button
                      onClick={() => window.location.assign('/sheeko')}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-lg active:scale-[0.98] transition-all text-sm"
                      data-testid="button-create-sheeko-live"
                    >
                      <Plus className="w-4 h-4" />
                      Abuuri
                    </button>
                  )}
                  <button
                    onClick={() => window.location.assign('/sheeko')}
                    className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-semibold px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg active:scale-[0.98] transition-all text-sm"
                    data-testid="button-join-sheeko"
                  >
                    <Radio className="w-4 h-4" />
                    Ku biir
                  </button>
                </div>
              </div>
            )}

            {/* Scheduled rooms with countdown */}
            {scheduledCount > 0 && (
              <div className="space-y-2">
                {liveCount === 0 && (
                  <div className="flex items-center justify-between">
                    <Link href="/sheeko" className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" data-testid="sheeko-header-scheduled">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Calendar className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-base">Sheeko</h3>
                        <p className="text-sm text-gray-600">{scheduledCount} la qorsheeyay</p>
                      </div>
                    </Link>
                    <div className="flex items-center gap-2">
                      {canHost && (
                        <button
                          onClick={() => window.location.assign('/sheeko')}
                          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-lg active:scale-[0.98] transition-all text-sm"
                          data-testid="button-create-sheeko-scheduled"
                        >
                          <Plus className="w-4 h-4" />
                          Abuuri
                        </button>
                      )}
                      {countdown && (
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Soo socda</p>
                          <p className="text-sm font-bold text-indigo-600">{countdown}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {liveCount > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium pt-2 border-t border-purple-100">
                    <Calendar className="w-3.5 h-3.5" />
                    Soo socda ({scheduledCount})
                  </div>
                )}
                <div className="space-y-2">
                  {scheduledRooms.slice(0, 2).map((room) => (
                    <ScheduledSheekoCard key={room.id} room={room} />
                  ))}
                </div>
              </div>
            )}

            {/* Offline state - no live or scheduled rooms */}
            {isOffline && (
              <div className="flex items-center justify-between">
                <Link href="/sheeko" className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" data-testid="sheeko-header-offline">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center shadow">
                    <Radio className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">Sheeko</h3>
                    <p className="text-sm text-gray-500">Weli lama qorshayn</p>
                  </div>
                  <span className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg text-sm">
                    Arag
                  </span>
                </Link>
                <div className="flex items-center gap-2">
                  {canHost && (
                    <button
                      onClick={() => window.location.assign('/sheeko')}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-lg active:scale-[0.98] transition-all text-sm"
                      data-testid="button-create-sheeko"
                    >
                      <Plus className="w-4 h-4" />
                      Abuuri
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
      </div>
    </div>
  );
}

function DhambaalSection() {
  const { apiLanguage } = useLanguage();
  interface ParentMessage {
    id: string;
    title: string;
    topic: string;
    images: string[];
    thumbnailUrl?: string | null;
    messageDate: string;
  }

  const { data: todayMessage } = useQuery<ParentMessage>({
    queryKey: [`/api/parent-messages/today?lang=${apiLanguage}`],
  });

  return (
    <div className="mt-4 px-4 max-w-7xl mx-auto lg:px-8">
      <Link href="/dhambaal" data-testid="dhambaal-section">
        <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 rounded-2xl border border-emerald-600/30 shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-all active:scale-[0.99]">
          <div className="p-4 flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <MessageCircle className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">Dhambaalka Waalidka</h3>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Cusub
                </span>
              </div>
              {todayMessage ? (
                <p className="text-sm text-emerald-200 truncate mt-0.5">
                  Maanta: {todayMessage.title}
                </p>
              ) : (
                <p className="text-sm text-emerald-300 mt-0.5">
                  Talo iyo tilmaamo waalidnimo
                </p>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-emerald-400" />
          </div>
          {(todayMessage?.thumbnailUrl || todayMessage?.images?.[0]) && (
            <div className="h-24 overflow-hidden">
              <img 
                src={todayMessage.thumbnailUrl || todayMessage.images[0]} 
                alt={todayMessage.title}
                className="w-full h-full object-cover opacity-60"
              />
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}

function MaaweeloSection() {
  const { apiLanguage } = useLanguage();
  interface BedtimeStory {
    id: string;
    titleSomali: string;
    characterName: string;
    images: string[];
    thumbnailUrl?: string | null;
    storyDate: string;
  }

  const { data: todayStory } = useQuery<BedtimeStory>({
    queryKey: [`/api/bedtime-stories/today?lang=${apiLanguage}`],
  });

  return (
    <div className="mt-4 px-4 max-w-7xl mx-auto lg:px-8">
      <Link href="/maaweelo" data-testid="maaweelo-section">
        <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 rounded-2xl border border-purple-600/30 shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-all active:scale-[0.99]">
          <div className="p-4 flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <Moon className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">Maaweelada Caruurta</h3>
                <span className="bg-yellow-500/20 text-yellow-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Cusub
                </span>
              </div>
              {todayStory ? (
                <p className="text-sm text-purple-200 truncate mt-0.5">
                  Cawaysinkeena Caawa: {todayStory.titleSomali}
                </p>
              ) : (
                <p className="text-sm text-purple-300 mt-0.5">
                  Sheekooyinka Hurdada
                </p>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-purple-400" />
          </div>
          {(todayStory?.thumbnailUrl || todayStory?.images?.[0]) && (
            <div className="h-24 overflow-hidden">
              <img 
                src={todayStory.thumbnailUrl || todayStory.images[0]} 
                alt={todayStory.titleSomali}
                className="w-full h-full object-cover opacity-60"
              />
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}

function ParentFeedSection() {
  interface LatestPost {
    id: string;
    title: string;
    content: string;
    author: {
      id: string;
      name: string | null;
      picture: string | null;
    };
    createdAt: string;
  }

  const { data: latestPosts } = useQuery<LatestPost[]>({
    queryKey: ["/api/social-posts/latest"],
  });

  const latestPost = latestPosts?.[0];

  return (
    <div className="mt-4 px-4 max-w-7xl mx-auto lg:px-8">
      <Link href="/waalid/feed" data-testid="parent-feed-section">
        <div className="bg-gradient-to-br from-blue-900 via-sky-900 to-slate-900 rounded-2xl border border-blue-600/30 shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-all active:scale-[0.99]">
          <div className="p-4 flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">Baraha Waalidiinta</h3>
                <span className="bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Cusub
                </span>
              </div>
              {latestPost ? (
                <p className="text-sm text-blue-200 truncate mt-0.5">
                  {latestPost.title}
                </p>
              ) : (
                <p className="text-sm text-blue-300 mt-0.5">
                  La wadaag fikradahaaga waalidiinta kale
                </p>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-blue-400" />
          </div>
          <div className="h-24 overflow-hidden">
            <img 
              src={barahaWaalidiintaImg} 
              alt="Baraha Waalidiinta"
              className="w-full h-full object-cover opacity-60"
            />
          </div>
        </div>
      </Link>
    </div>
  );
}

function CourseCard({ course, onComingSoonClick }: { course: Course; onComingSoonClick?: (course: Course) => void }) {
  const { t } = useTranslation();
  const isAvailable = isAvailableCourse(course.courseId);
  
  const cardContent = (
    <div 
      className={`w-[115px] flex-shrink-0 bg-white rounded-2xl shadow-md overflow-hidden cursor-pointer active:scale-[0.98] transition-all hover:shadow-lg border border-gray-100`}
      data-testid={`card-course-${course.courseId}`}
    >
      <div className="h-20 bg-gradient-to-br from-sky-200 via-blue-100 to-cyan-100 relative overflow-hidden">
        {course.imageUrl ? (
          <img src={course.imageUrl} alt={course.title} className={`w-full h-full object-cover ${!isAvailable ? 'opacity-70' : ''}`} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
              <Play className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        )}
        {!isAvailable && (
          <div className="absolute top-1 left-1 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-[7px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
            2026
          </div>
        )}
        {isAvailable && !course.isFree && (
          <div className="absolute top-1 right-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
            PRO
          </div>
        )}
        {isAvailable && course.isLive && (
          <div className="absolute top-1 left-1 bg-gradient-to-r from-red-500 to-rose-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
            <span className="w-1 h-1 bg-white rounded-full animate-pulse" />
            LIVE
          </div>
        )}
      </div>
      <div className="p-2">
        <h3 className="font-bold text-gray-900 text-[11px] line-clamp-2 leading-tight mb-0.5">
          {course.title}
        </h3>
        <p className="text-gray-500 text-[10px]">{translateDuration(course.duration, t) || t("home.defaultLessons")}</p>
      </div>
    </div>
  );
  
  if (isAvailable) {
    return (
      <Link href={`/course/${course.courseId}`}>
        {cardContent}
      </Link>
    );
  }
  
  return (
    <div onClick={() => onComingSoonClick?.(course)}>
      {cardContent}
    </div>
  );
}

function MeetEventsSection({ parent }: { parent: any }) {
  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/meet-events"],
    queryFn: async () => {
      const res = await fetch("/api/meet-events");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const [addedToCalendar, setAddedToCalendar] = useState<Set<number>>(() => {
    try {
      const stored = localStorage.getItem("meetEventsAddedToCalendar");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  const [expandedDescs, setExpandedDescs] = useState<Set<number>>(new Set());

  const safeDateParse = (dateStr: string, timeStr: string) => {
    const t = timeStr.includes(":") && timeStr.split(":").length === 2 ? timeStr + ":00" : timeStr;
    return new Date(`${dateStr}T${t}`);
  };

  const now = new Date();
  const upcomingOrLive = events.filter((e: any) => {
    if (!e.isActive) return false;
    const eventEnd = safeDateParse(e.eventDate, e.endTime);
    return now <= eventEnd;
  });
  const pastWithRecording = events
    .filter((e: any) => {
      if (!e.isActive) return false;
      const eventEnd = safeDateParse(e.eventDate, e.endTime);
      return now > eventEnd && e.driveFileId;
    })
    .sort((a: any, b: any) => {
      const aEnd = safeDateParse(a.eventDate, a.endTime).getTime();
      const bEnd = safeDateParse(b.eventDate, b.endTime).getTime();
      return bEnd - aEnd;
    });
  const latestRecording = pastWithRecording.length > 0 ? pastWithRecording[0] : null;
  const activeEvents = [...upcomingOrLive, ...(latestRecording ? [latestRecording] : [])];
  if (activeEvents.length === 0) return null;

  const formatSomaliDate = (dateStr: string) => {
    const months = ["Janaayo", "Febraayo", "Maarso", "Abriil", "May", "Juun", "Luuliyo", "Ogost", "Sebtembar", "Oktoobar", "Nofembar", "Desembar"];
    const days = ["Axad", "Isniin", "Talaado", "Arbaco", "Khamiis", "Jimce", "Sabti"];
    const d = new Date(dateStr + "T00:00:00");
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const formatTime12 = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  return (
    <div className="mt-6 px-4 max-w-7xl mx-auto lg:px-8">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
          <Video className="w-4 h-4 text-white" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Kulannada Tooska ah</h2>
      </div>
      <div className="space-y-3">
        {activeEvents.map((event: any) => {
          const eventStart = safeDateParse(event.eventDate, event.startTime);
          const eventEnd = safeDateParse(event.eventDate, event.endTime);
          const diffMs = eventStart.getTime() - now.getTime();
          const diffMin = diffMs / 60000;
          const isLive = now >= eventStart && now <= eventEnd;
          const canJoin = diffMin <= 15 && now <= eventEnd;
          const isPast = now > eventEnd;

          const handleJoin = () => {
            if (!parent) {
              window.location.assign("/register");
              return;
            }
            if (canJoin) {
              window.open(event.meetLink, "_blank");
            }
          };

          const isAddedToCal = addedToCalendar.has(event.id);

          const handleAddToCalendar = () => {
            if (isAddedToCal) {
              toast.info("Kulankaan horay ayaad kalandarka u gelisay");
              return;
            }
            const [year, month, day] = event.eventDate.split("-").map(Number);
            const [sh, sm] = event.startTime.split(":").map(Number);
            const [eh, em] = event.endTime.split(":").map(Number);
            const startUtc = new Date(Date.UTC(year, month - 1, day, sh - 3, sm, 0));
            const endUtc = new Date(Date.UTC(year, month - 1, day, eh - 3, em, 0));
            const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
            const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${fmt(startUtc)}/${fmt(endUtc)}&details=${encodeURIComponent(event.description || "")}`;
            window.open(calUrl, "_blank");
            const updated = new Set(addedToCalendar);
            updated.add(event.id);
            setAddedToCalendar(updated);
            try { localStorage.setItem("meetEventsAddedToCalendar", JSON.stringify(Array.from(updated))); } catch {}
            toast.success("Kalandarka waad ku dartay!");
          };

          if (isPast && !event.driveFileId) return null;

          if (isPast && event.driveFileId) {
            const recordingTitle = event.mediaTitle || event.title;
            return (
              <div
                key={event.id}
                className="relative overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-br from-white to-orange-50 p-4 shadow-sm"
                data-testid={`meet-card-${event.id}`}
              >
                <div className="absolute top-3 right-3 flex items-center gap-1.5 text-white text-[10px] font-bold px-2.5 py-1 rounded-full bg-orange-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                  Duubis
                </div>
                <div className="flex items-start gap-3">
                  <img src={tarbiyaddaLogo} alt="Tarbiyadda Caruurta" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-gray-900 mb-1">{recordingTitle}</h3>
                    {event.mediaTitle && event.title !== event.mediaTitle && (
                      <p className="text-xs text-gray-500 mb-1">{event.title}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-3">
                      <span className="flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-full">
                        <Calendar className="w-3 h-3 text-blue-500" />
                        {formatSomaliDate(event.eventDate)}
                      </span>
                      <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full">
                        {event.mediaType === "audio" ? <Volume2 className="w-3 h-3 text-purple-500" /> : <Video className="w-3 h-3 text-red-500" />}
                        {event.mediaType === "audio" ? "Cod" : "Muuqaal"}
                      </span>
                    </div>
                  </div>
                </div>
                <a
                  href={`/meet-watch/${event.id}`}
                  className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                    event.mediaType === "audio"
                      ? "bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-purple-200"
                      : "bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white shadow-red-200"
                  }`}
                  data-testid={`btn-watch-meet-${event.id}`}
                >
                  {event.mediaType === "audio" ? <Volume2 className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                  {event.mediaType === "audio" ? "Dhageyso Kulankii" : "Daawo Kulankii"}
                </a>
              </div>
            );
          }

          return (
            <div
              key={event.id}
              className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-4 shadow-sm"
              data-testid={`meet-card-${event.id}`}
            >
              {(() => {
                const diffHours = diffMs / 3600000;
                const showLiveBadge = isLive || (diffHours <= 6 && diffHours > 0);
                if (!showLiveBadge) return null;
                return (
                  <div className={`absolute top-3 right-3 flex items-center gap-1.5 text-white text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    isLive ? "bg-red-600 animate-pulse" : "bg-red-500 animate-pulse"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-white" : "bg-white/80"}`}></span>
                    {isLive ? "LIVE" : (() => {
                      const h = Math.floor(diffHours);
                      const m = Math.floor((diffMs % 3600000) / 60000);
                      return h > 0 ? `${h}h ${m}m` : `${m} daqiiqo`;
                    })()}
                  </div>
                );
              })()}
              <div className="flex items-start gap-3">
                <img src={tarbiyaddaLogo} alt="Tarbiyadda Caruurta" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-gray-900 mb-1">{event.title}</h3>
                  {event.description && (
                    <div className="mb-2">
                      <p className={`text-xs text-gray-600 ${expandedDescs.has(event.id) ? "" : "line-clamp-2"}`}>{event.description}</p>
                      {event.description.length > 80 && (
                        <button
                          onClick={() => setExpandedDescs(prev => {
                            const next = new Set(prev);
                            if (next.has(event.id)) next.delete(event.id);
                            else next.add(event.id);
                            return next;
                          })}
                          className="text-xs text-blue-600 font-medium mt-0.5 hover:underline"
                          data-testid={`btn-readmore-meet-${event.id}`}
                        >
                          {expandedDescs.has(event.id) ? "Yaree ▲" : "Akhri dhamaystirka ▼"}
                        </button>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-full">
                      <Calendar className="w-3 h-3 text-blue-500" />
                      {formatSomaliDate(event.eventDate)}
                    </span>
                    <span className="flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-full">
                      <Clock className="w-3 h-3 text-indigo-500" />
                      {formatTime12(event.startTime)} - {formatTime12(event.endTime)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                    {!parent ? (
                      <button
                        onClick={() => window.location.assign("/register")}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 transition-all"
                        data-testid={`btn-join-meet-${event.id}`}
                      >
                        <Video className="w-3.5 h-3.5" />
                        Isdiiwaangeli si aad u gasho
                      </button>
                    ) : (
                      <button
                        onClick={handleJoin}
                        disabled={!canJoin}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          isLive
                            ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200"
                            : canJoin
                            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        }`}
                        data-testid={`btn-join-meet-${event.id}`}
                      >
                        <Video className="w-3.5 h-3.5" />
                        {isLive ? "Ku Biir Hadda" : canJoin ? "Ku Biir" : "Wali ma furina"}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (!parent) {
                          window.location.assign("/register");
                          return;
                        }
                        handleAddToCalendar();
                      }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        isAddedToCal
                          ? "bg-green-50 border border-green-200 text-green-700"
                          : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                      data-testid={`btn-calendar-meet-${event.id}`}
                    >
                      {isAddedToCal ? <Check className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
                      {isAddedToCal ? "Kalandarka waad ku dartay" : "Kalandarka"}
                    </button>
              </div>
              {event.driveFileId && (
                <div className="mt-3">
                  <a
                    href={`/meet-watch/${event.id}`}
                    className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                      event.mediaType === "audio"
                        ? "bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-purple-200"
                        : "bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white shadow-red-200"
                    }`}
                    data-testid={`btn-watch-meet-${event.id}`}
                  >
                    {event.mediaType === "audio" ? <Volume2 className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                    {event.mediaType === "audio" ? "Dhageyso Kulankii" : "Daawo Kulankii"}
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionHeader({ title, linkTo }: { title: string; linkTo?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between mb-4 px-4">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      {linkTo && (
        <Link href={linkTo}>
          <span className="text-blue-600 text-xs font-medium flex items-center gap-0.5">
            {t("home.viewAllCourses")}
            <ChevronRight className="w-4 h-4" />
          </span>
        </Link>
      )}
    </div>
  );
}

interface DailyTip {
  id: string;
  ageRange: string;
  title: string;
  content: string;
  category: string | null;
}

interface AiTip {
  id: string;
  ageRange: string;
  title: string;
  content: string;
  correctedContent: string | null;
  category: string;
  publishDate: string;
  audioUrl: string | null;
}

function formatAudioTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function AiTipCard() {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data: aiTip } = useQuery<AiTip | null>({
    queryKey: ["aiTipToday"],
    queryFn: async () => {
      const res = await fetch("/api/ai-tips/today");
      if (!res.ok) return null;
      return res.json();
    },
  });

  if (!aiTip) return null;

  const getProxiedAudioUrl = (url: string | null): string | null => {
    if (!url) return null;
    const match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match) {
      return `/api/tts-audio/${match[1]}`;
    }
    if (url.includes('/file/d/')) {
      const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (fileIdMatch) return `/api/tts-audio/${fileIdMatch[1]}`;
    }
    return url;
  };

  const proxiedAudioUrl = getProxiedAudioUrl(aiTip.audioUrl);

  const getCategoryLabel = (category: string) => {
    const categoryKeys: Record<string, string> = {
      "feeding": "home.categories.feeding",
      "sleep": "home.categories.sleep",
      "play": "home.categories.play",
      "health": "home.categories.health",
      "emotional": "home.categories.emotional",
      "behavior": "home.categories.behavior",
      "learning": "home.categories.learning",
    };
    return categoryKeys[category] ? t(categoryKeys[category]) : category;
  };

  const getAgeLabel = (ageRange: string) => {
    const ranges: Record<string, { value: string; unit: string }> = {
      "0-6": { value: "0-6", unit: "months" },
      "6-12": { value: "6-12", unit: "months" },
      "1-2": { value: "1-2", unit: "years" },
      "2-4": { value: "2-4", unit: "years" },
      "4-7": { value: "4-7", unit: "years" },
    };
    const range = ranges[ageRange];
    if (!range) return ageRange;
    return `${range.value} ${t(`assessment.${range.unit}`)}`;
  };

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
    setAudioProgress(isNaN(progress) ? 0 : progress);
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = percent * audioRef.current.duration;
  };

  return (
    <div className="mx-4 mt-4 bg-gradient-to-br from-purple-100 via-indigo-50 to-blue-100 rounded-2xl p-5 border border-purple-200/60 shadow-md" data-testid="card-ai-tip">
      <div className="flex items-start gap-4">
        <div className="relative flex-shrink-0">
          <img
            src="/images/founder-musse.jpg"
            alt="Founder"
            className="w-14 h-14 rounded-full object-cover border-2 border-purple-300 shadow-sm"
          />
          <span className="absolute -bottom-1 -right-1 bg-gradient-to-br from-purple-600 to-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow">
            AI
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-1 mb-1.5">
            <h3 className="font-bold text-gray-900 text-sm leading-snug">
              Maraaxisha da'da ilmaha (Child development stages by age)
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs bg-purple-200/80 text-purple-800 px-2.5 py-0.5 rounded-full font-medium">
                {getAgeLabel(aiTip.ageRange)}
              </span>
              <span className="text-xs bg-indigo-200/80 text-indigo-800 px-2.5 py-0.5 rounded-full font-medium">
                {getCategoryLabel(aiTip.category)}
              </span>
            </div>
          </div>
          <h4 className="font-semibold text-gray-800 text-[15px] mb-1.5">{aiTip.title}</h4>
          <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
            {aiTip.correctedContent || aiTip.content}
          </p>
        </div>
      </div>

      {proxiedAudioUrl && (
        <div className="mt-3 bg-gradient-to-r from-slate-800 via-slate-800 to-indigo-900 rounded-xl px-3 py-2.5 shadow-md" data-testid="player-ai-tip-audio">
          <audio
            ref={audioRef}
            src={proxiedAudioUrl}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => { setIsPlaying(false); setAudioProgress(0); }}
            onLoadedMetadata={() => {
              if (audioRef.current) setAudioDuration(audioRef.current.duration);
            }}
            preload="metadata"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={toggleAudio}
              className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-indigo-500 rounded-full text-white shadow-md hover:bg-indigo-400 transition-all active:scale-95"
              data-testid="button-ai-tip-audio"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <div className="flex-1 min-w-0">
              <div
                className="flex items-end gap-[2px] h-7 cursor-pointer"
                onClick={handleProgressClick}
                data-testid="progress-ai-tip-audio"
              >
                {Array.from({ length: 40 }).map((_, i) => {
                  const barProgress = (i / 40) * 100;
                  const isActive = barProgress < audioProgress;
                  const heights = [40, 55, 35, 70, 45, 80, 50, 65, 30, 75, 55, 85, 40, 60, 50, 90, 45, 70, 35, 80, 55, 65, 45, 75, 60, 85, 40, 70, 50, 90, 55, 65, 35, 80, 45, 75, 60, 50, 70, 85];
                  return (
                    <div
                      key={i}
                      className={`flex-1 rounded-sm transition-colors duration-150 ${isActive ? 'bg-indigo-400' : 'bg-slate-600'}`}
                      style={{ height: `${heights[i % heights.length]}%` }}
                    />
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-indigo-400 font-mono">{formatAudioTime(currentTime)}</span>
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
                  {isPlaying ? "PLAYING" : "READY"}
                </span>
                <span className="text-[10px] text-indigo-400 font-mono">{formatAudioTime(audioDuration)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DailyTipCard() {
  const { t } = useTranslation();
  const { data: tip } = useQuery<DailyTip | null>({
    queryKey: ["dailyTip"],
    queryFn: async () => {
      const res = await fetch("/api/daily-tip");
      if (!res.ok) return null;
      return res.json();
    },
  });

  if (!tip) return null;

  const getAgeLabel = (ageRange: string) => {
    const ranges: Record<string, { value: string; unit: string }> = {
      "0-6": { value: "0-6", unit: "months" },
      "6-12": { value: "6-12", unit: "months" },
      "1-2": { value: "1-2", unit: "years" },
      "2-4": { value: "2-4", unit: "years" },
      "4-7": { value: "4-7", unit: "years" },
    };
    const range = ranges[ageRange];
    if (!range) return ageRange;
    return `${range.value} ${t(`assessment.${range.unit}`)}`;
  };

  return (
    <div className="mx-4 mt-6 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-2xl p-4 border border-amber-200 shadow-sm" data-testid="card-daily-tip">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
          <Lightbulb className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-gray-900 text-sm">{t("home.dailyTip")}</h3>
            <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium">
              {getAgeLabel(tip.ageRange)}
            </span>
          </div>
          <p className="text-gray-700 text-sm leading-relaxed">{tip.content}</p>
          <div className="mt-2 pt-2 border-t border-amber-200">
            <p className="text-xs text-gray-700 font-medium">{t("signature.name")}</p>
            <p className="text-[10px] text-gray-500 italic">{t("home.signatureTagline")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface HomepageParentTip {
  id: string;
  title: string;
  content: string;
  stage: string;
  topic: string;
  keyPoints: string | null;
  images: string[];
  audioUrl: string | null;
  tipDate: string;
  generatedAt: string;
}

const DEV_STAGE_LABELS: Record<string, { label: string; icon: string }> = {
  "newborn-0-3m": { label: "Murjux (0-3 bilood)", icon: "👶" },
  "infant-3-6m": { label: "Fadhi-barad (3-6 bilood)", icon: "🍼" },
  "infant-6-12m": { label: "Gurguurte (6-12 bilood)", icon: "🦶" },
  "toddler-1-2y": { label: "Socod barad (1-2 sano)", icon: "🧒" },
  "toddler-2-3y": { label: "Inyow (2-3 sano)", icon: "🗣️" },
  "preschool-3-5y": { label: "Dareeme (3-5 sano)", icon: "🎨" },
  "school-age-5-7y": { label: "Salaad-barad (5-7 sano)", icon: "🎒" },
};

function HomepageTipsSection() {
  const { data: tips = [] } = useQuery<HomepageParentTip[]>({
    queryKey: ["homepage-parent-tips"],
    queryFn: async () => {
      const res = await fetch("/api/parent-tips/homepage");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const [playingTipId, setPlayingTipId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const getProxyAudioUrl = (audioUrl: string | null): string | null => {
    if (!audioUrl) return null;
    const match = audioUrl.match(/[?&]id=([^&]+)/);
    if (match) return `/api/tts-audio/${match[1]}`;
    return audioUrl;
  };

  const toggleAudio = (tipId: string, audioUrl: string | null) => {
    const proxyUrl = getProxyAudioUrl(audioUrl);
    if (!proxyUrl) return;
    if (playingTipId === tipId) {
      audioRef.current?.pause();
      setPlayingTipId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = proxyUrl;
        audioRef.current.play().then(() => setPlayingTipId(tipId)).catch(() => {});
      }
    }
  };

  if (tips.length === 0) return null;

  return (
    <div className="mt-6 px-4 max-w-7xl mx-auto lg:px-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          Talooyinkeena Maalin kasta ah
        </h2>
        <Link href="/parent-tips">
          <span className="text-sm text-purple-600 font-medium flex items-center gap-1">
            Dhammaan <ChevronRight className="w-4 h-4" />
          </span>
        </Link>
      </div>
      <audio
        ref={audioRef}
        onEnded={() => setPlayingTipId(null)}
        preload="none"
      />
      <div className="space-y-4">
        {tips.map((tip) => {
          const stageInfo = DEV_STAGE_LABELS[tip.stage];
          return (
            <Link key={tip.id} href="/parent-tips">
              <div
                className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 rounded-2xl p-4 border border-purple-200 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
                data-testid={`homepage-tip-${tip.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-gray-900 text-sm">Talooyinkeena Maalin kasta ah</h3>
                      {stageInfo && (
                        <span className="text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full font-medium">
                          {stageInfo.label}
                        </span>
                      )}
                      <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                        {tip.topic}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-800 text-sm mb-1">{tip.title}</p>
                    <p className="text-gray-700 text-sm leading-relaxed line-clamp-4">
                      {tip.content}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      {tip.audioUrl && (
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleAudio(tip.id, tip.audioUrl); }}
                          className="flex items-center gap-1.5 text-xs text-purple-600 font-medium bg-purple-100 px-3 py-1.5 rounded-full hover:bg-purple-200 transition-colors"
                          data-testid={`play-tip-${tip.id}`}
                        >
                          {playingTipId === tip.id ? (
                            <><Pause className="w-3 h-3" /> Jooji</>
                          ) : (
                            <><Volume2 className="w-3 h-3" /> Dhagayso</>
                          )}
                        </button>
                      )}
                    </div>
                    <div className="mt-3 pt-2 border-t border-purple-200/50">
                      <p className="text-xs text-gray-600 font-medium">Mahadsanid</p>
                      <p className="text-[10px] text-gray-500 italic">Barbaarintasan Academy.</p>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function CourseCarousel({ children }: { children: React.ReactNode }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    loop: true,
  });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const autoScrollRef = useRef<NodeJS.Timeout | null>(null);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const updateScrollButtons = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    updateScrollButtons();
    emblaApi.on("select", updateScrollButtons);
    emblaApi.on("reInit", updateScrollButtons);
    return () => {
      emblaApi.off("select", updateScrollButtons);
      emblaApi.off("reInit", updateScrollButtons);
    };
  }, [emblaApi, updateScrollButtons]);

  useEffect(() => {
    if (!emblaApi) return;
    
    const startAutoScroll = () => {
      autoScrollRef.current = setInterval(() => {
        emblaApi.scrollNext();
      }, 4000);
    };
    
    const stopAutoScroll = () => {
      if (autoScrollRef.current) {
        clearInterval(autoScrollRef.current);
        autoScrollRef.current = null;
      }
    };
    
    startAutoScroll();
    
    emblaApi.on("pointerDown", stopAutoScroll);
    emblaApi.on("pointerUp", startAutoScroll);
    
    return () => {
      stopAutoScroll();
      emblaApi.off("pointerDown", stopAutoScroll);
      emblaApi.off("pointerUp", startAutoScroll);
    };
  }, [emblaApi]);

  return (
    <div className="relative group">
      <button
        onClick={scrollPrev}
        className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 backdrop-blur rounded-full shadow-lg flex items-center justify-center transition-opacity ${
          canScrollPrev ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-5 h-5 text-gray-700" />
      </button>

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-2 pb-2 pl-4 pr-3">
          {children}
        </div>
      </div>

      <button
        onClick={scrollNext}
        className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 backdrop-blur rounded-full shadow-lg flex items-center justify-center transition-opacity ${
          canScrollNext ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-label="Scroll right"
      >
        <ChevronRight className="w-5 h-5 text-gray-700" />
      </button>
    </div>
  );
}

function RandomTestimonial({ feedbackList }: { feedbackList: any[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number>(0);
  
  const goNext = () => {
    setIsVisible(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % feedbackList.length);
      setIsVisible(true);
    }, 150);
  };
  
  const goPrev = () => {
    setIsVisible(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + feedbackList.length) % feedbackList.length);
      setIsVisible(true);
    }, 150);
  };
  
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
  };
  
  useEffect(() => {
    if (feedbackList.length <= 1) return;
    
    const startInterval = () => {
      intervalRef.current = setInterval(() => {
        if (!isPaused) {
          setIsVisible(false);
          timeoutRef.current = setTimeout(() => {
            setCurrentIndex((prev) => {
              let nextIndex;
              do {
                nextIndex = Math.floor(Math.random() * feedbackList.length);
              } while (nextIndex === prev && feedbackList.length > 1);
              return nextIndex;
            });
            setIsVisible(true);
          }, 300);
        }
      }, 180000);
    };
    
    startInterval();
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [feedbackList.length, isPaused]);
  
  if (feedbackList.length === 0) return null;
  
  const feedback = feedbackList[currentIndex];
  
  return (
    <div 
      className={`bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200 transition-opacity duration-300 cursor-pointer ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      data-testid={`home-feedback-${feedback.id}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-400 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
          {feedback.parentName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-gray-800">{feedback.parentName}</span>
            {feedback.telegramGroupName && (
              <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                {feedback.telegramGroupName}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{feedback.notes}</p>
        </div>
      </div>
    </div>
  );
}

function RandomAnnouncement({ announcements }: { announcements: any[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number>(0);
  
  const goNext = () => {
    setIsVisible(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
      setIsVisible(true);
    }, 150);
  };
  
  const goPrev = () => {
    setIsVisible(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
      setIsVisible(true);
    }, 150);
  };
  
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
  };
  
  useEffect(() => {
    if (announcements.length <= 1) return;
    
    const startInterval = () => {
      intervalRef.current = setInterval(() => {
        if (!isPaused) {
          setIsVisible(false);
          timeoutRef.current = setTimeout(() => {
            setCurrentIndex((prev) => {
              let nextIndex;
              do {
                nextIndex = Math.floor(Math.random() * announcements.length);
              } while (nextIndex === prev && announcements.length > 1);
              return nextIndex;
            });
            setIsVisible(true);
          }, 300);
        }
      }, 180000);
    };
    
    startInterval();
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [announcements.length, isPaused]);
  
  if (announcements.length === 0) return null;
  
  const announcement = announcements[currentIndex];
  
  return (
    <div 
      className={`bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-200 shadow-sm transition-opacity duration-300 cursor-pointer ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      data-testid={`home-announcement-${announcement.id}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
          <Megaphone className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          {announcement.title && (
            <h4 className="text-gray-900 mb-1 font-bold text-[20px]">{announcement.title}</h4>
          )}
          <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{announcement.content}</p>
        </div>
      </div>
      {announcements.length > 1 && (
        <div className="flex justify-center gap-1 mt-3">
          {announcements.map((_, idx) => (
            <div 
              key={idx} 
              className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentIndex ? 'bg-orange-500' : 'bg-orange-200'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// AI Recommended Courses Section - Shows courses from the learning path
function RecommendedCoursesSection() {
  const { t } = useTranslation();
  const { data: learningPath } = useQuery({
    queryKey: ["learningPath"],
    queryFn: async () => {
      const res = await fetch("/api/learning-path", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  // Only show if there are recommendations
  if (!learningPath?.recommendations || learningPath.recommendations.length === 0) {
    return null;
  }

  // Only show courses that are currently available (0-6-bilood and ilmo-is-dabira)
  const allowedCourseIds = ["0-6-bilood", "ilmo-is-dabira"];
  const filteredRecommendations = learningPath.recommendations.filter((rec: any) => 
    rec.course && allowedCourseIds.includes(rec.course.courseId)
  );

  if (filteredRecommendations.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 px-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-purple-600" />
        <h3 className="text-lg font-bold text-gray-900">{t("home.aiRecommendations")}</h3>
      </div>
      <p className="text-sm text-gray-600 mb-3">{t("home.aiRecommendationsSubtitle")}</p>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {filteredRecommendations.map((rec: any) => {
          const course = rec.course;
          if (!course) return null;
          return (
            <Link key={rec.id} href={`/course/${course.courseId}`}>
              <div 
                className="flex-shrink-0 w-40 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-3 border border-purple-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                data-testid={`recommended-course-${course.courseId}`}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Play className="w-5 h-5 text-white" />
                </div>
                <h4 className="font-semibold text-gray-800 text-sm text-center line-clamp-2 mb-1">{course.title}</h4>
                <p className="text-xs text-purple-600 text-center">{rec.focusArea}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// All 40 Flashcards organized by categories
const flashcardCategories = {
  furud: {
    name: "Furud",
    nameEn: "Fruits",
    color: "from-green-500 to-emerald-500",
    bgColor: "from-green-50 to-emerald-50",
    borderColor: "border-green-200",
    items: [
      { id: 1, image: bananaImg, word: "MOOS" },
      { id: 2, image: mangoImg, word: "CAMBE" },
      { id: 3, image: appleImg, word: "TUFAAX" },
      { id: 4, image: grapesImg, word: "CINAB" },
      { id: 5, image: lemonImg, word: "LIIN" },
      { id: 6, image: orangeImg, word: "BERDEEN" },
      { id: 7, image: pineappleImg, word: "CANANAS" },
      { id: 8, image: strawberryImg, word: "ISTOROOBAARI" },
      { id: 9, image: watermelonImg, word: "QARE" },
      { id: 10, image: figsImg, word: "TIN" },
    ],
  },
  khutaar: {
    name: "Khutaar",
    nameEn: "Vegetables",
    color: "from-orange-500 to-amber-500",
    bgColor: "from-orange-50 to-amber-50",
    borderColor: "border-orange-200",
    items: [
      { id: 11, image: lettuceImg, word: "SALADH" },
      { id: 12, image: cabbageImg, word: "KAABASH" },
      { id: 13, image: pumpkinImg, word: "BOQOR" },
      { id: 14, image: onionImg, word: "BASAL" },
      { id: 15, image: garlicImg, word: "TOON" },
      { id: 16, image: carrotImg, word: "KAROOTO" },
      { id: 17, image: potatoImg, word: "BARADHO" },
      { id: 18, image: tomatoImg, word: "TAMAATO" },
      { id: 19, image: chiliImg, word: "BASBAS" },
      { id: 20, image: cucumberImg, word: "KHIYAAR" },
    ],
  },
  alaabGuri: {
    name: "Alaab Guri",
    nameEn: "Household Items",
    color: "from-purple-500 to-pink-500",
    bgColor: "from-purple-50 to-pink-50",
    borderColor: "border-purple-200",
    items: [
      { id: 21, image: tableImg, word: "MIIS" },
      { id: 22, image: chairImg, word: "KURSI" },
      { id: 23, image: bedImg, word: "SARIIR" },
      { id: 24, image: doorImg, word: "ALBAAB" },
      { id: 25, image: windowImg, word: "DAAQAD" },
      { id: 26, image: lampImg, word: "NALKA" },
      { id: 27, image: bookImg, word: "BUUG" },
      { id: 28, image: mirrorImg, word: "MURAAYAD" },
      { id: 29, image: sofaImg, word: "KURSI DHEER" },
      { id: 30, image: tvImg, word: "TELEFISHIN" },
    ],
  },
  maacuun: {
    name: "Maacuun",
    nameEn: "Kitchen Utensils",
    color: "from-blue-500 to-cyan-500",
    bgColor: "from-blue-50 to-cyan-50",
    borderColor: "border-blue-200",
    items: [
      { id: 31, image: potImg, word: "DIGSI" },
      { id: 32, image: knifeImg, word: "MINDI" },
      { id: 33, image: spoonImg, word: "QAADO" },
      { id: 34, image: forkImg, word: "FARGEETO" },
      { id: 35, image: plateImg, word: "SAXAN" },
      { id: 36, image: cupImg, word: "KOOB" },
      { id: 37, image: panImg, word: "BILAASH" },
      { id: 38, image: ladleImg, word: "MARDUUF" },
      { id: 39, image: mugImg, word: "FIINJAN" },
      { id: 40, image: bowlImg, word: "WEEL" },
    ],
  },
};

// Get current week number
function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

// Get which category and items to show based on current week
function getWeeklyFlashcards() {
  const today = new Date();
  const weekNum = getWeekNumber(today);
  const categories = Object.keys(flashcardCategories) as (keyof typeof flashcardCategories)[];
  const categoryIndex = (weekNum - 1) % 4;
  const category = flashcardCategories[categories[categoryIndex]];
  
  // Available every day - 5 cards per day, alternating between first and second half
  const dayOfWeek = today.getDay();
  const dayOfMonth = today.getDate();
  
  // Alternate daily: even days = first 5 items, odd days = second 5 items
  const itemsPerDay = 5;
  const startIndex = (dayOfMonth % 2 === 0) ? 0 : 5;
  const todaysItems = category.items.slice(startIndex, startIndex + itemsPerDay);
  
  return {
    category,
    categoryKey: categories[categoryIndex],
    todaysItems,
    allItems: category.items,
    dayOfWeek,
    weekNum,
  };
}


function FlashcardModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const weeklyData = getWeeklyFlashcards();
  const { category, todaysItems } = weeklyData;
  
  const goNext = () => {
    if (currentIndex < todaysItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };
  
  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };
  
  const resetAndClose = () => {
    setCurrentIndex(0);
    onClose();
  };
  
  if (!isOpen) return null;
  
  const card = todaysItems[currentIndex];
  
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={resetAndClose}>
      <div 
        className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`bg-gradient-to-r ${category.color} p-4 flex items-center justify-between`}>
          <div>
            <h3 className="text-white font-bold text-lg">{category.name}</h3>
            <p className="text-white/80 text-xs">{category.nameEn}</p>
          </div>
          <button 
            onClick={resetAndClose}
            className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            data-testid="button-close-flashcards"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="text-center text-sm text-gray-500 mb-4">
            {t("home.flashcard.card")} {currentIndex + 1} {t("home.flashcard.of")} {todaysItems.length}
          </div>
          
          <div className={`bg-gradient-to-br ${category.bgColor} rounded-2xl p-6 mb-6 border-2 ${category.borderColor}`}>
            <img 
              src={card.image} 
              alt={card.word} 
              className="w-full h-48 object-contain rounded-xl mb-4"
            />
            <h2 className="text-4xl font-black text-center text-gray-800 tracking-wide">{card.word}</h2>
          </div>
          
          <p className="text-center text-gray-600 text-sm mb-4">
            {t("home.flashcard.instruction")}
          </p>
          
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                currentIndex === 0 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 active:scale-[0.98]'
              }`}
              data-testid="button-flashcard-prev"
            >
              {t("home.flashcard.previous")}
            </button>
            <button
              onClick={goNext}
              disabled={currentIndex === todaysItems.length - 1}
              className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                currentIndex === todaysItems.length - 1 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : `bg-gradient-to-r ${category.color} text-white active:scale-[0.98]`
              }`}
              data-testid="button-flashcard-next"
            >
              {t("home.flashcard.next")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Getting Started Guide Component for New Parents
function GettingStartedGuide({ 
  isLoggedIn, 
  hasCompletedAssessment, 
  hasEnrolledCourse 
}: { 
  isLoggedIn: boolean; 
  hasCompletedAssessment: boolean;
  hasEnrolledCourse: boolean;
}) {
  const { t } = useTranslation();
  const steps = [
    {
      num: 1,
      title: t("home.onboarding.register"),
      icon: UserPlus,
      link: isLoggedIn ? "/profile" : "/register",
      color: "from-blue-500 to-indigo-600",
      completed: isLoggedIn
    },
    {
      num: 2,
      title: t("home.onboarding.assess"),
      icon: ClipboardCheck,
      link: "/assessment",
      color: "from-purple-500 to-pink-600",
      completed: hasCompletedAssessment
    },
    {
      num: 3,
      title: t("home.onboarding.chooseCourse"),
      icon: BookOpen,
      link: "/courses",
      color: "from-orange-500 to-amber-600",
      completed: hasEnrolledCourse
    },
    {
      num: 4,
      title: t("home.onboarding.learn"),
      icon: Play,
      link: "/courses",
      color: "from-green-500 to-emerald-600",
      completed: hasEnrolledCourse
    },
    {
      num: 5,
      title: t("home.onboarding.profile"),
      icon: User,
      link: "/profile",
      color: "from-cyan-500 to-blue-600",
      completed: isLoggedIn
    }
  ];

  return (
    <div className="px-4 mt-6">
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-4 border border-blue-100 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-orange-500" />
          {t("home.howToUseApp")}
        </h3>
        <div className="grid grid-cols-5 gap-1.5">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <Link key={step.num} href={step.link}>
                <div 
                  className="flex flex-col items-center p-1.5 bg-white rounded-xl shadow-sm border border-gray-100 active:scale-95 transition-all cursor-pointer min-w-0"
                  data-testid={`step-card-${step.num}`}
                >
                  <div className="relative">
                    <div className={`w-9 h-9 bg-gradient-to-br ${step.color} rounded-lg flex items-center justify-center mb-1`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    {step.completed && (
                      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-2 h-2 text-white" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold text-gray-800 text-center leading-tight w-full truncate px-0.5">{step.title}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LiveStatsBar() {
  useEffect(() => {
    const ping = () => fetch("/api/stats/ping", { method: "POST" }).catch(() => {});
    ping();
    const interval = setInterval(ping, 60000);
    return () => clearInterval(interval);
  }, []);

  const { data: liveStats, isLoading } = useQuery({
    queryKey: ["liveStats"],
    queryFn: async () => {
      const res = await fetch("/api/stats/live");
      if (!res.ok) return { onlineCount: 0, enrolledCount: 0, totalUsers: 0 };
      return res.json();
    },
    refetchInterval: 30000,
  });

  const onlineCount = liveStats?.onlineCount || 0;
  const enrolledCount = liveStats?.enrolledCount || 0;

  return (
    <div className="flex items-center justify-center gap-4 sm:gap-8" data-testid="live-stats-bar">
      <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2.5 shadow-sm border border-gray-100" data-testid="stat-online-users">
        <span className="relative flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 shadow-[0_0_8px_2px_rgba(34,197,94,0.5)]"></span>
        </span>
        <span className="text-base font-bold text-gray-800">{isLoading ? "..." : onlineCount}</span>
        <span className="text-sm text-gray-500">online</span>
      </div>
      <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2.5 shadow-sm border border-gray-100" data-testid="stat-enrolled-users">
        <GraduationCap className="w-5 h-5 text-indigo-500" />
        <span className="text-base font-bold text-gray-800">{isLoading ? "..." : enrolledCount}</span>
        <span className="text-sm text-gray-500">enrolled</span>
      </div>
    </div>
  );
}

export default function Home() {
  const { t, i18n } = useTranslation();
  const { parent, isLoading, logout } = useParentAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [selectedAgeFilter, setSelectedAgeFilter] = useState<string | null>(null);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [comingSoonCourse, setComingSoonCourse] = useState<Course | null>(null);
  const [, setLocation] = useLocation();

  const ageFilters = [
    { value: null, label: t("common.all") },
    { value: "0-6", label: `0-6 ${t("assessment.months")}` },
    { value: "6-12", label: `6-12 ${t("assessment.months")}` },
    { value: "1-2", label: `1-2 ${t("assessment.years")}` },
    { value: "2-4", label: `2-4 ${t("assessment.years")}` },
    { value: "4-7", label: `4-7 ${t("assessment.years")}` },
  ];

  const handleLogout = async () => {
    await logout();
    setShowLogoutConfirm(false);
  };

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ["courses"],
    queryFn: async () => {
      const res = await fetch("/api/courses");
      return res.json();
    },
  });

  const { data: allLessons = [] } = useQuery({
    queryKey: ["allLessons"],
    queryFn: async () => {
      const res = await fetch("/api/lessons");
      return res.json();
    },
  });

  const { data: parentStats } = useQuery({
    queryKey: ["parentStats"],
    queryFn: async () => {
      const res = await fetch("/api/stats/parents");
      return res.json();
    },
  });

  const { data: telegramStats } = useQuery({
    queryKey: ["telegramStats"],
    queryFn: async () => {
      const res = await fetch("/api/stats/telegram-members");
      return res.json();
    },
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["parentEnrollments", parent?.id],
    queryFn: async () => {
      const res = await fetch("/api/parent/enrollments", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!parent,
  });

  const { data: recommendationsData } = useQuery({
    queryKey: ["recommendations"],
    queryFn: async () => {
      const res = await fetch("/api/recommendations", { credentials: "include" });
      if (!res.ok) return { recommendations: [], reason: "popular" };
      return res.json();
    },
  });

  const recommendations = recommendationsData?.recommendations || [];
  const recommendationReason = recommendationsData?.reason || "popular";

  const { data: parentFeedback = [] } = useQuery<any[]>({
    queryKey: ["parentFeedback"],
    queryFn: async () => {
      const res = await fetch("/api/telegram-referrals");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: announcements = [] } = useQuery<any[]>({
    queryKey: ["announcements"],
    queryFn: async () => {
      const res = await fetch("/api/announcements");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Check if parent has completed any assessment (scoped by parent ID)
  const { data: assessmentHistory = [] } = useQuery<any[]>({
    queryKey: ["assessmentHistory", parent?.id],
    queryFn: async () => {
      const res = await fetch("/api/parent/assessment-history", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!parent,
  });

  // Only show completion if parent is logged in and has data
  const hasCompletedAssessment = !!parent && assessmentHistory.length > 0;
  const hasEnrolledCourse = !!parent && enrollments.length > 0;

  const { data: homepageSections } = useQuery<any[]>({
    queryKey: ["homepage-sections"],
    queryFn: async () => {
      const res = await fetch("/api/homepage-sections");
      if (!res.ok) throw new Error("Failed to fetch sections");
      const data = await res.json();
      try {
        localStorage.setItem("homepage-sections-cache", JSON.stringify(data));
      } catch {
        // localStorage may be unavailable in private browsing mode
      }
      return data;
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 3,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const isSectionVisible = (sectionKey: string) => {
    if (!homepageSections || homepageSections.length === 0) {
      return true;
    }
    const section = homepageSections.find((s: any) => s.sectionKey === sectionKey);
    if (section !== undefined) return true;
    if (sectionKey === "gold_membership") return true;
    return false;
  };

  const hasEnrollments = enrollments.filter((e: any) => e.status === "active").length > 0;

  const filterByAge = (coursesToFilter: Course[]) => {
    if (!selectedAgeFilter) return coursesToFilter;
    return coursesToFilter.filter((c: any) => {
      // Match course_id that starts with the filter value (e.g., "0-6" matches "0-6-bilood")
      return c.courseId.startsWith(selectedAgeFilter) || c.ageRange === selectedAgeFilter;
    });
  };

  const generalCourses = filterByAge(courses.filter((c) => c.category === "general" && c.isLive)).sort((a, b) => a.order - b.order);
  const specialCourses = courses.filter((c) => c.category === "special" && c.isLive).sort((a, b) => a.order - b.order);

  const { data: searchResults } = useQuery({
    queryKey: ["search", searchQuery],
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) return { courses: [], lessons: [] };
      return res.json();
    },
    enabled: searchQuery.length >= 2,
  });


  return (
    <div className="min-h-screen bg-white pb-24 lg:pb-8">
      <InstallBanner />
      <header className="sticky top-0 z-40 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 safe-top prevent-flicker">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/" className="flex flex-col items-center" data-testid="link-bsa-app">
                <img src={bsaAppIcon} alt="BSA" className="w-10 h-10 rounded-xl shadow-lg border-2 border-white/30" />
                <span className="text-white text-[10px] font-bold mt-0.5">BSA</span>
              </Link>
            </div>
            
            <div className="flex items-center gap-3">
              {parent ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/50 cursor-pointer" data-testid="button-profile-menu">
                      {parent.picture ? (
                        <img src={parent.picture} alt={parent.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-orange-400 flex items-center justify-center text-white font-bold text-xs">
                          {parent.name.charAt(0)}
                        </div>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="w-full cursor-pointer">
                        <span className="font-medium">{parent.name}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setShowLogoutConfirm(true)}
                      className="text-red-600 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      {t("auth.logout")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link href="/login">
                  <button 
                    className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-orange-600 rounded-full hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg border border-white/30"
                    data-testid="button-header-sign-in"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Gal</span>
                  </button>
                </Link>
              )}
              <img src={logoImage} alt="Logo" className="w-10 h-10 rounded-xl shadow-lg border-2 border-white/30" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all" data-testid="button-language-switcher">
                    <Globe className="w-4 h-4 text-white" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem
                    onClick={() => { i18n.changeLanguage('so'); localStorage.setItem('barbaarintasan-lang', 'so'); }}
                    className={i18n.language === 'so' ? 'bg-blue-50 text-blue-700' : ''}
                    data-testid="button-lang-somali"
                  >
                    <span className="mr-2">🇸🇴</span>
                    {t("language.somali")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => { i18n.changeLanguage('en'); localStorage.setItem('barbaarintasan-lang', 'en'); }}
                    className={i18n.language === 'en' ? 'bg-blue-50 text-blue-700' : ''}
                    data-testid="button-lang-english"
                  >
                    <span className="mr-2">🇬🇧</span>
                    {t("language.english")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {(parent?.email === "barbaarintasan@gmail.com" || parent?.isAdmin) && (
                <Link href="/admin">
                  <button className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all" data-testid="button-admin-header">
                    <Settings className="w-4 h-4 text-white" />
                  </button>
                </Link>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Link href="/sheeko" className="flex flex-col items-center" data-testid="link-sheeko-app">
                <img src={sheekoAppIcon} alt="Sheeko" className="w-10 h-10 rounded-xl shadow-lg border-2 border-white/30" />
                <span className="text-white text-[10px] font-bold mt-0.5">Sheeko</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto">
      <div className="bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 mx-4 mt-3 rounded-3xl p-5 border border-sky-200 shadow-sm lg:mx-8 lg:p-8">
        <div className="text-center mb-4">
          <h1 className="font-display font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 text-2xl sm:text-3xl tracking-tight mb-2 drop-shadow-sm">{t("home.academyName")}</h1>
          <p className="text-blue-600 text-base sm:text-lg font-semibold leading-relaxed max-w-md mx-auto">{t("home.academyTagline")}</p>
        </div>
        {parent ? (
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">{parent.name}</h1>
            {hasEnrollments ? (
              <>
                <p className="text-gray-600 text-base mb-5">{t("home.knowledgeBasedParenting")}</p>
                <Link href="/learning-hub">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg active:scale-[0.98] transition-all" data-testid="button-continue-learning">
                    <Play className="w-5 h-5" />
                    {t("home.startLessons")}
                  </button>
                </Link>
              </>
            ) : (
              <>
                <p className="text-gray-600 text-base mb-5">{t("home.chooseCourse")}</p>
                <Link href="/learning-hub">
                  <button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg active:scale-[0.98] transition-all" data-testid="button-browse-courses">
                    <Sparkles className="w-5 h-5" />
                    {t("home.browseCourses")}
                  </button>
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="text-center">
            <p className="text-base font-bold text-gray-800 mb-2">{t("home.parentYourChild")}</p>
            <p className="text-sm text-gray-600 mb-3">{t("home.faithIntellectMorals")}</p>
            {!isLoading && (
              <div className="flex flex-col items-center gap-2">
                <Link href="/register">
                  <button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg active:scale-[0.98] transition-all" data-testid="button-register">
                    {t("auth.register")}
                  </button>
                </Link>
                <p className="text-xs text-gray-500">
                  Akoon horay ma u lahayd?{" "}
                  <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold underline">
                    Gal
                  </Link>
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      </div>

      {/* Live Stats Bar - Online Users & Enrolled Students */}
      <div className="mt-6 px-4 max-w-7xl mx-auto lg:px-8">
        <LiveStatsBar />
      </div>

      {/* Stats Section */}
      {isSectionVisible("stats") && (
      <div className="mt-4 px-4 max-w-7xl mx-auto lg:px-8">
        <div className="grid grid-cols-4 gap-3 lg:gap-6">
          <div className="text-center">
            <p className="text-sm text-gray-500 font-medium mb-1">{t("home.stats.courses")}</p>
            <AnimatedCounter value={courses.filter(c => c.isLive).length > 0 ? courses.filter(c => c.isLive).length : 10} />
            <p className="text-xs text-gray-400 mt-1">{t("home.stats.available")}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500 font-medium mb-1">{t("home.stats.lessons")}</p>
            <AnimatedCounter value={allLessons.length > 0 ? allLessons.length : 70} />
            <p className="text-xs text-gray-400 mt-1">{t("home.stats.available")}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500 font-medium mb-1">{t("home.stats.parents")}</p>
            <AnimatedCounter value={parentStats?.count > 0 ? parentStats.count : 8} />
            <p className="text-xs text-gray-400 mt-1">{t("home.stats.inApp")}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500 font-medium mb-1">Telegram</p>
            <AnimatedCounter value={telegramStats?.count > 0 ? telegramStats.count : 9905} />
            <p className="text-xs text-gray-400 mt-1">{t("home.stats.followUs")}</p>
          </div>
        </div>
      </div>
      )}

      {/* Xubin Dahabi ah - Gold Membership Card */}
      {isSectionVisible("gold_membership") && (
      <div className="mt-4 px-4 max-w-7xl mx-auto lg:px-8">
        <div 
          onClick={() => { import("@/lib/api").then(m => m.openSSOLink()); }}
          className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 rounded-2xl p-4 shadow-lg cursor-pointer active:scale-[0.98] transition-transform hover:shadow-xl"
          data-testid="link-gold-membership"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Crown className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-bold text-lg">Xubin Dahabi ah Noqo Maanta 💛</h3>
              <p className="text-white/90 text-sm leading-relaxed">
                Taageer Barnaamijkeena — Booqo barbaarintasan.com
              </p>
            </div>
            <div className="flex-shrink-0 bg-white/20 rounded-lg px-3 py-2">
              <span className="text-white text-sm font-semibold flex items-center gap-1">
                Booqo <ExternalLink className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Learning Groups Card */}
      {isSectionVisible("learning_groups") && (
      <div className="mt-4 px-4 max-w-7xl mx-auto lg:px-8">
        <Link href="/groups">
          <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-700 rounded-2xl p-4 shadow-lg cursor-pointer active:scale-[0.98] transition-transform" data-testid="link-learning-groups">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-white font-bold text-base">👥 Guruubyada Waxbaranaya</h3>
                  <div className="flex-shrink-0 bg-white/20 rounded-lg px-3 py-1">
                    <span className="text-white text-xs font-semibold whitespace-nowrap">Gal Guruubyada</span>
                  </div>
                </div>
                <p className="text-white/80 text-xs leading-relaxed mt-1">
                  Waalidka kale la wadaag fikradahaaga — dhageyso, qor, oo wax baro wadajir ah.
                </p>
              </div>
            </div>
          </div>
        </Link>
      </div>
      )}

      {/* AI Homework Helper Card */}
      {isSectionVisible("homework_helper") && (
      <div className="mt-4 px-4 max-w-7xl mx-auto lg:px-8">
        <Link href="/ai-caawiye">
          <div className="bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 rounded-2xl p-4 shadow-lg cursor-pointer active:scale-[0.98] transition-transform" data-testid="link-ai-caawiye">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Bot className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg mb-1">🤖 AI Caawiye</h3>
                <p className="text-white/80 text-sm leading-relaxed">
                  Ilmahaaga dhibaatooyin ma kala kulantaa oo Talo ma u baahan tahay? AI iyo Ustaad Muuse ayaa diyaar kuugu ah — tarbiyada, laylisyada guriga, iyo wax walba oo ilmahaaga khuseeya.
                </p>
              </div>
              <div className="flex-shrink-0 mt-1 bg-white/20 rounded-lg px-3 py-1">
              <span className="text-white text-sm font-semibold">Tijaabi</span>
            </div>
            </div>
          </div>
        </Link>
      </div>
      )}

      {/* Google Meet Events Section */}
      <MeetEventsSection parent={parent} />

      {/* BSAv.1 Sheeko - Voice Spaces Section (below stats) */}
      <SheekoSection />

      {/* Baraha Waalidiinta - Parent Social Feed Section */}
      <ParentFeedSection />

      {/* Dhambaalka Waalidka - Parent Messages Section */}
      <DhambaalSection />

      {/* Maaweelada Caruurta - Bedtime Stories Section */}
      <MaaweeloSection />


      {/* Getting Started Guide - 5 Steps for New Parents */}
      {isSectionVisible("getting_started") && (
        <GettingStartedGuide 
          isLoggedIn={!!parent} 
          hasCompletedAssessment={hasCompletedAssessment} 
          hasEnrolledCourse={hasEnrolledCourse}
        />
      )}

      {/* Quick Access Features - Services */}
      {isSectionVisible("services") && (
      <div className="mt-6 px-4 max-w-7xl mx-auto lg:px-8">
        <h2 className="text-lg font-bold text-gray-900 mb-3 lg:text-xl">{t("home.otherServices")}</h2>
        <div className="grid grid-cols-3 gap-1.5 lg:grid-cols-6 lg:gap-6">
          <a href="/sheeko" onClick={(e) => { e.preventDefault(); window.location.assign('/sheeko'); }}>
            <div className="flex flex-col items-center p-1.5 lg:p-4 bg-white rounded-xl shadow-sm border border-red-200 active:scale-95 transition-all cursor-pointer min-w-0 relative" data-testid="link-sheeko">
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <div className="w-9 h-9 lg:w-16 lg:h-16 bg-gradient-to-br from-red-400 to-rose-500 rounded-lg lg:rounded-2xl flex items-center justify-center mb-1 lg:mb-3">
                <Radio className="w-4 h-4 lg:w-8 lg:h-8 text-white" />
              </div>
              <span className="text-[10px] lg:text-sm font-bold text-red-600 text-center leading-tight w-full truncate lg:overflow-visible lg:whitespace-normal px-0.5">Sheeko</span>
            </div>
          </a>
          <Link href="/parent-tips">
            <div className="flex flex-col items-center p-1.5 lg:p-4 bg-white rounded-xl shadow-sm border border-orange-200 active:scale-95 transition-all cursor-pointer min-w-0" data-testid="link-parent-tips">
              <div className="w-9 h-9 lg:w-16 lg:h-16 bg-gradient-to-br from-orange-400 to-amber-500 rounded-lg lg:rounded-2xl flex items-center justify-center mb-1 lg:mb-3">
                <Lightbulb className="w-4 h-4 lg:w-8 lg:h-8 text-white" />
              </div>
              <span className="text-[10px] lg:text-sm font-semibold text-gray-800 text-center leading-tight w-full truncate lg:overflow-visible lg:whitespace-normal px-0.5">Horumarka Da'da</span>
            </div>
          </Link>
          <Link href="/milestones">
            <div className="flex flex-col items-center p-1.5 lg:p-4 bg-white rounded-xl shadow-sm border border-gray-100 active:scale-95 transition-all cursor-pointer min-w-0" data-testid="link-milestones">
              <div className="w-9 h-9 lg:w-16 lg:h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg lg:rounded-2xl flex items-center justify-center mb-1 lg:mb-3">
                <Target className="w-4 h-4 lg:w-8 lg:h-8 text-white" />
              </div>
              <span className="text-[10px] lg:text-sm font-semibold text-gray-800 text-center leading-tight w-full truncate lg:overflow-visible lg:whitespace-normal px-0.5">Horumarka ilmaha</span>
            </div>
          </Link>
          <Link href="/resources">
            <div className="flex flex-col items-center p-1.5 lg:p-4 bg-white rounded-xl shadow-sm border border-gray-100 active:scale-95 transition-all cursor-pointer min-w-0" data-testid="link-resources">
              <div className="w-9 h-9 lg:w-16 lg:h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg lg:rounded-2xl flex items-center justify-center mb-1 lg:mb-3">
                <BookOpen className="w-4 h-4 lg:w-8 lg:h-8 text-white" />
              </div>
              <span className="text-[10px] lg:text-sm font-semibold text-gray-800 text-center leading-tight w-full truncate lg:overflow-visible lg:whitespace-normal px-0.5">Maktabada</span>
            </div>
          </Link>
          <Link href="/groups">
            <div className="flex flex-col items-center p-1.5 lg:p-4 bg-white rounded-xl shadow-sm border border-indigo-200 active:scale-95 transition-all cursor-pointer min-w-0" data-testid="link-groups">
              <div className="w-9 h-9 lg:w-16 lg:h-16 bg-gradient-to-br from-indigo-400 to-blue-600 rounded-lg lg:rounded-2xl flex items-center justify-center mb-1 lg:mb-3">
                <UserPlus className="w-4 h-4 lg:w-8 lg:h-8 text-white" />
              </div>
              <span className="text-[10px] lg:text-sm font-semibold text-indigo-700 text-center leading-tight w-full truncate lg:overflow-visible lg:whitespace-normal px-0.5">Guruubada</span>
            </div>
          </Link>
          <Link href="/learning-hub">
            <div className="flex flex-col items-center p-1.5 lg:p-4 bg-white rounded-xl shadow-sm border border-sky-200 active:scale-95 transition-all cursor-pointer min-w-0" data-testid="link-baro">
              <div className="w-9 h-9 lg:w-16 lg:h-16 bg-gradient-to-br from-sky-400 to-cyan-500 rounded-lg lg:rounded-2xl flex items-center justify-center mb-1 lg:mb-3">
                <GraduationCap className="w-4 h-4 lg:w-8 lg:h-8 text-white" />
              </div>
              <span className="text-[10px] lg:text-sm font-semibold text-sky-700 text-center leading-tight w-full truncate lg:overflow-visible lg:whitespace-normal px-0.5">Baro</span>
            </div>
          </Link>
        </div>
      </div>
      )}

      {/* Search Bar */}
      {isSectionVisible("search") && (
      <div className="mx-4 mt-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder={t("home.searchPlaceholder")}
            className="pl-10 pr-10 h-12 rounded-xl border-gray-200 focus:border-blue-400 focus:ring-blue-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowSearch(true)}
            data-testid="input-search"
          />
          {searchQuery && (
            <button 
              onClick={() => { setSearchQuery(""); setShowSearch(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        
        {/* Search Results Dropdown */}
        {showSearch && searchQuery.length >= 2 && searchResults && (searchResults.courses?.length > 0 || searchResults.lessons?.length > 0) && (
          <div className="absolute left-4 right-4 z-50 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 max-h-80 overflow-auto">
            {searchResults.courses?.length > 0 && (
              <div className="p-3 border-b border-gray-100">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">{t("common.courses")}</h4>
                {searchResults.courses.slice(0, 3).map((course: any) => (
                  <div 
                    key={course.id} 
                    onClick={() => { setLocation(`/course/${course.courseId}`); setShowSearch(false); setSearchQuery(""); }}
                    className="p-2 hover:bg-gray-50 rounded-lg cursor-pointer flex items-center gap-3"
                    data-testid={`search-result-course-${course.courseId}`}
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Play className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{course.title}</p>
                      <p className="text-xs text-gray-500">{t("home.course")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {searchResults.lessons?.length > 0 && (
              <div className="p-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">{t("common.lessons")}</h4>
                {searchResults.lessons.slice(0, 5).map((lesson: any) => (
                  <div 
                    key={lesson.id} 
                    onClick={() => { 
                      const course = courses.find(c => c.id === lesson.courseId);
                      if (course) {
                        setLocation(`/course/${course.courseId}/lesson/${lesson.id}`);
                      }
                      setShowSearch(false); 
                      setSearchQuery(""); 
                    }}
                    className="p-2 hover:bg-gray-50 rounded-lg cursor-pointer flex items-center gap-3"
                    data-testid={`search-result-lesson-${lesson.id}`}
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Video className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{lesson.title}</p>
                      <p className="text-xs text-gray-500">{lesson.courseName}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* AI Learning Path Card - Visible to all, but locked for non-registered users */}
      {isSectionVisible("ai_learning") && (
      <div className="mt-4 px-4">
        <p className="text-center text-base text-blue-700 font-semibold italic leading-relaxed mb-3">
          <span className="text-xl">👇</span> {t("home.ctaMessage")} <span className="text-xl">👇</span>
        </p>
        {parent ? (
          <Link href="/assessment">
            <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-4 shadow-lg cursor-pointer active:scale-[0.98] transition-transform" data-testid="link-assessment-card">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold text-lg mb-1">{t("home.aiLearningPath")}</h3>
                  <p className="text-white/80 text-sm">
                    {t("home.aiLearningPathDesc")}
                  </p>
                </div>
                <ChevronRight className="w-6 h-6 text-white/60 flex-shrink-0 mt-1" />
              </div>
            </div>
          </Link>
        ) : (
          <Link href="/register">
            <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-4 shadow-lg cursor-pointer active:scale-[0.98] transition-transform relative overflow-hidden" data-testid="link-assessment-card-locked">
              <div className="absolute top-2 right-2 bg-white/30 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full">
                🔒 Is-Diiwaangeli
              </div>
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold text-lg mb-1">{t("home.aiLearningPath")}</h3>
                  <p className="text-white/80 text-sm">
                    {t("home.aiLearningPathDesc")}
                  </p>
                </div>
                <ChevronRight className="w-6 h-6 text-white/60 flex-shrink-0 mt-1" />
              </div>
            </div>
          </Link>
        )}
      </div>
      )}

      {/* AI Recommended Courses - Show courses recommended by the AI Learning Path */}
      {parent && <RecommendedCoursesSection />}

      {/* Daily Tip Card */}
      {isSectionVisible("daily_tip") && <DailyTipCard />}
      
      {/* AI Generated Tip Card */}
      {isSectionVisible("ai_tip") && <AiTipCard />}

      {/* Talooyinkeena Maalin kasta ah - Fresh AI Parent Tips (last 3 hours) */}
      <HomepageTipsSection />

      {/* General Age Courses with Filter Tabs */}
      {isSectionVisible("general_courses") && (
      <div className="mt-6 px-4">
        <h3 className="text-lg font-bold text-gray-900 mb-3">{t("home.generalAgeCourses")}</h3>
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
          {ageFilters.map((filter) => (
            <button
              key={filter.value || "all"}
              onClick={() => setSelectedAgeFilter(filter.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedAgeFilter === filter.value
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              data-testid={`filter-age-${filter.value || "all"}`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        {/* Filtered General Courses */}
        <div className="mt-2">
          {generalCourses.length > 0 ? (
            <CourseCarousel>
              {generalCourses.map((course) => (
                <div key={course.id} style={{ scrollSnapAlign: "start" }}>
                  <CourseCard course={course} onComingSoonClick={setComingSoonCourse} />
                </div>
              ))}
            </CourseCarousel>
          ) : (
            <p className="text-gray-500 text-center py-4">Ma jiraan koorsooyin da'dan ah.</p>
          )}
        </div>
      </div>
      )}


      {/* Personalized Recommendations Section - HIDDEN: Only 2 courses available for now */}
      {/* TODO: Unhide when more courses are available in 2026 */}
      {false && recommendations.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-4 px-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-amber-500 rounded-lg flex items-center justify-center">
                <Star className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">
                {recommendationReason === "personalized" 
                  ? t("home.personalizedForYou")
                  : recommendationReason === "discover"
                    ? t("home.newCourses")
                    : t("home.popularCourses")}
              </h2>
            </div>
          </div>
          <CourseCarousel>
            {recommendations.map((course: Course) => (
              <div key={course.id} style={{ scrollSnapAlign: "start" }}>
                <CourseCard course={course} onComingSoonClick={setComingSoonCourse} />
              </div>
            ))}
          </CourseCarousel>
        </div>
      )}

      {/* Special Courses Section */}
      {isSectionVisible("special_courses") && (
      <div className="mt-6 px-4">
        <h3 className="text-lg font-bold text-gray-900 mb-3">{t("home.specialCourses")}</h3>
        <CourseCarousel>
          {specialCourses.map((course) => (
            <div key={course.id} style={{ scrollSnapAlign: "start" }}>
              <CourseCard course={course} onComingSoonClick={setComingSoonCourse} />
            </div>
          ))}
        </CourseCarousel>
      </div>
      )}

      {/* Parent Feedback Section */}
      {isSectionVisible("testimonials") && parentFeedback.length > 0 && (
        <div className="mx-4 mt-6 bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 rounded-3xl p-6 border border-sky-200 shadow-sm">
          <div className="text-center mb-4">
            <h3 className="font-bold text-xl text-gray-900 mb-2">{t("home.parentTestimonials")}</h3>
            <p className="text-gray-600 text-base font-medium">{t("home.parentingCommunity")}</p>
          </div>
          <a 
            href="https://t.me/+TD42GjNOkzWIZXSZ" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-16 h-16 mx-auto bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-[18px] shadow-lg flex items-center justify-center active:scale-[0.95] transition-all mb-4"
            data-testid="link-join-telegram"
          >
            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.751-.244-1.349-.374-1.297-.789.027-.216.324-.437.892-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.141.121.099.154.232.169.327.016.096.035.311.02.481z"/>
            </svg>
          </a>
          
          <RandomTestimonial feedbackList={parentFeedback} />
          
          <Link href="/testimonials">
            <button className="w-full mt-4 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-2xl text-white font-bold text-lg shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-300 animate-pulse hover:animate-none" data-testid="link-all-testimonials">
              <span className="flex items-center justify-center gap-2">
                Arag Waayo-aragnimada Waalidka
                <span className="text-xl">👍❤️👏🤲</span>
              </span>
            </button>
          </Link>
        </div>
      )}

      

      {/* Ogeeysiisyada - Announcements Section (hoose, nav-ka kor) */}
      {isSectionVisible("announcements") && announcements.length > 0 && (
        <div className="mx-4 mt-6 mb-6" data-testid="announcements-section">
          <RandomAnnouncement announcements={announcements} />
        </div>
      )}

      {/* SEO Content Section - Crawlable content for search engines and AI */}
      <footer className="mx-4 mt-8 mb-24 lg:mb-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 max-w-7xl lg:mx-auto lg:p-8" role="contentinfo">
        <article className="text-center">
          <h2 className="text-lg font-bold text-gray-800 mb-3">{t("footer.title")}</h2>
          <p 
            className="text-sm text-gray-600 leading-relaxed mb-4"
            dangerouslySetInnerHTML={{ __html: t("footer.paragraph1") }}
          />
          <p 
            className="text-sm text-gray-600 leading-relaxed mb-4"
            dangerouslySetInnerHTML={{ __html: t("footer.paragraph2") }}
          />
          <section className="mt-4 pt-4 border-t border-blue-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">{t("footer.helpTitle")}</h3>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>{t("footer.help1")}</li>
              <li>{t("footer.help2")}</li>
              <li>{t("footer.help3")}</li>
              <li>{t("footer.help4")}</li>
            </ul>
          </section>
          <p className="text-xs text-gray-400 mt-4">
            {t("footer.copyright")}
          </p>
          
          {/* Legal Links for App Store Compliance - Enhanced Visibility */}
          <div className="mt-8 border-t border-blue-200 pt-8 pb-4">
            <Link href="/legal">
              <button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all active:scale-[0.98] text-sm uppercase tracking-wider mb-4">
                📋 All Legal Documents / Dhamaan Sharciyada
              </button>
            </Link>
            <div className="grid grid-cols-3 gap-2">
              <Link href="/terms">
                <button className="w-full bg-white hover:bg-blue-50 text-blue-700 font-medium py-2 px-2 rounded-lg border border-blue-100 shadow-sm transition-all active:scale-[0.98] text-[10px] uppercase tracking-wider">
                  Terms
                </button>
              </Link>
              <Link href="/privacy-policy">
                <button className="w-full bg-white hover:bg-blue-50 text-blue-700 font-medium py-2 px-2 rounded-lg border border-blue-100 shadow-sm transition-all active:scale-[0.98] text-[10px] uppercase tracking-wider">
                  Privacy
                </button>
              </Link>
              <Link href="/community-guidelines">
                <button className="w-full bg-white hover:bg-blue-50 text-blue-700 font-medium py-2 px-2 rounded-lg border border-blue-100 shadow-sm transition-all active:scale-[0.98] text-[10px] uppercase tracking-wider">
                  Guidelines
                </button>
              </Link>
            </div>
          </div>

          <p className="text-sm font-semibold text-gray-600 mt-8">{t("footer.ownerName")}</p>
          <img src="/signature.png" alt={t("footer.signatureAlt")} className="h-8 mx-auto mt-1" />
        </article>
      </footer>

      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("auth.logoutConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("auth.logoutConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.no")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-red-600 hover:bg-red-700">
              {t("auth.yesLogout")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FlashcardModal isOpen={showFlashcards} onClose={() => setShowFlashcards(false)} />

      {/* Coming Soon Modal - rendered at top level to avoid overflow issues */}
      {comingSoonCourse && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4" onClick={() => setComingSoonCourse(null)}>
          <div 
            className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 p-4 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-white font-bold text-lg">{t("home.comingSoon.title")}</h3>
            </div>
            <div className="p-6 text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-3">{comingSoonCourse.title}</h2>
              <p className="text-gray-600 mb-4 leading-relaxed">
                {t("home.comingSoon.dateInfo")}
              </p>
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200 mb-4">
                <p className="text-sm text-gray-700">
                  {t("home.comingSoonMessage")}
                </p>
              </div>
              <button
                onClick={() => setComingSoonCourse(null)}
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold py-3 rounded-xl shadow-lg active:scale-[0.98] transition-all"
                data-testid="button-close-coming-soon"
              >
                {t("home.comingSoon.okButton")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
