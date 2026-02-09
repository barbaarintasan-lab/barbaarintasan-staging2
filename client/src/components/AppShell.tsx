import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Home, BookOpen, BrainCircuit, User, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useParentAuth } from "@/contexts/ParentAuthContext";

interface AppShellProps {
  children: ReactNode;
  hideNav?: boolean;
  headerTitle?: string;
  headerAction?: ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
}

export default function AppShell({ 
  children, 
  hideNav = false,
  headerTitle,
  headerAction,
  showBackButton = false,
  onBack
}: AppShellProps) {
  const [location] = useLocation();
  const { parent } = useParentAuth();

  const navItems = [
    { icon: Home, label: "Hoyga", path: "/" },
    { icon: BookOpen, label: "Koorsooyin", path: "/courses" },
    { icon: BrainCircuit, label: "Quiz", path: "/quiz" },
    { icon: User, label: "Profile-kaaga", path: "/profile" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col safe-area-inset">
      {/* Desktop Top Navigation - hidden on mobile */}
      {!hideNav && (
        <nav className="hidden lg:block sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/">
                <div className="flex items-center gap-3 cursor-pointer">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-bold text-xl text-gray-900">Barbaarintasan Academy</span>
                </div>
              </Link>
              
              {/* Desktop Nav Links */}
              <div className="flex items-center gap-2">
                {navItems.map((item) => {
                  const isActive = location === item.path || 
                    (item.path === "/" && location === "/") ||
                    (item.path !== "/" && location.startsWith(item.path));
                  return (
                    <Link key={item.path} href={item.path}>
                      <div className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all",
                        isActive 
                          ? "bg-blue-50 text-blue-600" 
                          : "text-gray-600 hover:bg-gray-100"
                      )}>
                        <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                        <span className="font-medium">{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </nav>
      )}
      {headerTitle && (
        <header className="sticky top-0 z-40 bg-white border-b border-gray-100 safe-top">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-3">
              {showBackButton && (
                <button 
                  onClick={onBack || (() => window.history.back())}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <h1 className="text-lg font-bold text-gray-900 truncate">{headerTitle}</h1>
            </div>
            {headerAction}
          </div>
        </header>
      )}

      <main className={cn(
        "flex-1",
        !hideNav && "pb-24 lg:pb-0"
      )}>
        {children}
      </main>

      {/* Bottom navigation - hidden on desktop (lg:hidden) */}
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom lg:hidden">
          <div className="bg-white border-t border-gray-200 shadow-lg">
            <div className="flex items-center justify-around h-16 max-w-md mx-auto">
              {navItems.map((item) => {
                const isActive = location === item.path || 
                  (item.path === "/" && location === "/") ||
                  (item.path !== "/" && location.startsWith(item.path));
                return (
                  <Link key={item.path} href={item.path}>
                    <div className={cn(
                      "flex flex-col items-center justify-center w-16 h-full cursor-pointer transition-all",
                      isActive ? "text-orange-500" : "text-gray-400"
                    )}>
                      <item.icon 
                        className={cn(
                          "w-6 h-6 mb-1 transition-transform",
                          isActive && "scale-110"
                        )} 
                        strokeWidth={isActive ? 2.5 : 2} 
                      />
                      <span className={cn(
                        "text-[10px] font-semibold",
                        isActive ? "text-orange-500" : "text-gray-400"
                      )}>
                        {item.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}
