// src/auth/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type AuthUser = {
  id: string;
  email: string;
  displayName: string; // used to auto-fill player name
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
};

const AUTH_TOKEN_KEY = "ruleshiftAuthToken_v1";

const AuthContext = createContext<AuthContextValue | null>(null);

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(AUTH_TOKEN_KEY);
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const isAuthenticated = !!token && !!user;

  const persistToken = (t: string | null) => {
    setToken(t);
    try {
      if (typeof window !== "undefined") {
        if (t) window.localStorage.setItem(AUTH_TOKEN_KEY, t);
        else window.localStorage.removeItem(AUTH_TOKEN_KEY);
      }
    } catch {
      // ignore
    }
  };

  const fetchMe = async (t: string) => {
    // Adjust this path to match your backend once you add it.
    const res = await fetch("/api/auth/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${t}` },
    });

    if (!res.ok) {
      throw new Error("Session expired. Please log in again.");
    }

    const data = await safeJson(res);
    if (!data?.user) throw new Error("Invalid session response.");
    setUser(data.user as AuthUser);
  };

  useEffect(() => {
    let alive = true;

    const init = async () => {
      try {
        if (!token) {
          if (alive) setUser(null);
          return;
        }
        await fetchMe(token);
      } catch (err) {
        // token invalid -> clear
        persistToken(null);
        if (alive) setUser(null);
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
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await safeJson(res);

    if (!res.ok) {
      throw new Error(data?.message || "Login failed.");
    }
    if (!data?.token || !data?.user) {
      throw new Error("Invalid login response.");
    }

    persistToken(data.token);
    setUser(data.user as AuthUser);
  };

  const register = async (email: string, password: string, displayName?: string) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, displayName }),
    });

    const data = await safeJson(res);

    if (!res.ok) {
      throw new Error(data?.message || "Registration failed.");
    }
    if (!data?.token || !data?.user) {
      throw new Error("Invalid registration response.");
    }

    persistToken(data.token);
    setUser(data.user as AuthUser);
  };

  const logout = () => {
    persistToken(null);
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated,
      login,
      register,
      logout,
    }),
    [user, token, isLoading, isAuthenticated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
