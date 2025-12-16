import React, { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext"; // update path to your actual AuthContext
import { getApiBase } from "../lib/api"; // update path to your helper

type Stats = {
  totalDuels: number;
  wins: number;
  losses: number;
  totalScore: number;
};

export default function ProfilePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        setLoading(true);
        setErr(null);

        const API = getApiBase();
        const res = await fetch(`${API}/stats/me`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) throw new Error(data?.error || "Failed to load stats");
        if (alive) setStats(data as Stats);
      } catch (e: any) {
        if (alive) setErr(e?.message || "Error");
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, []);

  if (!user) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Profile</h2>
        <p>You’re not logged in.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 700, margin: "0 auto" }}>
      <h2>Profile</h2>
      <div style={{ marginTop: 8, opacity: 0.85 }}>
        <div><strong>{user.displayName}</strong></div>
        <div style={{ fontSize: 14 }}>{user.email}</div>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Stats</h3>

        {loading && <p>Loading…</p>}
        {err && <p style={{ color: "crimson" }}>{err}</p>}

        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginTop: 12 }}>
            <StatCard label="Total Score" value={stats.totalScore} />
            <StatCard label="Total Duels" value={stats.totalDuels} />
            <StatCard label="Wins" value={stats.wins} />
            <StatCard label="Losses" value={stats.losses} />
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 12,
      padding: 14
    }}>
      <div style={{ fontSize: 13, opacity: 0.8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{value}</div>
    </div>
  );
}
