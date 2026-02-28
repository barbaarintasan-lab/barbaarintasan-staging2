import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface Parent {
  id: string;
  name: string;
  email: string;
  picture: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  isAdmin?: boolean;
  canHostSheeko?: boolean;
  isYearlySubscriber?: boolean;
  dailyReminderEnabled?: boolean;
  dailyReminderTime?: string | null;
}

interface ParentAuthContextType {
  parent: Parent | null;
  isLoading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, name: string, phone: string, country: string, city?: string, inParentingGroup?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshParent: () => Promise<void>;
}

const ParentAuthContext = createContext<ParentAuthContextType | null>(null);

export function ParentAuthProvider({ children }: { children: ReactNode }) {
  const [parent, setParent] = useState<Parent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/parent/me", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setParent(data.parent);
      } else if (res.status === 401) {
        const data = await res.json().catch(() => ({}));
        if (data.code === "SESSION_SUPERSEDED") {
          setParent(null);
        }
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/parent/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Login failed");
    }

    const data = await res.json();
    setParent(data.parent);
    queryClient.invalidateQueries({ queryKey: ["enrollments"] });
  }, [queryClient]);

  const registerWithEmail = useCallback(async (email: string, password: string, name: string, phone: string, country: string, city?: string, inParentingGroup?: boolean) => {
    const res = await fetch("/api/auth/parent/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password, name, phone, country, city, inParentingGroup }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Registration failed");
    }

    const data = await res.json();
    setParent(data.parent);
    queryClient.invalidateQueries({ queryKey: ["enrollments"] });
  }, [queryClient]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/parent/logout", { 
      method: "POST",
      credentials: "include",
    });
    setParent(null);
    queryClient.invalidateQueries({ queryKey: ["enrollments"] });
  }, [queryClient]);

  const refreshParent = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/parent/me", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setParent(data.parent);
      } else if (res.status === 401) {
        const data = await res.json().catch(() => ({}));
        if (data.code === "SESSION_SUPERSEDED") {
          setParent(null);
        }
      }
    } catch (error) {
      console.error("Failed to refresh parent:", error);
    }
  }, []);

  return (
    <ParentAuthContext.Provider value={{ parent, isLoading, loginWithEmail, registerWithEmail, logout, refreshParent }}>
      {children}
    </ParentAuthContext.Provider>
  );
}

export function useParentAuth() {
  const context = useContext(ParentAuthContext);
  if (!context) {
    throw new Error("useParentAuth must be used within ParentAuthProvider");
  }
  return context;
}
