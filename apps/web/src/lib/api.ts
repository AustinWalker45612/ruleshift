// src/libs/api.ts
export function getApiBase() {
    return import.meta.env.VITE_API_BASE;
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
  
    const res = await fetch(`${API}${path}`, {
      ...init,
      // keep include for desktop cookie fallback; Bearer will be primary on iPhone
      credentials: "include",
      headers,
    });
  
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
  
    if (!res.ok) throw new Error(data?.error || "Request failed");
    return data;
  }
  