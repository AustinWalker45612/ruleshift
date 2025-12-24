// src/pages/HomePage.tsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { LeaderboardCard } from "../components/LeaderBoardCard";
import { apiFetch } from "../lib/api";

const generateRoomId = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/1/0
  let id = "";
  for (let i = 0; i < 5; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
};

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, isLoading } = useAuth();

  const [joinCode, setJoinCode] = useState("");
  const canJoin = useMemo(() => joinCode.trim().length >= 4, [joinCode]);

  const [mmStatus, setMmStatus] = useState<"idle" | "loading" | "error">("idle");

  const onCreateRoom = () => {
    const id = generateRoomId();
    navigate(`/room/${id}`);
  };

  const onJoinRoom = () => {
    const id = joinCode.trim().toUpperCase();
    if (!id) return;
    navigate(`/room/${id}`);
  };

  const onFindGame = async () => {
    if (mmStatus === "loading") return;
    setMmStatus("loading");
    try {
      const data = await apiFetch("/matchmake", { method: "POST" });
      const id = (data?.roomId || "").toString().trim().toUpperCase();
      if (!id) throw new Error("No roomId returned");
      navigate(`/room/${id}`);
    } catch (e) {
      console.error("Matchmaking failed:", e);
      setMmStatus("error");
      setTimeout(() => setMmStatus("idle"), 2000);
    }
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
    fontSize: 16, // prevents iOS zoom
    letterSpacing: 2,
  };

  const buttonStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 0",
    borderRadius: 999,
    border: "none",
    fontWeight: 700,
    cursor: "pointer",
    background: "#16a34a",
    color: "#e5e7eb",
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: "#2563eb",
  };

  const smallButtonStyle: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid #374151",
    background: "#0b1220",
    color: "#e5e7eb",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 12,
    whiteSpace: "nowrap",
  };

  const cardStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    background: "#111827",
    borderRadius: 16,
    border: "1px solid #1f2937",
    padding: 20,
    boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
    color: "#e5e7eb",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        position: "relative",
        overflowX: "hidden", // 👈 stops any stray horizontal overflow on iOS
      }}
    >
      {/* Top bar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          padding: 12,
          display: "flex",
          justifyContent: "flex-end",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            pointerEvents: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 10,
            flexWrap: "wrap",
            maxWidth: 980,
            width: "100%",
          }}
        >
          {isLoading ? (
            <div style={{ fontSize: 12, opacity: 0.7, color: "#e5e7eb" }}>
              Loading…
            </div>
          ) : user ? (
            <>
              <div style={{ fontSize: 12, opacity: 0.85, color: "#e5e7eb" }}>
                Logged in as <strong>{user.displayName}</strong>
              </div>

              <button style={smallButtonStyle} onClick={() => navigate("/profile")}>
                Profile
              </button>

              <button
                style={smallButtonStyle}
                onClick={async () => {
                  await logout();
                  navigate("/");
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 12, opacity: 0.7, color: "#e5e7eb" }}>
                Not logged in
              </div>
              <button style={smallButtonStyle} onClick={() => navigate("/login")}>
                Login
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          paddingTop: 76, // room for fixed top bar
          paddingBottom: 28,
        }}
      >
        {/* This wrapper is the KEY for iPhone: safe side padding + max width */}
        <div
          style={{
            width: "100%",
            maxWidth: 560,
            paddingInline: 16, // 👈 iPhone-safe gutter
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {/* Main card */}
          <div style={cardStyle}>
            <h1 style={{ margin: 0, fontSize: 28 }}>RuleShift</h1>
            <p style={{ marginTop: 8, opacity: 0.9, fontSize: 14 }}>
              A two-player duel: one patches the rules, the other breaks the code.
            </p>

            <div style={{ marginTop: 16 }}>
              <button
                style={{
                  ...secondaryButtonStyle,
                  opacity: mmStatus === "loading" ? 0.7 : 1,
                  cursor: mmStatus === "loading" ? "not-allowed" : "pointer",
                }}
                onClick={onFindGame}
                disabled={mmStatus === "loading"}
              >
                {mmStatus === "loading"
                  ? "Finding match…"
                  : mmStatus === "error"
                  ? "Matchmaking failed — try again"
                  : "Find Game (Matchmaking)"}
              </button>

              <p
                style={{
                  margin: "12px 0 10px",
                  opacity: 0.55,
                  fontSize: 12,
                  textAlign: "center",
                }}
              >
                or use Room Codes
              </p>

              <button style={buttonStyle} onClick={onCreateRoom}>
                Create New Room
              </button>

              <p
                style={{
                  margin: "10px 0",
                  opacity: 0.7,
                  fontSize: 12,
                  textAlign: "center",
                }}
              >
                or
              </p>

              <label style={{ display: "block", fontSize: 13 }}>
                Join existing room:
                <input
                  style={inputStyle}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ENTER CODE (e.g. K7P2Q)"
                  maxLength={10}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onJoinRoom();
                  }}
                />
              </label>

              <button
                style={{ ...buttonStyle, marginTop: 12, opacity: canJoin ? 1 : 0.5 }}
                onClick={onJoinRoom}
                disabled={!canJoin}
              >
                Join Room
              </button>
            </div>
          </div>

          {/* Leaderboard card (kept INSIDE the same wrapper so it can’t overflow on iPhone) */}
          <div style={cardStyle}>
            <LeaderboardCard />
          </div>
        </div>
      </div>
    </div>
  );
};
