// src/layouts/DesktopLayout.tsx
import React, { type Dispatch, type SetStateAction } from "react";

import type { Rule, RuleTemplate } from "../game/gameTypes";
import { PatcherView } from "../components/PatcherView";
import { BreakerView } from "../components/BreakerView";
import ResultScreens from "../components/ResultScreens";
import { HowToPlayModal } from "../components/HowToPlayModal";
import { OnboardingOverlay } from "../components/OnboardingOverlay";
import {
  TutorialOverlay,
  type TutorialRole,
} from "../components/TutorialOverlay";

// Re-declare these simple types here (structurally identical to App.tsx)
type Player = {
  name: string;
  ready: boolean;
};

type Phase =
  | "enterNames"
  | "patcherSetup"
  | "breakerTurn"
  | "validResult"
  | "exactResult"
  | "breakerWin"
  | "patcherWin";

type GuessResult = "INVALID" | "VALID" | "EXACT";

type Guess = {
  value: string;
  result: GuessResult;
};

type Round = {
  roundNumber: number;
  patcherIndex: number;
  secretCode: string;
  ruleText: string;
  guesses: Guess[];
};

type SeatPresence = {
  seatIndex: number;
  occupied: boolean;
  clientId: string | null;
  connected: boolean;
};

type RoomPresence = {
  roomId: string;
  seats: SeatPresence[];
  spectatorsCount: number;
};

// Local TutorialMode (shared with App)
export type TutorialMode = TutorialRole | "none";

export type LayoutProps = {
  // Core meta
  roomId: string;
  players: Player[];
  phase: Phase;
  currentRoundNumber: number;
  currentPatcherName: string;
  currentBreakerName: string;
  playerScores: [number, number];

  // Local seat info
  isSpectator: boolean;
  thisPlayerIndex: number;
  thisPlayer: Player;

  // Presence + room link
  roomPresence: RoomPresence | null;
  copyStatus: "idle" | "copied" | "error";
  onCopyRoomLink: () => void;

  // Name entry
  bothPlayersReady: boolean;
  onStartGame: () => void;
  onNameChange: (value: string) => void;
  onConfirmName: () => void;

  // Who is patcher/breaker on this device
  isPatcherHere: boolean;
  isBreakerHere: boolean;
  currentPatcherIndex: number;
  currentBreakerIndex: number;

  // PatcherView props
  patcherSecretCode: string;
  setPatcherSecretCode: Dispatch<SetStateAction<string>>;

  selectedTemplate: RuleTemplate;
  setSelectedTemplate: Dispatch<SetStateAction<RuleTemplate>>;

  positionIndex: number;
  setPositionIndex: Dispatch<SetStateAction<number>>;

  positionChar: string;
  setPositionChar: Dispatch<SetStateAction<string>>;

  positionKind: "letter" | "digit";
  setPositionKind: Dispatch<SetStateAction<"letter" | "digit">>;

  lettersCount: number;
  setLettersCount: Dispatch<SetStateAction<number>>;

  digitsCount: number;
  setDigitsCount: Dispatch<SetStateAction<number>>;

  firstChar: string;
  setFirstChar: Dispatch<SetStateAction<string>>;

  secondChar: string;
  setSecondChar: Dispatch<SetStateAction<string>>;

  mustContainChar: string;
  setMustContainChar: Dispatch<SetStateAction<string>>;

  forbiddenChar: string;
  setForbiddenChar: Dispatch<SetStateAction<string>>;

  maxDigitValue: number;
  setMaxDigitValue: Dispatch<SetStateAction<number>>;

  cannotAdjCharA: string;
  setCannotAdjCharA: Dispatch<SetStateAction<string>>;

  cannotAdjCharB: string;
  setCannotAdjCharB: Dispatch<SetStateAction<string>>;

  distinctCount: number;
  setDistinctCount: Dispatch<SetStateAction<number>>;

  availableTemplateOptions: any[]; // snapshot options, view-only here
  patcherRuleError: string | null;
  handleConfirmPatcherSetup: () => void;
  visibleRules: Rule[];
  validCodesCount: number;

  // BreakerView props
  currentBreaker: Player;
  breakerGuess: string;
  setBreakerGuess: Dispatch<SetStateAction<string>>;
  breakerError: string | null;
  handleAddGuess: () => void;
  currentRoundGuesses: Guess[];
  playerCorrectGuesses: string[][];
  playerIncorrectGuesses: string[][];
  endgameModeActive: boolean;
  isEndgameWindow: boolean;
  endgameBaseAttempts: number;
  endgameBonusAttempts: number;
  endgameAttemptsLeft: number;
  validCodes: string[];
  templatesAvailableForCurrentRound: any[];

  // Results + history
  rounds: Round[];
  lastResult: GuessResult | null;
  lastGuessValue: string | null;
  lastBreakerPoints: number | null;
  lastPatcherPoints: number | null;
  patcherRuleText: string;
  onNextRound: () => void;
  onRestartDuel: () => void;

  // Overlays
  showOnboarding: boolean;
  onCloseOnboarding: () => void;
  showHowToPlay: boolean;
  setShowHowToPlay: Dispatch<SetStateAction<boolean>>;
  tutorialMode: TutorialMode;
  setTutorialMode: Dispatch<SetStateAction<TutorialMode>>;
};

