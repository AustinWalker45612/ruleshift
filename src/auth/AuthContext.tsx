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
  
  export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
  }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
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
        return;
      }
  
      if (data?.user) {
        setUser(data.user as AuthUser);
      } else {
        setUser(null);
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
  
      setUser(data.user as AuthUser);
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
  
      setUser(data.user as AuthUser);
    };
  
    const logout = async () => {
      const API = getApiBase();
      await fetch(`${API}/auth/logout`, {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
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
  