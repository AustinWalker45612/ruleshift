// src/components/BreakerToyExample.tsx
import React, { useState } from "react";
import type { Rule } from "../game/gameTypes";
import { CODE_REGEX, passesAllRules } from "../game/rulesEngine";

// Fixed secret code for this toy example
const TOY_SECRET_CODE = "A2B4";

// Toy rule system: 4 interlocking rules
const TOY_RULES: Rule[] = [
  {
    id: 1,
    type: "allUnique",
    description: "All 4 characters must be unique (no repeats).",
  },
  {
    id: 2,
    type: "exactLettersDigits",
    letters: 2,
    digits: 2,
    description: "Exactly 2 letters and 2 digits.",
  },
  {
    id: 3,
    type: "positionKind",
    position: 0, // position 1 in UI
    kind: "letter",
    description: "Position 1 must be a letter.",
  },
  {
    id: 4,
    type: "digitsLessThan",
    maxDigit: 5,
    description: "All digits must be less than 5.",
  },
];

type ToyResult = "INVALID" | "VALID" | "EXACT";

type ToyGuess = {
  value: string;
  result: ToyResult;
};

export const BreakerToyExample: React.FC = () => {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ToyGuess[]>([]);

  const handleSubmit = () => {
    setError(null);
    const guess = input.toUpperCase().trim();

    // Basic format check
    if (!CODE_REGEX.test(guess)) {
      setError("Guess must be exactly 4 characters, A–Z or 0–9.");
      return;
    }

    // Evaluate against toy rules
    const obeysRules = passesAllRules(guess, TOY_RULES);

    let result: ToyResult;
    if (!obeysRules) {
      result = "INVALID";
    } else if (guess === TOY_SECRET_CODE) {
      result = "EXACT";
    } else {
      result = "VALID";
    }

    // Newest results at the TOP of the list
    setHistory((prev) => [{ value: guess, result }, ...prev]);

    // Clear the input for next guess
    setInput("");
  };

  return (
    <div
      style={{
        marginTop: 10,
        padding: 10,
        borderRadius: 12,
        border: "1px solid #1f2937",
        background: "#020617",
        fontSize: 13,
      }}
    >
      <p style={{ marginBottom: 6, opacity: 0.9 }}>
        <strong>Try it as the Breaker</strong>{" "}
        <span style={{ opacity: 0.8 }}>
          (toy position, not a live round):
        </span>
      </p>

      {/* Rule summary */}
      <div
        style={{
          marginBottom: 8,
          padding: 8,
          borderRadius: 8,
          background: "#020617",
          border: "1px solid #111827",
        }}
      >
        <div style={{ marginBottom: 4, fontWeight: 500 }}>
          Example rule set:
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>All 4 characters must be unique.</li>
          <li>Exactly 2 letters and 2 digits.</li>
          <li>Position 1 must be a letter.</li>
          <li>All digits must be less than 5.</li>
        </ul>
        <p
          style={{
            marginTop: 6,
            marginBottom: 0,
            fontSize: 11,
            opacity: 0.7,
          }}
        >
          In a real duel, the <strong>newest rule is hidden</strong> from the
          Breaker each round. Here, all rules are shown so you can see how the
          feedback lines up with the full rule system.
        </p>
      </div>

      {/* Input + button */}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <input
          value={input}
          onChange={(e) => {
            const raw = e.target.value.toUpperCase();
            // Only allow A–Z, 0–9 and clamp to 4 chars
            const trimmed = raw.replace(/[^A-Z0-9]/g, "").slice(0, 4);
            setInput(trimmed);
          }}
          maxLength={4}
          placeholder="e.g. A2B4"
          style={{
            flex: "0 0 120px",
            padding: "6px 8px",
            borderRadius: 8,
            border: "1px solid #374151",
            background: "#020617",
            color: "#e5e7eb",
            fontSize: 13,
            textTransform: "uppercase",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />

        <button
          onClick={handleSubmit}
          style={{
            padding: "6px 10px",
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
          Check guess
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            marginBottom: 6,
            fontSize: 12,
            color: "#f97373",
          }}
        >
          {error}
        </div>
      )}

      {/* History */}
      <div
        style={{
          maxHeight: 150,
          overflowY: "auto",
          borderRadius: 8,
          border: "1px solid #111827",
          padding: 6,
        }}
      >
        {history.length === 0 ? (
          <p style={{ margin: 0, opacity: 0.7, fontSize: 12 }}>
            Try a few guesses and see whether they come back INVALID, VALID, or
            EXACT under this rule system.
          </p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
            {history.map((g, idx) => (
              <li
                key={`${g.value}-${idx}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "3px 0",
                  borderBottom:
                    idx === history.length - 1
                      ? "none"
                      : "1px solid rgba(15,23,42,0.8)",
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
                <span>
                  {g.result === "INVALID" && (
                    <span style={{ color: "#f97373" }}>INVALID</span>
                  )}
                  {g.result === "VALID" && (
                    <span style={{ color: "#38bdf8" }}>VALID</span>
                  )}
                  {g.result === "EXACT" && (
                    <span style={{ color: "#facc15" }}>EXACT</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p
        style={{
          marginTop: 6,
          fontSize: 11,
          opacity: 0.7,
        }}
      >
        Hint: in this toy, you see every rule. In a real duel, you&apos;d only
        see the older rules and have to infer the newest one from the feedback.
      </p>
    </div>
  );
};
