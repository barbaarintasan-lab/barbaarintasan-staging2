import { ReactNode } from "react";

interface MushafFrameProps {
  children: ReactNode;
  className?: string;
}

export default function MushafFrame({ children, className = "" }: MushafFrameProps) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 pointer-events-none">
        <svg viewBox="0 0 400 560" className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="frameGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2d7a4f" />
              <stop offset="50%" stopColor="#1e5c3a" />
              <stop offset="100%" stopColor="#2d7a4f" />
            </linearGradient>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d4af37" />
              <stop offset="50%" stopColor="#f4d03f" />
              <stop offset="100%" stopColor="#d4af37" />
            </linearGradient>
          </defs>
          
          <rect x="0" y="0" width="400" height="560" rx="8" fill="url(#frameGradient)" />
          <rect x="4" y="4" width="392" height="552" rx="6" fill="none" stroke="url(#goldGradient)" strokeWidth="2" />
          <rect x="10" y="10" width="380" height="540" rx="4" fill="none" stroke="url(#goldGradient)" strokeWidth="1" />
          
          <circle cx="20" cy="20" r="6" fill="#e8b4c8" opacity="0.8" />
          <circle cx="380" cy="20" r="6" fill="#e8b4c8" opacity="0.8" />
          <circle cx="20" cy="540" r="6" fill="#e8b4c8" opacity="0.8" />
          <circle cx="380" cy="540" r="6" fill="#e8b4c8" opacity="0.8" />
          
          <circle cx="200" cy="12" r="4" fill="#e8b4c8" opacity="0.6" />
          <circle cx="200" cy="548" r="4" fill="#e8b4c8" opacity="0.6" />
          <circle cx="12" cy="280" r="4" fill="#e8b4c8" opacity="0.6" />
          <circle cx="388" cy="280" r="4" fill="#e8b4c8" opacity="0.6" />
          
          <path d="M 30 8 Q 200 -5 370 8" fill="none" stroke="url(#goldGradient)" strokeWidth="1.5" opacity="0.7" />
          <path d="M 30 552 Q 200 565 370 552" fill="none" stroke="url(#goldGradient)" strokeWidth="1.5" opacity="0.7" />
          
          <rect x="16" y="16" width="368" height="528" rx="3" fill="#fefdf8" />
        </svg>
      </div>
      
      <div className="relative z-10 p-4">
        {children}
      </div>
    </div>
  );
}

export function MushafPageFrame({ children, className = "" }: MushafFrameProps) {
  return (
    <div className={`relative bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-700 rounded-lg shadow-2xl overflow-hidden ${className}`}>
      <div className="absolute top-0 left-0 w-8 h-8">
        <svg viewBox="0 0 32 32" className="w-full h-full">
          <path d="M0 0 Q16 8 32 0 L32 32 Q24 16 0 32 Z" fill="rgba(255,255,255,0.1)" />
          <circle cx="8" cy="8" r="4" fill="#f0a0b8" opacity="0.6" />
        </svg>
      </div>
      <div className="absolute top-0 right-0 w-8 h-8 transform scale-x-[-1]">
        <svg viewBox="0 0 32 32" className="w-full h-full">
          <path d="M0 0 Q16 8 32 0 L32 32 Q24 16 0 32 Z" fill="rgba(255,255,255,0.1)" />
          <circle cx="8" cy="8" r="4" fill="#f0a0b8" opacity="0.6" />
        </svg>
      </div>
      <div className="absolute bottom-0 left-0 w-8 h-8 transform scale-y-[-1]">
        <svg viewBox="0 0 32 32" className="w-full h-full">
          <path d="M0 0 Q16 8 32 0 L32 32 Q24 16 0 32 Z" fill="rgba(255,255,255,0.1)" />
          <circle cx="8" cy="8" r="4" fill="#f0a0b8" opacity="0.6" />
        </svg>
      </div>
      <div className="absolute bottom-0 right-0 w-8 h-8 transform scale-[-1]">
        <svg viewBox="0 0 32 32" className="w-full h-full">
          <path d="M0 0 Q16 8 32 0 L32 32 Q24 16 0 32 Z" fill="rgba(255,255,255,0.1)" />
          <circle cx="8" cy="8" r="4" fill="#f0a0b8" opacity="0.6" />
        </svg>
      </div>
      
      <div className="absolute inset-2 border-2 border-yellow-500/30 rounded pointer-events-none" />
      <div className="absolute inset-3 border border-yellow-500/20 rounded pointer-events-none" />
      
      <div className="relative m-4 bg-[#fefdf8] rounded shadow-inner overflow-hidden">
        {children}
      </div>
    </div>
  );
}
