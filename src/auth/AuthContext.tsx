// src/auth/AuthContext.tsx
import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
  } from "react";
  
  type AuthUser = {
    id: string;
    email: string;
    displayName: string;
    createdAt?: string;
  };
  
  type AuthContextValue = {
    user: AuthUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
  
    refreshMe: () => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, displayName: string) => Promise<void>;
    logout: () => Promise<void>;
  };
  
  const AuthContext = createContext<AuthContextValue | null>(null);
  
  async function safeJson(res: Response) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
  
  function getApiBase(): string {
    // In Vercel set: VITE_API_URL = https://ruleshift-backend.onrender.com
    const base = (import.meta as any)?.env?.VITE_API_URL as string | undefined;
    if (base && typeof base === "string") return base.replace(/\/+$/, "");
    // Local fallback
    return "http://localhost:4000";
  }
  
  export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
  
    // Incrementing token to prevent stale responses overwriting newer auth state
    const authOpIdRef = useRef(0);
  
    const isAuthenticated = !!user;
  
    const refreshMe = async () => {
      const API = getApiBase();
      const opId = ++authOpIdRef.current;
  
      const res = await fetch(`${API}/auth/me`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
  
      const data = await safeJson(res);
  
      // If a newer auth op happened while this request was in-flight, ignore this response.
      if (opId !== authOpIdRef.current) return;
  
      if (!res.ok) {
        setUser(null);
        return;
      }
  
      if (data?.user) setUser(data.user as AuthUser);
      else setUser(null);
    };
  
    useEffect(() => {
      let alive = true;
  
      const init = async () => {
        try {
          await refreshMe();
        } finally {
          if (alive) setIsLoading(false);
        }
      };
  
      init();
      return () => {
        alive = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
  
    const login = async (email: string, password: string) => {
      const API = getApiBase();
      const opId = ++authOpIdRef.current;
  
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
  
      const data = await safeJson(res);
  
      if (!res.ok) {
        throw new Error(data?.error || "Login failed.");
      }
      if (!data?.user) {
        throw new Error("Invalid login response.");
      }
  
      // only apply if still latest op
      if (opId !== authOpIdRef.current) return;
  
      setUser(data.user as AuthUser);
    };
  
    const register = async (email: string, password: string, displayName: string) => {
      const API = getApiBase();
      const opId = ++authOpIdRef.current;
  
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName }),
      });
  
      const data = await safeJson(res);
  
      if (!res.ok) {
        throw new Error(data?.error || "Registration failed.");
      }
      if (!data?.user) {
        throw new Error("Invalid registration response.");
      }
  
      if (opId !== authOpIdRef.current) return;
  
      setUser(data.user as AuthUser);
    };
  
    const logout = async () => {
      const API = getApiBase();
      const opId = ++authOpIdRef.current;
  
      await fetch(`${API}/auth/logout`, {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
  
      if (opId !== authOpIdRef.current) return;
  
      setUser(null);
    };
  
    const value = useMemo<AuthContextValue>(
      () => ({
        user,
        isLoading,
        isAuthenticated,
        refreshMe,
        login,
        register,
        logout,
      }),
      [user, isLoading, isAuthenticated]
    );
  
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  };
  
  export const useAuth = (): AuthContextValue => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
  };
  