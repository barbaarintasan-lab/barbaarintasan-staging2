import { useState, useEffect, useCallback } from "react";

export interface QuranAyah {
  number: number;
  text: string;
  juz: number;
  page: number;
}

export interface QuranSurah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: string;
  numberOfAyahs: number;
  ayahs: QuranAyah[];
}

const surahCache = new Map<number, QuranSurah>();

export function useQuranText(surahNumber: number | null) {
  const [surah, setSurah] = useState<QuranSurah | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!surahNumber) {
      setSurah(null);
      return;
    }

    if (surahCache.has(surahNumber)) {
      setSurah(surahCache.get(surahNumber)!);
      return;
    }

    setLoading(true);
    setError(null);

    const paddedNum = surahNumber.toString().padStart(3, "0");
    fetch(`/quran/${paddedNum}.json`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load surah");
        return res.json();
      })
      .then((data: QuranSurah) => {
        surahCache.set(surahNumber, data);
        setSurah(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading surah:", err);
        setError("Ma suurtogalin in la soo dejiso qoraalka");
        setLoading(false);
      });
  }, [surahNumber]);

  return { surah, loading, error };
}

export function useAyahSync(
  audioRef: React.RefObject<HTMLAudioElement | null>,
  surah: QuranSurah | null,
  isPlaying: boolean
) {
  const [currentAyahIndex, setCurrentAyahIndex] = useState<number>(0);
  const [estimatedTimings, setEstimatedTimings] = useState<number[]>([]);

  useEffect(() => {
    if (!surah) {
      setCurrentAyahIndex(0);
      setEstimatedTimings([]);
      return;
    }

    const totalAyahs = surah.numberOfAyahs;
    const timings: number[] = [];
    let accumulatedTime = 0;
    
    for (let i = 0; i < totalAyahs; i++) {
      timings.push(accumulatedTime);
      const ayahLength = surah.ayahs[i]?.text.length || 50;
      const estimatedDuration = Math.max(3, ayahLength * 0.08);
      accumulatedTime += estimatedDuration;
    }
    
    setEstimatedTimings(timings);
    setCurrentAyahIndex(0);
  }, [surah]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !surah || !isPlaying || estimatedTimings.length === 0) return;

    const handleTimeUpdate = () => {
      const currentTime = audio.currentTime;
      const duration = audio.duration;
      
      if (!isFinite(duration) || duration === 0) return;

      const scaleFactor = duration / (estimatedTimings[estimatedTimings.length - 1] + 5);
      const scaledTimings = estimatedTimings.map(t => t * scaleFactor);
      
      let newIndex = 0;
      for (let i = scaledTimings.length - 1; i >= 0; i--) {
        if (currentTime >= scaledTimings[i]) {
          newIndex = i;
          break;
        }
      }
      
      if (newIndex !== currentAyahIndex) {
        setCurrentAyahIndex(newIndex);
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    return () => audio.removeEventListener("timeupdate", handleTimeUpdate);
  }, [audioRef, surah, isPlaying, estimatedTimings, currentAyahIndex]);

  const seekToAyah = useCallback((ayahIndex: number) => {
    const audio = audioRef.current;
    if (!audio || !surah || estimatedTimings.length === 0) return;

    const duration = audio.duration;
    if (!isFinite(duration) || duration === 0) return;

    const scaleFactor = duration / (estimatedTimings[estimatedTimings.length - 1] + 5);
    const targetTime = estimatedTimings[ayahIndex] * scaleFactor;
    
    audio.currentTime = targetTime;
    setCurrentAyahIndex(ayahIndex);
  }, [audioRef, surah, estimatedTimings]);

  return { currentAyahIndex, seekToAyah };
}
