// src/pages/LoginPage.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

type Mode = "login" | "register";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cardStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 520,
    background: "#111827",
    border: "1px solid #1f2937",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
    color: "#e5e7eb",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    marginTop: 6,
    padding: 10,
    borderRadius: 10,
    border: "1px solid #374151",
    background: "#020617",
    color: "#e5e7eb",
    fontSize: 16,
  };

  const buttonStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 0",
    borderRadius: 999,
    border: "none",
    fontWeight: 800,
    cursor: "pointer",
    background: "#16a34a",
    color: "#e5e7eb",
    opacity: loading ? 0.7 : 1,
  };

  const secondaryStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 0",
    borderRadius: 999,
    border: "1px solid #374151",
    fontWeight: 800,
    cursor: "pointer",
    background: "#0b1220",
    color: "#e5e7eb",
  };

  const onSubmit = async () => {
    setError(null);

    const e = email.trim().toLowerCase();
    if (!e) return setError("Email is required.");
    if (!password) return setError("Password is required.");

    if (mode === "register") {
      const dn = displayName.trim();
      if (!dn) return setError("Display name is required for registration.");
      if (dn.length < 2) return setError("Display name is too short.");
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await login(e, password); // ✅ updates AuthContext immediately
      } else {
        await register(e, password, displayName.trim()); // ✅ updates immediately
      }

      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b1220",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div style={cardStyle}>
        <h1 style={{ margin: 0, fontSize: 24 }}>RuleShift</h1>
        <p style={{ marginTop: 8, opacity: 0.85, fontSize: 13 }}>
          {mode === "login"
            ? "Login to save stats across devices."
            : "Create an account to save stats."}
        </p>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            style={{
              ...secondaryStyle,
              background: mode === "login" ? "#111827" : "#0b1220",
              borderColor: mode === "login" ? "#16a34a" : "#374151",
            }}
            onClick={() => setMode("login")}
            disabled={loading}
          >
            Login
          </button>
          <button
            style={{
              ...secondaryStyle,
              background: mode === "register" ? "#111827" : "#0b1220",
              borderColor: mode === "register" ? "#16a34a" : "#374151",
            }}
            onClick={() => setMode("register")}
            disabled={loading}
          >
            Register
          </button>
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={{ display: "block", fontSize: 13, marginTop: 10 }}>
            Email
            <input
              style={inputStyle}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              autoComplete="email"
              inputMode="email"
            />
          </label>

          <label style={{ display: "block", fontSize: 13, marginTop: 10 }}>
            Password
            <input
              style={inputStyle}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSubmit();
              }}
            />
          </label>

          {mode === "register" && (
            <label style={{ display: "block", fontSize: 13, marginTop: 10 }}>
              Display name
              <input
                style={inputStyle}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How you’ll appear in-game"
                autoComplete="nickname"
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSubmit();
                }}
              />
            </label>
          )}

          {error && (
            <div style={{ marginTop: 10, fontSize: 12, color: "#fca5a5" }}>
              {error}
            </div>
          )}

          <button
            style={{ ...buttonStyle, marginTop: 14 }}
            onClick={onSubmit}
            disabled={loading}
          >
            {loading ? "Working..." : mode === "login" ? "Login" : "Create Account"}
          </button>

          <button
            style={{ ...secondaryStyle, marginTop: 10 }}
            onClick={() => navigate("/", { replace: true })}
            disabled={loading}
          >
            Back
          </button>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75, lineHeight: 1.4 }}>
            Playing is still allowed without login — this just lets us attach stats to your account.
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
