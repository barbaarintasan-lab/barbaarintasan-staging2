import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

interface ChildProfile {
  id: string;
  parentId: string;
  name: string;
  age: number;
  username: string;
  avatarColor: string;
  createdAt: string;
}

interface ChildAuthContextType {
  child: ChildProfile | null;
  isLoading: boolean;
  login: (username: string, password: string, childId?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshChild: () => Promise<void>;
}

const ChildAuthContext = createContext<ChildAuthContextType | null>(null);

export function ChildAuthProvider({ children: childrenProp }: { children: ReactNode }) {
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/child/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setChild(data.child);
      } else {
        setChild(null);
      }
    } catch {
      setChild(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (username: string, password: string, childId?: string) => {
    const res = await fetch("/api/auth/child/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password, childId }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Login failed");
    }
    const data = await res.json();
    setChild(data.child);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/child/logout", { method: "POST", credentials: "include" });
    setChild(null);
  }, []);

  return (
    <ChildAuthContext.Provider value={{ child, isLoading, login, logout, refreshChild: checkAuth }}>
      {childrenProp}
    </ChildAuthContext.Provider>
  );
}

export function useChildAuth() {
  const ctx = useContext(ChildAuthContext);
  if (!ctx) throw new Error("useChildAuth must be used within ChildAuthProvider");
  return ctx;
}
