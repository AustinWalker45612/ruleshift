// src/pages/Profile.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { apiFetch } from "../lib/api";

type DuelOutcome = "WIN" | "LOSS";

type RecentDuel = {
  duelKey: string;
  outcome: DuelOutcome;
  scoreEarned: number;
  createdAt: string;
};

type StatsMeResponse = {
  ok: boolean;
  totals?: {
    totalDuels: number;
    wins: number;
    losses: number;
    totalScore: number;
    winRate: number; // 0..1
  };
  recent?: RecentDuel[];
  error?: string;
};

export default function Profile() {
  const navigate = useNavigate();
  const { user, isLoading, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StatsMeResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // If not logged in, go to login
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  const load = useMemo(() => {
    return async () => {
      setLoading(true);
      setErr(null);

      try {
        const json = (await apiFetch("/stats/me?recent=10", {
          method: "GET",
          cache: "no-store",
        })) as StatsMeResponse;

        setData(json);
      } catch (e: any) {
        setData(null);
        setErr(e?.message || "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) return;
    load();
  }, [isLoading, isAuthenticated, load]);

  const cardStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 720,
    background: "#111827",
    borderRadius: 16,
    border: "1px solid #1f2937",
    padding: 20,
    boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
    color: "#e5e7eb",
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
  };

  const statBoxStyle: React.CSSProperties = {
    border: "1px solid #1f2937",
    borderRadius: 14,
    padding: 14,
    background: "#0b1220",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    opacity: 0.75,
    marginBottom: 6,
  };

  const valueStyle: React.CSSProperties = {
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: 0.2,
  };

  const totals = data?.totals;
  const recent = data?.recent || [];
  const displayName = user?.displayName || "Player";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 26 }}>Profile</h1>
            <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>
              Logged in as <strong>{displayName}</strong>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button style={smallButtonStyle} onClick={() => navigate("/")}>
              Back to Home
            </button>
          </div>
        </div>

        <div style={{ height: 1, background: "#1f2937", margin: "14px 0" }} />

        {loading ? (
          <div style={{ opacity: 0.8 }}>Loading your stats…</div>
        ) : err ? (
          <div
            style={{
              border: "1px solid #7f1d1d",
              background: "rgba(127,29,29,0.15)",
              padding: 12,
              borderRadius: 12,
              color: "#fecaca",
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 6 }}>
              Couldn’t load profile
            </div>
            <div style={{ fontSize: 13, opacity: 0.95 }}>{err}</div>

            <button
              style={{ ...smallButtonStyle, marginTop: 10 }}
              onClick={load}
            >
              Retry
            </button>
          </div>
        ) : !totals ? (
          <div style={{ opacity: 0.85 }}>
            No stats yet. Play a duel and your profile will start tracking results.
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <div style={statBoxStyle}>
                <div style={labelStyle}>Total Duels</div>
                <div style={valueStyle}>{totals.totalDuels}</div>
              </div>

              <div style={statBoxStyle}>
                <div style={labelStyle}>Wins</div>
                <div style={valueStyle}>{totals.wins}</div>
              </div>

              <div style={statBoxStyle}>
                <div style={labelStyle}>Losses</div>
                <div style={valueStyle}>{totals.losses}</div>
              </div>

              <div style={statBoxStyle}>
                <div style={labelStyle}>Total Score</div>
                <div style={valueStyle}>{totals.totalScore}</div>
              </div>
            </div>

            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <div style={statBoxStyle}>
                <div style={labelStyle}>Win Rate</div>
                <div style={valueStyle}>
                  {Math.round((totals.winRate || 0) * 100)}%
                </div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                  Based on {totals.totalDuels} duels
                </div>
              </div>

              <div style={statBoxStyle}>
                <div style={labelStyle}>Average Score / Duel</div>
                <div style={valueStyle}>
                  {totals.totalDuels > 0
                    ? Math.round(totals.totalScore / totals.totalDuels)
                    : 0}
                </div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                  Quick sanity metric
                </div>
              </div>
            </div>

            <div style={{ height: 1, background: "#1f2937", margin: "16px 0" }} />

            <h2 style={{ margin: "0 0 10px 0", fontSize: 16 }}>Recent Duels</h2>

            {recent.length === 0 ? (
              <div style={{ opacity: 0.8, fontSize: 13 }}>
                No recent duels found.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {recent.slice(0, 10).map((d) => {
                  const isWin = d.outcome === "WIN";
                  return (
                    <div
                      key={d.duelKey + d.createdAt}
                      style={{
                        border: "1px solid #1f2937",
                        borderRadius: 14,
                        padding: 12,
                        background: "#0b1220",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <div style={{ fontWeight: 800 }}>
                          {isWin ? "WIN" : "LOSS"}{" "}
                          <span style={{ opacity: 0.7, fontWeight: 600 }}>
                            · {d.duelKey}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                          {new Date(d.createdAt).toLocaleString()}
                        </div>
                      </div>

                      <div style={{ fontWeight: 900 }}>+{d.scoreEarned}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
