// src/components/TutorialOverlay.tsx
import React, { useState, useEffect } from "react";
import { BreakerToyExample } from "./BreakerToyExample";

export type TutorialRole = "breaker" | "patcher";

type TutorialOverlayProps = {
  isOpen: boolean;
  initialRole?: TutorialRole;
  onClose: () => void;
};

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

        {/* Interactive toy example from separate file */}
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
        alignItems: "flex-start", // top-align to avoid "zoomed modal" feel
        justifyContent: "center",
        zIndex: 1300,
        padding: "16px 12px 24px",
        overflowY: "auto", // whole overlay scrolls on small screens
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
          margin: "24px auto 0", // give some breathing room from top
          maxHeight: "min(640px, 100vh - 48px)",
          overflowY: "auto", // inner card scrolls if content is tall
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
            gap: 8,
            flexWrap: "wrap",
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
              flexShrink: 0,
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
