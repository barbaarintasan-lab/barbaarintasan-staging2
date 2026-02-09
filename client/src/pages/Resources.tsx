import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Download, FileText, Image, Headphones, Video, X, ExternalLink, BookOpen, Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Cloud, FolderOpen, Play, Pause, SkipBack, SkipForward, Volume2, BookOpenText, List, Eye, EyeOff } from "lucide-react";
import { Link } from "wouter";
import { useState, useCallback, useRef, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import { Dialog, DialogContent, DialogContentFullscreen } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Document, Page, pdfjs } from "react-pdf";
import { useParentAuth } from "@/contexts/ParentAuthContext";
import { useTranslation } from "react-i18next";
import { useQuranText, useAyahSync } from "@/hooks/useQuranText";
import MushafFlipbook from "@/components/MushafFlipbook";
import PrayerTimes from "@/components/PrayerTimes";
import SheekoRecordingsSection from "@/components/SheekoRecordingsSection";
import BedtimeStoriesArchive from "@/components/BedtimeStoriesArchive";

const QURAN_SURAHS = [
  { number: 1, name: "Al-Faatixa", arabicName: "الفاتحة", verses: 7 },
  { number: 2, name: "Al-Baqarah", arabicName: "البقرة", verses: 286 },
  { number: 3, name: "Aal-Imraan", arabicName: "آل عمران", verses: 200 },
  { number: 4, name: "An-Nisaa", arabicName: "النساء", verses: 176 },
  { number: 5, name: "Al-Maaidah", arabicName: "المائدة", verses: 120 },
  { number: 6, name: "Al-Ancaam", arabicName: "الأنعام", verses: 165 },
  { number: 7, name: "Al-Acraaf", arabicName: "الأعراف", verses: 206 },
  { number: 8, name: "Al-Anfaal", arabicName: "الأنفال", verses: 75 },
  { number: 9, name: "At-Tawbah", arabicName: "التوبة", verses: 129 },
  { number: 10, name: "Yuunus", arabicName: "يونس", verses: 109 },
  { number: 11, name: "Huud", arabicName: "هود", verses: 123 },
  { number: 12, name: "Yuusuf", arabicName: "يوسف", verses: 111 },
  { number: 13, name: "Ar-Racd", arabicName: "الرعد", verses: 43 },
  { number: 14, name: "Ibraahiim", arabicName: "ابراهيم", verses: 52 },
  { number: 15, name: "Al-Xijr", arabicName: "الحجر", verses: 99 },
  { number: 16, name: "An-Naxl", arabicName: "النحل", verses: 128 },
  { number: 17, name: "Al-Israa", arabicName: "الإسراء", verses: 111 },
  { number: 18, name: "Al-Kahf", arabicName: "الكهف", verses: 110 },
  { number: 19, name: "Maryam", arabicName: "مريم", verses: 98 },
  { number: 20, name: "Daa Haa", arabicName: "طه", verses: 135 },
  { number: 21, name: "Al-Anbiyaa", arabicName: "الأنبياء", verses: 112 },
  { number: 22, name: "Al-Xajj", arabicName: "الحج", verses: 78 },
  { number: 23, name: "Al-Muminuun", arabicName: "المؤمنون", verses: 118 },
  { number: 24, name: "An-Nuur", arabicName: "النور", verses: 64 },
  { number: 25, name: "Al-Furqaan", arabicName: "الفرقان", verses: 77 },
  { number: 26, name: "Ash-Shucara", arabicName: "الشعراء", verses: 227 },
  { number: 27, name: "An-Naml", arabicName: "النمل", verses: 93 },
  { number: 28, name: "Al-Qasas", arabicName: "القصص", verses: 88 },
  { number: 29, name: "Al-Cankabuut", arabicName: "العنكبوت", verses: 69 },
  { number: 30, name: "Ar-Ruum", arabicName: "الروم", verses: 60 },
  { number: 31, name: "Luqmaan", arabicName: "لقمان", verses: 34 },
  { number: 32, name: "As-Sajdah", arabicName: "السجدة", verses: 30 },
  { number: 33, name: "Al-Axzaab", arabicName: "الأحزاب", verses: 73 },
  { number: 34, name: "Saba", arabicName: "سبإ", verses: 54 },
  { number: 35, name: "Faatir", arabicName: "فاطر", verses: 45 },
  { number: 36, name: "Yaa Siin", arabicName: "يس", verses: 83 },
  { number: 37, name: "As-Saaffaat", arabicName: "الصافات", verses: 182 },
  { number: 38, name: "Saad", arabicName: "ص", verses: 88 },
  { number: 39, name: "Az-Zumar", arabicName: "الزمر", verses: 75 },
  { number: 40, name: "Gaafir", arabicName: "غافر", verses: 85 },
  { number: 41, name: "Fussilat", arabicName: "فصلت", verses: 54 },
  { number: 42, name: "Ash-Shuuraa", arabicName: "الشورى", verses: 53 },
  { number: 43, name: "Az-Zukhruf", arabicName: "الزخرف", verses: 89 },
  { number: 44, name: "Ad-Dukhaan", arabicName: "الدخان", verses: 59 },
  { number: 45, name: "Al-Jaathiyah", arabicName: "الجاثية", verses: 37 },
  { number: 46, name: "Al-Axqaaf", arabicName: "الأحقاف", verses: 35 },
  { number: 47, name: "Muxammad", arabicName: "محمد", verses: 38 },
  { number: 48, name: "Al-Fatx", arabicName: "الفتح", verses: 29 },
  { number: 49, name: "Al-Xujuraat", arabicName: "الحجرات", verses: 18 },
  { number: 50, name: "Qaaf", arabicName: "ق", verses: 45 },
  { number: 51, name: "Adh-Dhaariyaat", arabicName: "الذاريات", verses: 60 },
  { number: 52, name: "At-Tuur", arabicName: "الطور", verses: 49 },
  { number: 53, name: "An-Najm", arabicName: "النجم", verses: 62 },
  { number: 54, name: "Al-Qamar", arabicName: "القمر", verses: 55 },
  { number: 55, name: "Ar-Raxmaan", arabicName: "الرحمن", verses: 78 },
  { number: 56, name: "Al-Waaqicah", arabicName: "الواقعة", verses: 96 },
  { number: 57, name: "Al-Xadiid", arabicName: "الحديد", verses: 29 },
  { number: 58, name: "Al-Mujaadilah", arabicName: "المجادلة", verses: 22 },
  { number: 59, name: "Al-Xashr", arabicName: "الحشر", verses: 24 },
  { number: 60, name: "Al-Mumtaxanah", arabicName: "الممتحنة", verses: 13 },
  { number: 61, name: "As-Saff", arabicName: "الصف", verses: 14 },
  { number: 62, name: "Al-Jumucah", arabicName: "الجمعة", verses: 11 },
  { number: 63, name: "Al-Munaafiquun", arabicName: "المنافقون", verses: 11 },
  { number: 64, name: "At-Taghaabun", arabicName: "التغابن", verses: 18 },
  { number: 65, name: "At-Talaaq", arabicName: "الطلاق", verses: 12 },
  { number: 66, name: "At-Taxriim", arabicName: "التحريم", verses: 12 },
  { number: 67, name: "Al-Mulk", arabicName: "الملك", verses: 30 },
  { number: 68, name: "Al-Qalam", arabicName: "القلم", verses: 52 },
  { number: 69, name: "Al-Xaaqqah", arabicName: "الحاقة", verses: 52 },
  { number: 70, name: "Al-Macaarij", arabicName: "المعارج", verses: 44 },
  { number: 71, name: "Nuux", arabicName: "نوح", verses: 28 },
  { number: 72, name: "Al-Jinn", arabicName: "الجن", verses: 28 },
  { number: 73, name: "Al-Muzzammil", arabicName: "المزمل", verses: 20 },
  { number: 74, name: "Al-Muddaththir", arabicName: "المدثر", verses: 56 },
  { number: 75, name: "Al-Qiyaamah", arabicName: "القيامة", verses: 40 },
  { number: 76, name: "Al-Insaan", arabicName: "الانسان", verses: 31 },
  { number: 77, name: "Al-Mursalaat", arabicName: "المرسلات", verses: 50 },
  { number: 78, name: "An-Naba", arabicName: "النبإ", verses: 40 },
  { number: 79, name: "An-Naazicaat", arabicName: "النازعات", verses: 46 },
  { number: 80, name: "Cabasa", arabicName: "عبس", verses: 42 },
  { number: 81, name: "At-Takwiir", arabicName: "التكوير", verses: 29 },
  { number: 82, name: "Al-Infitaar", arabicName: "الإنفطار", verses: 19 },
  { number: 83, name: "Al-Mutaffifiin", arabicName: "المطففين", verses: 36 },
  { number: 84, name: "Al-Inshiqaaq", arabicName: "الإنشقاق", verses: 25 },
  { number: 85, name: "Al-Buruuj", arabicName: "البروج", verses: 22 },
  { number: 86, name: "At-Taariq", arabicName: "الطارق", verses: 17 },
  { number: 87, name: "Al-Aclaa", arabicName: "الأعلى", verses: 19 },
  { number: 88, name: "Al-Gaashiyah", arabicName: "الغاشية", verses: 26 },
  { number: 89, name: "Al-Fajr", arabicName: "الفجر", verses: 30 },
  { number: 90, name: "Al-Balad", arabicName: "البلد", verses: 20 },
  { number: 91, name: "Ash-Shams", arabicName: "الشمس", verses: 15 },
  { number: 92, name: "Al-Layl", arabicName: "الليل", verses: 21 },
  { number: 93, name: "Ad-Duxaa", arabicName: "الضحى", verses: 11 },
  { number: 94, name: "Ash-Sharx", arabicName: "الشرح", verses: 8 },
  { number: 95, name: "At-Tiin", arabicName: "التين", verses: 8 },
  { number: 96, name: "Al-Calaq", arabicName: "العلق", verses: 19 },
  { number: 97, name: "Al-Qadr", arabicName: "القدر", verses: 5 },
  { number: 98, name: "Al-Bayyinah", arabicName: "البينة", verses: 8 },
  { number: 99, name: "Az-Zalzalah", arabicName: "الزلزلة", verses: 8 },
  { number: 100, name: "Al-Caadiyaat", arabicName: "العاديات", verses: 11 },
  { number: 101, name: "Al-Qaaricah", arabicName: "القارعة", verses: 11 },
  { number: 102, name: "At-Takaathur", arabicName: "التكاثر", verses: 8 },
  { number: 103, name: "Al-Casr", arabicName: "العصر", verses: 3 },
  { number: 104, name: "Al-Humazah", arabicName: "الهمزة", verses: 9 },
  { number: 105, name: "Al-Fiil", arabicName: "الفيل", verses: 5 },
  { number: 106, name: "Quraysh", arabicName: "قريش", verses: 4 },
  { number: 107, name: "Al-Maacuun", arabicName: "الماعون", verses: 7 },
  { number: 108, name: "Al-Kawthar", arabicName: "الكوثر", verses: 3 },
  { number: 109, name: "Al-Kaafiruun", arabicName: "الكافرون", verses: 6 },
  { number: 110, name: "An-Nasr", arabicName: "النصر", verses: 3 },
  { number: 111, name: "Al-Masad", arabicName: "المسد", verses: 5 },
  { number: 112, name: "Al-Ikhlaas", arabicName: "الإخلاص", verses: 4 },
  { number: 113, name: "Al-Falaq", arabicName: "الفلق", verses: 5 },
  { number: 114, name: "An-Naas", arabicName: "الناس", verses: 6 },
];

