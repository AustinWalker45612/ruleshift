import React from "react";
import type { Round, Player } from "../game/gameTypes";

type DuelHistoryProps = {
  rounds: Round[];
  players: Player[];
  onRestart: () => void;
};

const DuelHistory: React.FC<DuelHistoryProps> = ({
  rounds,
  players,
  onRestart,
}) => {
  return (
    <div
      style={{
        background: "#020617",
        padding: 12,
        borderRadius: 12,
        border: "1px solid #1f2937",
        fontSize: 12,
        marginTop: 16,
      }}
    >
      <h3 style={{ marginBottom: 8, fontSize: 13 }}>Duel History</h3>
      {rounds.map((r) => (
        <div
          key={r.roundNumber}
          style={{
            marginBottom: 10,
            paddingBottom: 8,
            borderBottom: "1px solid #111827",
          }}
        >
          <div style={{ marginBottom: 2 }}>
            <strong>Round {r.roundNumber}</strong> — Patcher:{" "}
            {players[r.patcherIndex].name}
          </div>
          <div>Code: {r.secretCode}</div>
          <div style={{ opacity: 0.8 }}>Rule: {r.ruleText}</div>
        </div>
      ))}

      <button
        onClick={onRestart}
        style={{
          width: "100%",
          padding: "8px 0",
          borderRadius: 999,
          border: "1px solid #4b5563",
          fontWeight: 500,
          cursor: "pointer",
          background: "transparent",
          color: "#9ca3af",
          marginTop: 8,
        }}
      >
        Restart Duel
      </button>
    </div>
  );
};

export default DuelHistory;
