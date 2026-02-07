import { Link } from "wouter";
import { LogIn } from "lucide-react";
import { useParentAuth } from "@/contexts/ParentAuthContext";

export default function TopBar() {
  const { parent } = useParentAuth();

  return (
    <>
      <div className="fixed top-0 left-1/2 -translate-x-1/2 z-[60] w-full max-w-2xl">
        <div className="bg-white border-b-0 px-4 py-2 flex items-center justify-between">
          {/* Left: Sign In button (hidden when logged in) */}
          <div className="w-20">
            {!parent && (
              <Link href="/profile">
                <button 
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-orange-600 rounded-full hover:from-orange-600 hover:to-orange-700 transition-all shadow-sm"
                  data-testid="button-sign-in"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Gal</span>
                </button>
              </Link>
            )}
          </div>

          {/* Center: Logo and name */}
          <div className="flex items-center gap-2">
            <img 
              src="/logo.png" 
              alt="Barbaarintasan" 
              className="w-8 h-8 rounded-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <span className="font-bold text-sm text-gray-800">Barbaarintasan</span>
          </div>

          {/* Right: Empty space for balance */}
          <div className="w-20" />
        </div>
      </div>
      <div className="h-12" />
    </>
  );
}
