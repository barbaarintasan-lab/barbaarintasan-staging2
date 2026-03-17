import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useChildAuth } from "@/contexts/ChildAuthContext";
import { BookOpen, Star, Moon, LogIn, ArrowLeft, Eye, EyeOff, Plus, User, Loader2 } from "lucide-react";
import { toast } from "sonner";

const AVATAR_COLORS = ["#FFD93D", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8"];

function sanitizeAgeInput(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

interface ChildProfile {
  id: string;
  parentId: string;
  name: string;
  age: number;
  username: string;
  avatarColor: string;
}

export default function ChildLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useChildAuth();
  const [, setLocation] = useLocation();

  const [parentLoggedIn, setParentLoggedIn] = useState(false);
  const [parentChildren, setParentChildren] = useState<ChildProfile[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [selectedChild, setSelectedChild] = useState<ChildProfile | null>(null);
  const [childPassword, setChildPassword] = useState("");
  const [showChildPassword, setShowChildPassword] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newChild, setNewChild] = useState({ name: "", age: "", username: "", password: "", avatarColor: AVATAR_COLORS[0] });
  const [creatingChild, setCreatingChild] = useState(false);

  useEffect(() => {
    fetch("/api/auth/parent/me", { credentials: "include" })
      .then(r => {
        if (r.ok) {
          setParentLoggedIn(true);
          return fetch("/api/children", { credentials: "include" });
        }
        setParentLoggedIn(false);
        setLoadingChildren(false);
        return null;
      })
      .then(r => r ? r.json() : null)
      .then(data => {
        if (Array.isArray(data)) setParentChildren(data);
        setLoadingChildren(false);
      })
      .catch(() => setLoadingChildren(false));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error("Buuxi username iyo password");
      return;
    }
    setIsLoading(true);
    try {
      await login(username.trim(), password.trim());
      setLocation("/child-dashboard");
    } catch (err: any) {
      toast.error(err.message || "Login wuu ku guul dareeystay");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChildSelect = async (child: ChildProfile) => {
    setSelectedChild(child);
    setChildPassword("");
    setShowChildPassword(false);
  };

  const handleChildLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChild || !childPassword.trim()) {
      toast.error("Password gali");
      return;
    }
    setIsLoading(true);
    try {
      await login(selectedChild.username, childPassword.trim());
      setLocation("/child-dashboard");
    } catch (err: any) {
      toast.error(err.message || "Password-ka waa khalad");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChild.name.trim() || !newChild.age || !newChild.username.trim() || !newChild.password.trim()) {
      toast.error("Buuxi dhammaan meelaha");
      return;
    }

    const ageValue = parseInt(newChild.age, 10);
    if (!Number.isInteger(ageValue) || ageValue < 3 || ageValue > 15) {
      toast.error("Da'da waa inay noqotaa 3 ilaa 10 Sano");
      return;
    }

    setCreatingChild(true);
    try {
      const res = await fetch("/api/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...newChild, age: String(ageValue) }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Khalad ayaa dhacay");
      }
      const created = await res.json();
      setParentChildren(prev => [...prev, created]);
      setShowAddForm(false);
      setNewChild({ name: "", age: "", username: "", password: "", avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)] });
      toast.success(`${created.name} Ilmaha akoonkiisi waa la sameeyay!`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreatingChild(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] relative overflow-hidden flex flex-col" data-testid="child-login-page">
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              width: Math.random() * 3 + 1 + "px",
              height: Math.random() * 3 + 1 + "px",
              top: Math.random() * 100 + "%",
              left: Math.random() * 100 + "%",
              animationDelay: Math.random() * 3 + "s",
              animationDuration: Math.random() * 2 + 2 + "s",
              opacity: Math.random() * 0.7 + 0.3,
            }}
          />
        ))}
      </div>

      <a
        href="/"
        className="absolute top-4 left-4 z-10 text-white/60 hover:text-white flex items-center gap-1 text-sm"
        data-testid="link-back-home"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Guriga</span>
      </a>

      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        <div className="mb-5">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FFD93D] to-[#FFA502] flex items-center justify-center shadow-lg shadow-yellow-500/30">
            <Moon className="w-10 h-10 text-[#1a1a2e]" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white mb-2 text-center">
          Quraanka Caruurta
        </h1>

        {loadingChildren ? (
          <div className="flex flex-col items-center gap-3 mt-8">
            <Loader2 className="w-8 h-8 text-[#FFD93D] animate-spin" />
            <p className="text-white/40 text-sm">Waa soo socda...</p>
          </div>
        ) : parentLoggedIn ? (
          <>
            {selectedChild ? (
              <div className="w-full max-w-sm mt-4">
                <button
                  onClick={() => setSelectedChild(null)}
                  className="text-white/50 hover:text-white text-sm flex items-center gap-1 mb-4"
                  data-testid="button-back-to-children"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Dib u noqo
                </button>
                <div className="flex flex-col items-center mb-5">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-[#1a1a2e] mb-2 shadow-lg"
                    style={{ backgroundColor: selectedChild.avatarColor }}
                  >
                    {selectedChild.name.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="text-white font-bold text-xl">{selectedChild.name}</h3>
                  <p className="text-white/40 text-sm">{selectedChild.age} sano</p>
                </div>
                <form onSubmit={handleChildLogin} className="space-y-4">
                  <div className="relative">
                    <label className="text-white/70 text-sm mb-1 block">Password</label>
                    <input
                      type={showChildPassword ? "text" : "password"}
                      value={childPassword}
                      onChange={(e) => setChildPassword(e.target.value)}
                      placeholder="Password-ka gali"
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#FFD93D] focus:ring-1 focus:ring-[#FFD93D] text-lg pr-12"
                      autoFocus
                      data-testid="input-child-password-select"
                    />
                    <button
                      type="button"
                      onClick={() => setShowChildPassword(!showChildPassword)}
                      className="absolute right-3 top-9 text-white/40 hover:text-white/70"
                    >
                      {showChildPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-[#FFD93D] to-[#FFA502] text-[#1a1a2e] font-bold text-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20"
                    data-testid="button-child-login-confirm"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <LogIn className="w-5 h-5" />
                        Soo Gal
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              <div className="w-full max-w-sm mt-4">
                <p className="text-white/50 text-center text-sm mb-5">
                  Ilmahaaga u samee akoon cusub si uu Quraanka u barto
                </p>

                {parentChildren.length > 0 ? (
                  <div className="space-y-3 mb-5">
                    {parentChildren.map(child => (
                      <button
                        key={child.id}
                        onClick={() => handleChildSelect(child)}
                        className="w-full flex items-center gap-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#FFD93D]/30 rounded-2xl p-4 transition-all active:scale-[0.97]"
                        data-testid={`button-child-select-${child.id}`}
                      >
                        <div
                          className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-[#1a1a2e] shrink-0"
                          style={{ backgroundColor: child.avatarColor }}
                        >
                          {child.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 text-left">
                          <h3 className="text-white font-bold text-lg">{child.name}</h3>
                          <p className="text-white/40 text-sm">{child.age} sano</p>
                        </div>
                        <BookOpen className="w-5 h-5 text-[#FFD93D]" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 mb-4">
                    <User className="w-12 h-12 text-white/20 mx-auto mb-3" />
                    <p className="text-white/40 text-sm">
                      Wali ilmo kuma samaysanid akoon
                    </p>
                  </div>
                )}

                {showAddForm ? (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <h4 className="text-white font-bold text-sm mb-3">Ilmo cusub samee</h4>
                    <form onSubmit={handleCreateChild} className="space-y-3">
                      <input
                        type="text"
                        value={newChild.name}
                        onChange={(e) => setNewChild(p => ({ ...p, name: e.target.value }))}
                        placeholder="Magaca ilmaha"
                        className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#FFD93D] text-sm"
                        data-testid="input-new-child-name"
                      />
                      <input
                        type="number"
                        value={newChild.age}
                        onChange={(e) => setNewChild(p => ({ ...p, age: sanitizeAgeInput(e.target.value) }))}
                        placeholder="Da'da (3-15)"
                        min="3"
                        max="15"
                        className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#FFD93D] text-sm"
                        data-testid="input-new-child-age"
                      />
                      <input
                        type="text"
                        value={newChild.username}
                        onChange={(e) => setNewChild(p => ({ ...p, username: e.target.value }))}
                        placeholder="Username"
                        className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#FFD93D] text-sm"
                        data-testid="input-new-child-username"
                      />
                      <input
                        type="password"
                        value={newChild.password}
                        onChange={(e) => setNewChild(p => ({ ...p, password: e.target.value }))}
                        placeholder="Password"
                        className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#FFD93D] text-sm"
                        data-testid="input-new-child-password"
                      />
                      <div className="flex flex-wrap gap-2">
                        {AVATAR_COLORS.map(color => (
                          <button
                            type="button"
                            key={color}
                            onClick={() => setNewChild(p => ({ ...p, avatarColor: color }))}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${newChild.avatarColor === color ? "border-white scale-110" : "border-transparent"}`}
                            style={{ backgroundColor: color }}
                            data-testid={`color-${color}`}
                          />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAddForm(false)}
                          className="flex-1 py-2.5 rounded-xl bg-white/10 text-white/70 font-semibold text-sm"
                        >
                          Ka noqo
                        </button>
                        <button
                          type="submit"
                          disabled={creatingChild}
                          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#FFD93D] to-[#FFA502] text-[#1a1a2e] font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-1"
                          data-testid="button-create-child-submit"
                        >
                          {creatingChild ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                          Samee
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-white/20 hover:border-[#FFD93D]/40 text-white/50 hover:text-white/80 transition-all"
                    data-testid="button-add-new-child"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="font-semibold text-sm">Ilmo cusub ku dar</span>
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-white/60 text-center mb-8 text-sm">
              Soo gal akoonkaaga si aad Quraanka u barato, ka dibna u ciyaarto
            </p>
            <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
              <div>
                <label className="text-white/70 text-sm mb-1 block">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username-kaaga"
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#FFD93D] focus:ring-1 focus:ring-[#FFD93D] text-lg"
                  autoComplete="username"
                  data-testid="input-child-username"
                />
              </div>
              <div className="relative">
                <label className="text-white/70 text-sm mb-1 block">Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="password-kaaga"
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#FFD93D] focus:ring-1 focus:ring-[#FFD93D] text-lg pr-12"
                  autoComplete="current-password"
                  data-testid="input-child-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-white/40 hover:text-white/70"
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[#FFD93D] to-[#FFA502] text-[#1a1a2e] font-bold text-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-6 shadow-lg shadow-yellow-500/20"
                data-testid="button-child-login"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-[#1a1a2e] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Soo Gal
                  </>
                )}
              </button>
            </form>
            <p className="text-white/30 text-xs mt-6 text-center">
              Waalidkaaga ayaa kuu sameeyay akoonkan
            </p>
          </>
        )}
      </div>
    </div>
  );
}
