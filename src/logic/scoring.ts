// src/logic/scoring.ts

type DifficultyTier = 1 | 2 | 3 | 4 | 5;

function getDifficultyTier(validCodesAtStart: number): DifficultyTier {
  if (validCodesAtStart > 500_000) return 1;
  if (validCodesAtStart > 150_000) return 2;
  if (validCodesAtStart > 80_000) return 3;
  if (validCodesAtStart > 1_000) return 4;
  return 5;
}

function getTierMultiplier(tier: DifficultyTier): number {
  switch (tier) {
    case 1:
      return 0.5;
    case 2:
      return 1.0;
    case 3:
      return 1.5;
    case 4:
      return 2.0;
    case 5:
      return 3.0;
    default:
      return 1.0;
  }
}

function safeLog2(n: number): number {
  if (n <= 1) return 0;
  return Math.log(n) / Math.log(2);
}

type BreakerScoreInput = {
  validCodesAtStart: number;
  result: "VALID" | "EXACT";
  inEndgame: boolean;
};

export function computeBreakerScore(input: BreakerScoreInput): number {
  const { validCodesAtStart, result, inEndgame } = input;

  if (validCodesAtStart <= 0) return 0;

  const tier = getDifficultyTier(validCodesAtStart);
  const multiplier = getTierMultiplier(tier);

  const base = safeLog2(validCodesAtStart); // bigger search = more credit
  const exactBonus = result === "EXACT" ? base * 0.5 : 0;
  const endgameBonus = inEndgame ? 3 : 0;

  const rawScore = base * multiplier + exactBonus + endgameBonus;
  return Math.floor(rawScore); // always round down
}

type PatcherScoreInput = {
  validCodesAtStart: number;
  invalidGuessesThisRound: number;
  endgameWin: boolean;
};

export function computePatcherScore(input: PatcherScoreInput): number {
  const { validCodesAtStart, invalidGuessesThisRound, endgameWin } = input;

  if (validCodesAtStart <= 0 || invalidGuessesThisRound <= 0) {
    // Might still get something from an endgame win
    if (!endgameWin) return 0;
  }

  const tier = getDifficultyTier(validCodesAtStart);
  const multiplier = getTierMultiplier(tier);

  // Per-invalid scales with difficulty tier.
  // At ~1.7M codes (tier 1), 7 invalids ≈ 0 pts.
  // Around 150k (tier 3), 7 invalids ≈ 1–2 pts.
  const perInvalid = 0.15 * multiplier;
  let rawScore = invalidGuessesThisRound * perInvalid;

  // Extra juice when your system actually survives endgame.
  if (endgameWin) {
    rawScore += 3 * multiplier;
  }

  return Math.floor(rawScore);
}
