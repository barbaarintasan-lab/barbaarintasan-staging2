import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import {
  Home,
  BookOpen,
  User,
  CalendarCheck,
  MessageCircle,
  Share2,
  Smartphone,
  X,
  ArrowUp,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useParentAuth } from "@/contexts/ParentAuthContext";
import { useIsAuthPage } from "@/hooks/useIsAuthPage";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function BottomNav() {
  const [location, setLocation] = useLocation();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { parent } = useParentAuth();
  const [showSocialSection, setShowSocialSection] = useState(false);

  // Check if current page is an authentication page
  const isAuthPage = useIsAuthPage();

  const hideOnPages = ["/parent-tips", "/talooyinka-waalidka"];
  const shouldHide = hideOnPages.some(p => location.startsWith(p));

  // Focus mode check from URL hash - reactive to hash changes
  const [isFocusMode, setIsFocusMode] = useState(
    () =>
      window.location.hash === "#quran-focus" ||
      window.location.hash.includes("focus"),
  );

  useEffect(() => {
    const checkFocusMode = () => {
      const hash = window.location.hash;
      setIsFocusMode(hash === "#quran-focus" || hash.includes("focus"));
    };

    window.addEventListener("hashchange", checkFocusMode);
    // Also check periodically for SPA navigation
    const interval = setInterval(checkFocusMode, 500);

    return () => {
      window.removeEventListener("hashchange", checkFocusMode);
      clearInterval(interval);
    };
  }, []);

  // Unread notifications count
  const { data: unreadData } = useQuery({
    queryKey: ["unread-notification-count"],
    queryFn: async () => {
      const res = await fetch("/api/parent/notifications/unread-count", {
        credentials: "include",
      });
      if (!res.ok) return { count: 0 };
      return res.json();
    },
    enabled: !!parent,
    refetchInterval: 60000, // Refresh every minute
  });

  const unreadCount = unreadData?.count || 0;

  // PWA Install State
  const [showPWAModal, setShowPWAModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(true);
  const [pwaInstalled, setPwaInstalled] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      const scrolledToBottom = scrollTop + clientHeight >= scrollHeight - 100;
      setShowSocialSection(scrolledToBottom);
      setShowScrollTop(scrollTop > 300);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // PWA Install Logic
  useEffect(() => {
    const isInStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isInStandaloneMode);

    if (isInStandaloneMode) return;

    const wasInstalled = localStorage.getItem("pwa-installed") === "true";
    if (wasInstalled) {
      setPwaInstalled(true);
      return;
    }

    const iosCheck = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iosCheck);

    const mobileCheck =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );
    setIsMobile(mobileCheck);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    window.addEventListener("appinstalled", () => {
      setShowPWAModal(false);
      setPwaInstalled(true);
      localStorage.setItem("pwa-installed", "true");
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handlePWAInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowPWAModal(false);
        localStorage.setItem("pwa-installed", "true");
      }
      setDeferredPrompt(null);
    } else {
      setShowPWAModal(true);
    }
  };

  const handlePWAClick = () => {
    if (deferredPrompt) {
      handlePWAInstall();
    } else {
      setShowPWAModal(true);
    }
  };

  const showPWAButton = !isStandalone && !pwaInstalled;

  const navItems = [
    { icon: Home, label: t("nav.home"), path: "/" },
    { icon: BookOpen, label: t("nav.courses"), path: "/courses" },
    { icon: CalendarCheck, label: t("nav.calendar"), path: "/calendar" },
    { icon: User, label: t("nav.profile"), path: "/profile" },
  ];

  const whatsappNumber = "252907790584";
  const whatsappMessage = encodeURIComponent(
    "Asalaamu Aleykum! Waxaan kaala soo xidhiidhayaa App-ka Barbaarintasan Academy. Waxaan u baahanahay Caawimaad App-ka ah",
  );
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  const socialLinks = [
    {
      name: "Facebook Group",
      url: "https://www.facebook.com/profile.php?id=100033615385746",
      color: "bg-blue-600 hover:bg-blue-700",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
        </svg>
      ),
    },
    {
      name: "Facebook",
      url: "https://www.facebook.com/profile.php?id=100033615385746",
      color: "bg-blue-600 hover:bg-blue-700",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      name: "Instagram",
      url: "https://www.instagram.com/barbaarintasanacademy/?hl=en",
      color:
        "bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 hover:from-purple-700 hover:via-pink-600 hover:to-orange-500",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      ),
    },
    {
      name: "TikTok",
      url: "https://www.tiktok.com/@barbaarintasan_academy?is_from_webapp=1&sender_device=pc",
      color: "bg-black hover:bg-gray-800",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
        </svg>
      ),
    },
    {
      name: "Telegram",
      url: "https://t.me/+Vv4daxdI1LMwNmVk",
      color: "bg-sky-500 hover:bg-sky-600",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.751-.244-1.349-.374-1.297-.789.027-.216.324-.437.892-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.141.121.099.154.232.169.327.016.096.035.311.02.481z" />
        </svg>
      ),
    },
  ];

  const handleNavClick = (e: React.MouseEvent, path: string) => {
    window.scrollTo({ top: 0, behavior: "instant" });

    if (location === path) {
      e.preventDefault();
      queryClient.invalidateQueries();
    } else {
      setLocation(path);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: "Barbaarintasan Academy",
      text: "Barbaarintasan Academy - Machadka ugu fiican ee tarbiyadda caruurta Soomaaliyeed. Ka bilow maanta!",
      url: "https://appbarbaarintasan.com/",
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or error occurred
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(
          `${shareData.text} ${shareData.url}`,
        );
        alert("Link waa la nuqulay!");
      } catch (err) {
        // Clipboard not available
      }
    }
  };

  return (
    <div
      className={cn(
        "fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-[672px] transition-all duration-500",
        isFocusMode || shouldHide
          ? "translate-y-full opacity-0 pointer-events-none"
          : "translate-y-0 opacity-100",
      )}
    >
      {/* Share Section - Above Navigation (only shows when scrolled to bottom) */}
      <div
        className={cn(
          "bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-100 px-3 py-1.5 transition-all duration-300 overflow-hidden",
          showSocialSection &&
            location !== "/share-info" &&
            location !== "/sheeko" &&
            location !== "/ai-caawiye" &&
            location !== "/homework-helper" &&
            location !== "/tarbiya-helper" &&
            !isAuthPage
            ? "max-h-12 opacity-100"
            : "max-h-0 opacity-0 py-0 border-t-0",
        )}
      >
        <div className="flex items-center justify-between">
          {/* Share Button */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-full border border-blue-200 shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            <Share2 className="w-3 h-3 text-blue-600" />
            <span className="text-[11px] font-medium text-gray-700">Share</span>
          </button>

          {/* Social Media Icons */}
          <div className="flex items-center gap-1">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.name}
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-white transition-all active:scale-95",
                  social.color,
                )}
              >
                <span className="w-3 h-3 flex items-center justify-center">
                  {social.icon}
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav>
        <div
          className="bg-white/70 backdrop-blur-xl border-t border-white/30 shadow-[0_-4px_30px_rgba(0,0,0,0.1)]"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <div className="flex items-center justify-around h-14 px-1">
            {navItems.map((item) => {
              const isActive =
                location === item.path ||
                (item.path !== "/" && location.startsWith(item.path));

              return (
                <div
                  key={item.path}
                  onClick={(e) => handleNavClick(e, item.path)}
                  className={cn(
                    "flex flex-col items-center justify-center py-1.5 px-2 cursor-pointer transition-all active:scale-95 rounded-lg min-w-0",
                    isActive ? "bg-orange-500/20" : "hover:bg-gray-100/50",
                  )}
                >
                  <div
                    className={cn(
                      "w-6 h-6 flex items-center justify-center mb-1 transition-colors",
                      isActive ? "text-orange-600" : "text-gray-500",
                    )}
                  >
                    <item.icon className="w-6 h-6" strokeWidth={2} />
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-bold transition-colors text-center",
                      isActive ? "text-orange-600" : "text-gray-600",
                    )}
                  >
                    {item.label}
                  </span>
                </div>
              );
            })}
            {/* Notification Bell with Badge */}
            {parent && (
              <div
                onClick={(e) => handleNavClick(e, "/notifications")}
                className={cn(
                  "flex flex-col items-center justify-center py-1.5 px-2 cursor-pointer transition-all active:scale-95 rounded-lg relative min-w-0",
                  location === "/notifications"
                    ? "bg-orange-500/20"
                    : "hover:bg-gray-100/50",
                )}
                data-testid="button-notifications-nav"
              >
                <div
                  className={cn(
                    "w-6 h-6 flex items-center justify-center mb-1 transition-colors relative",
                    location === "/notifications"
                      ? "text-orange-600"
                      : "text-gray-500",
                  )}
                >
                  <Bell className="w-6 h-6" strokeWidth={2} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-bold transition-colors text-center",
                    location === "/notifications"
                      ? "text-orange-600"
                      : "text-gray-600",
                  )}
                >
                  Fariin
                </span>
              </div>
            )}
            {showPWAButton && (
              <div
                onClick={handlePWAClick}
                className="flex flex-col items-center justify-center py-1.5 px-2 cursor-pointer transition-all active:scale-95 rounded-lg hover:bg-orange-100/50 min-w-0"
                data-testid="button-pwa-nav"
              >
                <div className="w-6 h-6 flex items-center justify-center mb-1 text-orange-600">
                  <Smartphone className="w-6 h-6" strokeWidth={2} />
                </div>
                <span className="text-[10px] font-bold text-orange-600 text-center">
                  Install
                </span>
              </div>
            )}
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <div className="flex flex-col items-center justify-center py-1.5 px-2 cursor-pointer transition-all active:scale-95 rounded-lg hover:bg-green-100/50 min-w-0">
                <div className="w-6 h-6 flex items-center justify-center mb-1 text-green-600">
                  <MessageCircle className="w-6 h-6" strokeWidth={2} />
                </div>
                <span className="text-[10px] font-bold text-green-600 text-center">
                  WhatsApp
                </span>
              </div>
            </a>
          </div>
        </div>
      </nav>

      {/* Floating Scroll to Top Button */}
      {showScrollTop && !isAuthPage && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-28 right-4 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 z-50"
          data-testid="button-scroll-top"
          aria-label="Xagga sare u laabo"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      )}

      {/* PWA Install Modal */}
      {showPWAModal && (
        <div
          className="fixed inset-0 bg-black/60 z-[60] flex items-end justify-center p-4"
          onClick={() => setShowPWAModal(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-t-3xl rounded-b-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-orange-500 to-red-600 p-4 text-center text-white relative">
              <button
                onClick={() => setShowPWAModal(false)}
                className="absolute top-2 right-2 text-white/80 hover:text-white p-1"
                aria-label="Xir"
              >
                <X className="w-5 h-5" />
              </button>
              <Smartphone className="w-12 h-12 mx-auto mb-2" />
              <h3 className="font-bold text-lg">📲 Ku Dar Home Screen</h3>
              <p className="text-sm text-white/90">
                BSA App-ka taleefankaaga ku kaydi
              </p>
            </div>

            <div className="p-4">
              {deferredPrompt ? (
                <Button
                  onClick={handlePWAInstall}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold text-lg py-6 rounded-xl"
                  data-testid="button-install-pwa"
                >
                  <Smartphone className="w-5 h-5 mr-2" />
                  Install Now
                </Button>
              ) : isIOS ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-xl">
                      1
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">
                        Riix Share button
                      </p>
                      <p className="text-sm text-gray-500">
                        Hoose browser-ka ⬆️
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-xl">
                      2
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">
                        Dooro "Add to Home Screen"
                      </p>
                      <p className="text-sm text-gray-500">
                        Hoos u scroll-garee si aad u aragto
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-xl">
                      ✓
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">Riix "Add"</p>
                      <p className="text-sm text-gray-500">
                        BSA wuu ku dari doonaa Home Screen
                      </p>
                    </div>
                  </div>
                </div>
              ) : !isMobile ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-xl">
                      1
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">
                        Riix icon-ka install
                      </p>
                      <p className="text-sm text-gray-500">
                        URL bar-ka geeska midig ⊕
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-xl">
                      2
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">
                        Ama Menu ⋮ → "Install BSA.v1"
                      </p>
                      <p className="text-sm text-gray-500">
                        Chrome menu geeska sare midig
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-xl">
                      ✓
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">Riix "Install"</p>
                      <p className="text-sm text-gray-500">
                        BSA wuxuu ku dari doonaa Desktop/Start Menu
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-xl">
                      1
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">
                        Riix icon-ka ⬇️ ee URL bar-ka
                      </p>
                      <p className="text-sm text-gray-500">
                        Geeska sare midig ee cinwaanka
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-xl">
                      ✓
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">Riix "Add"</p>
                      <p className="text-sm text-gray-500">
                        BSA wuu ku dari doonaa Home Screen
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
