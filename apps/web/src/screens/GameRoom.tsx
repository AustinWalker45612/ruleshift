// src/screens/GameRoom.tsx
import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket";
import { useAuth } from "../auth/AuthContext";

import type { Rule, RuleTemplate } from "../game/gameTypes";
import {
  CODE_REGEX,
  CHAR_REGEX,
  ALL_CHARS,
  passesAllRules,
  isDuplicateRule,
} from "../game/rulesEngine";
import { getAvailableTemplateOptions } from "../game/ruleTemplates";
import { computeBreakerScore, computePatcherScore } from "../logic/scoring";

import {
  DesktopLayout,
  type LayoutProps,
  type TutorialMode,
} from "../layouts/DesktopLayout";
import { TabletLayout } from "../layouts/TabletLayout";
import { MobileLayout } from "../layouts/MobileLayout";
import { useBreakpoint } from "../hooks/useBreakpoint";

import { apiFetch } from "../lib/api";

const LS_GUEST_NAME_KEY = "ruleshiftGuestName_v1";

// ---------- Types shared with server state ----------
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

type TemplateOptionSummary = {
  value: RuleTemplate;
  label: string;
};

type PlayerSeat = 0 | 1 | null;

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

type SyncedState = {
  roomId?: string;

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

  templatesAvailableForCurrentRound: TemplateOptionSummary[];

  sender?: string;
};

// ---------- Props ----------
type GameRoomProps = {
  roomId: string; // comes from /room/:roomId route
};