// Surah start pages in Madinah Mushaf (604 pages total)
const SURAH_START_PAGES: Record<number, number> = {
  1: 1, 2: 2, 3: 50, 4: 77, 5: 106, 6: 128, 7: 151, 8: 177, 9: 187, 10: 208,
  11: 221, 12: 235, 13: 249, 14: 255, 15: 262, 16: 267, 17: 282, 18: 293, 19: 305, 20: 312,
  21: 322, 22: 332, 23: 342, 24: 350, 25: 359, 26: 367, 27: 377, 28: 385, 29: 396, 30: 404,
  31: 411, 32: 415, 33: 418, 34: 428, 35: 434, 36: 440, 37: 446, 38: 453, 39: 458, 40: 467,
  41: 477, 42: 483, 43: 489, 44: 496, 45: 499, 46: 502, 47: 507, 48: 511, 49: 515, 50: 518,
  51: 520, 52: 523, 53: 526, 54: 528, 55: 531, 56: 534, 57: 537, 58: 542, 59: 545, 60: 549,
  61: 551, 62: 553, 63: 554, 64: 556, 65: 558, 66: 560, 67: 562, 68: 564, 69: 566, 70: 568,
  71: 570, 72: 572, 73: 574, 74: 575, 75: 577, 76: 578, 77: 580, 78: 582, 79: 583, 80: 585,
  81: 586, 82: 587, 83: 587, 84: 589, 85: 590, 86: 591, 87: 591, 88: 592, 89: 593, 90: 594,
  91: 595, 92: 595, 93: 596, 94: 596, 95: 597, 96: 597, 97: 598, 98: 598, 99: 599, 100: 599,
  101: 600, 102: 600, 103: 601, 104: 601, 105: 601, 106: 602, 107: 602, 108: 602, 109: 603, 110: 603,
  111: 603, 112: 604, 113: 604, 114: 604
};

// Get the surah and end page for navigation
const getSurahEndPage = (surahNumber: number): number => {
  if (surahNumber === 114) return 604;
  return SURAH_START_PAGES[surahNumber + 1] - 1;
};

interface QuranReciter {
  id: string;
  name: string;
  nameSomali: string | null;
  audioBaseUrl: string;
  imageUrl: string | null;
  isActive: boolean;
  order: number;
}

interface Hadith {
  id: string;
  number: number;
  arabicText: string;
  somaliText: string;
  source: string | null;
  narrator: string | null;
  topic: string | null;
  isActive: boolean;
}

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Resource {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileType: string;
  ageRange: string | null;
  category: string | null;
  downloadCount: number;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
}

const categoryKeys = ["all", "guide", "checklist", "infographic", "audio"] as const;

const fileTypeIcons: Record<string, React.ReactNode> = {
  pdf: <FileText className="w-6 h-6" />,
  image: <Image className="w-6 h-6" />,
  audio: <Headphones className="w-6 h-6" />,
  video: <Video className="w-6 h-6" />,
};

const fileTypeColors: Record<string, string> = {
  pdf: "from-red-400 to-red-500",
  image: "from-green-400 to-emerald-500",
  audio: "from-purple-400 to-pink-500",
  video: "from-blue-400 to-indigo-500",
};

type LibrarySection = "main" | "quran" | "hadith" | "siirada" | "duas" | "parenting-books" | "children-books" | "prayer-times" | "sheeko-recordings" | "bedtime-stories" | "parent-messages" | "meet-recordings";

