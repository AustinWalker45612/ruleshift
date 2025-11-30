import React from "react";
import type { Guess } from "../game/gameTypes";

type BreakerTurnProps = {
  breakerName: string;
  breakerGuess: string;
  setBreakerGuess: (v: string) => void;
  breakerError: string | null;
  onSubmitGuess: () => void;

  endgameModeActive: boolean;
  isEndgameWindow: boolean;
  validCodesCount: number;
  endgameBaseAttempts: number;
  endgameBonusAttempts: number;
  endgameAttemptsLeft: number;

  currentRoundGuesses: Guess[];
  correctGuesses: string[];
  incorrectGuesses: string[];
};

export const BreakerTurn: React.FC<BreakerTurnProps> = ({
  breakerName,
  breakerGuess,
  setBreakerGuess,
  breakerError,
  onSubmitGuess,
  endgameModeActive,
  isEndgameWindow,
  validCodesCount,
  endgameBaseAttempts,
  endgameBonusAttempts,
  endgameAttemptsLeft,
  currentRoundGuesses,
  correctGuesses,
  incorrectGuesses,
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
      <h2 style={{ marginBottom: 8 }}>
        {breakerName}&apos;s Turn (BREAKER)
      </h2>
      <p style={{ fontSize: 13, marginBottom: 12 }}>
        Guess 4-character codes that you think follow all active rules. The
        system will automatically label your guess as INVALID, VALID, or EXACT.
        You can&apos;t repeat the same code within this round, or reuse a code
        that was already INVALID for you earlier in the duel.
      </p>

      {endgameModeActive && isEndgameWindow && (
        <p
          style={{
            fontSize: 12,
            marginBottom: 12,
            padding: 8,
            borderRadius: 8,
            background: "#022c22",
            border: "1px solid #16a34a",
          }}
        >
          🔻 <strong>Endgame mode:</strong> only{" "}
          <span
            style={{
              fontFamily: "monospace",
              letterSpacing: 1,
            }}
          >
            {validCodesCount}
          </span>{" "}
          valid codes remain. This window granted{" "}
          <span
            style={{
              fontFamily: "monospace",
              letterSpacing: 1,
            }}
          >
            {endgameBaseAttempts}
          </span>{" "}
          base attempt{endgameBaseAttempts !== 1 ? "s" : ""} +{" "}
          <span
            style={{
              fontFamily: "monospace",
              letterSpacing: 1,
            }}
          >
            {endgameBonusAttempts}
          </span>{" "}
          bonus, for{" "}
          <span
            style={{
              fontFamily: "monospace",
              letterSpacing: 1,
              fontWeight: 600,
            }}
          >
            {endgameBaseAttempts + endgameBonusAttempts}
          </span>{" "}
          total. You now have{" "}
          <span
            style={{
              fontFamily: "monospace",
              letterSpacing: 1,
              fontWeight: 600,
            }}
          >
            {endgameAttemptsLeft}
          </span>{" "}
          attempt{endgameAttemptsLeft !== 1 ? "s" : ""} left. Invalid guesses
          consume attempts. Hitting a VALID code continues the duel as normal.
          Hitting an EXACT code wins you the duel.
        </p>
      )}

      <label style={{ display: "block", marginBottom: 8 }}>
        Your Guess:
        <input
          style={{
            width: "100%",
            marginTop: 4,
            padding: 8,
            borderRadius: 8,
            border: "1px solid #374151",
            background: "#020617",
            color: "#e5e7eb",
            letterSpacing: 2,
          }}
          value={breakerGuess}
          maxLength={4}
          onChange={(e) => setBreakerGuess(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSubmitGuess();
            }
          }}
          placeholder="e.g. A1B2"
        />
      </label>

      {breakerError && (
        <p
          style={{
            marginTop: 4,
            marginBottom: 8,
            fontSize: 12,
            color: "#f97373",
          }}
        >
          {breakerError}
        </p>
      )}

      <button
        onClick={onSubmitGuess}
        style={{
          width: "100%",
          padding: "10px 0",
          borderRadius: 999,
          border: "none",
          fontWeight: 600,
          cursor: "pointer",
          background: "#16a34a",
          color: "#e5e7eb",
          marginBottom: 16,
        }}
      >
        Submit Guess
      </button>

      {currentRoundGuesses.length > 0 && (
        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: "1px solid #1f2937",
            fontSize: 13,
            marginBottom: 12,
          }}
        >
          <h3 style={{ marginBottom: 8, fontSize: 14 }}>
            Guess History (this round)
          </h3>
          <ul style={{ listStyle: "none", paddingLeft: 0 }}>
            {currentRoundGuesses.map((g, idx) => (
              <li
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <span>{g.value}</span>
                <span style={{ opacity: 0.8 }}>{g.result}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {correctGuesses.length > 0 && (
        <div
          style={{
            marginTop: 4,
            paddingTop: 8,
            borderTop: "1px solid #1f2937",
            fontSize: 12,
            marginBottom: 10,
          }}
        >
          <h3 style={{ marginBottom: 6, fontSize: 13 }}>
            All Your Correct Guesses This Duel
          </h3>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            {correctGuesses.map((code, idx) => (
              <span
                key={idx}
                style={{
                  padding: "4px 8px",
                  borderRadius: 999,
                  border: "1px solid #16a34a",
                  background: "#022c22",
                  fontFamily: "monospace",
                  letterSpacing: 1,
                  fontSize: 12,
                }}
              >
                {code}
              </span>
            ))}
          </div>
        </div>
      )}

      {incorrectGuesses.length > 0 && (
        <div
          style={{
            marginTop: 4,
            paddingTop: 8,
            borderTop: "1px solid #1f2937",
            fontSize: 12,
          }}
        >
          <h3 style={{ marginBottom: 6, fontSize: 13 }}>
            All Your Incorrect Guesses This Duel
          </h3>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            {incorrectGuesses.map((code, idx) => (
              <span
                key={idx}
                style={{
                  padding: "4px 8px",
                  borderRadius: 999,
                  border: "1px solid #374151",
                  fontFamily: "monospace",
                  letterSpacing: 1,
                  fontSize: 12,
                  opacity: 0.9,
                }}
              >
                {code}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BreakerTurn;
