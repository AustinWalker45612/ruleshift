// src/components/TutorialOverlay.tsx
import React, { useState, useEffect } from "react";
import type { Rule } from "../game/gameTypes";
import { CODE_REGEX, passesAllRules } from "../game/rulesEngine";

export type TutorialRole = "breaker" | "patcher";

type TutorialOverlayProps = {
  isOpen: boolean;
  initialRole?: TutorialRole;
  onClose: () => void;
};

// ---------- Breaker toy example (interactive sandbox) ----------

type ToyResult = "INVALID" | "VALID" | "EXACT";

type ToyGuess = {
  value: string;
  result: ToyResult;
  explanation: string;
};

const TOY_RULES: Rule[] = [
  {
    id: 1,
    type: "allUnique",
    description: "All 4 characters must be unique (no repeats).",
  },
];

// For this toy, the visible rules are the whole ruleset.
const VISIBLE_RULES = TOY_RULES;

// Fixed secret code for the example. Players don't see this.
const TOY_SECRET_CODE = "AB12";

const BreakerToyExample: React.FC = () => {
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

    // First: must satisfy visible rules (like in the real game)
    const passesVisible = passesAllRules(raw, VISIBLE_RULES);
    if (!passesVisible) {
      setMessage(
        "This would be rejected immediately: it repeats at least one character and breaks the 'no repeats' rule."
      );
      return;
    }

    const systemValid = passesAllRules(raw, TOY_RULES);

    let result: ToyResult;
    let explanation: string;

    if (!systemValid) {
      result = "INVALID";
      explanation =
        "INVALID: this breaks at least one active rule. In this toy that means you repeated a character somewhere.";
    } else if (raw === TOY_SECRET_CODE) {
      result = "EXACT";
      explanation =
        "EXACT: you hit the secret code. In a real duel this would end the duel immediately.";
    } else {
      result = "VALID";
      explanation =
        "VALID: this obeys all rules but isn’t the secret. In a real duel this would end the round and swap roles.";
    }

    const newEntry: ToyGuess = { value: raw, result, explanation };
    setGuesses((prev) => [...prev, newEntry]);
    setGuess("");
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
        <strong>Toy example</strong> (interactive sandbox):
      </p>
      <p style={{ marginBottom: 4 }}>
        Visible rules:
        <br />
        • Code is 4 characters (A–Z, 0–9).
        <br />
        • No repeated characters.
      </p>
      <p style={{ marginBottom: 8, fontSize: 12, opacity: 0.85 }}>
        Try a guess like <code>AA12</code> and compare it to something like{" "}
        <code>AB12</code>. Watch how INVALID vs VALID behave. The secret code is
        fixed but hidden.
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
        This sandbox doesn&apos;t affect your real duel. Use it to practice
        spotting INVALID patterns fast.
      </div>
    </div>
  );
};

