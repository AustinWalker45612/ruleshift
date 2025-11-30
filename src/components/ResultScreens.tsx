// src/ResultScreens.tsx
import React from "react";

type Phase =
  | "enterNames"
  | "patcherSetup"
  | "passToBreaker"
  | "breakerTurn"
  | "validResult"
  | "exactResult"
  | "breakerWin"
  | "patcherWin";

type GuessResult = "INVALID" | "VALID" | "EXACT";

type ResultScreensProps = {
  phase: Phase;
  lastGuessValue: string | null;
  lastResult: GuessResult | null;
  patcherSecretCode: string;
  currentBreakerName: string;
  currentPatcherName: string;
  onNextRound: () => void;
  onRestartDuel: () => void;
  lastBreakerPoints: number | null;
  lastPatcherPoints: number | null;
};

export const ResultScreens: React.FC<ResultScreensProps> = ({
  phase,
  lastGuessValue,
  lastResult,
  patcherSecretCode,
  currentBreakerName,
  currentPatcherName,
  onNextRound,
  onRestartDuel,
  lastBreakerPoints,
  lastPatcherPoints,
}) => {
  if (
    phase !== "validResult" &&
    phase !== "exactResult" &&
    phase !== "breakerWin" &&
    phase !== "patcherWin"
  ) {
    return null;
  }

  const renderScoreLine = () => {
    if (lastBreakerPoints == null && lastPatcherPoints == null) return null;

    if (phase === "patcherWin") {
      if (lastPatcherPoints == null) return null;
      return (
        <p
          style={{
            fontSize: 12,
            marginBottom: 10,
            opacity: 0.85,
          }}
        >
          {currentPatcherName} earned{" "}
          <strong>
            +{lastPatcherPoints} point
            {lastPatcherPoints === 1 ? "" : "s"}
          </strong>{" "}
          from this defense.
        </p>
      );
    }

    if (lastBreakerPoints == null || lastPatcherPoints == null) return null;

    return (
      <p
        style={{
          fontSize: 12,
          marginBottom: 10,
          opacity: 0.85,
        }}
      >
        {currentBreakerName} gained{" "}
        <strong>
          +{lastBreakerPoints} point
          {lastBreakerPoints === 1 ? "" : "s"}
        </strong>{" "}
        and {currentPatcherName} gained{" "}
        <strong>
          +{lastPatcherPoints} point
          {lastPatcherPoints === 1 ? "" : "s"}
        </strong>{" "}
        this round.
      </p>
    );
  };

  if (phase === "validResult" && lastGuessValue) {
    return (
      <div
        style={{
          background: "#022c22",
          padding: 20,
          borderRadius: 16,
          boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
          textAlign: "center",
          marginTop: 16,
        }}
      >
        <h2 style={{ marginBottom: 8, fontSize: 22 }}>✅ VALID BREAK!</h2>
        <p style={{ fontSize: 14, marginBottom: 12, opacity: 0.9 }}>
          {currentBreakerName} found a{" "}
          <strong>code that fits every rule</strong>.
        </p>
        <p style={{ fontSize: 13, marginBottom: 8 }}>
          Guess:{" "}
          <span
            style={{
              fontFamily: "monospace",
              letterSpacing: 2,
              fontWeight: 600,
            }}
          >
            {lastGuessValue}
          </span>
        </p>
        <p style={{ fontSize: 12, marginBottom: 12, opacity: 0.8 }}>
          Secret code was{" "}
          <span
            style={{
              fontFamily: "monospace",
              letterSpacing: 2,
              fontWeight: 600,
            }}
          >
            {patcherSecretCode}
          </span>
          .
        </p>
        {renderScoreLine()}
        <p
          style={{
            fontSize: 12,
            marginBottom: 16,
            opacity: 0.7,
          }}
        >
          The system survives… but it has to evolve. A new round begins with
          roles flipped.
        </p>
        <button
          onClick={onNextRound}
          style={{
            padding: "10px 24px",
            borderRadius: 999,
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
            background: "#10b981",
            color: "#e5e7eb",
            width: "100%",
          }}
        >
          Start Next Round
        </button>
      </div>
    );
  }

  if (phase === "exactResult" && lastGuessValue) {
    return (
      <div
        style={{
          background: "#1f2937",
          padding: 24,
          borderRadius: 18,
          boxShadow: "0 25px 50px rgba(0,0,0,0.7)",
          textAlign: "center",
          border: "1px solid #facc15",
          marginTop: 16,
        }}
      >
        <h2
          style={{
            marginBottom: 8,
            fontSize: 24,
          }}
        >
          🎉 SYSTEM SHATTERED!
        </h2>
        <p
          style={{
            fontSize: 15,
            marginBottom: 12,
          }}
        >
          {currentBreakerName} <strong>nailed the exact code</strong>.
        </p>
        <p style={{ fontSize: 14, marginBottom: 10 }}>
          Winning guess:
          <br />
          <span
            style={{
              display: "inline-block",
              marginTop: 4,
              padding: "8px 16px",
              borderRadius: 999,
              background: "#111827",
              fontFamily: "monospace",
              letterSpacing: 3,
              fontWeight: 700,
            }}
          >
            {lastGuessValue}
          </span>
        </p>
        <p
          style={{
            fontSize: 12,
            marginBottom: 4,
            opacity: 0.8,
          }}
        >
          Patcher&apos;s secret code was the same:
        </p>
        <p
          style={{
            fontSize: 13,
            marginBottom: 16,
            fontFamily: "monospace",
            letterSpacing: 3,
          }}
        >
          {patcherSecretCode}
        </p>
        {renderScoreLine()}
        <p
          style={{
            fontSize: 12,
            marginBottom: 18,
            opacity: 0.75,
          }}
        >
          The current system has been completely cracked. Time to rebuild a
          tougher one…
        </p>
        <button
          onClick={onNextRound}
          style={{
            padding: "10px 24px",
            borderRadius: 999,
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
            background: "#facc15",
            color: "#111827",
            width: "100%",
          }}
        >
          New System, Next Round
        </button>
      </div>
    );
  }

  if (phase === "breakerWin" && lastGuessValue) {
    return (
      <div
        style={{
          background: "#022c22",
          padding: 24,
          borderRadius: 18,
          boxShadow: "0 25px 50px rgba(0,0,0,0.7)",
          textAlign: "center",
          border: "1px solid #22c55e",
          marginTop: 16,
        }}
      >
        <h2
          style={{
            marginBottom: 8,
            fontSize: 24,
          }}
        >
          🧠 CHECKMATE: BREAKER WINS
        </h2>
        <p
          style={{
            fontSize: 15,
            marginBottom: 12,
          }}
        >
          In endgame, {currentBreakerName}{" "}
          <strong>sniped the exact secret code</strong> and wins the duel.
        </p>
        <p style={{ fontSize: 14, marginBottom: 10 }}>
          Winning guess:
          <br />
          <span
            style={{
              display: "inline-block",
              marginTop: 4,
              padding: "8px 16px",
              borderRadius: 999,
              background: "#111827",
              fontFamily: "monospace",
              letterSpacing: 3,
              fontWeight: 700,
            }}
          >
            {lastGuessValue}
          </span>
        </p>
        <p
          style={{
            fontSize: 12,
            marginBottom: 4,
            opacity: 0.8,
          }}
        >
          Patcher&apos;s secret code:
        </p>
        <p
          style={{
            fontSize: 13,
            marginBottom: 16,
            fontFamily: "monospace",
            letterSpacing: 3,
          }}
        >
          {patcherSecretCode}
        </p>
        {renderScoreLine()}
        <button
          onClick={onRestartDuel}
          style={{
            padding: "10px 24px",
            borderRadius: 999,
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
            background: "#22c55e",
            color: "#022c22",
            width: "100%",
          }}
        >
          Restart Duel
        </button>
      </div>
    );
  }

  if (phase === "patcherWin") {
    return (
      <div
        style={{
          background: "#111827",
          padding: 24,
          borderRadius: 18,
          boxShadow: "0 25px 50px rgba(0,0,0,0.7)",
          textAlign: "center",
          border: "1px solid #f97316",
          marginTop: 16,
        }}
      >
        <h2
          style={{
            marginBottom: 8,
            fontSize: 24,
          }}
        >
          🛡️ DEFENSE HOLDS: PATCHER WINS
        </h2>
        <p
          style={{
            fontSize: 15,
            marginBottom: 12,
          }}
        >
          {currentBreakerName}{" "}
          <strong>ran out of endgame attempts</strong> without finding a VALID
          or EXACT code. The system holds, and {currentPatcherName} wins the
          duel.
        </p>
        {lastGuessValue && (
          <p style={{ fontSize: 13, marginBottom: 8 }}>
            Last guess:
            <br />
            <span
              style={{
                display: "inline-block",
                marginTop: 4,
                padding: "6px 12px",
                borderRadius: 999,
                background: "#020617",
                fontFamily: "monospace",
                letterSpacing: 2,
              }}
            >
              {lastGuessValue}
            </span>
          </p>
        )}
        <p
          style={{
            fontSize: 12,
            marginBottom: 4,
            opacity: 0.8,
          }}
        >
          Patcher&apos;s secret code was:
        </p>
        <p
          style={{
            fontSize: 13,
            marginBottom: 16,
            fontFamily: "monospace",
            letterSpacing: 3,
          }}
        >
          {patcherSecretCode}
        </p>
        {renderScoreLine()}
        <button
          onClick={onRestartDuel}
          style={{
            padding: "10px 24px",
            borderRadius: 999,
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
            background: "#f97316",
            color: "#111827",
            width: "100%",
          }}
        >
          Restart Duel
        </button>
      </div>
    );
  }

  return null;
};

export default ResultScreens;
