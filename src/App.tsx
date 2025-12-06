// src/App.tsx
import React, { useState, useMemo, useEffect } from "react";

import { socket } from "./socket";

import type { Rule, RuleTemplate } from "./game/gameTypes";
import {
  CODE_REGEX,
  CHAR_REGEX,
  ALL_CHARS,
  passesAllRules,
  isDuplicateRule,
} from "./game/rulesEngine";
import { getAvailableTemplateOptions } from "./game/ruleTemplates";
import { computeBreakerScore, computePatcherScore } from "./logic/scoring";
import ResultScreens from "./components/ResultScreens";

import { PatcherView } from "./components/PatcherView";
import { BreakerView } from "./components/BreakerView";

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
  patcherIndex: number; // 0 or 1
  secretCode: string;
  ruleText: string;
  guesses: Guess[];
};

// Rule template snapshot shown to the Breaker for this patch round
type TemplateOptionSummary = {
  value: RuleTemplate;
  label: string;
};

// Which seat this browser is playing as (or none yet)
type PlayerSeat = 0 | 1 | null;

/**
 * Everything that BOTH devices should stay in sync on.
 * (Per-device-only things like playerSeat, breakerError, etc. stay local.)
 */
type SyncedState = {
  players: Player[];
  phase: Phase;
  currentPatcherIndex: number;
  currentRoundNumber: number;

  rules: Rule[];
  patcherSecretCode: string;
  patcherRuleText: string;

  rounds: Round[];
  playerScores: [number, number];

  endgameModeActive: boolean;
  endgameAttemptsLeft: number;
  endgameBaseAttempts: number;
  endgameBonusAttempts: number;
  prevValidCodesCount: number | null;

  lastResult: GuessResult | null;
  lastGuessValue: string | null;
  lastBreakerPoints: number | null;
  lastPatcherPoints: number | null;

  // NEW: which templates were available when the last patch was made
  templatesAvailableForCurrentRound: TemplateOptionSummary[];

  sender?: string;
};

