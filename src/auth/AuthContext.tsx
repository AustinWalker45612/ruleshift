// src/auth/AuthContext.tsx
import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
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
    register: (
      email: string,
      password: string,
      displayName: string
    ) => Promise<void>;
    logout: () => Promise<void>;
  };
  
  const AuthContext = createContext<AuthContextValue | null>(null);
  
  const LS_AUTH_USER_KEY = "ruleshiftAuthUser_v1";
  
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
  
  function readCachedUser(): AuthUser | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(LS_AUTH_USER_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }
  
  function writeCachedUser(user: AuthUser | null) {
    if (typeof window === "undefined") return;
    try {
      if (!user) window.localStorage.removeItem(LS_AUTH_USER_KEY);
      else window.localStorage.setItem(LS_AUTH_USER_KEY, JSON.stringify(user));
    } catch {
      // ignore
    }
  }
  
  export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
  }) => {
    // ✅ Hydrate instantly so UI reflects "logged in" without a refresh
    const [user, setUser] = useState<AuthUser | null>(() => readCachedUser());
    const [isLoading, setIsLoading] = useState<boolean>(true);
  
    const isAuthenticated = !!user;
  
    const refreshMe = async () => {
      const API = getApiBase();
      const res = await fetch(`${API}/auth/me`, {
        method: "GET",
        credentials: "include",
      });
  
      const data = await safeJson(res);
  
      if (!res.ok) {
        setUser(null);
        writeCachedUser(null);
        return;
      }
  
      if (data?.user) {
        const u = data.user as AuthUser;
        setUser(u);
        writeCachedUser(u);
      } else {
        setUser(null);
        writeCachedUser(null);
      }
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
  
      // ✅ immediate UI update (no refresh needed)
      const u = data.user as AuthUser;
      setUser(u);
      writeCachedUser(u);
  
      // Optional: if you want to immediately validate cookie/session:
      // await refreshMe();
    };
  
    const register = async (
      email: string,
      password: string,
      displayName: string
    ) => {
      const API = getApiBase();
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
  
      // ✅ immediate UI update (no refresh needed)
      const u = data.user as AuthUser;
      setUser(u);
      writeCachedUser(u);
  
      // Optional: validate cookie/session immediately:
      // await refreshMe();
    };
  
    const logout = async () => {
      const API = getApiBase();
      await fetch(`${API}/auth/logout`, {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
      setUser(null);
      writeCachedUser(null);
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
  