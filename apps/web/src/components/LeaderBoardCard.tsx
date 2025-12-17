// src/components/LeaderBoardCard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

type Metric = "score" | "wins" | "winRate";

type LeaderRow = {
  userId: string;
  displayName: string;
  value: number;
  totalDuels?: number;
};

type LeaderboardResponse = {
  ok: boolean;
  metric: Metric;
  rows: LeaderRow[];
};

function formatMetric(metric: Metric, v: number) {
  if (metric === "winRate") return `${Math.round(v * 100)}%`;
  return String(v);
}

export const LeaderboardCard: React.FC = () => {
  const [metric, setMetric] = useState<Metric>("score");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const metricLabel = useMemo(() => {
    if (metric === "score") return "Score";
    if (metric === "wins") return "Wins";
    return "Win %";
  }, [metric]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErr(null);

      try {
        // If you don’t have this endpoint yet, it’ll just show “No results yet.”
        const data = (await apiFetch(`/stats/leaderboard?metric=${metric}`, {
          method: "GET",
        })) as LeaderboardResponse;

        if (cancelled) return;

        if (!data?.ok) {
          setRows([]);
          return;
        }

        setRows(Array.isArray(data.rows) ? data.rows : []);
      } catch (e: any) {
        if (cancelled) return;
        setRows([]);
        setErr(e?.message || "Couldn’t load leaderboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [metric]);

  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 12px",
    borderRadius: 999,
    border: active ? "1px solid #22c55e" : "1px solid #374151",
    background: "#0b1220",
    color: "#e5e7eb",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 12,
    whiteSpace: "nowrap",
    flex: "0 0 auto",
  });

  return (
    <div
      style={{
        width: "100%",
        boxSizing: "border-box",
        overflow: "hidden", // 👈 prevents any internal overflow showing outside the card
      }}
    >
      {/* Header row: WRAPS on iPhone */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap", // 👈 key
          minWidth: 0, // 👈 allows shrink
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 2 }}>
            {metricLabel} Leaderboard
          </div>
          <div style={{ fontSize: 13, opacity: 0.75 }}>
            Top players (min 3 duels)
          </div>
        </div>

        {/* Tabs: WRAPS and never pushes layout wider than screen */}
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap", // 👈 key
            justifyContent: "flex-end",
            minWidth: 0, // 👈 key
            maxWidth: "100%",
          }}
        >
          <button style={pillStyle(metric === "score")} onClick={() => setMetric("score")}>
            Score
          </button>
          <button style={pillStyle(metric === "wins")} onClick={() => setMetric("wins")}>
            Wins
          </button>
          <button style={pillStyle(metric === "winRate")} onClick={() => setMetric("winRate")}>
            Win %
          </button>
        </div>
      </div>

      <div style={{ height: 1, background: "#1f2937", margin: "14px 0" }} />

      {loading ? (
        <div style={{ opacity: 0.8 }}>Loading…</div>
      ) : err ? (
        <div style={{ opacity: 0.85 }}>{err}</div>
      ) : rows.length === 0 ? (
        <div style={{ opacity: 0.8 }}>No results yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {rows.slice(0, 10).map((r, idx) => (
            <div
              key={`${r.userId}-${idx}`}
              style={{
                border: "1px solid #1f2937",
                borderRadius: 14,
                padding: 12,
                background: "#0b1220",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                minWidth: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    background: "#111827",
                    border: "1px solid #1f2937",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                    flex: "0 0 auto",
                  }}
                >
                  {idx + 1}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 900,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: "100%",
                    }}
                  >
                    {r.displayName}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    {typeof r.totalDuels === "number" ? `${r.totalDuels} duels` : ""}
                  </div>
                </div>
              </div>

              <div style={{ fontWeight: 900, flex: "0 0 auto" }}>
                {formatMetric(metric, r.value)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
