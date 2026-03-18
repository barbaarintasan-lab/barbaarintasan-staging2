import { useEffect } from "react";
import { useLocation } from "wouter";
import { Lock, LogOut, BookOpen } from "lucide-react";
import { useChildAuth } from "@/contexts/ChildAuthContext";

interface JuzCard {
  num: number;
  arabic: string;
  somaliName: string;
  englishName: string;
  surahStart: number;
  isOpen: boolean;
  gradient: string;
  glowColor: string;
}

const JUZ_DATA: JuzCard[] = [
  { num: 1,  arabic: "الم",              somaliName: "Juz Alif Laam Miim",      englishName: "Alif Laam Miim",       surahStart: 1,  isOpen: true,  gradient: "from-pink-800 via-rose-700 to-red-800",              glowColor: "#f472b6" },
  { num: 2,  arabic: "سَيَقُولُ",         somaliName: "Juz Sayaquul",            englishName: "Sayaqulu",             surahStart: 2,  isOpen: true,  gradient: "from-red-800 via-rose-700 to-orange-800",            glowColor: "#fb7185" },
  { num: 3,  arabic: "تِلْكَ الرُّسُلُ",  somaliName: "Juz Tilkar Rusul",        englishName: "Tilkar Rusul",         surahStart: 3,  isOpen: true,  gradient: "from-orange-800 via-amber-700 to-yellow-800",        glowColor: "#fb923c" },
  { num: 4,  arabic: "لَن تَنَالُوا",     somaliName: "Juz Lan Tanaaluu",        englishName: "Lan Tanalu",           surahStart: 4,  isOpen: true,  gradient: "from-yellow-700 via-lime-700 to-green-800",          glowColor: "#fbbf24" },
  { num: 5,  arabic: "وَٱلْمُحْصَنَٰتُ",  somaliName: "Juz Wal-Muxsanaat",       englishName: "Wal-Muhsanat",         surahStart: 5,  isOpen: true,  gradient: "from-lime-800 via-green-700 to-emerald-800",         glowColor: "#86efac" },
  { num: 6,  arabic: "لَا يُحِبُّ ٱللَّهُ", somaliName: "Juz Laa Yuxibbullaah",  englishName: "La Yuhibbullah",       surahStart: 6,  isOpen: true,  gradient: "from-emerald-800 via-teal-700 to-cyan-800",          glowColor: "#34d399" },
  { num: 7,  arabic: "وَإِذَا سَمِعُوا",  somaliName: "Juz Wa Iza Sami’uu",      englishName: "Wa-iza Sami'u",        surahStart: 7,  isOpen: true,  gradient: "from-teal-800 via-cyan-700 to-sky-800",              glowColor: "#2dd4bf" },
  { num: 8,  arabic: "وَلَوْ أَنَّنَا",   somaliName: "Juz Walaw Annanaa",       englishName: "Walaw Annana",         surahStart: 8,  isOpen: true,  gradient: "from-cyan-800 via-sky-700 to-blue-800",              glowColor: "#22d3ee" },
  { num: 9,  arabic: "قَالَ ٱلْمَلَأُ",  somaliName: "Juz Qaalal Mala’u",       englishName: "Qalal Mala",           surahStart: 9,  isOpen: true,  gradient: "from-sky-800 via-blue-700 to-indigo-800",            glowColor: "#60a5fa" },
  { num: 10, arabic: "وَاعْلَمُوٓا",      somaliName: "Juz Waclamuu",            englishName: "Wa'lamu",              surahStart: 10, isOpen: true,  gradient: "from-blue-800 via-indigo-700 to-violet-800",         glowColor: "#818cf8" },
  { num: 11, arabic: "يَعْتَذِرُونَ",     somaliName: "Juz Yacdhiruun",          englishName: "Ya'taziruna",          surahStart: 11, isOpen: true,  gradient: "from-indigo-800 via-violet-700 to-purple-800",       glowColor: "#a78bfa" },
  { num: 12, arabic: "وَمَا مِن دَآبَّةٍ", somaliName: "Juz Wa Maa Min Daabbah", englishName: "Wama min Dabbah",      surahStart: 12, isOpen: true,  gradient: "from-violet-800 via-purple-700 to-fuchsia-800",      glowColor: "#c084fc" },
  { num: 13, arabic: "وَمَآ أُبَرِّئُ",   somaliName: "Juz Wa Maa Ubarri’u",     englishName: "Wama Ubarri'u",        surahStart: 13, isOpen: true,  gradient: "from-purple-800 via-fuchsia-700 to-pink-800",        glowColor: "#e879f9" },
  { num: 14, arabic: "رُّبَمَا",          somaliName: "Juz Rubamaa",             englishName: "Rubama",               surahStart: 15, isOpen: true,  gradient: "from-fuchsia-800 via-pink-700 to-rose-800",          glowColor: "#f0abfc" },
  { num: 15, arabic: "سُبْحَانَ ٱلَّذِى",  somaliName: "Juz Subxaan",             englishName: "Subhanal-lazi",        surahStart: 17, isOpen: true,  gradient: "from-rose-800 via-red-700 to-orange-800",            glowColor: "#fda4af" },
  { num: 16, arabic: "قَالَ أَلَمْ",      somaliName: "Juz Qaal Alam",           englishName: "Qala Alam",            surahStart: 18, isOpen: true,  gradient: "from-orange-700 via-amber-600 to-yellow-700",        glowColor: "#fdba74" },
  { num: 17, arabic: "ٱقْتَرَبَ",         somaliName: "Juz Iqtaraba",            englishName: "Iqtaraba",             surahStart: 21, isOpen: true,  gradient: "from-yellow-700 via-green-700 to-teal-700",          glowColor: "#fef08a" },
  { num: 18, arabic: "قَدْ أَفْلَحَ",     somaliName: "Juz Qad Aflaxa",          englishName: "Qad Aflaha",           surahStart: 23, isOpen: true,  gradient: "from-green-800 via-emerald-700 to-cyan-800",         glowColor: "#6ee7b7" },
  { num: 19, arabic: "وَقَالَ ٱلَّذِينَ", somaliName: "Juz Qaalalladiina",       englishName: "Waqalal-lazina",       surahStart: 25, isOpen: true,  gradient: "from-teal-800 via-blue-700 to-indigo-800",           glowColor: "#5eead4" },
  { num: 20, arabic: "أَمَّنْ خَلَقَ",    somaliName: "Juz Amaan Khalaqa",       englishName: "Amman Khalaqa",        surahStart: 27, isOpen: true,  gradient: "from-cyan-800 via-cyan-700 to-teal-700",             glowColor: "#22d3ee" },
  { num: 21, arabic: "أَمَّن يَتَسَآءَ",  somaliName: "Juz Utlu Maa Uuxiya",     englishName: "Amma Yatasaa",         surahStart: 29, isOpen: true,  gradient: "from-sky-800 via-blue-700 to-sky-700",               glowColor: "#60a5fa" },
  { num: 22, arabic: "وَمَن يَقْنُتْ",    somaliName: "Juz Wa Man Yaqnut",       englishName: "Wa Man Yaqnut",        surahStart: 33, isOpen: true,  gradient: "from-violet-800 via-violet-700 to-purple-700",       glowColor: "#a78bfa" },
  { num: 23, arabic: "وَمَآ أُبَرِّئُ",   somaliName: "Juz Wa Maa Li",           englishName: "Wama Ubarri'u",        surahStart: 36, isOpen: true,  gradient: "from-fuchsia-800 via-fuchsia-700 to-pink-700",       glowColor: "#e879f9" },
  { num: 24, arabic: "فَمَنْ أَظْلَمُ",   somaliName: "Juz Faman Azhlem",        englishName: "Faman Azlamu",         surahStart: 39, isOpen: true,  gradient: "from-rose-800 via-rose-700 to-red-700",              glowColor: "#fb7185" },
  { num: 25, arabic: "إِلَيْهِ يُرَدُّ",  somaliName: "Juz Ilayhi Yuraddu",      englishName: "Ilayhi Yuraddu",       surahStart: 41, isOpen: true,  gradient: "from-orange-800 via-orange-700 to-amber-700",        glowColor: "#fb923c" },
  { num: 26, arabic: "حٰمٓ",              somaliName: "Juz Xaa Miim",            englishName: "Ha Mim",               surahStart: 46, isOpen: true,  gradient: "from-yellow-700 via-yellow-600 to-lime-700",         glowColor: "#fbbf24" },
  { num: 27, arabic: "قَالَ فَمَا خَطْبُكُمْ", somaliName: "Juz Qaal Famaa",   englishName: "Qala Fama",            surahStart: 51, isOpen: true,  gradient: "from-lime-800 via-lime-700 to-green-700",            glowColor: "#86efac" },
  { num: 28, arabic: "قَدْ سَمِعَ ٱللَّهُ", somaliName: "Juz Qad Sami’allaah", englishName: "Qad Sami'a",           surahStart: 58, isOpen: true,  gradient: "from-teal-800 via-teal-700 to-cyan-700",             glowColor: "#2dd4bf" },
  { num: 29, arabic: "تَبَارَكَ",         somaliName: "Juz Tabaarak",            englishName: "Tabaraka",             surahStart: 67, isOpen: true,  gradient: "from-emerald-800 via-emerald-700 to-teal-700",       glowColor: "#34d399" },
  { num: 30, arabic: "جُزْءُ عَمَّ",      somaliName: "Juz Camma",               englishName: "Juz Amma — 38 Surah", surahStart: 78, isOpen: true,  gradient: "from-green-800 via-emerald-700 to-green-700",        glowColor: "#4ade80" },
];

// (Inta kale code-kaaga waxba lagama badalin — waa sida uu ahaa)
