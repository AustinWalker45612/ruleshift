// src/layouts/MobileLayout.tsx
import React, { useState } from "react";

import { PatcherView } from "../components/PatcherView";
import { BreakerView } from "../components/BreakerView";
import ResultScreens from "../components/ResultScreens";
import { HowToPlayModal } from "../components/HowToPlayModal";
import { OnboardingOverlay } from "../components/OnboardingOverlay";
import { TutorialOverlay } from "../components/TutorialOverlay";

import type { LayoutProps } from "./DesktopLayout";

export const MobileLayout: React.FC<LayoutProps> = (props) => {
  const {
    // Core meta
    roomId,
    players,
    phase,
    currentRoundNumber,
    currentPatcherName,
    currentBreakerName,
    playerScores,

    // Seat info
    isSpectator,
    thisPlayerIndex,
    thisPlayer,

    // Presence + link
    roomPresence,
    copyStatus,
    onCopyRoomLink,

    // Names
    bothPlayersReady,
    onStartGame,
    onNameChange,
    onConfirmName,

    // role on this device
    isPatcherHere,
    isBreakerHere,
    currentBreakerIndex,

    // PatcherView props
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

    // BreakerView props
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

    // Results + history
    rounds,
    lastResult,
    lastGuessValue,
    lastBreakerPoints,
    lastPatcherPoints,
    patcherSecretCode: patcherCodeForResults,
    onNextRound,
    onRestartDuel,

    // Overlays
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

  // Mobile: duel history collapsed by default
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflowY: "auto",
        padding: "10px 10px 16px",
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
          maxWidth: 560,
          margin: "0 auto",
        }}
      >
        {/* HEADER (stacked, mobile-friendly) */}
        <header
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            gap: 8,
            marginBottom: 10,
          }}
        >
          <div style={{ textAlign: "left" }}>
            <h1
              style={{
                marginBottom: 2,
                fontSize: 28,
              }}
            >
              RuleShift
            </h1>

            <p
              style={{
                marginBottom: 2,
                fontSize: 11,
                opacity: 0.8,
              }}
            >
              Room: <strong>{roomId}</strong>{" "}
              <span style={{ opacity: 0.7 }}>
                •{" "}
                {isSpectator
                  ? "Spectator"
                  : `You are Player ${thisPlayerIndex + 1}`}
              </span>
            </p>

            {roomPresence ? (
              <p
                style={{
                  marginBottom: 2,
                  fontSize: 10,
                  opacity: 0.8,
                }}
              >
                P1:{" "}
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
                  marginBottom: 2,
                  fontSize: 10,
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
                fontSize: 12,
              }}
            >
              Two players. One evolving rule system.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              justifyContent: "flex-start",
            }}
          >
            <button
              onClick={onCopyRoomLink}
              style={{
                flexShrink: 0,
                padding: "5px 10px",
                borderRadius: 999,
                border: "1px solid #4b5563",
                background: "#020617",
                color: "#e5e7eb",
                fontSize: 10,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>Copy link</span>
              {copyStatus === "copied" && (
                <span style={{ fontSize: 10, color: "#4ade80" }}>✓</span>
              )}
              {copyStatus === "error" && (
                <span style={{ fontSize: 10, color: "#f97373" }}>!</span>
              )}
            </button>

            <button
              onClick={() => setShowHowToPlay(true)}
              style={{
                flexShrink: 0,
                padding: "5px 10px",
                borderRadius: 999,
                border: "1px solid #4b5563",
                background: "#020617",
                color: "#e5e7eb",
                fontSize: 11,
              }}
            >
              ❓ How to play
            </button>

            <button
              onClick={() => setTutorialMode("breaker")}
              style={{
                flexShrink: 0,
                padding: "5px 10px",
                borderRadius: 999,
                border: "1px solid #4b5563",
                background: "#020617",
                color: "#e5e7eb",
                fontSize: 11,
              }}
            >
              🧠 Examples
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
                  padding: 16,
                  borderRadius: 14,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
                }}
              >
                <h2
                  style={{
                    marginBottom: 6,
                    fontSize: 18,
                  }}
                >
                  {thisPlayerIndex === 0
                    ? "Player 1, enter your name"
                    : "Player 2, enter your name"}
                </h2>

                <p
                  style={{
                    marginBottom: 10,
                    fontSize: 11,
                    opacity: 0.7,
                  }}
                >
                  This phone is for{" "}
                  <strong>
                    Player {thisPlayerIndex + 1}
                    {thisPlayer.name ? ` (${thisPlayer.name})` : ""}
                  </strong>
                  .
                </p>

                <label style={{ display: "block", marginBottom: 10 }}>
                  <span style={{ fontSize: 12 }}>Your name</span>
                  <input
                    style={{
                      width: "100%",
                      marginTop: 4,
                      padding: 9,
                      borderRadius: 8,
                      border: "1px solid #374151",
                      background: "#020617",
                      color: "#e5e7eb",
                      fontSize: 14,
                      boxSizing: "border-box",
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
                  disabled={!thisPlayer.name.trim()}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 999,
                    border: "1px solid #4b5563",
                    background: thisPlayer.ready ? "#16a34a" : "#111827",
                    color: thisPlayer.ready ? "#ecfdf5" : "#e5e7eb",
                    fontSize: 14,
                    fontWeight: 500,
                    marginBottom: 10,
                    boxSizing: "border-box",
                  }}
                >
                  {thisPlayer.ready ? "Name confirmed ✓" : "Confirm name"}
                </button>

                <div
                  style={{
                    background: "#020617",
                    borderRadius: 8,
                    padding: 8,
                    border: "1px solid #1f2937",
                    fontSize: 11,
                    marginBottom: 10,
                  }}
                >
                  <div>
                    P1:{" "}
                    <strong>
                      {players[0].name || "(not set)"}{" "}
                      {players[0].ready ? "✓" : ""}
                    </strong>{" "}
                    <span
                      style={{
                        fontSize: 10,
                        marginLeft: 4,
                        color: seat0Connected ? "#4ade80" : "#f97373",
                      }}
                    >
                      {seat0Connected ? "online" : "offline"}
                    </span>
                  </div>
                  <div>
                    P2:{" "}
                    <strong>
                      {players[1].name || "(not set)"}{" "}
                      {players[1].ready ? "✓" : ""}
                    </strong>{" "}
                    <span
                      style={{
                        fontSize: 10,
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
                    padding: "10px 14px",
                    borderRadius: 999,
                    border: "none",
                    fontWeight: 600,
                    fontSize: 15,
                    background: bothPlayersReady ? "#2563eb" : "#1f2937",
                    color: "#e5e7eb",
                    boxSizing: "border-box",
                  }}
                >
                  {bothPlayersReady
                    ? "Start Duel"
                    : "Waiting for both players"}
                </button>
              </div>
            ) : (
              <div
                style={{
                  background: "#111827",
                  padding: 16,
                  borderRadius: 14,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
                }}
              >
                <h2
                  style={{
                    marginBottom: 6,
                    fontSize: 18,
                  }}
                >
                  Spectator Lobby
                </h2>
                <p
                  style={{
                    marginBottom: 10,
                    fontSize: 11,
                    opacity: 0.7,
                  }}
                >
                  You&apos;re watching as a spectator. Names are set on the
                  player devices.
                </p>

                <div
                  style={{
                    background: "#020617",
                    borderRadius: 8,
                    padding: 8,
                    border: "1px solid #1f2937",
                    fontSize: 11,
                    marginBottom: 8,
                  }}
                >
                  <div>
                    P1:{" "}
                    <strong>
                      {players[0].name || "(not set)"}{" "}
                      {players[0].ready ? "✓" : ""}
                    </strong>{" "}
                    <span
                      style={{
                        fontSize: 10,
                        marginLeft: 4,
                        color: seat0Connected ? "#4ade80" : "#f97373",
                      }}
                    >
                      {seat0Connected ? "online" : "offline"}
                    </span>
                  </div>
                  <div>
                    P2:{" "}
                    <strong>
                      {players[1].name || "(not set)"}{" "}
                      {players[1].ready ? "✓" : ""}
                    </strong>{" "}
                    <span
                      style={{
                        fontSize: 10,
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
                    fontSize: 11,
                    opacity: 0.7,
                    marginTop: 4,
                  }}
                >
                  When the duel starts, you&apos;ll see the board here.
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
                padding: 10,
                borderRadius: 10,
                background: "#020617",
                border: "1px solid #1f2937",
                fontSize: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 6,
                  flexWrap: "wrap",
                }}
              >
                <span>Round {currentRoundNumber}</span>
                <span>
                  Patcher: <strong>{currentPatcherName}</strong> · Breaker:{" "}
                  <strong>{currentBreakerName}</strong>
                </span>
              </div>
              <div style={{ marginTop: 4 }}>
                Score — {players[0].name || "P1"}: {playerScores[0] ?? 0} ·{" "}
                {players[1].name || "P2"}: {playerScores[1] ?? 0}
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
                  padding: 16,
                  borderRadius: 12,
                  textAlign: "center",
                  border: "1px solid #4b5563",
                }}
              >
                <h3
                  style={{
                    fontSize: 14,
                    marginBottom: 4,
                    fontWeight: 600,
                  }}
                >
                  Waiting for Patcher
                </h3>
                <p style={{ fontSize: 13 }}>
                  {currentPatcherName || "Your opponent"} is setting the secret
                  code and adding a new rule.
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
                      padding: 16,
                      borderRadius: 12,
                      textAlign: "center",
                      border: "1px solid #4b5563",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: 14,
                        marginBottom: 4,
                        fontWeight: 600,
                      }}
                    >
                      Waiting for Breaker
                    </h3>
                    <p style={{ fontSize: 13 }}>
                      {currentBreakerName || "Your opponent"} is trying to
                      break the system.
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
                patcherSecretCode={patcherCodeForResults}
                currentBreakerName={currentBreakerName}
                currentPatcherName={currentPatcherName}
                onNextRound={onNextRound}
                onRestartDuel={onRestartDuel}
                lastBreakerPoints={lastBreakerPoints}
                lastPatcherPoints={lastPatcherPoints}
              />
            )}

            {/* DUEL HISTORY — collapsible on mobile */}
            <div
              style={{
                background: "#020617",
                padding: 10,
                borderRadius: 12,
                border: "1px solid #1f2937",
                fontSize: 12,
                marginTop: 14,
              }}
            >
              <button
                onClick={() => setHistoryOpen((o) => !o)}
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "4px 2px",
                  border: "none",
                  background: "transparent",
                  color: "#e5e7eb",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                <span>Duel History</span>
                <span style={{ fontSize: 14 }}>
                  {historyOpen ? "▾" : "▸"}
                </span>
              </button>

              {historyOpen && (
                <>
                  {rounds.length === 0 || rounds.length === 1 ? (
                    <p style={{ opacity: 0.6, fontSize: 12, marginTop: 4 }}>
                      Once you get further into the duel, completed rounds will
                      appear here.
                    </p>
                  ) : (
                    rounds.map((r) => (
                      <div
                        key={r.roundNumber}
                        style={{
                          marginTop: 6,
                          paddingTop: 6,
                          borderTop: "1px solid #111827",
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
                      marginTop: 8,
                      padding: "7px 12px",
                      borderRadius: 999,
                      border: "1px solid #4b5563",
                      background: "transparent",
                      color: "#9ca3af",
                      fontWeight: 500,
                      fontSize: 12,
                    }}
                  >
                    Restart Duel
                  </button>
                </>
              )}
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
