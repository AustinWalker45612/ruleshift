// src/components/OnboardingOverlay.tsx
import React, { useState } from "react";

type OnboardingOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({
  isOpen,
  onClose,
}) => {
  const [step, setStep] = useState<number>(0);

  if (!isOpen) return null;

  const totalSteps = 3;

  const goNext = () => {
    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <>
            <h2 style={{ fontSize: 20, marginBottom: 8 }}>
              Welcome to RuleShift
            </h2>
            <p style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>
              RuleShift is a two-player deduction duel. One player shapes the
              rule system, the other tries to break through it.
            </p>
            <ul style={{ paddingLeft: 18, fontSize: 14, margin: 0 }}>
              <li style={{ marginBottom: 6 }}>
                <strong>Patcher</strong> creates each round:
                <br />• one new rule the code must obey
                <br />• a secret 4-character code (A–Z, 0–9) that follows{" "}
                <strong>all</strong> rules so far.
              </li>
              <li style={{ marginBottom: 6 }}>
                <strong>Breaker</strong> attempts to find a code that satisfies
                the entire rule system.
              </li>
              <li style={{ marginBottom: 6 }}>
                Outside Endgame, the Breaker&apos;s core objective is to
                discover a <strong>VALID</strong> code — any code that satisfies
                every rule. A VALID guess ends the round and swaps roles.
              </li>
              <li style={{ marginBottom: 6 }}>
                A guess can be:
                <br />
                <strong>INVALID</strong> — breaks at least one rule.
                <br />
                <strong>VALID</strong> — satisfies all rules but isn&apos;t the
                secret code (round ends, roles swap).
                <br />
                <strong>EXACT</strong> — the Patcher&apos;s secret code itself
                (the Breaker Gains extra points).
              </li>
              <li>
                The Patcher&apos;s job is to shape the rules so that finding a
                VALID code is hard, especially once the rules shrink the space
                down to{" "}
                <strong>25 or fewer valid codes</strong>. At that point the duel
                enters <strong>Endgame</strong>, where attempts are limited,
                INVALID guesses burn those attempts, VALID still only{" "}
                <strong>ends the round</strong>, and{" "}
                <strong>only an EXACT guess</strong> wins the duel for the
                Breaker.
              </li>
            </ul>
          </>
        );
      case 1:
        return (
          <>
            <h2 style={{ fontSize: 20, marginBottom: 8 }}>How a round works</h2>
            <ol style={{ paddingLeft: 18, fontSize: 14, margin: 0 }}>
              <li style={{ marginBottom: 4 }}>
                <strong>Patcher</strong> chooses{" "}
                <strong>one new rule template</strong> (e.g. &ldquo;No
                repeats&rdquo;, &ldquo;Position 2 must be a digit&rdquo;).
              </li>
              <li style={{ marginBottom: 4 }}>
                Then the Patcher sets a <strong>secret 4-character code</strong>{" "}
                (A–Z, 0–9) that obeys{" "}
                <strong>all active rules (old + new)</strong>.
              </li>
              <li style={{ marginBottom: 4 }}>
                The <strong>newest rule is hidden</strong> from the Breaker for
                this round. They only see the older rules.
              </li>
              <li style={{ marginBottom: 4 }}>
                <strong>Breaker</strong> starts guessing codes that must follow
                every rule.
              </li>
              <li style={{ marginBottom: 4 }}>
                The system labels each guess as{" "}
                <strong>INVALID / VALID / EXACT</strong> and updates the duel
                state:
                <br />
                • INVALID burns an attempt but the round continues.
                <br />
                • VALID ends the round (roles swap, duel continues).
                <br />
                • EXACT ends the duel (Breaker wins).
              </li>
              <li>
                When the rules shrink the space down to{" "}
                <strong>25 or fewer valid codes</strong>, the game enters{" "}
                <strong>Endgame</strong>: INVALID guesses burn from a{" "}
                <strong>limited attempt pool</strong>, a VALID guess still just{" "}
                <strong>ends the round</strong>, and{" "}
                <strong>only an EXACT guess</strong> wins the duel for the
                Breaker.
              </li>
            </ol>
          </>
        );
      case 2:
        return (
          <>
            <h2 style={{ fontSize: 20, marginBottom: 8 }}>Reading the board</h2>
            <p style={{ fontSize: 14, opacity: 0.9, marginBottom: 10 }}>
              Here&apos;s what you&apos;ll see on the main screen:
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid #4b5563",
                  fontSize: 13,
                }}
              >
                <strong>Top bar</strong>: round, scores, who&apos;s Patcher /
                Breaker, and whether you&apos;re in{" "}
                <strong>Endgame</strong>.
              </div>
              <div
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid #4b5563",
                  fontSize: 13,
                }}
              >
                <strong>Active Rules</strong>: the visible constraints the code
                must follow. (The newest rule is hidden from the Breaker until
                the round ends.)
              </div>
              <div
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid #4b5563",
                  fontSize: 13,
                }}
              >
                <strong>Center panel</strong>: where the Patcher sets rules and
                code, or the Breaker submits guesses and sees results.
              </div>
              <div
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid #4b5563",
                  fontSize: 13,
                }}
              >
                <strong>Duel History</strong>: previous rounds (who patched
                what, which rules were added, and the secret codes).
              </div>
            </div>
            <p style={{ fontSize: 13, opacity: 0.85 }}>
              That&apos;s it. Once you start, follow the prompts on screen.
              You&apos;ll pick it up after a round or two.
            </p>
          </>
        );
      default:
        return null;
    }
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
        zIndex: 1200,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          maxWidth: 640,
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
        {/* Content */}
        <div style={{ marginBottom: 16 }}>{renderStepContent()}</div>

        {/* Progress dots */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 6,
            marginBottom: 12,
          }}
        >
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: i === step ? "#f97316" : "#4b5563",
              }}
            />
          ))}
        </div>

        {/* Buttons */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <button
            onClick={onClose}
            style={{
              borderRadius: 999,
              padding: "6px 14px",
              border: "1px solid #4b5563",
              background: "#020617",
              color: "#9ca3af",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Skip for now
          </button>

          <div style={{ display: "flex", gap: 8 }}>
            {step > 0 && (
              <button
                onClick={goPrev}
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
                Back
              </button>
            )}
            <button
              onClick={goNext}
              style={{
                borderRadius: 999,
                padding: "6px 18px",
                border: "none",
                background: "#22c55e",
                color: "#022c22",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {step === totalSteps - 1 ? "Start playing" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