const GameRoom: React.FC<GameRoomProps> = ({ roomId }) => {
  const navigate = useNavigate();
  const breakpoint = useBreakpoint();
  const { user } = useAuth();

  // ✅ Normalize roomId to match server (server uppercases roomId)
  const normalizedRoomId = useMemo(
    () => String(roomId || "").toUpperCase().trim(),
    [roomId]
  );

  const preferredDisplayName = useMemo(() => {
    const fromAuth = (user?.displayName || "").trim();
    if (fromAuth) return fromAuth;

    if (typeof window === "undefined") return "";
    return (window.localStorage.getItem(LS_GUEST_NAME_KEY) || "").trim();
  }, [user?.displayName]);

  // Persistent clientId per device
  const [clientId] = useState<string>(() => {
    try {
      const key = "ruleshiftClientId";
      const existing =
        typeof window !== "undefined"
          ? window.localStorage.getItem(key)
          : null;
      if (existing) return existing;

      const newId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, newId);
      }
      return newId;
    } catch {
      return Math.random().toString(36).slice(2);
    }
  });

  const [playerSeat, setPlayerSeat] = useState<PlayerSeat>(null);
  const [roomPresence, setRoomPresence] = useState<RoomPresence | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle"
  );
  const [leaving, setLeaving] = useState(false);

  // ✅ Prevent “Waiting…” flash before we’ve synced any state on refresh
  const [hasSyncedState, setHasSyncedState] = useState(false);

  const handleCopyRoomLink = async () => {
    if (typeof window === "undefined" || !normalizedRoomId) return;
    const url = `${window.location.origin}/room/${normalizedRoomId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch (err) {
      console.error("Failed to copy room link", err);
      setCopyStatus("error");
      setTimeout(() => setCopyStatus("idle"), 2000);
    }
  };

  const leaveRoom = async () => {
    if (leaving) return;
    setLeaving(true);

    // Best-effort: remove from matchmaking pool if backend supports it.
    try {
      await apiFetch("/matchmake/leave", {
        method: "POST",
        body: JSON.stringify({ roomId: normalizedRoomId }),
      });
    } catch (e) {
      console.warn("matchmake/leave failed (ignored):", e);
    }

    try {
      socket.emit("room:leave", { roomId: normalizedRoomId, clientId });
    } catch {
      // ignore
    }

    navigate("/");
  };

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

  const [playerCorrectGuesses, setPlayerCorrectGuesses] = useState<string[][]>(
    [[], []]
  );
  const [playerIncorrectGuesses, setPlayerIncorrectGuesses] = useState<
    string[][]
  >([[], []]);

  const [rules, setRules] = useState<Rule[]>([]);
  const [nextRuleId, setNextRuleId] = useState(1);

  // ✅ Remove positionEquals usage: default to positionKind
  const [selectedTemplate, setSelectedTemplate] =
    useState<RuleTemplate>("positionKind");

  const [positionIndex, setPositionIndex] = useState<number>(1);
  const [positionChar, setPositionChar] = useState<string>("");
  const [positionKind, setPositionKind] = useState<"letter" | "digit">("letter");
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

  const [lastResult, setLastResult] = useState<GuessResult | null>(null);
  const [lastGuessValue, setLastGuessValue] = useState<string | null>(null);

  const [playerScores, setPlayerScores] = useState<[number, number]>([0, 0]);
  const [lastBreakerPoints, setLastBreakerPoints] = useState<number | null>(
    null
  );
  const [lastPatcherPoints, setLastPatcherPoints] = useState<number | null>(
    null
  );

  const [endgameModeActive, setEndgameModeActive] = useState(false);
  const [endgameAttemptsLeft, setEndgameAttemptsLeft] = useState(0);
  const [endgameBaseAttempts, setEndgameBaseAttempts] = useState(0);
  const [endgameBonusAttempts, setEndgameBonusAttempts] = useState(0);

  const [prevValidCodesCount, setPrevValidCodesCount] = useState<number | null>(
    null
  );

  const [
    templatesAvailableForCurrentRound,
    setTemplatesAvailableForCurrentRound,
  ] = useState<TemplateOptionSummary[]>([]);

  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const seen = window.localStorage.getItem("ruleshiftOnboardingSeen_v1");
      return !seen;
    } catch {
      return true;
    }
  });

  const handleCloseOnboarding = () => {
    setShowOnboarding(false);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("ruleshiftOnboardingSeen_v1", "true");
      }
    } catch {
      // ignore
    }
  };

  const [tutorialMode, setTutorialMode] = useState<TutorialMode>("none");

  const currentPatcher = players[currentPatcherIndex];
  const currentBreakerIndex = 1 - currentPatcherIndex;
  const currentBreaker = players[currentBreakerIndex];

  const bothPlayersReady = players[0].ready && players[1].ready;

  const isSpectator = playerSeat === null;
  const thisPlayerIndex = playerSeat ?? 0;
  const thisPlayer = players[thisPlayerIndex];

  const isPatcherHere = !isSpectator && playerSeat === currentPatcherIndex;
  const isBreakerHere = !isSpectator && playerSeat === currentBreakerIndex;

  // ✅ Only breaker initializes endgame attempts (prevents refresh reset + double init)
  const isBreakerClient =
    playerSeat !== null && playerSeat === currentBreakerIndex;

  const TOTAL_CODES = 36 ** 4;

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

  const currentValidCount = rules.length === 0 ? TOTAL_CODES : validCodes.length;

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

  // --- Socket: join room + seat assignment ---
  useEffect(() => {
    if (!normalizedRoomId) return;

    // ✅ Send a name if available (login displayName preferred).
    const payload = {
      roomId: normalizedRoomId,
      clientId,
      mode: null, // keep shape compatible with server if it expects "mode"
      guestName: preferredDisplayName || "",
    };

    console.log("🧩 Joining room with payload:", payload);
    socket.emit("room:join", payload);

    const handleJoined = (data: any) => {
      if (!data) return;
      if (data.roomId !== normalizedRoomId || data.clientId !== clientId) return;

      console.log("🎯 Received room:joined", data);
      const seatIndex =
        data.seatIndex === 0 || data.seatIndex === 1 ? data.seatIndex : null;
      setPlayerSeat(seatIndex);
    };

    socket.on("room:joined", handleJoined);

    return () => {
      socket.off("room:joined", handleJoined);
    };
  }, [normalizedRoomId, clientId, preferredDisplayName]);

  // --- Presence listener ---
  useEffect(() => {
    if (!normalizedRoomId) return;

    const handlePresence = (data: RoomPresence) => {
      if (!data || data.roomId !== normalizedRoomId) return;
      setRoomPresence(data);
    };

    socket.on("room:presence", handlePresence);
    return () => {
      socket.off("room:presence", handlePresence);
    };
  }, [normalizedRoomId]);

  const occupiedSeatsCount = useMemo(() => {
    if (!roomPresence?.seats) return 0;
    return roomPresence.seats.filter((s) => s.occupied).length;
  }, [roomPresence]);

  // Waiting UI: only when room has <2 players and we haven't started the duel yet
  // ✅ Gate behind hasSyncedState to prevent refresh flash
  const waitingForOpponent =
    hasSyncedState && occupiedSeatsCount < 2 && phase === "enterNames";

  const broadcastState = (overrides: Partial<SyncedState> = {}) => {
    if (!normalizedRoomId) return;

    const payload: SyncedState = {
      roomId: normalizedRoomId,
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

  // --- Receive remote state ---
  useEffect(() => {
    const handler = (remote: SyncedState) => {
      if (remote.sender && remote.sender === socket.id) return;
      if (normalizedRoomId && remote.roomId && remote.roomId !== normalizedRoomId)
        return;

      setHasSyncedState(true);

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
  }, [normalizedRoomId]);

  // --- On connect: request state ---
  useEffect(() => {
    if (!normalizedRoomId) return;

    const requestState = () => {
      console.log("🔄 Requesting latest game state for room:", normalizedRoomId);
      socket.emit("game:requestState", { roomId: normalizedRoomId });
    };

    if (socket.connected) requestState();
    socket.on("connect", requestState);

    return () => {
      socket.off("connect", requestState);
    };
  }, [normalizedRoomId]);

  // ✅ Safety: if server doesn't send any state (fresh room), allow UI after short delay
  useEffect(() => {
    if (hasSyncedState) return;
    const t = setTimeout(() => setHasSyncedState(true), 1200);
    return () => clearTimeout(t);
  }, [hasSyncedState]);

  // --- Prefill this seat's name from login displayName (preferred) or localStorage ---
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (playerSeat === null) return;

    const name = (preferredDisplayName || "").trim();
    if (!name) return;

    setPlayers((prev) => {
      const seat = playerSeat;
      const current = prev[seat]?.name?.trim() || "";
      if (current.length > 0) return prev;

      const updated: Player[] = [{ ...prev[0] }, { ...prev[1] }];
      updated[seat] = { ...updated[seat], name, ready: false };
      return updated;
    });
  }, [playerSeat, preferredDisplayName]);

  // --- Local endgame effects ---
  useEffect(() => {
    if (phase === "patcherSetup") {
      setPrevValidCodesCount(currentValidCount);
    }
  }, [phase, currentValidCount]);

  // ✅ FIX: do NOT reset attempts on refresh / mount.
  // Only breaker initializes endgame once; everyone else just receives synced state.
  useEffect(() => {
    if (phase !== "breakerTurn") return;
    if (!isBreakerClient) return;

    // If we already have attempts (from synced state), do NOT overwrite.
    if (endgameModeActive || endgameAttemptsLeft > 0) return;

    if (isEndgameWindow && endgameStats) {
      setEndgameModeActive(true);
      setEndgameBaseAttempts(endgameStats.baseAttempts);
      setEndgameBonusAttempts(endgameStats.bonusAttempts);
      setEndgameAttemptsLeft(endgameStats.totalAttempts);

      broadcastState({
        endgameModeActive: true,
        endgameBaseAttempts: endgameStats.baseAttempts,
        endgameBonusAttempts: endgameStats.bonusAttempts,
        endgameAttemptsLeft: endgameStats.totalAttempts,
      });
    } else {
      // Ensure endgame is off (but avoid spam)
      if (endgameModeActive || endgameAttemptsLeft !== 0) {
        setEndgameModeActive(false);
        setEndgameBaseAttempts(0);
        setEndgameBonusAttempts(0);
        setEndgameAttemptsLeft(0);

        broadcastState({
          endgameModeActive: false,
          endgameBaseAttempts: 0,
          endgameBonusAttempts: 0,
          endgameAttemptsLeft: 0,
        });
      }
    }
  }, [
    phase,
    isBreakerClient,
    isEndgameWindow,
    endgameStats,
    endgameModeActive,
    endgameAttemptsLeft,
  ]);

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

    // ✅ default after removing positionEquals
    setSelectedTemplate("positionKind");

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

    const templatesAtPatchTime = getAvailableTemplateOptions(rules);

    let newRule: Rule;
    let description: string;

    switch (selectedTemplate) {
      // ✅ positionEquals removed

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
        newRule = { id: nextRuleId, type: "allUnique", description };
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
        newRule = { id: nextRuleId, type: "adjacentLettersPair", description };
        break;
      }

      case "lettersFirstHalf": {
        description =
          "All letters in the code must be from the first half of the alphabet (A–M).";
        newRule = { id: nextRuleId, type: "lettersFirstHalf", description };
        break;
      }

      case "lettersSecondHalf": {
        description =
          "All letters in the code must be from the second half of the alphabet (N–Z).";
        newRule = { id: nextRuleId, type: "lettersSecondHalf", description };
        break;
      }

      case "endsMirror": {
        description =
          "The first and last characters of the code must be the same.";
        newRule = { id: nextRuleId, type: "endsMirror", description };
        break;
      }

      case "noAdjacentDuplicates": {
        description = "No two adjacent characters in the code can be identical.";
        newRule = { id: nextRuleId, type: "noAdjacentDuplicates", description };
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

    const passesVisibleRules = passesAllRules(guess, visibleRules);
    if (!passesVisibleRules) {
      setBreakerError("Breaks one of the previously implemented rules.");
      return;
    }

    const systemValid = passesAllRules(guess, rules);

    if (!systemValid) {
      const newGuess: Guess = { value: guess, result: "INVALID" };
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
    const result: GuessResult = guess === patcherSecretCode ? "EXACT" : "VALID";

    const newGuess: Guess = { value: guess, result };
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
      endgameModeActive: false,
      endgameAttemptsLeft: 0,
      endgameBaseAttempts: 0,
      endgameBonusAttempts: 0,
      prevValidCodesCount: null,
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

  // --- name handlers for this seat ---
  const handleConfirmName = () => {
    if (isSpectator || playerSeat === null) return;
    const index = playerSeat;
    const rawName = players[index].name.trim();
    if (!rawName) return;

    const updatedPlayers: Player[] = [{ ...players[0] }, { ...players[1] }];
    updatedPlayers[index] = {
      ...updatedPlayers[index],
      name: rawName,
      ready: true,
    };

    setPlayers(updatedPlayers);
    broadcastState({ players: updatedPlayers });

    console.log("🔔 Emitting player:upsert", { clientId, rawName });
    socket.emit("player:upsert", { clientId, name: rawName });
  };

  const handleNameChange = (value: string) => {
    if (isSpectator || playerSeat === null) return;

    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LS_GUEST_NAME_KEY, value);
      }
    } catch {
      // ignore
    }

    const index = playerSeat;
    setPlayers((prev) => {
      const updated: Player[] = [{ ...prev[0] }, { ...prev[1] }];
      updated[index] = { ...updated[index], name: value, ready: false };
      return updated;
    });
  };

  // ✅ Logged-in-only duel stats (call once when duel ends)
  const reportedDuelRef = useRef<string | null>(null);

  useEffect(() => {
    const duelEnded = phase === "breakerWin" || phase === "patcherWin";
    if (!duelEnded) return;

    // logged-in only
    const userId = (user as any)?.id; // sanitizeUser likely includes id
    if (!userId) return;

    // players only (not spectators)
    if (
      thisPlayerIndex === null ||
      thisPlayerIndex === undefined ||
      thisPlayerIndex < 0
    )
      return;

    const winnerIndex =
      phase === "breakerWin" ? currentBreakerIndex : currentPatcherIndex;
    const outcome = winnerIndex === thisPlayerIndex ? "WIN" : "LOSS";

    const scoreEarned = playerScores[thisPlayerIndex] ?? 0;

    const duelKey = `${normalizedRoomId}:${rounds.length}:${phase}:${winnerIndex}`;
    if (reportedDuelRef.current === duelKey) return;
    reportedDuelRef.current = duelKey;

    (async () => {
      try {
        await apiFetch("/stats/duel/complete", {
          method: "POST",
          body: JSON.stringify({ scoreEarned, outcome, duelKey }),
        });
      } catch (e) {
        console.error("Failed to record duel stats:", e);
      }
    })();
  }, [
    phase,
    user,
    playerSeat,
    thisPlayerIndex,
    playerScores,
    normalizedRoomId,
    rounds.length,
    currentBreakerIndex,
    currentPatcherIndex,
  ]);

  // Build props for layout components
  const layoutProps: LayoutProps = {
    roomId: normalizedRoomId,
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
    onCopyRoomLink: handleCopyRoomLink,

    bothPlayersReady,
    onStartGame: startGame,
    onNameChange: handleNameChange,
    onConfirmName: handleConfirmName,

    isPatcherHere,
    isBreakerHere,
    currentPatcherIndex,
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
    validCodesCount: currentValidCount,

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
    patcherRuleText,
    onNextRound: advanceToNextRound,
    onRestartDuel: handleRestartDuel,

    showOnboarding,
    onCloseOnboarding: handleCloseOnboarding,
    showHowToPlay,
    setShowHowToPlay,
    tutorialMode,
    setTutorialMode,
  };

  // ✅ Reconnecting guard (only if we truly haven't synced yet)
  if (!hasSyncedState) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0f172a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          color: "#e5e7eb",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 520,
            background: "#111827",
            borderRadius: 16,
            border: "1px solid #1f2937",
            padding: 20,
            boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
          }}
        >
          <h2 style={{ margin: 0, marginBottom: 8 }}>Reconnecting…</h2>
          <div style={{ fontSize: 13, opacity: 0.85 }}>
            Syncing duel state for room{" "}
            <strong style={{ letterSpacing: 2 }}>{normalizedRoomId}</strong>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Waiting screen (matchmaking-friendly)
  if (waitingForOpponent) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0f172a",
          position: "relative",
          overflowX: "hidden",
        }}
      >
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            justifyContent: "center",
            paddingTop: 76,
            paddingBottom: 28,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 560,
              paddingInline: 16,
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "#111827",
                borderRadius: 16,
                border: "1px solid #1f2937",
                padding: 20,
                boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
                color: "#e5e7eb",
              }}
            >
              <h2 style={{ margin: 0, marginBottom: 8 }}>
                Waiting for opponent…
              </h2>

              <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 12 }}>
                Room code:{" "}
                <strong style={{ letterSpacing: 2 }}>{normalizedRoomId}</strong>
              </div>

              <button
                onClick={handleCopyRoomLink}
                style={{
                  width: "100%",
                  padding: "10px 0",
                  borderRadius: 999,
                  border: "none",
                  fontWeight: 700,
                  cursor: "pointer",
                  background: "#2563eb",
                  color: "#e5e7eb",
                }}
              >
                {copyStatus === "copied"
                  ? "Copied ✅"
                  : copyStatus === "error"
                  ? "Copy failed"
                  : "Copy Room Link"}
              </button>

              <button
                onClick={leaveRoom}
                disabled={leaving}
                style={{
                  width: "100%",
                  marginTop: 10,
                  padding: "10px 0",
                  borderRadius: 999,
                  border: "1px solid #374151",
                  fontWeight: 700,
                  cursor: leaving ? "not-allowed" : "pointer",
                  background: "#0b1220",
                  color: "#e5e7eb",
                  opacity: leaving ? 0.7 : 1,
                }}
              >
                {leaving ? "Leaving…" : "Leave"}
              </button>

              <div style={{ marginTop: 14, fontSize: 12, opacity: 0.75 }}>
                If you used <strong>Find Game</strong>, someone will be routed
                into this room automatically.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (breakpoint === "mobile") return <MobileLayout {...layoutProps} />;
  if (breakpoint === "tablet") return <TabletLayout {...layoutProps} />;
  return <DesktopLayout {...layoutProps} />;
};

export default GameRoom;
