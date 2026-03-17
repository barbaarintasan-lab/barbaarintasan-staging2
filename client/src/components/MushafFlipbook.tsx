import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { MushafPageFrame } from "./MushafFrame";

interface MushafFlipbookProps {
  currentPage: number;
  onPageChange: (page: number) => void;
  totalPages?: number;
  className?: string;
  compactControls?: boolean;
}

export default function MushafFlipbook({
  currentPage,
  onPageChange,
  totalPages = 604,
  className = "",
  compactControls = false,
}: MushafFlipbookProps) {
  const [showControls, setShowControls] = useState(!compactControls);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTap = useCallback(() => {
    if (compactControls) {
      setShowControls(prev => !prev);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (!showControls) {
        controlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false);
        }, 4000);
      }
    }
  }, [compactControls, showControls]);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<"left" | "right">("right");
  const prevPageRef = useRef(currentPage);
  const currentUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    
    if (currentPage !== prevPageRef.current) {
      setFlipDirection(currentPage > prevPageRef.current ? "left" : "right");
      setIsFlipping(true);
      setTimeout(() => {
        if (!cancelled) setIsFlipping(false);
      }, 300);
      prevPageRef.current = currentPage;
    }

    const loadPage = async () => {
      try {
        const response = await fetch(`/api/mushaf/page/${currentPage}`);
        if (response.ok && !cancelled) {
          const svgText = await response.text();
          const blob = new Blob([svgText], { type: "image/svg+xml" });
          const url = URL.createObjectURL(blob);
          
          if (currentUrlRef.current) {
            URL.revokeObjectURL(currentUrlRef.current);
          }
          currentUrlRef.current = url;
          setImageUrl(url);
          setLoading(false);
        }
      } catch (error) {
        console.error(`Failed to load page ${currentPage}:`, error);
        if (!cancelled) setLoading(false);
      }
    };

    loadPage();

    return () => {
      cancelled = true;
    };
  }, [currentPage]);

  useEffect(() => {
    return () => {
      if (currentUrlRef.current) {
        URL.revokeObjectURL(currentUrlRef.current);
      }
    };
  }, []);

  const goToPrevPage = useCallback(() => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  }, [currentPage, onPageChange]);

  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  }, [currentPage, totalPages, onPageChange]);

  const handleSwipe = useCallback((e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    const startX = (e.target as any).dataset.startX;
    if (!startX) return;
    
    const diff = touch.clientX - parseFloat(startX);
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToPrevPage();
      } else {
        goToNextPage();
      }
    }
  }, [goToPrevPage, goToNextPage]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    (e.target as any).dataset.startX = touch.clientX.toString();
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div 
        className="touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleSwipe}
        onClick={(e) => {
          // Pass click to parent if needed for focus mode
          const event = new CustomEvent('mushaf-click', { bubbles: true });
          e.currentTarget.dispatchEvent(event);
        }}
      >
        <MushafPageFrame className="mx-auto w-full">
          <div className={`transition-all duration-300 ease-out ${
            isFlipping 
              ? flipDirection === "left" 
                ? "translate-x-[-10px] opacity-80" 
                : "translate-x-[10px] opacity-80"
              : "translate-x-0 opacity-100"
          }`}>
            {loading ? (
              <div className="w-full aspect-[3/4] flex items-center justify-center bg-[#fefdf8]">
                <div className="text-center">
                  <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mx-auto mb-2" />
                  <p className="text-sm text-emerald-700">Bogga {currentPage}</p>
                </div>
              </div>
            ) : imageUrl ? (
              <img
                src={imageUrl}
                alt={`Mushaf Page ${currentPage}`}
                className="w-full h-auto"
                data-testid="mushaf-page-image"
              />
            ) : (
              <div className="w-full aspect-[3/4] flex items-center justify-center bg-[#fefdf8]">
                <p className="text-sm text-red-500">Page not found</p>
              </div>
            )}
          </div>
        </MushafPageFrame>
      </div>

      {/* Navigation buttons - hide in compact mode unless controls visible */}
      <button
        onClick={goToNextPage}
        disabled={currentPage >= totalPages}
        className={`absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur rounded-full shadow-lg flex items-center justify-center text-emerald-700 hover:bg-white hover:text-emerald-800 disabled:opacity-30 disabled:cursor-not-allowed z-20 active:scale-95 transition-all duration-300 ${
          compactControls 
            ? `w-9 h-9 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}` 
            : 'w-12 h-12'
        }`}
        data-testid="mushaf-next-page"
      >
        <ChevronLeft className={compactControls ? "w-5 h-5" : "w-6 h-6"} />
      </button>

      <button
        onClick={goToPrevPage}
        disabled={currentPage <= 1}
        className={`absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur rounded-full shadow-lg flex items-center justify-center text-emerald-700 hover:bg-white hover:text-emerald-800 disabled:opacity-30 disabled:cursor-not-allowed z-20 active:scale-95 transition-all duration-300 ${
          compactControls 
            ? `w-9 h-9 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}` 
            : 'w-12 h-12'
        }`}
        data-testid="mushaf-prev-page"
      >
        <ChevronRight className={compactControls ? "w-5 h-5" : "w-6 h-6"} />
      </button>

      {/* Page counter - hide in compact mode unless controls visible */}
      <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 bg-emerald-800/90 backdrop-blur text-white rounded-full font-medium shadow-lg transition-all duration-300 ${
        compactControls 
          ? `px-3 py-1.5 text-xs ${showControls ? 'opacity-100' : 'opacity-0'}` 
          : 'px-4 py-2 text-sm'
      }`}>
        <span className="font-arabic">{currentPage}</span> / {totalPages}
      </div>
    </div>
  );
}