export default function Resources() {
  const { t } = useTranslation();
  const { parent } = useParentAuth();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [selectedDriveFile, setSelectedDriveFile] = useState<DriveFile | null>(null);
  const [driveViewerMode, setDriveViewerMode] = useState<"options" | "reading">("options");
  const [viewerMode, setViewerMode] = useState<"options" | "reading">("options");
  const [isLoading, setIsLoading] = useState(false);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pdfError, setPdfError] = useState(false);
  
  // Persist active section in URL hash so page refresh stays on same section
  const getInitialSection = (): LibrarySection => {
    if (typeof window === "undefined") return "main";
    try {
      const hash = window.location.hash.replace('#', '') as LibrarySection;
      const validSections: LibrarySection[] = ["main", "quran", "hadith", "siirada", "duas", "parenting-books", "children-books", "prayer-times", "sheeko-recordings", "bedtime-stories", "parent-messages", "meet-recordings"];
      return validSections.includes(hash) ? hash : "main";
    } catch {
      return "main";
    }
  };
  
  const [activeSection, setActiveSectionState] = useState<LibrarySection>(() => getInitialSection());
  
  const setActiveSection = (section: LibrarySection) => {
    setActiveSectionState(section);
    window.location.hash = section === "main" ? "" : section;
    // Reset focus mode if leaving quran
    if (section !== "quran") {
      setIsFocusMode(false);
    }
  };
  const [selectedReciter, setSelectedReciter] = useState<QuranReciter | null>(null);
  const [currentSurah, setCurrentSurah] = useState<typeof QURAN_SURAHS[0] | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedHadithBook, setSelectedHadithBook] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [reciterAudioFiles, setReciterAudioFiles] = useState<any[]>([]);
  const [loadingAudioFiles, setLoadingAudioFiles] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const [showQuranText, setShowQuranText] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [autoPlayNext, setAutoPlayNext] = useState(false);
  const [pendingAutoPlay, setPendingAutoPlay] = useState(false);
  const ayahRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [currentMushafPage, setCurrentMushafPage] = useState<number>(1);
  const [mushafImageLoading, setMushafImageLoading] = useState(true);
  const lastScrolledAyah = useRef<number>(-1);
  
  // Siirada section state (moved here to ensure consistent hook order)
  const [selectedSiiradaBook, setSelectedSiiradaBook] = useState<{
    id: string;
    name: string;
    author: string;
    description: string;
    icon: string;
    color: string;
    url: string;
  } | null>(null);
  
  // Duas section state (moved here to ensure consistent hook order)
  const [selectedDuaCategory, setSelectedDuaCategory] = useState<string | null>(null);
  const [currentDuaIndex, setCurrentDuaIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  // Focus mode for distraction-free Quran reading
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showFocusControls, setShowFocusControls] = useState(true);
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Update hash for BottomNav to detect focus mode
  useEffect(() => {
    if (activeSection === "quran") {
      window.location.hash = isFocusMode ? "quran-focus" : "quran";
    }
  }, [isFocusMode, activeSection]);
  
  // Auto-activate focus mode when Quran is playing with Mushaf visible
  useEffect(() => {
    if (isPlaying && currentSurah && showQuranText) {
      setIsFocusMode(true);
      setShowFocusControls(true);
      // Auto-hide controls after 4 seconds
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
      focusTimeoutRef.current = setTimeout(() => {
        setShowFocusControls(false);
      }, 4000);
    } else {
      // Exit focus mode when playback stops or Mushaf is hidden
      setIsFocusMode(false);
    }
    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    };
  }, [isPlaying, currentSurah, showQuranText]);
  
  const { surah: quranTextData, loading: loadingQuranText } = useQuranText(currentSurah?.number || null);
  const { currentAyahIndex, seekToAyah } = useAyahSync(audioRef, quranTextData, isPlaying);
  
  // Update Mushaf page when surah changes
  useEffect(() => {
    if (currentSurah) {
      const startPage = SURAH_START_PAGES[currentSurah.number];
      setCurrentMushafPage(startPage);
      setMushafImageLoading(true);
    }
  }, [currentSurah?.number]);
  
  // Sync Mushaf page with current ayah during playback
  useEffect(() => {
    if (quranTextData && quranTextData.ayahs[currentAyahIndex] && isPlaying) {
      const ayahPage = quranTextData.ayahs[currentAyahIndex].page;
      if (ayahPage && ayahPage !== currentMushafPage) {
        setCurrentMushafPage(ayahPage);
        setMushafImageLoading(true);
      }
    }
  }, [currentAyahIndex, quranTextData, isPlaying]);
  
  useEffect(() => {
    // Only scroll if ayah changed and autoScroll is enabled
    if (autoScroll && showQuranText && currentAyahIndex !== lastScrolledAyah.current && ayahRefs.current[currentAyahIndex]) {
      lastScrolledAyah.current = currentAyahIndex;
      // Use setTimeout to debounce rapid ayah changes
      const timeout = setTimeout(() => {
        ayahRefs.current[currentAyahIndex]?.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [currentAyahIndex, autoScroll, showQuranText]);
  
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      // Only auto-play next surah if autoPlayNext is enabled
      if (autoPlayNext && currentSurah && currentSurah.number < 114) {
        const nextSurah = QURAN_SURAHS.find(s => s.number === currentSurah.number + 1);
        if (nextSurah) {
          // Reset scroll position for new surah
          lastScrolledAyah.current = -1;
          setCurrentSurah(nextSurah);
          setPendingAutoPlay(true);
        }
      }
    };
    
    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);
    
    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [currentSurah, autoPlayNext]);
  
  // Reciters now use direct CDN URLs - no need to fetch file lists
  useEffect(() => {
    setReciterAudioFiles([]);
    setLoadingAudioFiles(false);
  }, [selectedReciter]);

  // Handle auto-play next surah
  useEffect(() => {
    if (pendingAutoPlay && currentSurah && selectedReciter) {
      setPendingAutoPlay(false);
      const baseUrl = selectedReciter.audioBaseUrl.endsWith("/") 
        ? selectedReciter.audioBaseUrl 
        : selectedReciter.audioBaseUrl + "/";
      const audioUrl = `${baseUrl}${currentSurah.number.toString().padStart(3, "0")}.mp3`;
      console.log(`[Quran] Auto-playing next surah ${currentSurah.number} from: ${audioUrl}`);
      setCurrentAudioUrl(audioUrl);
      setAudioLoading(true);
    }
  }, [pendingAutoPlay, currentSurah, selectedReciter]);

  const findAudioFileForSurah = (surahNumber: number) => {
    // Find audio file that matches the surah number in its name
    // Try multiple patterns since different reciters use different naming
    const paddedNum3 = surahNumber.toString().padStart(3, "0");
    const paddedNum2 = surahNumber.toString().padStart(2, "0");
    const plainNum = surahNumber.toString();
    const surahName = QURAN_SURAHS[surahNumber - 1]?.name.toLowerCase() || "";
    const arabicName = QURAN_SURAHS[surahNumber - 1]?.arabicName || "";
    
    // Sort files by name to ensure consistent ordering
    const sortedFiles = [...reciterAudioFiles].sort((a, b) => a.name.localeCompare(b.name));
    
    // First try: exact padded match at start of filename (e.g., "001.mp3", "001 - Al-Fatiha.mp3")
    let match = sortedFiles.find(file => {
      const name = file.name.toLowerCase();
      return name.startsWith(paddedNum3) || 
             name.startsWith(`${paddedNum3}.`) || 
             name.startsWith(`${paddedNum3} `) ||
             name.startsWith(`${paddedNum3}_`) ||
             name.startsWith(`${paddedNum3}-`);
    });
    if (match) return match;
    
    // Second try: 2-digit padded (e.g., "01.mp3")
    match = sortedFiles.find(file => {
      const name = file.name.toLowerCase();
      return name.startsWith(paddedNum2) && !name.startsWith(paddedNum2 + "0");
    });
    if (match) return match;
    
    // Third try: contains the number with word boundary patterns
    match = sortedFiles.find(file => {
      const name = file.name.toLowerCase();
      const patterns = [
        new RegExp(`\\b${paddedNum3}\\b`),
        new RegExp(`\\b${plainNum}\\b`),
        new RegExp(`^${plainNum}[^0-9]`),
        new RegExp(`[^0-9]${plainNum}[^0-9]`),
      ];
      return patterns.some(p => p.test(name));
    });
    if (match) return match;
    
    // Fourth try: surah name in any language
    match = sortedFiles.find(file => {
      const name = file.name.toLowerCase();
      return name.includes(surahName) || file.name.includes(arabicName);
    });
    if (match) return match;
    
    // Fifth try: if files are numbered sequentially, use index
    if (sortedFiles.length >= 114) {
      return sortedFiles[surahNumber - 1];
    }
    
    return null;
  };
  
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  
  const playSurah = async (surah: typeof QURAN_SURAHS[0]) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setCurrentSurah(surah);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setAudioLoading(true);
    setAudioError(null);
    setShowQuranText(true);
    lastScrolledAyah.current = -1;

    if (selectedReciter) {
      // Direct CDN URLs (mp3quran.net style: baseUrl + 001.mp3)
      const baseUrl = selectedReciter.audioBaseUrl.endsWith("/") 
        ? selectedReciter.audioBaseUrl 
        : selectedReciter.audioBaseUrl + "/";
      const audioUrl = `${baseUrl}${surah.number.toString().padStart(3, "0")}.mp3`;
      console.log(`[Quran] Playing surah ${surah.number} from: ${audioUrl}`);
      setCurrentAudioUrl(audioUrl);
    } else {
      setAudioError("Fadlan dooro shiikh");
      setAudioLoading(false);
    }
  };
  
  useEffect(() => {
    if (currentSurah && currentAudioUrl && audioRef.current) {
      const audio = audioRef.current;
      
      const onCanPlay = () => {
        setAudioLoading(false);
        audio.play().then(() => {
          setIsPlaying(true);
        }).catch((err) => {
          console.log("Autoplay blocked, user must click play:", err);
          setIsPlaying(false);
        });
      };
      
      const onError = (e: Event) => {
        const audioEl = e.target as HTMLAudioElement;
        const error = audioEl?.error;
        console.error("[Quran] Audio error:", e, "Error code:", error?.code, "Message:", error?.message);
        setAudioLoading(false);
        
        // Provide more specific error messages
        if (error) {
          switch(error.code) {
            case MediaError.MEDIA_ERR_ABORTED:
              setAudioError("Codka waa la joojiyay");
              break;
            case MediaError.MEDIA_ERR_NETWORK:
              setAudioError("Khalad network - hubso internet-kaaga");
              break;
            case MediaError.MEDIA_ERR_DECODE:
              setAudioError("Codka format-kiisu ma shaqaynayo");
              break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              setAudioError("Codkan ma la taageerin");
              break;
            default:
              setAudioError("Codka ma shaqaynayo");
          }
        } else {
          setAudioError("Codka ma shaqaynayo");
        }
      };
      
      audio.addEventListener("canplay", onCanPlay, { once: true });
      audio.addEventListener("error", onError, { once: true });
      
      audio.load();
      
      return () => {
        audio.removeEventListener("canplay", onCanPlay);
        audio.removeEventListener("error", onError);
      };
    }
  }, [currentAudioUrl]);
  
  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };
  
  const skipPrev = () => {
    if (!currentSurah || currentSurah.number <= 1) return;
    const prevSurah = QURAN_SURAHS.find(s => s.number === currentSurah.number - 1);
    if (prevSurah) playSurah(prevSurah);
  };
  
  const skipNext = () => {
    if (!currentSurah || currentSurah.number >= 114) return;
    const nextSurah = QURAN_SURAHS.find(s => s.number === currentSurah.number + 1);
    if (nextSurah) playSurah(nextSurah);
  };
  
  const seekTo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };
  
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    setPdfError(false);
  }, []);

  const onDocumentLoadError = useCallback(() => {
    setIsLoading(false);
    setPdfError(true);
  }, []);

  const { data: resources = [] } = useQuery<Resource[]>({
    queryKey: ["resources", selectedCategory],
    queryFn: async () => {
      const url = selectedCategory 
        ? `/api/resources?category=${selectedCategory}` 
        : "/api/resources";
      const res = await fetch(url);
      return res.json();
    },
  });

  const { data: quranReciters = [] } = useQuery<QuranReciter[]>({
    queryKey: ["quranReciters"],
    queryFn: async () => {
      const res = await fetch("/api/quran-reciters");
      if (!res.ok) throw new Error("Failed to fetch reciters");
      return res.json();
    },
    enabled: !!parent,
  });

  useEffect(() => {
    if (quranReciters.length > 0 && !selectedReciter) {
      setSelectedReciter(quranReciters[0]);
    }
  }, [quranReciters, selectedReciter]);

  const { data: hadithsList = [] } = useQuery<Hadith[]>({
    queryKey: ["hadiths"],
    queryFn: async () => {
      const res = await fetch("/api/hadiths");
      if (!res.ok) throw new Error("Failed to fetch hadiths");
      return res.json();
    },
    enabled: !!parent,
  });

  const { data: parentingBooks = [], isLoading: parentingBooksLoading } = useQuery<DriveFile[]>({
    queryKey: ["parentingBooks"],
    queryFn: async () => {
      const res = await fetch("/api/drive/books/parenting");
      if (!res.ok) throw new Error("Failed to fetch parenting books");
      return res.json();
    },
    enabled: !!parent && activeSection === "parenting-books",
  });

  const { data: childrenBooks = [], isLoading: childrenBooksLoading } = useQuery<DriveFile[]>({
    queryKey: ["childrenBooks"],
    queryFn: async () => {
      const res = await fetch("/api/drive/books/children");
      if (!res.ok) throw new Error("Failed to fetch children books");
      return res.json();
    },
    enabled: !!parent && activeSection === "children-books",
  });

  const { data: driveFiles = [], isLoading: driveLoading, isError: driveError } = useQuery<DriveFile[]>({
    queryKey: ["driveFiles"],
    queryFn: async () => {
      const res = await fetch("/api/drive/maktabada");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!parent,
  });

  const downloadMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/resources/${id}/download`, { method: "POST" });
    },
  });

  const handleDownload = async (resource: Resource) => {
    downloadMutation.mutate(resource.id);
    
    try {
      const response = await fetch(resource.fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${resource.title}.${resource.fileType === 'pdf' ? 'pdf' : resource.fileType}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      window.open(resource.fileUrl, "_blank");
    }
  };

  const handleResourceClick = (resource: Resource) => {
    if (resource.fileType === "pdf") {
      setSelectedResource(resource);
      setViewerMode("options");
      downloadMutation.mutate(resource.id);
    } else {
      handleDownload(resource);
    }
  };

  const handleDriveFileClick = (file: DriveFile) => {
    if (file.mimeType.includes("pdf")) {
      setSelectedDriveFile(file);
      setDriveViewerMode("options");
    } else if (file.webViewLink) {
      window.open(file.webViewLink, "_blank");
    }
  };

  const closeDriveViewer = () => {
    setSelectedDriveFile(null);
    setDriveViewerMode("options");
  };

  const openDriveInNewTab = () => {
    if (selectedDriveFile?.webViewLink) {
      window.open(selectedDriveFile.webViewLink, "_blank");
    }
  };

  const getDrivePdfPreviewUrl = (fileId: string) => {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  };

  const getDriveFileIcon = (mimeType: string) => {
    if (mimeType.includes("pdf")) return <FileText className="w-6 h-6" />;
    if (mimeType.includes("image")) return <Image className="w-6 h-6" />;
    if (mimeType.includes("audio")) return <Headphones className="w-6 h-6" />;
    if (mimeType.includes("video")) return <Video className="w-6 h-6" />;
    if (mimeType.includes("folder")) return <FolderOpen className="w-6 h-6" />;
    return <FileText className="w-6 h-6" />;
  };

  const getDriveFileColor = (mimeType: string) => {
    if (mimeType.includes("pdf")) return "from-red-400 to-red-500";
    if (mimeType.includes("image")) return "from-green-400 to-emerald-500";
    if (mimeType.includes("audio")) return "from-purple-400 to-pink-500";
    if (mimeType.includes("video")) return "from-blue-400 to-indigo-500";
    if (mimeType.includes("folder")) return "from-yellow-400 to-orange-500";
    return "from-gray-400 to-gray-500";
  };

  const formatFileSize = (bytes?: string) => {
    if (!bytes) return "";
    const size = parseInt(bytes);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const closeViewer = () => {
    setSelectedResource(null);
    setViewerMode("options");
    setIsLoading(false);
    setNumPages(0);
    setPageNumber(1);
    setScale(1.0);
    setPdfError(false);
  };

  const openPdfReader = () => {
    setIsLoading(true);
    setPageNumber(1);
    setScale(1.0);
    setPdfError(false);
    setViewerMode("reading");
  };

  const goToPrevPage = () => setPageNumber((prev) => Math.max(1, prev - 1));
  const goToNextPage = () => setPageNumber((prev) => Math.min(numPages, prev + 1));
  const zoomIn = () => setScale((prev) => Math.min(2.5, prev + 0.25));
  const zoomOut = () => setScale((prev) => Math.max(0.5, prev - 0.25));

  const openInNewTab = () => {
    if (selectedResource) {
      window.open(selectedResource.fileUrl, "_blank");
    }
  };

  if (!parent) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-24 flex items-center justify-center">
        <Card className="max-w-sm mx-4 border-none shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t("resources.title")}</h2>
            <p className="text-gray-600 mb-6">
              {t("resources.loginPrompt")}
            </p>
            <Link href="/register">
              <button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-8 py-3 rounded-xl flex items-center gap-2 shadow-lg active:scale-[0.98] transition-all mx-auto" data-testid="button-register-resources">
                {t("resources.registerLogin")}
              </button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle tap to toggle focus controls visibility
  const handleFocusTap = () => {
    if (isFocusMode) {
      setShowFocusControls(!showFocusControls);
      // Auto-hide after 4 seconds
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
      if (!showFocusControls) {
        focusTimeoutRef.current = setTimeout(() => {
          setShowFocusControls(false);
        }, 4000);
      }
    }
  };

  // Enter focus mode when playing Quran with Mushaf visible
  const shouldShowFocusMode = isPlaying && currentSurah && showQuranText;

  const renderQuranSection = () => {
    // Focus mode: Full screen Mushaf with minimal controls
    if (shouldShowFocusMode && isFocusMode) {
      return (
        <div 
          className="min-h-screen bg-black relative"
          onClick={handleFocusTap}
        >
          {/* Full screen Mushaf */}
          <div className="w-full h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-white">
            <MushafFlipbook
              currentPage={currentMushafPage}
              onPageChange={(page) => {
                setCurrentMushafPage(page);
                setMushafImageLoading(false);
              }}
              totalPages={604}
              className="h-full w-full"
              compactControls={true}
            />
          </div>

          {/* Floating header - shown on tap */}
          <div 
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
              showFocusControls ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-emerald-600/95 to-teal-600/95 backdrop-blur-sm safe-top shadow-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    setIsFocusMode(false);
                    setShowFocusControls(true);
                  }}
                  className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
                  data-testid="button-exit-focus"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div className="flex-1">
                  <h1 className="font-bold text-white text-lg">{currentSurah?.arabicName}</h1>
                  <p className="text-emerald-100 text-sm">{currentSurah?.name} - {currentSurah?.verses} Aayad</p>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Mini Player - shown on tap */}
          <div 
            className={`fixed bottom-6 left-4 right-4 z-50 transition-all duration-300 ${
              showFocusControls ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl shadow-2xl px-4 py-3">
              {/* Progress bar */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-white/70 w-10">{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={seekTo}
                  className="flex-1 h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-white"
                  data-testid="focus-slider-progress"
                />
                <span className="text-xs text-white/70 w-10">{formatTime(duration)}</span>
              </div>
              
              {/* Controls */}
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={skipPrev}
                  disabled={!currentSurah || currentSurah.number <= 1}
                  className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center disabled:opacity-40"
                  data-testid="focus-button-prev"
                >
                  <SkipBack className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={togglePlayPause}
                  disabled={audioLoading}
                  className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-lg active:scale-95 transition-transform disabled:opacity-70"
                  data-testid="focus-button-play-pause"
                >
                  {audioLoading ? (
                    <Loader2 className="w-7 h-7 text-emerald-600 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-7 h-7 text-emerald-600" fill="currentColor" />
                  ) : (
                    <Play className="w-7 h-7 text-emerald-600 ml-1" fill="currentColor" />
                  )}
                </button>
                <button
                  onClick={skipNext}
                  disabled={!currentSurah || currentSurah.number >= 114}
                  className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center disabled:opacity-40"
                  data-testid="focus-button-next"
                >
                  <SkipForward className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* Tap hint - shows when controls are hidden */}
          <div 
            className={`fixed bottom-4 left-1/2 -translate-x-1/2 pointer-events-none transition-all duration-300 ${
              !showFocusControls ? 'opacity-50' : 'opacity-0'
            }`}
          >
            <div className="bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full">
              <p className="text-white text-xs">Taabo si aad u aragtid</p>
            </div>
          </div>
        </div>
      );
    }

    // Normal mode
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white pb-24">
        <header className="sticky top-0 z-40 bg-gradient-to-r from-emerald-600 to-teal-600 safe-top shadow-lg">
          <div className="px-4 py-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  if (currentSurah) {
                    if (audioRef.current) {
                      audioRef.current.pause();
                    }
                    setIsPlaying(false);
                    setCurrentSurah(null);
                    setIsFocusMode(false);
                  } else {
                    setActiveSection("main");
                  }
                }}
                className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
                data-testid="button-back-quran"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div className="flex-1">
                <h1 className="font-bold text-white text-lg">Quraan Dhagayso</h1>
                <p className="text-emerald-100 text-sm">114 Surah oo dhan</p>
              </div>
            </div>
            
            {quranReciters.length > 0 && (
              <div className="mt-3">
                <label className="text-emerald-100 text-xs mb-1 block">Shiikhga:</label>
                <select
                  value={selectedReciter?.id || ""}
                  onChange={(e) => {
                    const reciter = quranReciters.find(r => r.id === e.target.value);
                    if (reciter) {
                      setSelectedReciter(reciter);
                      if (currentSurah && audioRef.current) {
                        audioRef.current.pause();
                        setIsPlaying(false);
                        setTimeout(() => {
                          audioRef.current?.load();
                          audioRef.current?.play().then(() => setIsPlaying(true)).catch(() => {});
                        }, 100);
                      }
                    }
                  }}
                  className="w-full bg-white/20 text-white border border-white/30 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/50"
                  data-testid="select-reciter"
                >
                  {quranReciters.map((reciter) => (
                    <option key={reciter.id} value={reciter.id} className="text-gray-900">
                      {reciter.nameSomali || reciter.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </header>

        {currentSurah && (
          <div className="sticky top-[72px] z-30 bg-white border-b border-gray-100 shadow-sm px-4 py-3">
            <div className="flex items-center gap-2 mb-3">
              <select
                value={currentSurah.number}
                onChange={(e) => {
                  const surahNum = parseInt(e.target.value);
                  const surah = QURAN_SURAHS.find(s => s.number === surahNum);
                  if (surah) {
                    playSurah(surah);
                  }
                }}
                className="flex-1 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                data-testid="select-surah"
              >
                {QURAN_SURAHS.map((surah) => (
                  <option key={surah.number} value={surah.number}>
                    {surah.number}. {surah.name} - {surah.arabicName}
                  </option>
                ))}
              </select>
              <div className="text-center px-2">
                <span className="text-xs text-gray-500 whitespace-nowrap">{currentSurah.verses} Aayad</span>
              </div>
            </div>
            
            {audioError && (
              <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg mb-2 text-center">
                {audioError}
              </div>
            )}
            
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-500 w-10">{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={seekTo}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                data-testid="slider-progress"
              />
              <span className="text-xs text-gray-500 w-10">{formatTime(duration)}</span>
            </div>
            
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={skipPrev}
                disabled={!currentSurah || currentSurah.number <= 1}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center disabled:opacity-40"
                data-testid="button-prev-surah"
              >
                <SkipBack className="w-5 h-5 text-gray-700" />
              </button>
              <button
                onClick={() => {
                  togglePlayPause();
                  // Enter focus mode when playing
                  if (!isPlaying && showQuranText) {
                    setIsFocusMode(true);
                    setShowFocusControls(true);
                    // Auto-hide controls after 4 seconds
                    if (focusTimeoutRef.current) {
                      clearTimeout(focusTimeoutRef.current);
                    }
                    focusTimeoutRef.current = setTimeout(() => {
                      setShowFocusControls(false);
                    }, 4000);
                  }
                }}
                disabled={audioLoading}
                className="w-14 h-14 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg active:scale-95 transition-transform disabled:opacity-70"
                data-testid="button-play-pause"
              >
                {audioLoading ? (
                  <Loader2 className="w-7 h-7 text-white animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-7 h-7 text-white" fill="white" />
                ) : (
                  <Play className="w-7 h-7 text-white ml-1" fill="white" />
                )}
              </button>
              <button
                onClick={skipNext}
                disabled={!currentSurah || currentSurah.number >= 114}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center disabled:opacity-40"
                data-testid="button-next-surah"
              >
                <SkipForward className="w-5 h-5 text-gray-700" />
              </button>
            </div>
            
            <div className="flex items-center justify-center gap-2 mt-2">
              <button
                onClick={() => setShowQuranText(!showQuranText)}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  showQuranText 
                    ? "bg-emerald-100 text-emerald-700" 
                    : "bg-gray-100 text-gray-600"
                }`}
                data-testid="toggle-quran-text"
              >
                <BookOpenText className="w-3.5 h-3.5" />
                Musxafka
              </button>
              <button
                onClick={() => setAutoPlayNext(!autoPlayNext)}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  autoPlayNext 
                    ? "bg-amber-100 text-amber-700" 
                    : "bg-gray-100 text-gray-600"
                }`}
                data-testid="toggle-auto-play-next"
              >
                <SkipForward className="w-3.5 h-3.5" />
                Auto-play
              </button>
            </div>
          </div>
        )}

        <div className="px-2 py-2">
          {currentSurah && showQuranText ? (
            <div>
              {/* Full-screen Mushaf Flipbook */}
              <MushafFlipbook
                currentPage={currentMushafPage}
                onPageChange={(page) => {
                  setCurrentMushafPage(page);
                  setMushafImageLoading(false);
                }}
                totalPages={604}
                className="min-h-[70vh]"
              />
            </div>
          ) : !currentSurah ? (
            <div className="space-y-2">
              {QURAN_SURAHS.map((surah) => (
                <button
                  key={surah.number}
                  onClick={() => playSurah(surah)}
                  className="w-full bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-emerald-200 transition-all active:scale-[0.99] flex items-center gap-3"
                  data-testid={`surah-${surah.number}`}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm bg-emerald-100 text-emerald-700">
                    {surah.number}
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-gray-900">{surah.name}</h3>
                    <p className="text-xs text-gray-500">{surah.verses} Aayad</p>
                  </div>
                  <p className="text-xl text-emerald-600 font-arabic">{surah.arabicName}</p>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <BottomNav />
      </div>
    );
  };

  // Hadith books configuration
  const hadithBooks = [
    { id: "arbacinka", name: "Arbacinka Nawawi", icon: "📗", color: "from-emerald-500 to-teal-600", pattern: "Arbacinka Nawawi", count: 0 },
    { id: "bukhari", name: "Saxiix Bukhaari", icon: "📕", color: "from-red-500 to-rose-600", pattern: "Saxiix Bukhaari", count: 0 },
    { id: "muslim", name: "Saxiix Muslim", icon: "📘", color: "from-blue-500 to-indigo-600", pattern: "Saxiix Muslim", count: 0 },
    { id: "tirmidhi", name: "Sunan Al-Tirmidhi", icon: "📙", color: "from-amber-500 to-orange-600", pattern: "Sunan Al-Tirmidhi", count: 0 },
    { id: "abu-dawud", name: "Sunan Abu Dawuud", icon: "📓", color: "from-purple-500 to-pink-600", pattern: "Sunan Abu Dawuud", count: 0 },
    { id: "ibn-majah", name: "Sunan Ibn Maajah", icon: "📔", color: "from-cyan-500 to-blue-600", pattern: "Sunan Ibn Maajah", count: 0 },
    { id: "other", name: "Kutub Kale", icon: "📚", color: "from-gray-500 to-slate-600", pattern: "other", count: 0 },
  ];

  // Count hadiths per book
  const getBookCounts = () => {
    return hadithBooks.map(book => {
      if (book.id === "other") {
        const otherCount = hadithsList.filter(h => {
          const src = h.source?.toLowerCase() || "";
          return !src.includes("arbacinka") && !src.includes("bukhaari") && !src.includes("muslim") && 
                 !src.includes("tirmidhi") && !src.includes("abu dawuud") && !src.includes("ibn maajah");
        }).length;
        return { ...book, count: otherCount };
      }
      const count = hadithsList.filter(h => h.source?.toLowerCase().includes(book.pattern.toLowerCase())).length;
      return { ...book, count };
    }).filter(book => book.count > 0);
  };

  // Get hadiths for selected book
  const getBookHadiths = () => {
    if (!selectedHadithBook) return [];
    const book = hadithBooks.find(b => b.id === selectedHadithBook);
    if (!book) return [];
    
    if (book.id === "other") {
      return hadithsList.filter(h => {
        const src = h.source?.toLowerCase() || "";
        return !src.includes("arbacinka") && !src.includes("bukhaari") && !src.includes("muslim") && 
               !src.includes("tirmidhi") && !src.includes("abu dawuud") && !src.includes("ibn maajah");
      });
    }
    return hadithsList.filter(h => h.source?.toLowerCase().includes(book.pattern.toLowerCase()));
  };

  const selectedBookInfo = hadithBooks.find(b => b.id === selectedHadithBook);
  const bookHadiths = getBookHadiths();

  const renderHadithSection = () => {
    // If a book is selected, show its hadiths
    if (selectedHadithBook && selectedBookInfo) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white pb-24">
          <header className={`sticky top-0 z-40 bg-gradient-to-r ${selectedBookInfo.color} safe-top shadow-lg`}>
            <div className="px-4 py-4">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedHadithBook(null)}
                  className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
                  data-testid="button-back-hadith-book"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div className="flex-1">
                  <h1 className="font-bold text-white text-lg">{selectedBookInfo.name}</h1>
                  <p className="text-white/80 text-sm">{bookHadiths.length} Xadiis</p>
                </div>
                <select
                  value={selectedHadithBook}
                  onChange={(e) => setSelectedHadithBook(e.target.value)}
                  className="bg-white/20 text-white text-sm rounded-lg px-3 py-2 border-0 outline-none cursor-pointer"
                  data-testid="select-hadith-book"
                >
                  {getBookCounts().map(book => (
                    <option key={book.id} value={book.id} className="text-gray-900">
                      {book.name} ({book.count})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </header>

          <div className="px-4 py-4">
            <div className="space-y-4">
              {bookHadiths.map((hadith, index) => (
                <div 
                  key={hadith.id}
                  className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden"
                  data-testid={`hadith-${hadith.number}`}
                >
                  <div className={`bg-gradient-to-r ${selectedBookInfo.color} px-4 py-2 flex items-center gap-3`}>
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      {hadith.topic && <span className="text-white/80 text-xs">{hadith.topic}</span>}
                    </div>
                    {hadith.source && (
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded text-white">
                        {hadith.source}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-xl text-right font-arabic text-gray-800 leading-loose mb-4" dir="rtl">
                      {hadith.arabicText}
                    </p>
                    <div className="border-t border-amber-100 pt-4">
                      <p className="text-gray-700 leading-relaxed">
                        {hadith.somaliText}
                      </p>
                      {hadith.narrator && (
                        <p className="text-xs text-amber-600 mt-2">— {hadith.narrator}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <BottomNav />
        </div>
      );
    }

    // Show book cards
    const booksWithCounts = getBookCounts();

    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white pb-24">
        <header className="sticky top-0 z-40 bg-gradient-to-r from-amber-600 to-orange-600 safe-top shadow-lg">
          <div className="px-4 py-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActiveSection("main")}
                className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
                data-testid="button-back-hadith"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="font-bold text-white text-lg">Axaadiis Saxiix ah</h1>
                <p className="text-amber-100 text-sm">Xadiisyada Nabiga (SAW)</p>
              </div>
            </div>
          </div>
        </header>

        <div className="px-4 py-4">
          {hadithsList.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">📚</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Weli xadiis lama soo gelin</h3>
              <p className="text-gray-500 text-sm">Admin-ka ayaa soo geliya Axaadiista</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {booksWithCounts.map((book) => (
                <button
                  key={book.id}
                  onClick={() => setSelectedHadithBook(book.id)}
                  className={`bg-gradient-to-br ${book.color} rounded-2xl p-5 text-left shadow-lg active:scale-[0.98] transition-transform`}
                  data-testid={`hadith-book-${book.id}`}
                >
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                    <span className="text-3xl">{book.icon}</span>
                  </div>
                  <h3 className="font-bold text-white text-sm leading-tight">{book.name}</h3>
                  <p className="text-white/80 text-xs mt-1">{book.count} Xadiis</p>
                </button>
              ))}
            </div>
          )}
        </div>
        <BottomNav />
      </div>
    );
  };

  // Siirada (Islamic Biography) Books Configuration - Empty for now
  const siiradaBooks: Array<{
    id: string;
    name: string;
    author: string;
    description: string;
    icon: string;
    color: string;
    url: string;
  }> = [];

  const renderSiiradaSection = () => {
    // If a book is selected, show it in an iframe
    if (selectedSiiradaBook) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-white flex flex-col">
          <header className={`sticky top-0 z-40 bg-gradient-to-r ${selectedSiiradaBook.color} safe-top shadow-lg`}>
            <div className="px-4 py-4">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedSiiradaBook(null)}
                  className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
                  data-testid="button-back-siirada-book"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div className="flex-1">
                  <h1 className="font-bold text-white text-lg">{selectedSiiradaBook.name}</h1>
                  <p className="text-white/80 text-sm">{selectedSiiradaBook.author}</p>
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 bg-white">
            <iframe
              src={selectedSiiradaBook.url}
              className="w-full h-full min-h-[calc(100vh-140px)]"
              title={selectedSiiradaBook.name}
              data-testid={`iframe-siirada-${selectedSiiradaBook.id}`}
            />
          </div>
          <BottomNav />
        </div>
      );
    }
    
    // Show book list
    return (
      <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-white pb-24">
        <header className="sticky top-0 z-40 bg-gradient-to-r from-cyan-500 to-sky-600 safe-top shadow-lg">
          <div className="px-4 py-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActiveSection("main")}
                className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
                data-testid="button-back-siirada"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="font-bold text-white text-lg">Siirada</h1>
                <p className="text-cyan-100 text-sm">Taariikhda Nabiga iyo Saxaabada</p>
              </div>
            </div>
          </div>
        </header>

        <div className="px-4 py-4">
          {siiradaBooks.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🕌</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Weli kutub lama soo gelin</h3>
              <p className="text-gray-500 text-sm">Kutubta Siirada waxaa soo gelini doona Admin-ka</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {siiradaBooks.map((book) => (
                <button
                  key={book.id}
                  onClick={() => setSelectedSiiradaBook(book)}
                  className={`bg-gradient-to-br ${book.color} rounded-2xl p-5 shadow-lg active:scale-[0.98] transition-transform flex items-center gap-4 text-left`}
                  data-testid={`siirada-book-${book.id}`}
                >
                  <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-4xl">{book.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-base leading-tight">{book.name}</h3>
                    <p className="text-white/90 text-xs mt-0.5">{book.author}</p>
                    <p className="text-white/70 text-xs mt-1">{book.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white">
                        📄 Qoraal
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/70" />
                </button>
              ))}
            </div>
          )}
        </div>
        <BottomNav />
      </div>
    );
  };

  // Xisnul Muslim Duas Data - Organized by Category
  const duaCategories = [
    { id: "subax-fiid", name: "Adkaaraha Subaxda & Fiidka", icon: "🌅", color: "from-amber-500 to-orange-600" },
    { id: "hurdo", name: "Ducada Hurdada", icon: "🌙", color: "from-indigo-500 to-purple-600" },
    { id: "cunto", name: "Ducada Cuntada", icon: "🍽️", color: "from-green-500 to-emerald-600" },
    { id: "guri", name: "Ducada Guriga", icon: "🏠", color: "from-blue-500 to-cyan-600" },
    { id: "masjid", name: "Ducada Masjidka", icon: "🕌", color: "from-teal-500 to-green-600" },
    { id: "safar", name: "Ducada Safarka", icon: "✈️", color: "from-sky-500 to-blue-600" },
    { id: "cudur", name: "Ducada Cudurka", icon: "💊", color: "from-red-500 to-pink-600" },
    { id: "kale", name: "Ducooyin Kale", icon: "🤲", color: "from-violet-500 to-purple-600" },
  ];

  const allDuas = [
    // Subax & Fiid
    { id: 1, category: "subax-fiid", arabicText: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لاَ إِلَـهَ إِلاَّ اللهُ وَحْدَهُ لاَ شَرِيكَ لَهُ", somaliText: "Waanu subaxsannahay, boqortooyiduna waxay u subaxsatay Allaah, mahad Allaah ayey u sugnaatay, ilaahnimo xaq ah lama leh Allaah oo keligiis ah, wax la wadaaga ma leh.", reference: "Xisnul Muslim #1" },
    { id: 2, category: "subax-fiid", arabicText: "اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ", somaliText: "Allaahumma bikaa asbahnaa, wa bika amsaynaa, wa bika nahyaa, wa bika namuutu wa ilaykan-nushuur. (Ilaahayow adigaa aannu subaxsannahay, adigaana aannu fiidsannahay, adigaa aannu ku noolnahay, adigaana aannu ku dhimannaynaa, adigaana loo soo bixin doonaa)", reference: "Xisnul Muslim #2" },
    { id: 3, category: "subax-fiid", arabicText: "سُبْحَانَ اللهِ وَبِحَمْدِهِ", somaliText: "Subxaanallaahi wa bixamdihi (100 jeer). Allaah waa ka nasahan yahay oo waxaan ku mahad naqayaa.", reference: "Xisnul Muslim #12" },
    { id: 4, category: "subax-fiid", arabicText: "لاَ إِلَـهَ إِلاَّ اللهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ", somaliText: "Laa ilaaha illallaahu wahdahu laa shariika lah, lahul-mulku wa lahul-hamdu wa huwa calaa kulli shay'in qadiir. (10 jeer subaxdii)", reference: "Xisnul Muslim #13" },
    { id: 5, category: "subax-fiid", arabicText: "أَعُوذُ بِكَلِمَاتِ اللهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ", somaliText: "Acuudhu bikalimaatillaahit-taammaati min sharri maa khalaq. (3 jeer fiidkii). Waxaan ka magan galayaa erayada Allaah ee dhamaystiran sharka waxa uu abuuray.", reference: "Xisnul Muslim #14" },
    // Hurdo
    { id: 6, category: "hurdo", arabicText: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا", somaliText: "Bismikallahumma amuutu wa ahyaa. (Magacaaga Ilaahayow ayaan ku dhimanayaa kuna noolaaday)", reference: "Xisnul Muslim #28" },
    { id: 7, category: "hurdo", arabicText: "اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ", somaliText: "Allaahumma qinii cadhaabaka yawma tabcathu cibaadak. (Ilaahayow iga dhawro cadhaabkaaga maalinta aad soo bixin doonto addoommadaada)", reference: "Xisnul Muslim #29" },
    { id: 8, category: "hurdo", arabicText: "الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ", somaliText: "Alhamdu lillaahil-ladhii ahyaanaa bacda maa amaatanaa wa ilayhin-nushuur. (Markii la tooso: Mahad Allaah baa leh ee noo noolaysiiyay ka dib markuu na dhintiiyay, xaggiisaana loo soo bixin doonaa)", reference: "Xisnul Muslim #30" },
    // Cunto
    { id: 9, category: "cunto", arabicText: "بِسْمِ اللهِ", somaliText: "Bismillaah. (Magaca Allaah - ka hor cuntada)", reference: "Xisnul Muslim #55" },
    { id: 10, category: "cunto", arabicText: "الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا، وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلاَ قُوَّةٍ", somaliText: "Alhamdulillaahil-ladhii atcamanii haadhaa wa razaqaniihi min ghayri hawlin minnii wa laa quwwah. (Ka dib cuntada: Mahad Allaah baa leh ee i quudiyay tanna, iina siiyay isagoon xoog iyo awood aniga iga ahayn)", reference: "Xisnul Muslim #56" },
    // Guri
    { id: 11, category: "guri", arabicText: "بِسْمِ اللهِ وَلَجْنَا، وَبِسْمِ اللهِ خَرَجْنَا، وَعَلَى اللهِ رَبِّنَا تَوَكَّلْنَا", somaliText: "Bismillaahi walajnaa, wa bismillaahi kharajnaa, wa calaallaahi rabbinaa tawakkalnaa. (Magaca Allaah ayaannu ku soo galnay, magaca Allaahna ayaannu ku baxnay, Allaah Rabbigayaga ayaannu isku hallaynnay)", reference: "Xisnul Muslim #18" },
    { id: 12, category: "guri", arabicText: "اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ الْمَوْلِجِ وَخَيْرَ الْمَخْرَجِ، بِسْمِ اللهِ وَلَجْنَا، وَبِسْمِ اللهِ خَرَجْنَا، وَعَلَى اللهِ رَبِّنَا تَوَكَّلْنَا", somaliText: "Allaahumma innii as'aluka khayral-mawliji wa khayral-makhraji... (Markii guriga la galo)", reference: "Xisnul Muslim #19" },
    // Masjid
    { id: 13, category: "masjid", arabicText: "أَعُوذُ بِاللهِ الْعَظِيمِ، وَبِوَجْهِهِ الْكَرِيمِ، وَسُلْطَانِهِ الْقَدِيمِ، مِنَ الشَّيْطَانِ الرَّجِيمِ", somaliText: "Acuudhu billaahil-cadhiim, wa bi wajhihil-kariim, wa sultaanihil-qadiim, minash-shaytaanir-rajiim. (Markii masjidka la galo)", reference: "Xisnul Muslim #20" },
    { id: 14, category: "masjid", arabicText: "اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ", somaliText: "Allaahummaf-tah lii abwaaba rahmatik. (Ilaahayow ii fur albaabada naxariistaada)", reference: "Xisnul Muslim #21" },
    { id: 15, category: "masjid", arabicText: "اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ", somaliText: "Allaahumma innii as'aluka min fadlik. (Markii masjidka laga baxayo: Ilaahayow waxaan kaa baryayaa fadligaaga)", reference: "Xisnul Muslim #22" },
    // Safar
    { id: 16, category: "safar", arabicText: "اللهُ أَكْبَرُ، اللهُ أَكْبَرُ، اللهُ أَكْبَرُ، سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ، وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ", somaliText: "Allaahu akbar (3x), Subhaanal-ladhii sakhkhara lanaa haadhaa wa maa kunnaa lahu muqriniin, wa innaa ilaa rabbinaa lamunqalibuun. (Ducada safarka)", reference: "Xisnul Muslim #82" },
    { id: 17, category: "safar", arabicText: "اللَّهُمَّ هَوِّنْ عَلَيْنَا سَفَرَنَا هَذَا وَاطْوِ عَنَّا بُعْدَهُ", somaliText: "Allaahumma hawwin calaynaa safaranaa haadhaa watw cannaa bucdah. (Ilaahayow noo fududee safarkeenna oo naga soo gaabi fogaantiisa)", reference: "Xisnul Muslim #83" },
    // Cudur
    { id: 18, category: "cudur", arabicText: "أَذْهِبِ الْبَأْسَ رَبَّ النَّاسِ، اشْفِ أَنْتَ الشَّافِي، لاَ شِفَاءَ إِلاَّ شِفَاؤُكَ، شِفَاءً لاَ يُغَادِرُ سَقَماً", somaliText: "Adhhibil-ba'sa rabban-naas, ishfi antash-shaafii, laa shifaa'a illaa shifaa'uk, shifaa'an laa yughaadiru saqamaa. (Tuur xanuunka Rabbiga dadka, bogsiiso adigaa bogsiiyana, bogsiin ma jirto bogsintaada mooyee, bogsiin aan xanuun ka tagayn)", reference: "Xisnul Muslim #115" },
    { id: 19, category: "cudur", arabicText: "بِسْمِ اللهِ أَرْقِيكَ، مِنْ كُلِّ شَيْءٍ يُؤْذِيكَ، مِنْ شَرِّ كُلِّ نَفْسٍ أَوْ عَيْنِ حَاسِدٍ، اللهُ يَشْفِيكَ، بِسْمِ اللهِ أَرْقِيكَ", somaliText: "Bismillaahi arqiik, min kulli shay'in yu'dhiik, min sharri kulli nafsin aw cayni haasidin, Allaahu yashfiik, bismillaahi arqiik.", reference: "Xisnul Muslim #116" },
    // Kale
    { id: 20, category: "kale", arabicText: "سُبْحَانَ اللهِ، وَالْحَمْدُ لِلَّهِ، وَلاَ إِلَـهَ إِلاَّ اللهُ، وَاللهُ أَكْبَرُ", somaliText: "Subhaanallaah, wal-hamdulillaah, wa laa ilaaha illallaah, wallaahu akbar. (Allaah waa ka nasahan yahay, mahad Allaah baa leh, ilaah xaq ah ma jiro Allaah mooyee, Allaah waa ugu weyn)", reference: "Xisnul Muslim #130" },
    { id: 21, category: "kale", arabicText: "أَسْتَغْفِرُ اللهَ الَّذِي لاَ إِلَـهَ إِلاَّ هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ", somaliText: "Astaghfirullahal-ladhii laa ilaaha illaa huwal-hayyul-qayyuum, wa atuubu ilayh. (Waxaan dambi dhaaf ka baryayaa Allaah oo aan ilaah xaq ah jirin isaga mooyee, Noolaha, Ilaaliyaha, waxaana xaggiisa u toobad keenayaa)", reference: "Xisnul Muslim #133" },
    { id: 22, category: "kale", arabicText: "لاَ حَوْلَ وَلاَ قُوَّةَ إِلاَّ بِاللهِ", somaliText: "Laa hawla wa laa quwwata illaa billaah. (Xoog iyo awood ma jirto Allaah mooyee)", reference: "Xisnul Muslim #135" },
    { id: 23, category: "kale", arabicText: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ", somaliText: "Rabbanaa aatinaa fid-dunyaa hasanah, wa fil-aakhirati hasanah, wa qinaa cadhaaban-naar. (Rabbigayagow na sii adduunka wanaag, aakhiradana wanaag, naga dhawrna cadhaabka naarta)", reference: "Xisnul Muslim #140" },
  ];

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = (categoryDuasLength: number) => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && currentDuaIndex < categoryDuasLength - 1) {
      setCurrentDuaIndex(currentDuaIndex + 1);
    }
    if (isRightSwipe && currentDuaIndex > 0) {
      setCurrentDuaIndex(currentDuaIndex - 1);
    }
  };

  const getCategoryDuas = () => {
    if (!selectedDuaCategory) return [];
    return allDuas.filter(d => d.category === selectedDuaCategory);
  };

  const selectedCategoryInfo = duaCategories.find(c => c.id === selectedDuaCategory);
  const categoryDuas = getCategoryDuas();

  const renderDuasSection = () => {
    // If a category is selected, show its duas with navigation
    if (selectedDuaCategory && selectedCategoryInfo && categoryDuas.length > 0) {
      const currentDua = categoryDuas[currentDuaIndex];
      
      return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-24">
          <header className={`sticky top-0 z-40 bg-gradient-to-r ${selectedCategoryInfo.color} safe-top shadow-lg`}>
            <div className="px-4 py-4">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => { setSelectedDuaCategory(null); setCurrentDuaIndex(0); }}
                  className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
                  data-testid="button-back-dua-category"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div className="flex-1">
                  <h1 className="font-bold text-white text-lg">{selectedCategoryInfo.name}</h1>
                  <p className="text-white/80 text-sm">{currentDuaIndex + 1} / {categoryDuas.length} Duco</p>
                </div>
              </div>
            </div>
          </header>

          <div className="px-4 py-6">
            <div 
              className="bg-white rounded-2xl shadow-lg border border-blue-100 overflow-hidden"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={() => onTouchEnd(categoryDuas.length)}
            >
              <div className={`bg-gradient-to-r ${selectedCategoryInfo.color} px-4 py-3 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{selectedCategoryInfo.icon}</span>
                  <span className="text-white font-medium">Duco #{currentDuaIndex + 1}</span>
                </div>
                <span className="text-xs bg-white/20 px-2 py-1 rounded text-white">{currentDua.reference}</span>
              </div>
              
              <div className="p-5">
                <p className="text-2xl text-right font-arabic text-gray-800 leading-loose mb-6" dir="rtl">
                  {currentDua.arabicText}
                </p>
                <div className="border-t border-blue-100 pt-4">
                  <p className="text-gray-700 leading-relaxed text-base">
                    {currentDua.somaliText}
                  </p>
                </div>
              </div>
              
              <div className="px-5 pb-4 text-center text-xs text-gray-400">
                ← Riix oo u jiid bidix ama midig →
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => setCurrentDuaIndex(Math.max(0, currentDuaIndex - 1))}
                disabled={currentDuaIndex === 0}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                  currentDuaIndex === 0 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-blue-100 text-blue-700 active:scale-95'
                }`}
                data-testid="button-prev-dua"
              >
                <ChevronLeft className="w-5 h-5" />
                Hore
              </button>
              
              <div className="flex gap-1">
                {categoryDuas.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentDuaIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === currentDuaIndex ? 'bg-blue-600 w-4' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
              
              <button
                onClick={() => setCurrentDuaIndex(Math.min(categoryDuas.length - 1, currentDuaIndex + 1))}
                disabled={currentDuaIndex === categoryDuas.length - 1}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                  currentDuaIndex === categoryDuas.length - 1 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-blue-100 text-blue-700 active:scale-95'
                }`}
                data-testid="button-next-dua"
              >
                Xiga
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          <BottomNav />
        </div>
      );
    }

    // Show category list
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-24">
        <header className="sticky top-0 z-40 bg-gradient-to-r from-blue-600 to-indigo-600 safe-top shadow-lg">
          <div className="px-4 py-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActiveSection("main")}
                className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
                data-testid="button-back-duas"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="font-bold text-white text-lg">Xisnul Muslim</h1>
                <p className="text-blue-100 text-sm">Ducooyinka iyo Adkaarta</p>
              </div>
            </div>
          </div>
        </header>

        <div className="px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            {duaCategories.map((category) => {
              const count = allDuas.filter(d => d.category === category.id).length;
              return (
                <button
                  key={category.id}
                  onClick={() => { setSelectedDuaCategory(category.id); setCurrentDuaIndex(0); }}
                  className={`bg-gradient-to-br ${category.color} rounded-2xl p-5 text-left shadow-lg active:scale-[0.98] transition-transform`}
                  data-testid={`dua-category-${category.id}`}
                >
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                    <span className="text-3xl">{category.icon}</span>
                  </div>
                  <h3 className="font-bold text-white text-sm leading-tight">{category.name}</h3>
                  <p className="text-white/80 text-xs mt-1">{count} Duco</p>
                </button>
              );
            })}
          </div>
          
          <div className="mt-6 bg-blue-100 rounded-xl p-4">
            <h4 className="font-semibold text-blue-800 mb-2">🤲 Xisnul Muslim</h4>
            <p className="text-blue-700 text-sm">
              Dhufeyska Muslinka - Ducooyinka iyo Adkaarta laga helay Quraanka iyo Sunnada Nabiga (SCW).
            </p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  };

  const renderBooksSection = (category: "parenting" | "children", title: string, subtitle: string, gradient: string) => {
    const books = category === "parenting" ? parentingBooks : childrenBooks;
    const isLoading = category === "parenting" ? parentingBooksLoading : childrenBooksLoading;
    const bgColor = category === "parenting" ? "from-purple-50" : "from-pink-50";
    const emptyIcon = category === "parenting" ? "📕" : "📚";

    return (
      <div className={`min-h-screen bg-gradient-to-b ${bgColor} to-white pb-24`}>
        <header className={`sticky top-0 z-40 bg-gradient-to-r ${gradient} safe-top shadow-lg`}>
          <div className="px-4 py-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActiveSection("main")}
                className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
                data-testid={`button-back-${category}-books`}
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="font-bold text-white text-lg">{title}</h1>
                <p className="text-white/80 text-sm">{subtitle}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="px-4 py-4">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-gray-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : books.length === 0 ? (
            <div className="text-center py-12">
              <div className={`w-20 h-20 ${category === "parenting" ? "bg-purple-100" : "bg-pink-100"} rounded-full flex items-center justify-center mx-auto mb-4`}>
                <span className="text-4xl">{emptyIcon}</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Weli buug lama soo gelin</h3>
              <p className="text-gray-500 text-sm">
                Fadlan ku dar folder-ka "{category === "parenting" ? "Kutubta Waalidiinta" : "Kutubta Caruurta"}" gudaha "Barbaarintasan Maktabada" ee Google Drive-kaaga
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {books.map((book) => (
                <button
                  key={book.id}
                  onClick={() => {
                    setSelectedDriveFile(book);
                    setDriveViewerMode("options");
                  }}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-left hover:shadow-md transition-shadow"
                  data-testid={`book-${book.id}`}
                >
                  <div className={`w-full aspect-[3/4] ${category === "parenting" ? "bg-gradient-to-br from-purple-100 to-pink-100" : "bg-gradient-to-br from-pink-100 to-rose-100"} rounded-lg flex items-center justify-center mb-3`}>
                    <span className="text-5xl">{emptyIcon}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 leading-tight">
                    {book.name.replace(/\.pdf$/i, '')}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">PDF</p>
                </button>
              ))}
            </div>
          )}
        </div>
        <BottomNav />
      </div>
    );
  };

  if (activeSection === "quran") {
    return (
      <>
        {/* Persistent audio element - must stay mounted across focus mode transitions */}
        {currentSurah && currentAudioUrl && (
          <audio
            ref={audioRef}
            src={currentAudioUrl}
            preload="metadata"
            style={{ display: 'none' }}
          />
        )}
        {renderQuranSection()}
      </>
    );
  }
  
  if (activeSection === "hadith") {
    return renderHadithSection();
  }
  
  if (activeSection === "siirada") {
    return renderSiiradaSection();
  }
  
  if (activeSection === "duas") {
    return renderDuasSection();
  }

  if (activeSection === "parenting-books") {
    return renderBooksSection("parenting", "Buugaagta Tarbiyada", "Waalidnimada iyo Barbaarinta", "from-purple-500 to-pink-600");
  }

  if (activeSection === "children-books") {
    return renderBooksSection("children", "Buugaagta Caruurta", "Sheekooyin iyo Waxbarasho", "from-pink-500 to-rose-600");
  }

  if (activeSection === "prayer-times") {
    return (
      <>
        <PrayerTimes onBack={() => setActiveSection("main")} />
        <BottomNav />
      </>
    );
  }

  if (activeSection === "sheeko-recordings") {
    return (
      <>
        <SheekoRecordingsSection onBack={() => setActiveSection("main")} />
        <BottomNav />
      </>
    );
  }

  if (activeSection === "bedtime-stories") {
    return (
      <>
        <BedtimeStoriesArchive onBack={() => setActiveSection("main")} />
        <BottomNav />
      </>
    );
  }

  if (activeSection === "meet-recordings") {
    return (
      <>
        <MeetRecordingsArchive onBack={() => setActiveSection("main")} />
        <BottomNav />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <header className="sticky top-0 z-40 bg-gradient-to-r from-indigo-600 to-purple-600 safe-top shadow-lg">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <button className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center" data-testid="button-back">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            </Link>
            <div>
              <h1 className="font-bold text-white text-lg">{t("resources.title")}</h1>
              <p className="text-blue-100 text-sm">{t("resources.subtitle")}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-4">
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => setActiveSection("prayer-times")}
            className="bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl p-5 text-left shadow-lg active:scale-[0.98] transition-transform col-span-2"
            data-testid="button-prayer-times-section"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-3xl">🕌</span>
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Jadwalka Salaadda</h3>
                <p className="text-slate-300 text-xs mt-1">Wakhtiyada Salaadda • Ogeysiisyo</p>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => setActiveSection("quran")}
            className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-left shadow-lg active:scale-[0.98] transition-transform"
            data-testid="button-quran-section"
          >
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mb-3">
              <span className="text-3xl">📖</span>
            </div>
            <h3 className="font-bold text-white text-lg">Quraan Dhagayso</h3>
            <p className="text-emerald-100 text-xs mt-1">114 Surah • MP3</p>
          </button>
          
          <button
            onClick={() => setActiveSection("hadith")}
            className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-left shadow-lg active:scale-[0.98] transition-transform"
            data-testid="button-hadith-section"
          >
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mb-3">
              <span className="text-3xl">📚</span>
            </div>
            <h3 className="font-bold text-white text-lg">Axaadiis Saxiix ah</h3>
            <p className="text-amber-100 text-xs mt-1">Carabi & Soomaali</p>
          </button>
          
          <button
            onClick={() => setActiveSection("siirada")}
            className="bg-gradient-to-br from-cyan-500 to-sky-600 rounded-2xl p-5 text-left shadow-lg active:scale-[0.98] transition-transform"
            data-testid="button-siirada-section"
          >
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mb-3">
              <span className="text-3xl">🕌</span>
            </div>
            <h3 className="font-bold text-white text-lg">Siirada</h3>
            <p className="text-cyan-100 text-xs mt-1">Taariikhda Islaamka</p>
          </button>
          
          <button
            onClick={() => setActiveSection("duas")}
            className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-left shadow-lg active:scale-[0.98] transition-transform"
            data-testid="button-duas-section"
          >
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mb-3">
              <span className="text-3xl">🤲</span>
            </div>
            <h3 className="font-bold text-white text-lg">Ducooyinka</h3>
            <p className="text-blue-100 text-xs mt-1">Xusnu Muslim</p>
          </button>
          
          <button
            onClick={() => setActiveSection("parenting-books")}
            className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-5 text-left shadow-lg active:scale-[0.98] transition-transform"
            data-testid="button-parenting-books-section"
          >
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mb-3">
              <span className="text-3xl">📕</span>
            </div>
            <h3 className="font-bold text-white text-lg leading-tight">Buugaagta Tarbiyada</h3>
            <p className="text-purple-100 text-xs mt-1">Waalidnimada</p>
          </button>
          
          <button
            onClick={() => setActiveSection("children-books")}
            className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl p-5 text-left shadow-lg active:scale-[0.98] transition-transform"
            data-testid="button-children-books-section"
          >
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mb-3">
              <span className="text-3xl">📚</span>
            </div>
            <h3 className="font-bold text-white text-lg leading-tight">Buugaagta Caruurta</h3>
            <p className="text-pink-100 text-xs mt-1">Sheekooyin</p>
          </button>
          
          <button
            onClick={() => setActiveSection("sheeko-recordings")}
            className="bg-gradient-to-br from-violet-500 to-purple-700 rounded-2xl p-5 text-left shadow-lg active:scale-[0.98] transition-transform col-span-2"
            data-testid="button-sheeko-recordings-section"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-3xl">🎙️</span>
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Sheeko Archive</h3>
                <p className="text-purple-200 text-xs mt-1">Wadahadalladii hore la duubay</p>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => setActiveSection("meet-recordings")}
            className="bg-gradient-to-br from-red-500 to-rose-700 rounded-2xl p-5 text-left shadow-lg active:scale-[0.98] transition-transform col-span-2"
            data-testid="button-meet-recordings-section"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-3xl">🎧</span>
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Kulamadii Hore</h3>
                <p className="text-red-200 text-xs mt-1">Kulamadii Bahda Tarbiyadda Caruurta ee Hore</p>
              </div>
            </div>
          </button>
          
          <Link href="/dhambaal" className="col-span-2">
            <div
              className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-5 text-left shadow-lg active:scale-[0.98] transition-transform"
              data-testid="button-parent-messages-section"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-3xl">💬</span>
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Dhambaalka Waalidka</h3>
                  <p className="text-emerald-200 text-xs mt-1">Talo iyo tilmaamo waalidnimo</p>
                </div>
              </div>
            </div>
          </Link>

          <button
            onClick={() => setActiveSection("bedtime-stories")}
            className="bg-gradient-to-br from-indigo-600 to-purple-800 rounded-2xl p-5 text-left shadow-lg active:scale-[0.98] transition-transform col-span-2"
            data-testid="button-bedtime-stories-section"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-3xl">🌙</span>
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Sheekooyinka Habeenkii</h3>
                <p className="text-indigo-200 text-xs mt-1">Sheekooyinka Hurdada</p>
              </div>
            </div>
          </button>
        </div>
      </div>


      {/* PDF Options Modal */}
      <Dialog open={!!selectedResource && viewerMode === "options"} onOpenChange={(open) => !open && closeViewer()}>
        <DialogContent className="p-0 gap-0 bg-white border-none overflow-hidden max-w-md mx-auto rounded-2xl">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-center">
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-white font-bold text-lg line-clamp-2">
              {selectedResource?.title}
            </h2>
            <p className="text-red-100 text-sm mt-1">PDF Document</p>
          </div>

          {/* Action Buttons */}
          <div className="p-6 space-y-3">
            <Button
              onClick={openPdfReader}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-base font-semibold rounded-xl"
              data-testid="button-read-pdf"
            >
              <BookOpen className="w-5 h-5 mr-3" />
              {t("resources.read")}
            </Button>

            <Button
              onClick={() => {
                if (selectedResource) handleDownload(selectedResource);
                closeViewer();
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-base font-semibold rounded-xl"
              data-testid="button-download-pdf"
            >
              <Download className="w-5 h-5 mr-3" />
              {t("resources.download")}
            </Button>
            
            <Button
              onClick={() => {
                openInNewTab();
                closeViewer();
              }}
              variant="outline"
              className="w-full border-2 border-gray-200 text-gray-700 hover:bg-gray-50 py-6 text-base font-semibold rounded-xl"
              data-testid="button-open-new-tab"
            >
              <ExternalLink className="w-5 h-5 mr-3" />
              {t("resources.openNewTab")}
            </Button>

            <button
              onClick={closeViewer}
              className="w-full text-gray-500 hover:text-gray-700 py-3 text-sm font-medium"
              data-testid="button-close-pdf"
            >
              {t("resources.close")}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Full Screen Reader */}
      <Dialog open={!!selectedResource && viewerMode === "reading"} onOpenChange={(open) => !open && closeViewer()}>
        <DialogContentFullscreen className="bg-white">
          {/* Full Screen PDF Reader */}
          <div className="flex flex-col h-full w-full">
              {/* Reader Header */}
              <div className="bg-gradient-to-r from-red-500 to-red-600 px-4 py-3 flex items-center justify-between safe-top shrink-0">
                <button
                  onClick={closeViewer}
                  className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
                  data-testid="button-close-reader"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <h2 className="text-white font-semibold text-sm line-clamp-1 flex-1 mx-3 text-center">
                  {selectedResource?.title}
                </h2>
                <button
                  onClick={() => selectedResource && handleDownload(selectedResource)}
                  className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
                  data-testid="button-download-reader"
                >
                  <Download className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* PDF Viewer using react-pdf */}
              <div className="flex-1 bg-gray-100 relative overflow-auto">
                {isLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 z-10">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
                    <p className="text-gray-600 text-sm">{t("resources.loading")}</p>
                  </div>
                )}
                {pdfError ? (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                    <FileText className="w-16 h-16 text-gray-300 mb-4" />
                    <p className="text-gray-700 font-medium mb-2">{t("resources.error")}</p>
                    <p className="text-gray-500 text-sm mb-4">{t("resources.openNewTab")}</p>
                    <Button onClick={openInNewTab} className="bg-blue-600 hover:bg-blue-700">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      {t("resources.openNewTab")}
                    </Button>
                  </div>
                ) : (
                  selectedResource && (
                    <div className="flex justify-center py-4" data-testid="pdf-document-viewer">
                      <Document
                        file={selectedResource.fileUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={onDocumentLoadError}
                        loading={null}
                      >
                        <Page 
                          pageNumber={pageNumber}
                          scale={scale}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                          loading={null}
                        />
                      </Document>
                    </div>
                  )
                )}
              </div>

              {/* Navigation and zoom controls */}
              {!pdfError && numPages > 0 && (
                <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={zoomOut}
                      disabled={scale <= 0.5}
                      className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center disabled:opacity-50"
                      data-testid="button-zoom-out"
                    >
                      <ZoomOut className="w-4 h-4 text-gray-600" />
                    </button>
                    <span className="text-xs text-gray-600 w-12 text-center">{Math.round(scale * 100)}%</span>
                    <button
                      onClick={zoomIn}
                      disabled={scale >= 2.5}
                      className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center disabled:opacity-50"
                      data-testid="button-zoom-in"
                    >
                      <ZoomIn className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={goToPrevPage}
                      disabled={pageNumber <= 1}
                      className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center disabled:opacity-50"
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="w-4 h-4 text-gray-600" />
                    </button>
                    <span className="text-sm text-gray-600">{pageNumber} / {numPages}</span>
                    <button
                      onClick={goToNextPage}
                      disabled={pageNumber >= numPages}
                      className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center disabled:opacity-50"
                      data-testid="button-next-page"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              )}

            {/* Bottom action bar */}
            <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-center gap-4 safe-bottom shrink-0">
              <Button
                onClick={openInNewTab}
                variant="outline"
                size="sm"
                className="flex-1"
                data-testid="button-open-external-reader"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {t("resources.openNewTab")}
              </Button>
              <Button
                onClick={() => selectedResource && handleDownload(selectedResource)}
                size="sm"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                data-testid="button-download-bottom"
              >
                <Download className="w-4 h-4 mr-2" />
                {t("resources.download")}
              </Button>
            </div>
          </div>
        </DialogContentFullscreen>
      </Dialog>

      {/* Google Drive PDF Options Modal */}
      <Dialog open={!!selectedDriveFile && driveViewerMode === "options"} onOpenChange={(open) => !open && closeDriveViewer()}>
        <DialogContent className="p-0 gap-0 bg-white border-none overflow-hidden max-w-md mx-auto rounded-2xl">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-center">
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Cloud className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-white font-bold text-lg line-clamp-2">
              {selectedDriveFile?.name}
            </h2>
            <p className="text-blue-100 text-sm mt-1">Google Drive PDF</p>
          </div>

          <div className="p-6 space-y-3">
            <Button
              onClick={() => setDriveViewerMode("reading")}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-base font-semibold rounded-xl"
              data-testid="button-read-drive-pdf"
            >
              <BookOpen className="w-5 h-5 mr-3" />
              {t("resources.read")}
            </Button>

            <Button
              onClick={() => {
                openDriveInNewTab();
                closeDriveViewer();
              }}
              variant="outline"
              className="w-full border-2 border-gray-200 text-gray-700 hover:bg-gray-50 py-6 text-base font-semibold rounded-xl"
              data-testid="button-open-drive-new-tab"
            >
              <ExternalLink className="w-5 h-5 mr-3" />
              {t("resources.openNewTab")}
            </Button>

            <button
              onClick={closeDriveViewer}
              className="w-full text-gray-500 hover:text-gray-700 py-3 text-sm font-medium"
              data-testid="button-close-drive-pdf"
            >
              {t("resources.close")}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Google Drive PDF Full Screen Reader */}
      <Dialog open={!!selectedDriveFile && driveViewerMode === "reading"} onOpenChange={(open) => !open && closeDriveViewer()}>
        <DialogContentFullscreen className="bg-white">
          <div className="flex flex-col h-full w-full">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-3 flex items-center justify-between safe-top shrink-0">
              <button
                onClick={closeDriveViewer}
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
                data-testid="button-close-drive-reader"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <h2 className="text-white font-semibold text-sm line-clamp-1 flex-1 mx-3 text-center">
                {selectedDriveFile?.name}
              </h2>
              <button
                onClick={openDriveInNewTab}
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
                data-testid="button-open-drive-external"
              >
                <ExternalLink className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="flex-1 bg-gray-100 relative">
              {selectedDriveFile && (
                <iframe
                  src={getDrivePdfPreviewUrl(selectedDriveFile.id)}
                  className="w-full h-full border-0"
                  allow="autoplay"
                  title={selectedDriveFile.name}
                  data-testid="drive-pdf-iframe"
                />
              )}
            </div>

            <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-center safe-bottom shrink-0">
              <Button
                onClick={openDriveInNewTab}
                variant="outline"
                size="sm"
                className="flex-1"
                data-testid="button-open-drive-external-bottom"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {t("resources.openNewTab")}
              </Button>
            </div>
          </div>
        </DialogContentFullscreen>
      </Dialog>

      <BottomNav />
    </div>
  );
}

function MeetRecordingsArchive({ onBack }: { onBack: () => void }) {
  const { data: archivedEvents = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/meet-events/archived"],
    queryFn: async () => {
      const res = await fetch("/api/meet-events/archived", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const formatSomaliDate = (dateStr: string) => {
    const months = ["Janaayo", "Febraayo", "Maarso", "Abriil", "May", "Juun", "Luuliyo", "Ogosto", "Sebtembar", "Oktoobar", "Nofembar", "Disembar"];
    const [y, m, d] = dateStr.split("-");
    return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <header className="sticky top-0 z-40 bg-gradient-to-r from-red-600 to-rose-700 safe-top shadow-lg">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center" data-testid="button-back-meet-recordings">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="font-bold text-white text-lg">Kulamadii Hore</h1>
              <p className="text-red-100 text-sm">Kulamadii Bahda Tarbiyadda Caruurta ee Hore</p>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          </div>
        ) : archivedEvents.length === 0 ? (
          <div className="text-center py-12">
            <Headphones className="w-16 h-16 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 text-sm">Wali kulan la duubay lama kaydsan</p>
          </div>
        ) : (
          archivedEvents.map((event: any) => (
            <div key={event.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4" data-testid={`archived-meet-${event.id}`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                  <Headphones className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-gray-900 mb-1">{event.title}</h3>
                  {event.description && <p className="text-xs text-gray-600 mb-2 line-clamp-2">{event.description}</p>}
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                    <span className="bg-gray-100 px-2 py-0.5 rounded-full">{formatSomaliDate(event.eventDate)}</span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded-full">{event.startTime} - {event.endTime}</span>
                  </div>
                  {event.driveFileId && (
                    <a
                      href={`/meet-watch/${event.id}`}
                      className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                        event.mediaType === "audio"
                          ? "bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white"
                          : "bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white"
                      }`}
                      data-testid={`btn-watch-archived-${event.id}`}
                    >
                      {event.mediaType === "audio" ? <Volume2 className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                      {event.mediaType === "audio" ? "Dhageyso Kulankii" : "Daawo Kulankii"}
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
