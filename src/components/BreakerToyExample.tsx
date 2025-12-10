// src/components/BreakerToyExample.tsx
import React, { useState } from "react";
import type { Rule } from "../game/gameTypes";
import { CODE_REGEX, passesAllRules } from "../game/rulesEngine";

type ToyResult = "INVALID" | "VALID" | "EXACT";

type ToyGuess = {
  value: string;
  result: ToyResult;
  explanation: string;
};

// Simple toy rules to match your text example:
// Visible rules:
// • Code is 4 characters (A–Z, 0–9).
// • No repeated characters.
const TOY_RULES: Rule[] = [
  {
    id: 1,
    type: "allUnique",
    description: "All 4 characters must be unique (no repeats).",
  },
];

// In this toy you can think of visibleRules === full rules.
const VISIBLE_RULES = TOY_RULES;

// Fixed secret code for the example.
const SECRET_CODE = "AB12";

export const BreakerToyExample: React.FC = () => {
  const [guess, setGuess] = useState("");
  const [guesses, setGuesses] = useState<ToyGuess[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = () => {
    const raw = guess.toUpperCase().trim();
    setMessage(null);

    if (!CODE_REGEX.test(raw)) {
      setMessage(
        "Guess must be exactly 4 characters using A–Z or 0–9 (no spaces or symbols)."
      );
      return;
    }

    // First: ensure it would be allowed by visible rules (like the real game)
    const passesVisible = passesAllRules(raw, VISIBLE_RULES);
    if (!passesVisible) {
      // With this toy ruleset, failing visible rules means you're repeating chars.
      setMessage(
        "This would be rejected immediately: it repeats at least one character and breaks the 'no repeats' rule."
      );
      return;
    }

    const systemValid = passesAllRules(raw, TOY_RULES);

    let result: ToyResult;
    let explanation: string;

    if (!systemValid) {
      // (With this toy there is only one rule, so this branch won’t actually hit,
      // but we keep it for clarity / future tweaks.)
      result = "INVALID";
      explanation =
        "INVALID: this breaks at least one active rule. In this toy, that means you repeated a character somewhere.";
    } else if (raw === SECRET_CODE) {
      result = "EXACT";
      explanation =
        "EXACT: you hit the secret code. In a real duel this would end the duel immediately.";
    } else {
      result = "VALID";
      explanation =
        "VALID: this obeys all rules but isn’t the secret. In a real duel this would end the round and swap roles.";
    }

    const newEntry: ToyGuess = {
      value: raw,
      result,
      explanation,
    };

    setGuesses((prev) => [...prev, newEntry]);
    setGuess("");
  };

  return (
    <div
      style={{
        marginTop: 10,
        padding: 12,
        borderRadius: 12,
        background: "#020617",
        border: "1px solid #1f2937",
        fontSize: 13,
      }}
    >
      <div
        style={{
          marginBottom: 6,
          fontWeight: 600,
        }}
      >
        Toy example (now interactive):
      </div>

      <div style={{ marginBottom: 6 }}>
        <div style={{ fontWeight: 500, marginBottom: 2 }}>Visible rules:</div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>Code is 4 characters (A–Z, 0–9).</li>
          <li>No repeated characters.</li>
        </ul>
      </div>

      <p style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
        Try a guess like <code>AA12</code> and compare it to something like{" "}
        <code>AB12</code>. Watch how INVALID vs VALID behave. The secret code in
        this toy is fixed but hidden.
      </p>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 8,
          alignItems: "center",
        }}
      >
        <input
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Try a 4-char code (e.g. AA12)"
          style={{
            flex: 1,
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid #4b5563",
            background: "#020617",
            color: "#e5e7eb",
            fontSize: 13,
          }}
        />
        <button
          onClick={handleSubmit}
          style={{
            padding: "6px 14px",
            borderRadius: 999,
            border: "none",
            background: "#22c55e",
            color: "#022c22",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Try guess
        </button>
      </div>

      {message && (
        <div
          style={{
            marginBottom: 8,
            padding: 6,
            borderRadius: 8,
            background: "#0f172a",
            border: "1px solid #4b5563",
            fontSize: 12,
          }}
        >
          {message}
        </div>
      )}

      <div
        style={{
          maxHeight: 180,
          overflowY: "auto",
          padding: 6,
          borderRadius: 8,
          background: "#020617",
          border: "1px solid #111827",
          fontSize: 12,
        }}
      >
        <div
          style={{
            marginBottom: 4,
            fontWeight: 500,
          }}
        >
          Your guesses
        </div>
        {guesses.length === 0 ? (
          <p style={{ opacity: 0.7, margin: 0 }}>
            Your guesses and explanations will appear here.
          </p>
        ) : (
          guesses.map((g, idx) => {
            let badgeBg = "#4b5563";
            let badgeText = "#e5e7eb";
            if (g.result === "INVALID") {
              badgeBg = "#991b1b";
              badgeText = "#fee2e2";
            } else if (g.result === "VALID") {
              badgeBg = "#92400e";
              badgeText = "#ffedd5";
            } else if (g.result === "EXACT") {
              badgeBg = "#166534";
              badgeText = "#bbf7d0";
            }

            return (
              <div
                key={idx}
                style={{
                  paddingBottom: 6,
                  marginBottom: 6,
                  borderBottom: "1px solid #111827",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "monospace",
                      letterSpacing: 1,
                    }}
                  >
                    {g.value}
                  </span>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 999,
                      fontSize: 11,
                      background: badgeBg,
                      color: badgeText,
                      fontWeight: 600,
                    }}
                  >
                    {g.result}
                  </span>
                </div>
                <div style={{ marginTop: 3, opacity: 0.9 }}>
                  {g.explanation}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div
        style={{
          marginTop: 6,
          fontSize: 11,
          opacity: 0.7,
        }}
      >
        This is a mini sandbox – it doesn&apos;t affect your real duel. Use it
        to practice spotting INVALID patterns quickly.
      </div>
    </div>
  );
};
