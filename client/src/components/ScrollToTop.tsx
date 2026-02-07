import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export function ScrollToTop() {
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowButton(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!showButton) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-40 right-3 z-50 w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full shadow-xl flex items-center justify-center text-white hover:scale-110 transition-all animate-in fade-in slide-in-from-bottom duration-300"
      aria-label="Scroll to top"
      data-testid="button-scroll-top"
    >
      <ArrowUp className="w-6 h-6" />
    </button>
  );
}
