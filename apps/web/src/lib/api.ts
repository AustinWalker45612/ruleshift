// src/libs/api.ts
export function getApiBase(): string {
    // Prefer explicit env var
    const raw = (import.meta as any).env?.VITE_API_BASE as string | undefined;
  
    // Guard against missing env or the literal strings "undefined"/"null"
    if (!raw || raw === "undefined" || raw === "null") {
      // Dev fallback
      if (!(import.meta as any).env?.PROD) return "http://localhost:10000";
  
      // Prod fallback: if you use Vercel rewrites, this is the safest default
      return "/api";
    }
  
    // Normalize: no trailing slash
    return raw.endsWith("/") ? raw.slice(0, -1) : raw;
  }
  
  export function getAuthToken(): string | null {
    return localStorage.getItem("rs_token");
  }
  
  export function setAuthToken(token: string | null) {
    if (!token) localStorage.removeItem("rs_token");
    else localStorage.setItem("rs_token", token);
  }
  
  export async function apiFetch(path: string, init: RequestInit = {}) {
    const API = getApiBase();
    const token = getAuthToken();
  
    // Normalize path
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
  
    const headers: Record<string, string> = {
      ...(init.headers as any),
    };
  
    // Only set JSON content-type if caller didn't send FormData
    if (!headers["Content-Type"] && !(init.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
  
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  
    const res = await fetch(`${API}${cleanPath}`, {
      ...init,
      // keep include for desktop cookie fallback; Bearer will be primary on iPhone
      credentials: "include",
      headers,
    });
  
    const text = await res.text();
    let data: any = null;
  
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text || null;
    }
  
    if (!res.ok) throw new Error(data?.error || "Request failed");
    return data;
  }
  