// ---------- Overlay ----------

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  isOpen,
  initialRole = "breaker",
  onClose,
}) => {
  const [activeRole, setActiveRole] = useState<TutorialRole>(initialRole);

  // Keep activeRole in sync if caller changes initialRole between openings
  useEffect(() => {
    if (isOpen) {
      setActiveRole(initialRole);
    }
  }, [initialRole, isOpen]);

  if (!isOpen) return null;

  const renderBreakerExample = () => {
    return (
      <>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>
          Example: Playing as Breaker
        </h2>
        <p style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>
          Your job is to find a <strong>VALID</strong> or{" "}
          <strong>EXACT</strong> code using the feedback from your guesses.
        </p>
        <ul style={{ fontSize: 13, paddingLeft: 18, marginBottom: 8 }}>
          <li style={{ marginBottom: 4 }}>
            Start with a{" "}
            <strong>
              spread-out guess that touches both letters and digits
            </strong>{" "}
            to learn how the rules behave.
          </li>
          <li style={{ marginBottom: 4 }}>
            Don&apos;t waste all your guesses on the same pattern (e.g.{" "}
            <code>AA1A</code>, <code>BB1B</code>, <code>CC1C</code>) if{" "}
            <strong>no rule mentions letters vs digits</strong>. Mix it up to
            probe more rule space.
          </li>
          <li>
            In <strong>Endgame</strong>, INVALID burns attempts and VALID ends
            the round. Aim for guesses that are likely to be VALID before you
            try to snipe the EXACT code.
          </li>
        </ul>

        {/* Interactive toy example */}
        <BreakerToyExample />
      </>
    );
  };

  const renderPatcherExample = () => {
    return (
      <>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>
          Example: Playing as Patcher
        </h2>
        <p style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>
          Your job is to choose rules and a secret code that{" "}
          <strong>always obey every rule</strong>, but are{" "}
          <strong>hard for the Breaker to find</strong>.
        </p>
        <ul style={{ fontSize: 13, paddingLeft: 18, marginBottom: 8 }}>
          <li style={{ marginBottom: 4 }}>
            Pick rules that <strong>interlock</strong> (e.g. one about positions
            and one about digits) so that many obvious guesses are INVALID.
          </li>
          <li style={{ marginBottom: 4 }}>
            Remember the <strong>newest rule is hidden</strong> from the
            Breaker this round. Use that to set traps (e.g. &quot;3rd position
            must be a digit&quot; while the visible rules don&apos;t mention
            that).
          </li>
          <li>
            As the valid-code count shrinks toward Endgame, think ahead: pick
            rules that keep a <strong>few</strong> viable codes so the Breaker
            has to spend attempts carefully.
          </li>
        </ul>

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
          <p style={{ marginBottom: 4, opacity: 0.9 }}>
            <strong>Toy example</strong> (not a live round):
          </p>
          <p style={{ marginBottom: 4 }}>
            Visible rules:
            <br />
            • No repeats.
            <br />
            • Position 1 must be a letter.
          </p>
          <p style={{ marginBottom: 4 }}>
            Hidden rule for this round:
            <br />• Position 4 must be a digit.
          </p>
          <p>
            Choose a code like <code>A9B3</code> that obeys{" "}
            <strong>all three rules</strong>. The Breaker only sees the first
            two, so they&apos;ll waste guesses that violate the hidden digit
            rule on position 4.
          </p>
        </div>
      </>
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.9)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1300,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          maxWidth: 720,
          width: "100%",
          background: "#020617",
          borderRadius: 16,
          border: "1px solid #1f2937",
          boxShadow: "0 22px 45px rgba(0,0,0,0.7)",
          padding: 20,
          color: "#e5e7eb",
          fontSize: 14,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Role toggle */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              padding: 4,
              borderRadius: 999,
              background: "#020617",
              border: "1px solid #1f2937",
              gap: 4,
            }}
          >
            <button
              onClick={() => setActiveRole("breaker")}
              style={{
                borderRadius: 999,
                border: "none",
                padding: "4px 12px",
                fontSize: 13,
                cursor: "pointer",
                background:
                  activeRole === "breaker" ? "#f97316" : "transparent",
                color: activeRole === "breaker" ? "#111827" : "#e5e7eb",
              }}
            >
              Example as Breaker
            </button>
            <button
              onClick={() => setActiveRole("patcher")}
              style={{
                borderRadius: 999,
                border: "none",
                padding: "4px 12px",
                fontSize: 13,
                cursor: "pointer",
                background:
                  activeRole === "patcher" ? "#f97316" : "transparent",
                color: activeRole === "patcher" ? "#111827" : "#e5e7eb",
              }}
            >
              Example as Patcher
            </button>
          </div>

          <button
            onClick={onClose}
            style={{
              borderRadius: 999,
              border: "1px solid #4b5563",
              background: "#020617",
              color: "#9ca3af",
              fontSize: 12,
              padding: "4px 10px",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>

        {/* Content */}
        <div>
          {activeRole === "breaker"
            ? renderBreakerExample()
            : renderPatcherExample()}
        </div>
      </div>
    </div>
  );
};
