import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

type Metric = "score" | "wins" | "winrate";

type Row = {
  userId: string;
  displayName: string;
  totalDuels: number;
  wins: number;
  losses: number;
  totalScore: number;
  winRate: number;
};

export function LeaderboardCard() {
  const [metric, setMetric] = useState<Metric>("score");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const title = useMemo(() => {
    if (metric === "wins") return "Wins Leaderboard";
    if (metric === "winrate") return "Win Rate Leaderboard";
    return "Score Leaderboard";
  }, [metric]);

  useEffect(() => {
    let dead = false;

    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const data = await apiFetch(`/stats/leaderboard?metric=${metric}&limit=10&minDuels=3`, {
          method: "GET",
        });
        if (dead) return;
        setRows(data?.rows || []);
      } catch (e: any) {
        if (dead) return;
        setErr(e?.message || "Failed to load leaderboard.");
      } finally {
        if (!dead) setLoading(false);
      }
    })();

    return () => {
      dead = true;
    };
  }, [metric]);

  const cardStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 560,
    background: "#111827",
    borderRadius: 16,
    border: "1px solid #1f2937",
    padding: 18,
    boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
    color: "#e5e7eb",
    marginTop: 14,
  };

  const pill: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid #374151",
    background: "#0b1220",
    color: "#e5e7eb",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 12,
  };

  const pillActive: React.CSSProperties = {
    ...pill,
    border: "1px solid #22c55e",
  };

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>{title}</div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
            Top players (min 3 duels)
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button style={metric === "score" ? pillActive : pill} onClick={() => setMetric("score")}>
            Score
          </button>
          <button style={metric === "wins" ? pillActive : pill} onClick={() => setMetric("wins")}>
            Wins
          </button>
          <button style={metric === "winrate" ? pillActive : pill} onClick={() => setMetric("winrate")}>
            Win %
          </button>
        </div>
      </div>

      <div style={{ height: 1, background: "#1f2937", margin: "14px 0" }} />

      {loading ? (
        <div style={{ opacity: 0.8 }}>Loading…</div>
      ) : err ? (
        <div style={{ opacity: 0.85, color: "#fecaca" }}>{err}</div>
      ) : rows.length === 0 ? (
        <div style={{ opacity: 0.8 }}>No results yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {rows.map((r, i) => (
            <div
              key={r.userId}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: 12,
                borderRadius: 14,
                border: "1px solid #1f2937",
                background: "#0b1220",
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ width: 26, textAlign: "center", fontWeight: 900, opacity: 0.9 }}>
                  #{i + 1}
                </div>
                <div>
                  <div style={{ fontWeight: 900 }}>{r.displayName}</div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 3 }}>
                    {r.wins}W · {r.losses}L · {r.totalDuels} duels
                  </div>
                </div>
              </div>

              <div style={{ fontWeight: 900 }}>
                {metric === "wins"
                  ? r.wins
                  : metric === "winrate"
                  ? `${Math.round(r.winRate * 100)}%`
                  : r.totalScore}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
