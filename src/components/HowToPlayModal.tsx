// src/components/HowToPlayModal.tsx
import React from "react";

type HowToPlayModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentPatcherName: string;
  currentBreakerName: string;
};

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({
  isOpen,
  onClose,
  currentPatcherName,
  currentBreakerName,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
        overflowY: "auto",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-to-play-title"
      onClick={onClose}
    >
      <div
        style={{
          maxWidth: 720,
          width: "100%",
          background: "#020617",
          borderRadius: 16,
          border: "1px solid #1f2937",
          boxShadow: "0 22px 45px rgba(0,0,0,0.6)",
          padding: 20,
          color: "#e5e7eb",
          fontSize: 14,
          maxHeight: "80vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <h2 id="how-to-play-title" style={{ fontSize: 20, margin: 0 }}>
            How to Play RuleShift
          </h2>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              color: "#9ca3af",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Roles */}
        <section style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, marginBottom: 6 }}>Roles</h3>
          <ul style={{ paddingLeft: 18, margin: 0 }}>
            <li style={{ marginBottom: 4 }}>
              <strong>Patcher</strong>{" "}
              {currentPatcherName !== "?"
                ? `(${currentPatcherName})`
                : "(Player 1)"}{" "}
              chooses a secret 4-character code using <strong>A–Z</strong> and{" "}
              <strong>0–9</strong>, then programs a rule that the code must obey
              (e.g. “Position 1 must be 7”, “No repeated characters”, etc.).
            </li>
            <li>
              <strong>Breaker</strong>{" "}
              {currentBreakerName !== "?"
                ? `(${currentBreakerName})`
                : "(Player 2)"}{" "}
              tries to deduce the secret code by making guesses and reading the
              feedback.
            </li>
          </ul>
        </section>

        {/* Objective */}
        <section style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, marginBottom: 6 }}>Objective</h3>
          <p style={{ margin: 0 }}>
            The Patcher keeps adding rules that shrink the space of possible
            codes. The Breaker tries to find the exact secret code{" "}
            <strong>before they run out of attempts</strong>, especially once
            the game enters <strong>Endgame</strong> (when only a small number
            of codes are still valid).
          </p>
        </section>

        {/* Guess feedback */}
        <section style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, marginBottom: 6 }}>Guess feedback</h3>
          <ul style={{ paddingLeft: 18, margin: 0 }}>
            <li style={{ marginBottom: 4 }}>
              <strong>EXACT</strong> – Your guess is{" "}
              <strong>exactly the secret code</strong>.
            </li>
            <li style={{ marginBottom: 4 }}>
              <strong>VALID</strong> – Your guess obeys{" "}
              <strong>all current rules</strong>, but it’s not the secret code.
              You’ve found a code that still fits the Patcher’s constraints.
            </li>
            <li>
              <strong>INVALID</strong> – Your guess breaks{" "}
              <strong>at least one rule</strong>. In Endgame, invalid guesses
              also burn your remaining attempts.
            </li>
          </ul>
        </section>

        {/* Endgame */}
        <section style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, marginBottom: 6 }}>Endgame</h3>
          <p style={{ marginBottom: 6 }}>
            Endgame begins automatically once the rule system has been tightened
            so much that only <strong>25 or fewer valid codes remain</strong>.
          </p>
          <ul style={{ paddingLeft: 18, margin: 0 }}>
            <li style={{ marginBottom: 4 }}>
              The Breaker is given a{" "}
              <strong>limited number of final attempts</strong>.
            </li>
            <li style={{ marginBottom: 4 }}>
              Each <strong>INVALID</strong> guess uses up one of those
              attempts.
            </li>
            <li style={{ marginBottom: 4 }}>
              <strong>VALID</strong> guesses do not spend attempts, but must
              still follow every rule.
            </li>
            <li style={{ marginBottom: 4 }}>
              If the Breaker finds the <strong>exact</strong> code before
              running out of attempts, they <strong>win Endgame</strong>.
            </li>
            <li>
              If they run out of attempts without finding the code, the{" "}
              <strong>Patcher wins Endgame</strong>.
            </li>
          </ul>
        </section>

        {/* Turn order */}
        <section style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, marginBottom: 6 }}>Turn order</h3>
          <ol style={{ paddingLeft: 18, margin: 0 }}>
            <li style={{ marginBottom: 4 }}>
              Both players join the same room and enter their names.
            </li>
            <li style={{ marginBottom: 4 }}>
              One player is randomly assigned as <strong>Patcher</strong>, the
              other as <strong>Breaker</strong> for this round.
            </li>
            <li style={{ marginBottom: 4 }}>
              Patcher chooses:
              <ul style={{ paddingLeft: 18, marginTop: 4 }}>
                <li>A secret 4-character code (A–Z, 0–9).</li>
                <li>One new rule template (e.g. “Position 2 must be a digit”).</li>
              </ul>
            </li>
            <li style={{ marginBottom: 4 }}>
              Breaker starts guessing codes that must respect{" "}
              <strong>all visible rules</strong>.
            </li>
            <li style={{ marginBottom: 4 }}>
              After each guess, the system returns{" "}
              <strong>INVALID / VALID / EXACT</strong> and updates scores.
            </li>
            <li>
              After the round resolves, roles swap and a new round begins (you
              can play multiple rounds in one duel).
            </li>
          </ol>
        </section>

        {/* How to win */}
        <section style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, marginBottom: 6 }}>How to win the duel</h3>
          <ul style={{ paddingLeft: 18, margin: 0 }}>
            <li style={{ marginBottom: 4 }}>
              The <strong>Breaker</strong> scores points by making{" "}
              <strong>VALID</strong> guesses, earning extra points for{" "}
              <strong>EXACT</strong> guesses, and by{" "}
              <strong>finding the secret code before running out of Endgame attempts</strong>.
            </li>
            <li style={{ marginBottom: 4 }}>
              The <strong>Patcher</strong> scores points when the Breaker makes{" "}
              <strong>INVALID</strong> guesses, and they{" "}
              <strong>win Endgame (and score additional points)</strong> if the
              Breaker runs out of attempts without finding the exact code.
            </li>
            <li>
              After you play however many rounds you want, compare scores –{" "}
              <strong>highest total score wins</strong> the duel.
            </li>
          </ul>
        </section>

        {/* Visual flow */}
        <section style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, marginBottom: 6 }}>Round flow (visual)</h3>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
              fontSize: 13,
            }}
          >
            <div
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid #4b5563",
              }}
            >
              Patcher: code + rule
            </div>
            <span>→</span>
            <div
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid #4b5563",
              }}
            >
              Rules panel updates
            </div>
            <span>→</span>
            <div
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid #4b5563",
              }}
            >
              Breaker: guess
            </div>
            <span>→</span>
            <div
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid #4b5563",
              }}
            >
              Feedback: INVALID / VALID / EXACT
            </div>
          </div>
        </section>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 16,
          }}
        >
          <button
            onClick={onClose}
            style={{
              borderRadius: 999,
              padding: "6px 14px",
              border: "1px solid #4b5563",
              background: "#020617",
              color: "#e5e7eb",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Got it, let’s play
          </button>
        </div>
      </div>
    </div>
  );
};
