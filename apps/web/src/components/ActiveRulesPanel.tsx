// components/ActiveRulesPanel.tsx
import React from "react";
import type { Rule } from "../game/gameTypes";

type ActiveRulesPanelProps = {
  visibleRules: Rule[];
  validCodesCount: number;
};

export const ActiveRulesPanel: React.FC<ActiveRulesPanelProps> = ({
  visibleRules,
  validCodesCount,
}) => {
  return (
    <div
      style={{
        marginBottom: 16,
        padding: 12,
        borderRadius: 12,
        background: "#020617",
        border: "1px solid #1f2937",
        fontSize: 13,
      }}
    >
      <h3 style={{ marginBottom: 4, fontSize: 14 }}>Active Rules</h3>
      <ul style={{ listStyle: "none", paddingLeft: 0, marginBottom: 4 }}>
        <li style={{ opacity: 0.85 }}>
          • Base: Code must be 4 characters, A–Z or 0–9 only.
        </li>
        {visibleRules.map((rule) => (
          <li key={rule.id} style={{ marginTop: 2 }}>
            • {rule.description}
          </li>
        ))}
        {visibleRules.length === 0 && (
          <li style={{ opacity: 0.6, marginTop: 4 }}>
            No extra rules yet. Patcher will add one this round.
          </li>
        )}
      </ul>
      <p
        style={{
          marginTop: 8,
          fontSize: 12,
          opacity: 0.8,
        }}
      >
        Valid codes remaining in this system:{" "}
        <span
          style={{
            fontFamily: "monospace",
            letterSpacing: 1,
            fontWeight: 600,
          }}
        >
          {validCodesCount}
        </span>
      </p>
    </div>
  );
};
