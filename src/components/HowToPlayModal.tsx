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
        {/* Header */}
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
            <li>
              <strong>Patcher</strong>{" "}
              {currentPatcherName !== "?" ? `(${currentPatcherName})` : ""}  
              creates:
              <ul style={{ paddingLeft: 18, marginTop: 4 }}>
                <li>A secret 4-character code (A–Z, 0–9)</li>
                <li>A rule the code must obey</li>
              </ul>
            </li>
            <li style={{ marginTop: 4 }}>
              <strong>Breaker</strong>{" "}
              {currentBreakerName !== "?" ? `(${currentBreakerName})` : ""}  
              attempts to find a code that satisfies the rule system.
            </li>
          </ul>
        </section>

        {/* Objective */}
        <section style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, marginBottom: 6 }}>Objective</h3>
          <p>
            The Breaker’s goal is to discover a <strong>VALID</strong> code —
            one that satisfies <em>every</em> rule.  
            The Patcher tries to shape the rules so the Breaker struggles to do
            so, especially once the game enters <strong>Endgame</strong>.
          </p>
        </section>

        {/* Feedback meanings */}
        <section style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, marginBottom: 6 }}>Guess Feedback</h3>

          <ul style={{ paddingLeft: 18, margin: 0 }}>
            <li style={{ marginBottom: 4 }}>
              <strong>VALID</strong> — The guess satisfies all rules.  
              This resolves the round immediately (including in Endgame).
            </li>

            <li style={{ marginBottom: 4 }}>
              <strong>EXACT</strong> — The guess is both VALID and the  
              <strong>Patcher’s secret code</strong>.  
              In Endgame, this wins the entire duel.
            </li>

            <li>
              <strong>INVALID</strong> — The guess breaks one or more rules.  
              In Endgame, INVALID guesses consume limited attempts.
            </li>
          </ul>
        </section>

        {/* Endgame */}
        <section style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, marginBottom: 6 }}>Endgame</h3>
          <p>
            Endgame begins once the rule system is so tight that
            <strong>25 or fewer</strong> valid codes remain.
          </p>

          <ul style={{ paddingLeft: 18, margin: 0 }}>
            <li>INVALID guesses reduce your remaining attempts.</li>
            <li>VALID guesses immediately end the round — no attempts lost.</li>
            <li>
              Only an <strong>EXACT</strong> guess wins the duel for the
              Breaker in Endgame.
            </li>
            <li>
              If attempts reach zero <em>before</em> the Breaker produces a VALID
              or EXACT, the <strong>Patcher wins the duel</strong>.
            </li>
          </ul>
        </section>

        {/* Turn order */}
        <section style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, marginBottom: 6 }}>Turn Order</h3>

          <ol style={{ paddingLeft: 18, margin: 0 }}>
            <li>Both players join a room and enter names.</li>
            <li>One player becomes Patcher, the other Breaker.</li>
            <li>Patcher sets a rule and a secret code.</li>
            <li>Breaker makes guesses and receives feedback.</li>
            <li>VALID → round resolved; EXACT → special success.</li>
            <li>In Endgame, only EXACT ends the duel.</li>
            <li>After a resolved round, roles switch and play continues.</li>
          </ol>
        </section>

        {/* Winning the duel */}
        <section style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, marginBottom: 6 }}>Winning the Duel</h3>

          <ul style={{ paddingLeft: 18, margin: 0 }}>
            <li>
              <strong>Breaker wins the duel</strong> by hitting an EXACT guess
              during Endgame.
            </li>
            <li>
              <strong>Patcher wins the duel</strong> if the Breaker runs out of
              Endgame attempts without producing a VALID or EXACT guess.
            </li>
          </ul>
        </section>

        {/* Close */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
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
            Got it — Let’s play
          </button>
        </div>
      </div>
    </div>
  );
};
