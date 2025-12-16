export function getApiBase() {
    // Use whatever you already use — keep it consistent
    return import.meta.env.VITE_API_BASE || "http://localhost:10000";
  }
  
  export async function apiFetch(path: string, init: RequestInit = {}) {
    const API = getApiBase();
    const res = await fetch(`${API}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
    });
  
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
  
    if (!res.ok) throw new Error(data?.error || "Request failed");
    return data;
  }
  