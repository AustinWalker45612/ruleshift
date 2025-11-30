import React from "react";
import type { Player } from "../game/gameTypes";

type EnterNamesProps = {
  players: Player[];
  allNamesEntered: boolean;
  onChangeName: (index: number, name: string) => void;
  onStart: () => void;
};

const EnterNames: React.FC<EnterNamesProps> = ({
  players,
  allNamesEntered,
  onChangeName,
  onStart,
}) => {
  return (
    <div
      style={{
        background: "#111827",
        padding: 16,
        borderRadius: 12,
        boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
      }}
    >
      <h2 style={{ marginBottom: 12 }}>Enter Player Names</h2>
      <label style={{ display: "block", marginBottom: 8 }}>
        Player 1:
        <input
          style={{
            width: "100%",
            marginTop: 4,
            padding: 8,
            borderRadius: 8,
            border: "1px solid #374151",
            background: "#020617",
            color: "#e5e7eb",
          }}
          value={players[0].name}
          onChange={(e) => onChangeName(0, e.target.value)}
          placeholder="e.g. Alice"
        />
      </label>
      <label style={{ display: "block", marginBottom: 16 }}>
        Player 2:
        <input
          style={{
            width: "100%",
            marginTop: 4,
            padding: 8,
            borderRadius: 8,
            border: "1px solid #374151",
            background: "#020617",
            color: "#e5e7eb",
          }}
          value={players[1].name}
          onChange={(e) => onChangeName(1, e.target.value)}
          placeholder="e.g. Bob"
        />
      </label>

      <button
        onClick={onStart}
        disabled={!allNamesEntered}
        style={{
          width: "100%",
          padding: "10px 0",
          borderRadius: 999,
          border: "none",
          fontWeight: 600,
          cursor: allNamesEntered ? "pointer" : "not-allowed",
          background: allNamesEntered ? "#2563eb" : "#1f2937",
          color: "#e5e7eb",
        }}
      >
        Start Duel
      </button>
    </div>
  );
};

export default EnterNames;