export const DesktopLayout: React.FC<LayoutProps> = (props) => {
  const {
    roomId,
    players,
    phase,
    currentRoundNumber,
    currentPatcherName,
    currentBreakerName,
    playerScores,

    isSpectator,
    thisPlayerIndex,
    thisPlayer,

    roomPresence,
    copyStatus,
    onCopyRoomLink,

    bothPlayersReady,
    onStartGame,
    onNameChange,
    onConfirmName,

    isPatcherHere,
    isBreakerHere,
    currentBreakerIndex,

    patcherSecretCode,
    setPatcherSecretCode,
    selectedTemplate,
    setSelectedTemplate,
    positionIndex,
    setPositionIndex,
    positionChar,
    setPositionChar,
    positionKind,
    setPositionKind,
    lettersCount,
    setLettersCount,
    digitsCount,
    setDigitsCount,
    firstChar,
    setFirstChar,
    secondChar,
    setSecondChar,
    mustContainChar,
    setMustContainChar,
    forbiddenChar,
    setForbiddenChar,
    maxDigitValue,
    setMaxDigitValue,
    cannotAdjCharA,
    setCannotAdjCharA,
    cannotAdjCharB,
    setCannotAdjCharB,
    distinctCount,
    setDistinctCount,
    availableTemplateOptions,
    patcherRuleError,
    handleConfirmPatcherSetup,
    visibleRules,
    validCodesCount,

    currentBreaker,
    breakerGuess,
    setBreakerGuess,
    breakerError,
    handleAddGuess,
    currentRoundGuesses,
    playerCorrectGuesses,
    playerIncorrectGuesses,
    endgameModeActive,
    isEndgameWindow,
    endgameBaseAttempts,
    endgameBonusAttempts,
    endgameAttemptsLeft,
    validCodes,
    templatesAvailableForCurrentRound,

    rounds,
    lastResult,
    lastGuessValue,
    lastBreakerPoints,
    lastPatcherPoints,
    onNextRound,
    onRestartDuel,

    showOnboarding,
    onCloseOnboarding,
    showHowToPlay,
    setShowHowToPlay,
    tutorialMode,
    setTutorialMode,
  } = props;

  const seat0 = roomPresence?.seats?.find((s) => s.seatIndex === 0);
  const seat1 = roomPresence?.seats?.find((s) => s.seatIndex === 1);
  const seat0Connected = !!seat0?.connected;
  const seat1Connected = !!seat1?.connected;
  const spectatorsCount = roomPresence?.spectatorsCount ?? 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflowY: "auto",
        padding: "16px clamp(8px, 4vw, 32px)",
        boxSizing: "border-box",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        background: "#0f172a",
        color: "#e5e7eb",
      }}
    >
      {/* Onboarding overlay */}
      <OnboardingOverlay isOpen={showOnboarding} onClose={onCloseOnboarding} />

      <div
        style={{
          width: "100%",
          maxWidth: "1120px",
          margin: "0 auto",
        }}
      >
        {/* HEADER */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1 1 260px" }}>
            <h1
              style={{
                marginBottom: 4,
                fontSize: "clamp(30px, 4.2vw, 44px)",
              }}
            >
              RuleShift
            </h1>

            <p
              style={{
                marginBottom: 4,
                fontSize: 12,
                opacity: 0.75,
              }}
            >
              Room: <strong>{roomId}</strong>{" "}
              <span style={{ opacity: 0.7 }}>
                •{" "}
                {isSpectator
                  ? "You are watching as a spectator"
                  : `You are Player ${thisPlayerIndex + 1}`}
              </span>
            </p>

            {roomPresence ? (
              <p
                style={{
                  marginBottom: 4,
                  fontSize: 11,
                  opacity: 0.8,
                }}
              >
                Connections — P1:{" "}
                <span
                  style={{ color: seat0Connected ? "#4ade80" : "#f97373" }}
                >
                  {seat0Connected ? "online" : "offline"}
                </span>{" "}
                · P2:{" "}
                <span
                  style={{ color: seat1Connected ? "#4ade80" : "#f97373" }}
                >
                  {seat1Connected ? "online" : "offline"}
                </span>{" "}
                · Spectators: {spectatorsCount}
              </p>
            ) : (
              <p
                style={{
                  marginBottom: 4,
                  fontSize: 11,
                  opacity: 0.6,
                }}
              >
                Connecting players…
              </p>
            )}

            <p
              style={{
                marginTop: 4,
                marginBottom: 0,
                fontSize: "clamp(13px, 1.5vw, 15px)",
              }}
            >
              Two players. One evolving rule system. Patcher vs Breaker in a
              duel.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              alignItems: "flex-end",
              flexShrink: 0,
            }}
          >
            <button
              onClick={onCopyRoomLink}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 999,
                border: "1px solid #4b5563",
                background: "#020617",
                color: "#e5e7eb",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              <span>Copy room link</span>
              {copyStatus === "copied" && (
                <span style={{ fontSize: 11, color: "#4ade80" }}>✓ Copied</span>
              )}
              {copyStatus === "error" && (
                <span style={{ fontSize: 11, color: "#f97373" }}>Error</span>
              )}
            </button>

            <button
              onClick={() => setShowHowToPlay(true)}
              style={{
                borderRadius: 999,
                padding: "6px 12px",
                border: "1px solid #4b5563",
                background: "#020617",
                color: "#e5e7eb",
                cursor: "pointer",
                fontSize: 13,
                whiteSpace: "nowrap",
              }}
            >
              ❓ How to play
            </button>

            <button
              onClick={() => setTutorialMode("breaker")}
              style={{
                borderRadius: 999,
                padding: "6px 12px",
                border: "1px solid #4b5563",
                background: "#020617",
                color: "#e5e7eb",
                cursor: "pointer",
                fontSize: 12,
                whiteSpace: "nowrap",
              }}
            >
              🧠 Examples (Breaker / Patcher)
            </button>
          </div>
        </header>

        {/* ENTER NAMES */}
        {phase === "enterNames" && (
          <>
            {!isSpectator ? (
              <div
                style={{
                  background: "#111827",
                  padding: 20,
                  borderRadius: 14,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
                  maxWidth: 560,
                  margin: "0 auto",
                }}
              >
                <h2
                  style={{
                    marginBottom: 8,
                    fontSize: "clamp(18px,2.3vw,22px)",
                  }}
                >
                  {thisPlayerIndex === 0
                    ? "Player 1, enter your name"
                    : "Player 2, enter your name"}
                </h2>
                <p
                  style={{
                    marginBottom: 12,
                    fontSize: 12,
                    opacity: 0.7,
                  }}
                >
                  This screen is for{" "}
                  <strong>
                    Player {thisPlayerIndex + 1}
                    {thisPlayer.name ? ` (${thisPlayer.name})` : ""}
                  </strong>
                  . Each player only sets and confirms their own name.
                </p>

                <label style={{ display: "block", marginBottom: 12 }}>
                  Your name:
                  <input
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      marginTop: 4,
                      padding: 10,
                      borderRadius: 8,
                      border: "1px solid #374151",
                      background: "#020617",
                      color: "#e5e7eb",
                      fontSize: 16, // prevent browser zoom on name input
                    }}
                    value={thisPlayer.name}
                    onChange={(e) => onNameChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        onConfirmName();
                      }
                    }}
                    placeholder="Type your name"
                  />
                </label>

                <button
                  onClick={onConfirmName}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "10px 16px",
                    borderRadius: 999,
                    border: "1px solid #4b5563",
                    fontWeight: 500,
                    cursor: thisPlayer.name.trim() ? "pointer" : "not-allowed",
                    background: thisPlayer.ready ? "#16a34a" : "#111827",
                    color: thisPlayer.ready ? "#ecfdf5" : "#e5e7eb",
                    marginBottom: 12,
                    fontSize: 16, // prevent zoom when tapping button
                  }}
                  disabled={!thisPlayer.name.trim()}
                >
                  {thisPlayer.ready ? "Name confirmed ✓" : "Confirm name"}
                </button>

                <div
                  style={{
                    background: "#020617",
                    borderRadius: 8,
                    padding: 8,
                    border: "1px solid #1f2937",
                    fontSize: 12,
                    marginBottom: 12,
                  }}
                >
                  <div>
                    Player 1:{" "}
                    <strong>
                      {players[0].name || "(not set yet)"}{" "}
                      {players[0].ready ? "✓" : ""}
                    </strong>{" "}
                    <span
                      style={{
                        fontSize: 11,
                        opacity: 0.8,
                        marginLeft: 4,
                        color: seat0Connected ? "#4ade80" : "#f97373",
                      }}
                    >
                      {seat0Connected ? "online" : "offline"}
                    </span>
                  </div>
                  <div>
                    Player 2:{" "}
                    <strong>
                      {players[1].name || "(not set yet)"}{" "}
                      {players[1].ready ? "✓" : ""}
                    </strong>{" "}
                    <span
                      style={{
                        fontSize: 11,
                        opacity: 0.8,
                        marginLeft: 4,
                        color: seat1Connected ? "#4ade80" : "#f97373",
                      }}
                    >
                      {seat1Connected ? "online" : "offline"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={onStartGame}
                  disabled={!bothPlayersReady}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "11px 16px",
                    borderRadius: 999,
                    border: "none",
                    fontWeight: 600,
                    cursor: bothPlayersReady ? "pointer" : "not-allowed",
                    background: bothPlayersReady ? "#2563eb" : "#1f2937",
                    color: "#e5e7eb",
                    fontSize: 16, // keep primary CTA at 16px
                  }}
                >
                  {bothPlayersReady
                    ? "Start Duel"
                    : "Waiting for both players to confirm names"}
                </button>
              </div>
            ) : (
              <div
                style={{
                  background: "#111827",
                  padding: 20,
                  borderRadius: 14,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
                  maxWidth: 560,
                  margin: "0 auto",
                }}
              >
                <h2
                  style={{
                    marginBottom: 8,
                    fontSize: "clamp(18px,2.3vw,22px)",
                  }}
                >
                  Spectator Lobby
                </h2>
                <p
                  style={{
                    marginBottom: 12,
                    fontSize: 12,
                    opacity: 0.7,
                  }}
                >
                  You&apos;re watching this duel as a spectator. Names are set
                  from the player devices.
                </p>

                <div
                  style={{
                    background: "#020617",
                    borderRadius: 8,
                    padding: 8,
                    border: "1px solid #1f2937",
                    fontSize: 12,
                    marginBottom: 8,
                  }}
                >
                  <div>
                    Player 1:{" "}
                    <strong>
                      {players[0].name || "(not set yet)"}{" "}
                      {players[0].ready ? "✓" : ""}
                    </strong>{" "}
                    <span
                      style={{
                        fontSize: 11,
                        opacity: 0.8,
                        marginLeft: 4,
                        color: seat0Connected ? "#4ade80" : "#f97373",
                      }}
                    >
                      {seat0Connected ? "online" : "offline"}
                    </span>
                  </div>
                  <div>
                    Player 2:{" "}
                    <strong>
                      {players[1].name || "(not set yet)"}{" "}
                      {players[1].ready ? "✓" : ""}
                    </strong>{" "}
                    <span
                      style={{
                        fontSize: 11,
                        opacity: 0.8,
                        marginLeft: 4,
                        color: seat1Connected ? "#4ade80" : "#f97373",
                      }}
                    >
                      {seat1Connected ? "online" : "offline"}
                    </span>
                  </div>
                </div>

                <p
                  style={{
                    fontSize: 12,
                    opacity: 0.7,
                    marginTop: 8,
                  }}
                >
                  Once both players are ready and start the duel, you&apos;ll
                  see the full game board.
                </p>
              </div>
            )}
          </>
        )}

        {/* EVERYTHING AFTER NAMES */}
        {phase !== "enterNames" && (
          <>
            {/* STATUS + SCORE */}
            <div
              style={{
                marginBottom: 8,
                padding: 12,
                borderRadius: 12,
                background: "#020617",
                border: "1px solid #1f2937",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 14,
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span>Round: {currentRoundNumber}</span>
                <span>
                  Patcher: <strong>{currentPatcherName}</strong> | Breaker:{" "}
                  <strong>{currentBreakerName}</strong>
                </span>
              </div>
              <div style={{ marginTop: 4, fontSize: 13 }}>
                Score — {players[0].name || "Player 1"}:{" "}
                {playerScores[0] ?? 0} | {players[1].name || "Player 2"}:{" "}
                {playerScores[1] ?? 0}
              </div>
            </div>

            {/* PATCHER SETUP VIEW */}
            {phase === "patcherSetup" && isPatcherHere && (
              <PatcherView
                mode="patcher"
                currentPatcherName={currentPatcherName}
                patcherSecretCode={patcherSecretCode}
                setPatcherSecretCode={setPatcherSecretCode}
                selectedTemplate={selectedTemplate}
                setSelectedTemplate={setSelectedTemplate}
                positionIndex={positionIndex}
                setPositionIndex={setPositionIndex}
                positionChar={positionChar}
                setPositionChar={setPositionChar}
                positionKind={positionKind}
                setPositionKind={setPositionKind}
                lettersCount={lettersCount}
                setLettersCount={setLettersCount}
                digitsCount={digitsCount}
                setDigitsCount={setDigitsCount}
                firstChar={firstChar}
                setFirstChar={setFirstChar}
                secondChar={secondChar}
                setSecondChar={setSecondChar}
                mustContainChar={mustContainChar}
                setMustContainChar={setMustContainChar}
                forbiddenChar={forbiddenChar}
                setForbiddenChar={setForbiddenChar}
                maxDigitValue={maxDigitValue}
                setMaxDigitValue={setMaxDigitValue}
                cannotAdjCharA={cannotAdjCharA}
                setCannotAdjCharA={setCannotAdjCharA}
                cannotAdjCharB={cannotAdjCharB}
                setCannotAdjCharB={setCannotAdjCharB}
                distinctCount={distinctCount}
                setDistinctCount={setDistinctCount}
                availableTemplateOptions={availableTemplateOptions}
                patcherRuleError={patcherRuleError}
                handleConfirmPatcherSetup={handleConfirmPatcherSetup}
                visibleRules={visibleRules}
                validCodesCount={validCodesCount}
              />
            )}

            {/* NON-PATCHER DURING SETUP */}
            {phase === "patcherSetup" && !isPatcherHere && (
              <div
                style={{
                  background: "#111827",
                  padding: 20,
                  borderRadius: 12,
                  textAlign: "center",
                  maxWidth: 520,
                  margin: "0 auto",
                  border: "1px solid #4b5563",
                }}
              >
                <h3
                  style={{
                    fontSize: 15,
                    marginBottom: 4,
                    fontWeight: 600,
                  }}
                >
                  Waiting for Patcher
                </h3>
                <p style={{ fontSize: 14 }}>
                  Waiting for{" "}
                  <strong>{currentPatcherName || "your opponent"}</strong> to
                  set the secret code and add a new rule.
                </p>
              </div>
            )}

            {/* BREAKER TURN VIEW */}
            {phase === "breakerTurn" && isBreakerHere && (
              <BreakerView
                mode="phone"
                currentBreaker={currentBreaker}
                breakerGuess={breakerGuess}
                setBreakerGuess={setBreakerGuess}
                breakerError={breakerError}
                handleAddGuess={handleAddGuess}
                currentRoundGuesses={currentRoundGuesses}
                playerCorrectGuesses={playerCorrectGuesses}
                playerIncorrectGuesses={playerIncorrectGuesses}
                currentBreakerIndex={currentBreakerIndex}
                endgameModeActive={endgameModeActive}
                isEndgameWindow={isEndgameWindow}
                endgameBaseAttempts={endgameBaseAttempts}
                endgameBonusAttempts={endgameBonusAttempts}
                endgameAttemptsLeft={endgameAttemptsLeft}
                validCodes={validCodes}
                visibleRules={visibleRules}
                validCodesCount={validCodesCount}
                availableTemplatesForThisPatchRound={
                  templatesAvailableForCurrentRound
                }
              />
            )}

            {/* NON-BREAKER DURING BREAKER TURN */}
            {phase === "breakerTurn" && !isBreakerHere && (
              <>
                {endgameModeActive && isEndgameWindow ? (
                  <BreakerView
                    mode="phone"
                    readOnly
                    currentBreaker={currentBreaker}
                    breakerGuess=""
                    setBreakerGuess={() => {}}
                    breakerError={null}
                    handleAddGuess={() => {}}
                    currentRoundGuesses={currentRoundGuesses}
                    playerCorrectGuesses={playerCorrectGuesses}
                    playerIncorrectGuesses={playerIncorrectGuesses}
                    currentBreakerIndex={currentBreakerIndex}
                    endgameModeActive={endgameModeActive}
                    isEndgameWindow={isEndgameWindow}
                    endgameBaseAttempts={endgameBaseAttempts}
                    endgameBonusAttempts={endgameBonusAttempts}
                    endgameAttemptsLeft={endgameAttemptsLeft}
                    validCodes={validCodes}
                    visibleRules={visibleRules}
                    validCodesCount={validCodesCount}
                    availableTemplatesForThisPatchRound={
                      templatesAvailableForCurrentRound
                    }
                  />
                ) : (
                  <div
                    style={{
                      background: "#111827",
                      padding: 20,
                      borderRadius: 12,
                      textAlign: "center",
                      maxWidth: 520,
                      margin: "0 auto",
                      border: "1px solid #4b5563",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: 15,
                        marginBottom: 4,
                        fontWeight: 600,
                      }}
                    >
                      Waiting for Breaker
                    </h3>
                    <p style={{ fontSize: 14 }}>
                      <strong>{currentBreakerName || "Your opponent"}</strong>{" "}
                      is currently trying to break the system.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* RESULT SCREENS */}
            {(phase === "validResult" ||
              phase === "exactResult" ||
              phase === "breakerWin" ||
              phase === "patcherWin") && (
              <ResultScreens
                phase={phase}
                lastGuessValue={lastGuessValue}
                lastResult={lastResult}
                patcherSecretCode={patcherSecretCode}
                currentBreakerName={currentBreakerName}
                currentPatcherName={currentPatcherName}
                onNextRound={onNextRound}
                onRestartDuel={onRestartDuel}
                lastBreakerPoints={lastBreakerPoints}
                lastPatcherPoints={lastPatcherPoints}
              />
            )}

            {/* DUEL HISTORY */}
            <div
              style={{
                background: "#020617",
                padding: 12,
                borderRadius: 12,
                border: "1px solid #1f2937",
                fontSize: 12,
                marginTop: 16,
              }}
            >
              <h3 style={{ marginBottom: 8, fontSize: 13 }}>Duel History</h3>

              {rounds.length === 0 || rounds.length === 1 ? (
                <p style={{ opacity: 0.6, fontSize: 12 }}>
                  Once you get further into the duel, completed rounds will
                  appear here.
                </p>
              ) : (
                rounds.map((r) => (
                  <div
                    key={r.roundNumber}
                    style={{
                      marginBottom: 10,
                      paddingBottom: 8,
                      borderBottom: "1px solid #111827",
                    }}
                  >
                    <div style={{ marginBottom: 2 }}>
                      <strong>Round {r.roundNumber}</strong> — Patcher:{" "}
                      {players[r.patcherIndex].name}
                    </div>
                    <div>Code: {r.secretCode}</div>
                    <div style={{ opacity: 0.8 }}>Rule: {r.ruleText}</div>
                  </div>
                ))
              )}

              <button
                onClick={onRestartDuel}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "8px 16px",
                  borderRadius: 999,
                  border: "1px solid #4b5563",
                  fontWeight: 500,
                  cursor: "pointer",
                  background: "transparent",
                  color: "#9ca3af",
                  marginTop: 8,
                }}
              >
                Restart Duel
              </button>
            </div>
          </>
        )}

        {/* HOW TO PLAY MODAL */}
        <HowToPlayModal
          isOpen={showHowToPlay}
          onClose={() => setShowHowToPlay(false)}
          currentPatcherName={currentPatcherName}
          currentBreakerName={currentBreakerName}
        />

        {/* TUTORIAL OVERLAY */}
        <TutorialOverlay
          isOpen={tutorialMode !== "none"}
          initialRole={tutorialMode === "none" ? "breaker" : tutorialMode}
          onClose={() => setTutorialMode("none")}
        />
      </div>
    </div>
  );
};