const App: React.FC = () => {
  // Which seat this browser is controlling: Player 1 (0) or Player 2 (1)
  const [playerSeat, setPlayerSeat] = useState<PlayerSeat>(null);

  const [players, setPlayers] = useState<Player[]>([
    { name: "", ready: false },
    { name: "", ready: false },
  ]);

  const [phase, setPhase] = useState<Phase>("enterNames");
  const [currentPatcherIndex, setCurrentPatcherIndex] = useState(0);
  const [currentRoundNumber, setCurrentRoundNumber] = useState(1);

  const [patcherSecretCode, setPatcherSecretCode] = useState("");
  const [patcherRuleText, setPatcherRuleText] = useState("");
  const [patcherRuleError, setPatcherRuleError] = useState<string | null>(null);

  const [breakerGuess, setBreakerGuess] = useState("");
  const [breakerError, setBreakerError] = useState<string | null>(null);

  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentRoundGuesses, setCurrentRoundGuesses] = useState<Guess[]>([]);

  // Per-player guess history across the duel (used in BreakerView)
  const [playerCorrectGuesses, setPlayerCorrectGuesses] = useState<string[][]>(
    [[], []]
  );
  const [playerIncorrectGuesses, setPlayerIncorrectGuesses] = useState<
    string[][]
  >([[], []]);

  const [rules, setRules] = useState<Rule[]>([]);
  const [nextRuleId, setNextRuleId] = useState(1);

  // Template selection + parameters for the new rule
  const [selectedTemplate, setSelectedTemplate] =
    useState<RuleTemplate>("positionEquals");

  const [positionIndex, setPositionIndex] = useState<number>(1); // 1–4 in UI
  const [positionChar, setPositionChar] = useState<string>("");

  const [positionKind, setPositionKind] = useState<"letter" | "digit">(
    "letter"
  );

  const [lettersCount, setLettersCount] = useState<number>(2);
  const [digitsCount, setDigitsCount] = useState<number>(2);

  const [firstChar, setFirstChar] = useState<string>("");
  const [secondChar, setSecondChar] = useState<string>("");

  const [mustContainChar, setMustContainChar] = useState<string>("");
  const [forbiddenChar, setForbiddenChar] = useState<string>("");

  const [maxDigitValue, setMaxDigitValue] = useState<number>(9);

  const [cannotAdjCharA, setCannotAdjCharA] = useState<string>("");
  const [cannotAdjCharB, setCannotAdjCharB] = useState<string>("");

  const [distinctCount, setDistinctCount] = useState<number>(4);

  // For result screens
  const [lastResult, setLastResult] = useState<GuessResult | null>(null);
  const [lastGuessValue, setLastGuessValue] = useState<string | null>(null);

  // Score state
  const [playerScores, setPlayerScores] = useState<[number, number]>([0, 0]);
  const [lastBreakerPoints, setLastBreakerPoints] = useState<number | null>(
    null
  );
  const [lastPatcherPoints, setLastPatcherPoints] = useState<number | null>(
    null
  );

  // Endgame state (hard-enforced attempts)
  const [endgameModeActive, setEndgameModeActive] = useState(false);
  const [endgameAttemptsLeft, setEndgameAttemptsLeft] = useState(0);
  const [endgameBaseAttempts, setEndgameBaseAttempts] = useState(0);
  const [endgameBonusAttempts, setEndgameBonusAttempts] = useState(0);

  // Previous valid-code count (before the latest rule that led into endgame)
  const [prevValidCodesCount, setPrevValidCodesCount] = useState<number | null>(
    null
  );

  // NEW: templates that were available when the current patch was made
  const [templatesAvailableForCurrentRound, setTemplatesAvailableForCurrentRound] =
    useState<TemplateOptionSummary[]>([]);

  const currentPatcher = players[currentPatcherIndex];
  const currentBreakerIndex = 1 - currentPatcherIndex;
  const currentBreaker = players[currentBreakerIndex];

  const bothPlayersReady = players[0].ready && players[1].ready;

  const TOTAL_CODES = 36 ** 4; // 1,679,616 possible 4-char codes

  // ---------- GLOBAL VALID-CODE SPACE + ENDGAME POTENTIAL ----------
  const allPossibleCodes = useMemo(() => {
    const results: string[] = [];
    const build = (prefix: string, depth: number) => {
      if (depth === 4) {
        results.push(prefix);
        return;
      }
      for (const c of ALL_CHARS) {
        build(prefix + c, depth + 1);
      }
    };
    build("", 0);
    return results;
  }, []);

  const validCodes = useMemo(() => {
    if (rules.length === 0) return [];
    return allPossibleCodes.filter((code) => passesAllRules(code, rules));
  }, [allPossibleCodes, rules]);

  const currentValidCount =
    rules.length === 0 ? TOTAL_CODES : validCodes.length;

  const isEndgameWindow =
    rules.length > 0 && currentValidCount > 0 && currentValidCount <= 25;

  const endgameStats = useMemo(() => {
    if (!isEndgameWindow) return null;

    const prevCount = prevValidCodesCount ?? currentValidCount;
    const currentCount = currentValidCount;
    const diff = Math.max(0, prevCount - currentCount);

    const baseAttempts = Math.max(1, Math.floor(currentCount / 5));
    const bonusRaw = Math.floor(diff / 10);
    const bonusAttempts = Math.min(50, Math.max(0, bonusRaw));

    return {
      prevCount,
      currentCount,
      diff,
      baseAttempts,
      bonusAttempts,
      totalAttempts: baseAttempts + bonusAttempts,
    };
  }, [isEndgameWindow, prevValidCodesCount, currentValidCount]);

  // ---------- SOCKET BROADCAST HELPER ----------
  const broadcastState = (overrides: Partial<SyncedState> = {}) => {
    const payload: SyncedState = {
      players,
      phase,
      currentPatcherIndex,
      currentRoundNumber,
      rules,
      patcherSecretCode,
      patcherRuleText,
      rounds,
      playerScores,
      endgameModeActive,
      endgameAttemptsLeft,
      endgameBaseAttempts,
      endgameBonusAttempts,
      prevValidCodesCount,
      lastResult,
      lastGuessValue,
      lastBreakerPoints,
      lastPatcherPoints,
      templatesAvailableForCurrentRound,
      sender: socket.id,
      ...overrides,
    };

    socket.emit("game:state", payload);
  };

  // ---------- SOCKET RECEIVE: APPLY REMOTE STATE ----------
  useEffect(() => {
    const handler = (remote: SyncedState) => {
      // Ignore our own echo
      if (remote.sender && remote.sender === socket.id) return;

      setPlayers(remote.players);
      setPhase(remote.phase);
      setCurrentPatcherIndex(remote.currentPatcherIndex);
      setCurrentRoundNumber(remote.currentRoundNumber);

      setRules(remote.rules);
      setPatcherSecretCode(remote.patcherSecretCode);
      setPatcherRuleText(remote.patcherRuleText);

      setRounds(remote.rounds);
      setPlayerScores(remote.playerScores);

      setEndgameModeActive(remote.endgameModeActive);
      setEndgameAttemptsLeft(remote.endgameAttemptsLeft);
      setEndgameBaseAttempts(remote.endgameBaseAttempts);
      setEndgameBonusAttempts(remote.endgameBonusAttempts);
      setPrevValidCodesCount(remote.prevValidCodesCount);

      setLastResult(remote.lastResult);
      setLastGuessValue(remote.lastGuessValue);
      setLastBreakerPoints(remote.lastBreakerPoints);
      setLastPatcherPoints(remote.lastPatcherPoints);

      setTemplatesAvailableForCurrentRound(
        remote.templatesAvailableForCurrentRound || []
      );
    };

    socket.on("game:state", handler);
    return () => {
      socket.off("game:state", handler);
    };
  }, []);

  // ---------- ON CONNECT / RECONNECT: REQUEST LATEST STATE ----------
  useEffect(() => {
    const requestState = () => {
      console.log("🔄 Requesting latest game state from server...");
      socket.emit("game:requestState");
    };

    if (socket.connected) {
      requestState();
    }

    socket.on("connect", requestState);

    return () => {
      socket.off("connect", requestState);
    };
  }, []);

  // ---------- LOCAL EFFECTS (NOT EMITTING) ----------
  useEffect(() => {
    if (phase === "patcherSetup") {
      setPrevValidCodesCount(currentValidCount);
    }
  }, [phase, currentValidCount]);

  useEffect(() => {
    if (phase === "breakerTurn") {
      if (isEndgameWindow && endgameStats) {
        setEndgameModeActive(true);
        setEndgameBaseAttempts(endgameStats.baseAttempts);
        setEndgameBonusAttempts(endgameStats.bonusAttempts);
        setEndgameAttemptsLeft(endgameStats.totalAttempts);
      } else {
        setEndgameModeActive(false);
        setEndgameBaseAttempts(0);
        setEndgameBonusAttempts(0);
        setEndgameAttemptsLeft(0);
      }
    }
  }, [phase, isEndgameWindow, endgameStats]);

  // Visible rules in the UI:
  // During breakerTurn we hide ONLY the newest rule.
  const visibleRules =
    phase === "breakerTurn"
      ? rules.slice(0, Math.max(0, rules.length - 1))
      : rules;

  const resetRoundFields = () => {
    setPatcherSecretCode("");
    setPatcherRuleText("");
    setBreakerGuess("");
    setBreakerError(null);
    setPatcherRuleError(null);
    setCurrentRoundGuesses([]);
    setSelectedTemplate("positionEquals");
    setPositionIndex(1);
    setPositionChar("");
    setPositionKind("letter");
    setLettersCount(2);
    setDigitsCount(2);
    setFirstChar("");
    setSecondChar("");
    setMustContainChar("");
    setForbiddenChar("");
    setMaxDigitValue(9);
    setCannotAdjCharA("");
    setCannotAdjCharB("");
    setDistinctCount(4);
    setLastResult(null);
    setLastGuessValue(null);
    setLastBreakerPoints(null);
    setLastPatcherPoints(null);
    setTemplatesAvailableForCurrentRound([]);
  };

  const startGame = () => {
    if (!bothPlayersReady) return;

    resetRoundFields();
    setRules([]);
    setNextRuleId(1);
    setPlayerCorrectGuesses([[], []]);
    setPlayerIncorrectGuesses([[], []]);
    setPlayerScores([0, 0]);
    setEndgameModeActive(false);
    setEndgameAttemptsLeft(0);
    setEndgameBaseAttempts(0);
    setEndgameBonusAttempts(0);
    setPrevValidCodesCount(null);
    setRounds([]);
    setCurrentPatcherIndex(0);
    setCurrentRoundNumber(1);
    setPhase("patcherSetup");

    broadcastState({
      players,
      phase: "patcherSetup",
      currentPatcherIndex: 0,
      currentRoundNumber: 1,
      rules: [],
      patcherSecretCode: "",
      patcherRuleText: "",
      rounds: [],
      playerScores: [0, 0],
      endgameModeActive: false,
      endgameAttemptsLeft: 0,
      endgameBaseAttempts: 0,
      endgameBonusAttempts: 0,
      prevValidCodesCount: null,
      lastResult: null,
      lastGuessValue: null,
      lastBreakerPoints: null,
      lastPatcherPoints: null,
      templatesAvailableForCurrentRound: [],
    });
  };

  const availableTemplateOptions = getAvailableTemplateOptions(rules);

  const handleConfirmPatcherSetup = () => {
    setPatcherRuleError(null);
    const code = patcherSecretCode.toUpperCase();

    if (!CODE_REGEX.test(code)) {
      alert(
        "Secret code must be exactly 4 characters and only A–Z or 0–9 (no spaces or symbols)."
      );
      return;
    }

    // Snapshot of the templates the Patcher COULD choose right now
    const templatesAtPatchTime = getAvailableTemplateOptions(rules);

    let newRule: Rule;
    let description: string;

    switch (selectedTemplate) {
      case "positionEquals": {
        if (!CHAR_REGEX.test(positionChar)) {
          alert(
            'Choose a single letter or digit (A–Z or 0–9) for "Position must equal" rule.'
          );
          return;
        }
        if (positionIndex < 1 || positionIndex > 4) {
          alert("Position must be between 1 and 4.");
          return;
        }
        description = `Position ${positionIndex} must be "${positionChar}".`;
        newRule = {
          id: nextRuleId,
          type: "positionEquals",
          position: (positionIndex - 1) as 0 | 1 | 2 | 3,
          char: positionChar,
          description,
        };
        break;
      }
      case "positionKind": {
        if (positionIndex < 1 || positionIndex > 4) {
          alert("Position must be between 1 and 4.");
          return;
        }
        const kindLabel = positionKind === "letter" ? "letter" : "digit";
        description = `Position ${positionIndex} must be a ${kindLabel}.`;
        newRule = {
          id: nextRuleId,
          type: "positionKind",
          position: (positionIndex - 1) as 0 | 1 | 2 | 3,
          kind: positionKind,
          description,
        };
        break;
      }
      case "exactLettersDigits": {
        if (
          lettersCount < 0 ||
          lettersCount > 4 ||
          digitsCount < 0 ||
          digitsCount > 4
        ) {
          alert("Letters and digits must each be between 0 and 4.");
          return;
        }
        if (lettersCount + digitsCount !== 4) {
          alert("Letters + digits must equal 4.");
          return;
        }
        description = `Exactly ${lettersCount} letter(s) and ${digitsCount} digit(s).`;
        newRule = {
          id: nextRuleId,
          type: "exactLettersDigits",
          letters: lettersCount,
          digits: digitsCount,
          description,
        };
        break;
      }
      case "mustComeBefore": {
        const first = firstChar.toUpperCase();
        const second = secondChar.toUpperCase();
        if (!CHAR_REGEX.test(first) || !CHAR_REGEX.test(second)) {
          alert(
            "Both characters must be a single A–Z or 0–9 value for the order rule."
          );
          return;
        }
        if (first === second) {
          alert("The two characters must be different.");
          return;
        }
        description = `If "${first}" and "${second}" both appear, "${first}" must come before "${second}".`;
        newRule = {
          id: nextRuleId,
          type: "mustComeBefore",
          firstChar: first,
          secondChar: second,
          description,
        };
        break;
      }
      case "allUnique": {
        description = "All 4 characters must be unique (no repeats).";
        newRule = {
          id: nextRuleId,
          type: "allUnique",
          description,
        };
        break;
      }
      case "mustContainChar": {
        const c = mustContainChar.toUpperCase();
        if (!CHAR_REGEX.test(c)) {
          alert(
            'Choose a single letter or digit (A–Z or 0–9) for "must be in the code".'
          );
          return;
        }
        description = `Character "${c}" must appear at least once in the code.`;
        newRule = {
          id: nextRuleId,
          type: "mustContainChar",
          char: c,
          description,
        };
        break;
      }
      case "forbiddenChar": {
        const c = forbiddenChar.toUpperCase();
        if (!CHAR_REGEX.test(c)) {
          alert(
            'Choose a single letter or digit (A–Z or 0–9) for "cannot be in the code".'
          );
          return;
        }
        description = `Character "${c}" cannot appear anywhere in the code.`;
        newRule = {
          id: nextRuleId,
          type: "forbiddenChar",
          char: c,
          description,
        };
        break;
      }
      case "lettersInAlphabeticalOrder": {
        description =
          "All letters in the code must appear in alphabetical order (ignoring digits).";
        newRule = {
          id: nextRuleId,
          type: "lettersInAlphabeticalOrder",
          description,
        };
        break;
      }
      case "lettersNotInAlphabeticalOrder": {
        description =
          "The letters in the code cannot be in alphabetical order (ignoring digits).";
        newRule = {
          id: nextRuleId,
          type: "lettersNotInAlphabeticalOrder",
          description,
        };
        break;
      }
      case "digitsLessThan": {
        if (
          isNaN(maxDigitValue) ||
          maxDigitValue < 1 ||
          maxDigitValue > 9 ||
          !Number.isInteger(maxDigitValue)
        ) {
          alert("Max digit must be an integer between 1 and 9.");
          return;
        }
        description = `All digits in the code must be less than ${maxDigitValue}.`;
        newRule = {
          id: nextRuleId,
          type: "digitsLessThan",
          maxDigit: maxDigitValue,
          description,
        };
        break;
      }
      case "cannotBeAdjacent": {
        const A = cannotAdjCharA.toUpperCase();
        const B = cannotAdjCharB.toUpperCase();
        if (!CHAR_REGEX.test(A) || !CHAR_REGEX.test(B)) {
          alert(
            "Both characters must be a single A–Z or 0–9 value for the adjacency rule."
          );
          return;
        }
        if (A === B) {
          alert("The two characters must be different.");
          return;
        }
        description = `"${A}" and "${B}" cannot be adjacent in the code (in either order).`;
        newRule = {
          id: nextRuleId,
          type: "cannotBeAdjacent",
          charA: A,
          charB: B,
          description,
        };
        break;
      }
      case "adjacentLettersPair": {
        description =
          "At least one pair of adjacent characters must both be letters.";
        newRule = {
          id: nextRuleId,
          type: "adjacentLettersPair",
          description,
        };
        break;
      }
      case "lettersFirstHalf": {
        description =
          "All letters in the code must be from the first half of the alphabet (A–M).";
        newRule = {
          id: nextRuleId,
          type: "lettersFirstHalf",
          description,
        };
        break;
      }
      case "lettersSecondHalf": {
        description =
          "All letters in the code must be from the second half of the alphabet (N–Z).";
        newRule = {
          id: nextRuleId,
          type: "lettersSecondHalf",
          description,
        };
        break;
      }
      case "endsMirror": {
        description =
          "The first and last characters of the code must be the same.";
        newRule = {
          id: nextRuleId,
          type: "endsMirror",
          description,
        };
        break;
      }
      case "noAdjacentDuplicates": {
        description =
          "No two adjacent characters in the code can be identical.";
        newRule = {
          id: nextRuleId,
          type: "noAdjacentDuplicates",
          description,
        };
        break;
      }
      case "exactDistinctCount": {
        if (
          isNaN(distinctCount) ||
          distinctCount < 1 ||
          distinctCount > 4 ||
          !Number.isInteger(distinctCount)
        ) {
          alert("Distinct character count must be an integer between 1 and 4.");
          return;
        }
        description = `Exactly ${distinctCount} distinct character(s) in the code.`;
        newRule = {
          id: nextRuleId,
          type: "exactDistinctCount",
          distinctCount,
          description,
        };
        break;
      }
      default:
        return;
    }

    if (isDuplicateRule(newRule, rules)) {
      setPatcherRuleError("This rule is already implemented.");
      return;
    }

    const candidateRules = [...rules, newRule];

    if (!passesAllRules(code, candidateRules)) {
      alert(
        "Your secret code does not satisfy all programmed rules (including the new one). Adjust the code or parameters."
      );
      return;
    }

    setPatcherSecretCode(code);
    setPatcherRuleText(description);
    setRules(candidateRules);
    setNextRuleId((prev) => prev + 1);
    setPatcherRuleError(null);

    // Store & sync the snapshot of templates that were available this patch
    setTemplatesAvailableForCurrentRound(templatesAtPatchTime);

    setPhase("breakerTurn");

    broadcastState({
      patcherSecretCode: code,
      patcherRuleText: description,
      rules: candidateRules,
      phase: "breakerTurn",
      templatesAvailableForCurrentRound: templatesAtPatchTime,
    });
  };

  const handleAddGuess = () => {
    const guess = breakerGuess.toUpperCase().trim();
    setBreakerError(null);

    if (!CODE_REGEX.test(guess)) {
      setBreakerError(
        "Guess must be exactly 4 characters and only A–Z or 0–9 (no spaces or symbols)."
      );
      return;
    }

    const alreadyInCurrentRound = currentRoundGuesses.some(
      (g) => g.value === guess
    );
    if (alreadyInCurrentRound) {
      setBreakerError(
        "⚠️ You’ve already tried this code this round. Pick a different one."
      );
      return;
    }

    const wasIncorrectBefore =
      playerIncorrectGuesses[currentBreakerIndex].includes(guess);

    if (wasIncorrectBefore) {
      setBreakerError(
        "⚠️ You’ve already tried this code earlier in the duel and it was INVALID. Try a different one."
      );
      return;
    }

    // Check against only the rules the Breaker can see (previously implemented)
    const passesVisibleRules = passesAllRules(guess, visibleRules);

    if (!passesVisibleRules) {
      setBreakerError("Breaks one of the previously implemented rules.");
      return; // do NOT count it as an INVALID attempt, don't record guess
    }

    const systemValid = passesAllRules(guess, rules);

    // INVALID path
    if (!systemValid) {
      const newGuess: Guess = {
        value: guess,
        result: "INVALID",
      };
      const updatedGuesses = [...currentRoundGuesses, newGuess];
      setCurrentRoundGuesses(updatedGuesses);

      const updatedIncorrect = playerIncorrectGuesses.map((arr, idx) =>
        idx === currentBreakerIndex ? [...arr, guess] : arr
      );
      setPlayerIncorrectGuesses(updatedIncorrect);
      setBreakerGuess("");

      if (endgameModeActive && isEndgameWindow) {
        const newAttempts = endgameAttemptsLeft - 1;
        setEndgameAttemptsLeft(newAttempts);

        if (newAttempts <= 0) {
          const invalidsThisRound = updatedGuesses.filter(
            (g) => g.result === "INVALID"
          ).length;

          const patcherPoints = computePatcherScore({
            validCodesAtStart: currentValidCount,
            invalidGuessesThisRound: invalidsThisRound,
            endgameWin: true,
          });

          const updatedScores: [number, number] = [...playerScores] as [
            number,
            number
          ];
          updatedScores[currentPatcherIndex] += patcherPoints;
          setPlayerScores(updatedScores);

          setLastBreakerPoints(null);
          setLastPatcherPoints(patcherPoints);

          setLastGuessValue(guess);
          setLastResult("INVALID");

          const newRound: Round = {
            roundNumber: currentRoundNumber,
            patcherIndex: currentPatcherIndex,
            secretCode: patcherSecretCode.toUpperCase(),
            ruleText: patcherRuleText,
            guesses: updatedGuesses,
          };
          const updatedRounds = [...rounds, newRound];
          setRounds(updatedRounds);
          setPhase("patcherWin");

          broadcastState({
            phase: "patcherWin",
            rounds: updatedRounds,
            playerScores: updatedScores,
            lastResult: "INVALID",
            lastGuessValue: guess,
            lastBreakerPoints: null,
            lastPatcherPoints: patcherPoints,
          });

          return;
        } else {
          setBreakerError(
            `❌ Invalid: this guess breaks at least one active rule. Endgame attempts left: ${newAttempts}.`
          );

          // NEW: broadcast the updated attempts so spectator sees countdown
          broadcastState({
            endgameAttemptsLeft: newAttempts,
          });
        }
      } else {
        setBreakerError(
          "❌ Invalid: this guess breaks at least one active rule. Adjust and try again."
        );
      }

      return;
    }

    // VALID or EXACT
    let result: GuessResult;
    if (guess === patcherSecretCode) {
      result = "EXACT";
    } else {
      result = "VALID";
    }

    const newGuess: Guess = {
      value: guess,
      result,
    };

    const updatedGuesses = [...currentRoundGuesses, newGuess];
    setCurrentRoundGuesses(updatedGuesses);

    const updatedCorrect = playerCorrectGuesses.map((arr, idx) =>
      idx === currentBreakerIndex ? [...arr, guess] : arr
    );
    setPlayerCorrectGuesses(updatedCorrect);

    setBreakerGuess("");
    setLastGuessValue(guess);
    setLastResult(result);

    const newRound: Round = {
      roundNumber: currentRoundNumber,
      patcherIndex: currentPatcherIndex,
      secretCode: patcherSecretCode.toUpperCase(),
      ruleText: patcherRuleText,
      guesses: updatedGuesses,
    };
    const updatedRounds = [...rounds, newRound];
    setRounds(updatedRounds);

    const invalidsThisRound = updatedGuesses.filter(
      (g) => g.result === "INVALID"
    ).length;

    const breakerPoints = computeBreakerScore({
      validCodesAtStart: currentValidCount,
      result: result === "EXACT" ? "EXACT" : "VALID",
      inEndgame: endgameModeActive && isEndgameWindow,
    });

    const patcherPoints = computePatcherScore({
      validCodesAtStart: currentValidCount,
      invalidGuessesThisRound: invalidsThisRound,
      endgameWin: false,
    });

    const updatedScores: [number, number] = [...playerScores] as [
      number,
      number
    ];
    updatedScores[currentBreakerIndex] += breakerPoints;
    updatedScores[currentPatcherIndex] += patcherPoints;
    setPlayerScores(updatedScores);

    setLastBreakerPoints(breakerPoints);
    setLastPatcherPoints(patcherPoints);

    if (result === "VALID") {
      if (endgameModeActive) {
        setEndgameModeActive(false);
        setEndgameAttemptsLeft(0);
        setEndgameBaseAttempts(0);
        setEndgameBonusAttempts(0);
      }
      setPhase("validResult");

      broadcastState({
        phase: "validResult",
        rounds: updatedRounds,
        playerScores: updatedScores,
        lastResult: result,
        lastGuessValue: guess,
        lastBreakerPoints: breakerPoints,
        lastPatcherPoints: patcherPoints,
      });
    } else {
      // EXACT
      if (endgameModeActive && isEndgameWindow) {
        setPhase("breakerWin");
        broadcastState({
          phase: "breakerWin",
          rounds: updatedRounds,
          playerScores: updatedScores,
          lastResult: result,
          lastGuessValue: guess,
          lastBreakerPoints: breakerPoints,
          lastPatcherPoints: patcherPoints,
        });
      } else {
        setPhase("exactResult");
        broadcastState({
          phase: "exactResult",
          rounds: updatedRounds,
          playerScores: updatedScores,
          lastResult: result,
          lastGuessValue: guess,
          lastBreakerPoints: breakerPoints,
          lastPatcherPoints: patcherPoints,
        });
      }
    }
  };

  const advanceToNextRound = () => {
    const nextPatcherIndex = 1 - currentPatcherIndex;
    const nextRound = currentRoundNumber + 1;

    setCurrentPatcherIndex(nextPatcherIndex);
    setCurrentRoundNumber(nextRound);
    resetRoundFields();
    setEndgameModeActive(false);
    setEndgameAttemptsLeft(0);
    setEndgameBaseAttempts(0);
    setEndgameBonusAttempts(0);
    setPrevValidCodesCount(null);
    setPhase("patcherSetup");

    // Clear code/rule across devices too
    broadcastState({
      phase: "patcherSetup",
      currentPatcherIndex: nextPatcherIndex,
      currentRoundNumber: nextRound,
      patcherSecretCode: "",
      patcherRuleText: "",
      lastResult: null,
      lastGuessValue: null,
      lastBreakerPoints: null,
      lastPatcherPoints: null,
      templatesAvailableForCurrentRound: [],
    });
  };

  const handleRestartDuel = () => {
    const resetPlayers: Player[] = [
      { name: "", ready: false },
      { name: "", ready: false },
    ];

    setPlayers(resetPlayers);
    setRounds([]);
    setCurrentRoundNumber(1);
    setCurrentPatcherIndex(0);
    resetRoundFields();
    setRules([]);
    setNextRuleId(1);
    setPlayerCorrectGuesses([[], []]);
    setPlayerIncorrectGuesses([[], []]);
    setPlayerScores([0, 0]);
    setEndgameModeActive(false);
    setEndgameAttemptsLeft(0);
    setEndgameBaseAttempts(0);
    setEndgameBonusAttempts(0);
    setPrevValidCodesCount(null);
    setPhase("enterNames");

    broadcastState({
      players: resetPlayers,
      phase: "enterNames",
      currentPatcherIndex: 0,
      currentRoundNumber: 1,
      rules: [],
      patcherSecretCode: "",
      patcherRuleText: "",
      rounds: [],
      playerScores: [0, 0],
      lastResult: null,
      lastGuessValue: null,
      lastBreakerPoints: null,
      lastPatcherPoints: null,
      endgameModeActive: false,
      endgameAttemptsLeft: 0,
      endgameBaseAttempts: 0,
      endgameBonusAttempts: 0,
      prevValidCodesCount: null,
      templatesAvailableForCurrentRound: [],
    });
  };

  const currentPatcherName = currentPatcher.name || "?";
  const currentBreakerName = players[1 - currentPatcherIndex].name || "?";

  // Is this browser currently the patcher or breaker?
  const isPatcherHere =
    playerSeat !== null && playerSeat === currentPatcherIndex;
  const isBreakerHere =
    playerSeat !== null && playerSeat === currentBreakerIndex;

  // --- name confirm handler for this browser's seat ---
  const handleConfirmName = () => {
    if (playerSeat === null) return;
    const index = playerSeat;
    const rawName = players[index].name.trim();
    if (!rawName) return;

    const updatedPlayers: Player[] = [
      { ...players[0] },
      { ...players[1] },
    ];
    updatedPlayers[index] = {
      ...updatedPlayers[index],
      name: rawName,
      ready: true,
    };

    setPlayers(updatedPlayers);

    broadcastState({
      players: updatedPlayers,
    });
  };

  const handleNameChange = (value: string) => {
    if (playerSeat === null) return;
    const index = playerSeat;
    setPlayers((prev) => {
      const updated: Player[] = [{ ...prev[0] }, { ...prev[1] }];
      updated[index] = { ...updated[index], name: value, ready: false };
      return updated;
    });
  };

  // ---------- SEAT SELECTION SCREEN ----------
  if (playerSeat === null) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          overflowY: "auto",
          padding: "16px clamp(8px, 4vw, 32px)",
          boxSizing: "border-box",
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          background: "#0f172a",
          color: "#e5e7eb",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            maxWidth: 560,
            width: "100%",
            background: "#020617",
            padding: 28,
            borderRadius: 18,
            boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
          }}
        >
          <h1
            style={{
              textAlign: "center",
              marginBottom: 12,
              fontSize: "clamp(28px, 4vw, 40px)",
            }}
          >
            RuleShift
          </h1>
          <p
            style={{
              textAlign: "center",
              fontSize: "clamp(13px, 1.4vw, 15px)",
              opacity: 0.8,
              marginBottom: 24,
            }}
          >
            On this computer, which player are you?
          </p>

          <button
            onClick={() => setPlayerSeat(0)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 16px",
              borderRadius: 999,
              border: "1px solid #4b5563",
              background: "#111827",
              color: "#e5e7eb",
              cursor: "pointer",
              marginBottom: 12,
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            I am Player 1
            {players[0].name ? ` (${players[0].name})` : ""}
          </button>

          <button
            onClick={() => setPlayerSeat(1)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 16px",
              borderRadius: 999,
              border: "1px solid #4b5563",
              background: "#111827",
              color: "#e5e7eb",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            I am Player 2
            {players[1].name ? ` (${players[1].name})` : ""}
          </button>

          <p
            style={{
              fontSize: 12,
              opacity: 0.7,
              marginTop: 16,
              textAlign: "center",
            }}
          >
            Have Player 1 and Player 2 each open this page on their own
            computer, then pick their seat.
          </p>
        </div>
      </div>
    );
  }

  // From this point on, playerSeat is 0 or 1
  const thisPlayerIndex = playerSeat;
  const thisPlayer = players[thisPlayerIndex];

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
      <div
        style={{
          width: "100%",
          maxWidth: "1120px",
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            marginBottom: 8,
            fontSize: "clamp(30px, 4.2vw, 44px)",
          }}
        >
          RuleShift
        </h1>
        <p
          style={{
            textAlign: "center",
            fontSize: "clamp(12px, 1.4vw, 14px)",
            opacity: 0.7,
          }}
        >
          phase: {phase} • you are{" "}
          {thisPlayer.name
            ? `Player ${thisPlayerIndex + 1} (${thisPlayer.name})`
            : `Player ${thisPlayerIndex + 1}`}
        </p>

        <p
          style={{
            textAlign: "center",
            marginBottom: 20,
            fontSize: "clamp(13px, 1.5vw, 15px)",
          }}
        >
          Two players. One evolving rule system. Patcher vs Breaker in a duel.
        </p>

        {/* === ENTER NAMES — EACH SEAT ENTERS ITS OWN NAME AND CONFIRMS === */}
        {phase === "enterNames" && (
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
            <h2 style={{ marginBottom: 8, fontSize: "clamp(18px,2.3vw,22px)" }}>
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
                  fontSize: 14,
                }}
                value={thisPlayer.name}
                onChange={(e) => handleNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleConfirmName();
                  }
                }}
                placeholder="Type your name"
              />
            </label>

            <button
              onClick={handleConfirmName}
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
                fontSize: 14,
              }}
              disabled={!thisPlayer.name.trim()}
            >
              {thisPlayer.ready ? "Name confirmed ✓" : "Confirm name"}
            </button>

            {/* Show status of both players */}
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
                </strong>
              </div>
              <div>
                Player 2:{" "}
                <strong>
                  {players[1].name || "(not set yet)"}{" "}
                  {players[1].ready ? "✓" : ""}
                </strong>
              </div>
            </div>

            <button
              onClick={startGame}
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
                fontSize: 15,
              }}
            >
              {bothPlayersReady
                ? "Start Duel"
                : "Waiting for both players to confirm names"}
            </button>
          </div>
        )}

        {/* === EVERYTHING AFTER NAMES === */}
        {phase !== "enterNames" && (
          <>
            {/* STATUS + SCORE — SHOWN ON BOTH DEVICES */}
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

            {/* === PATCHER SETUP VIEW — CURRENT PATCHER'S MACHINE ONLY === */}
            {phase === "patcherSetup" && isPatcherHere && (
              <PatcherView
                mode={"patcher"}
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
                validCodesCount={currentValidCount}
              />
            )}

            {/* NON-PATCHER MACHINE DURING PATCHER SETUP */}
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

            {/* === BREAKER TURN VIEW — CURRENT BREAKER'S MACHINE ONLY === */}
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
                validCodesCount={currentValidCount}
                availableTemplatesForThisPatchRound={
                  templatesAvailableForCurrentRound
                }
              />
            )}

            {/* NON-BREAKER MACHINE DURING BREAKER TURN */}
            {phase === "breakerTurn" && !isBreakerHere && (
              <>
                {endgameModeActive && isEndgameWindow ? (
                  // Endgame spectator view: read-only BreakerView
                  <BreakerView
                    mode="phone"
                    readOnly
                    currentBreaker={currentBreaker}
                    breakerGuess={""}
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
                    validCodesCount={currentValidCount}
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

            {/* === RESULT SCREENS — SHOWN ON BOTH DEVICES === */}
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
                onNextRound={advanceToNextRound}
                onRestartDuel={handleRestartDuel}
                lastBreakerPoints={lastBreakerPoints}
                lastPatcherPoints={lastPatcherPoints}
              />
            )}

            {/* === DUEL HISTORY — SHOWN ON BOTH DEVICES === */}
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

              {rounds.length === 0 ? (
                <p style={{ opacity: 0.6, fontSize: 12 }}>
                  Once you get further into the duel, completed rounds will appear here.
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

              {/* Restart button stays the same */}
              <button
                onClick={handleRestartDuel}
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
      </div>
    </div>
  );
};

export default App;
