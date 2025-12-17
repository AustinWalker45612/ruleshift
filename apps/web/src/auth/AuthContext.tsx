// src/auth/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, setAuthToken, getAuthToken } from "../lib/api";

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const authOpIdRef = useRef(0);

  const isAuthenticated = !!user;

  const refreshMe = async () => {
    const opId = ++authOpIdRef.current;

    try {
      const data = await apiFetch("/auth/me", { method: "GET" });

      if (opId !== authOpIdRef.current) return;

      if (data?.user) setUser(data.user as AuthUser);
      else setUser(null);
    } catch {
      if (opId !== authOpIdRef.current) return;
      setUser(null);
    }
  };

  useEffect(() => {
    let alive = true;

    const init = async () => {
      try {
        // If token exists, try to hydrate user
        if (getAuthToken()) await refreshMe();
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
    const opId = ++authOpIdRef.current;

    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (!data?.user || !data?.token) throw new Error("Invalid login response.");

    if (opId !== authOpIdRef.current) return;

    setAuthToken(data.token);
    setUser(data.user as AuthUser);
  };

  const register = async (email: string, password: string, displayName: string) => {
    const opId = ++authOpIdRef.current;

    const data = await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, displayName }),
    });

    if (!data?.user || !data?.token) throw new Error("Invalid registration response.");

    if (opId !== authOpIdRef.current) return;

    setAuthToken(data.token);
    setUser(data.user as AuthUser);
  };

  const logout = async () => {
    const opId = ++authOpIdRef.current;

    // Clear local token immediately
    setAuthToken(null);
    setUser(null);

    // Best-effort: clear cookie on backend too
    await apiFetch("/auth/logout", { method: "POST" }).catch(() => {});

    if (opId !== authOpIdRef.current) return;
  };

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, isAuthenticated, refreshMe, login, register, logout }),
    [user, isLoading, isAuthenticated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
