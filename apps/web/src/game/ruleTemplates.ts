// src/ruleTemplates.ts
import type { RuleTemplate, Rule } from "./gameTypes";

export type TemplateOption = {
  value: RuleTemplate;
  label: string;
};

export const templateOptions: TemplateOption[] = [
  {
    value: "positionEquals",
    label: "Position equals a specific character",
  },
  {
    value: "positionKind",
    label: "Position must be a letter or digit",
  },
  {
    value: "exactLettersDigits",
    label: "Exactly X letters and Y digits",
  },
  {
    value: "mustComeBefore",
    label: "One character must come before another",
  },
  {
    value: "allUnique",
    label: "All characters must be unique",
  },
  {
    value: "mustContainChar",
    label: "A specific character must be in the code",
  },
  {
    value: "forbiddenChar",
    label: "A specific character cannot be in the code",
  },
  {
    value: "lettersInAlphabeticalOrder",
    label: "All letters must be in alphabetical order",
  },
  {
    value: "lettersNotInAlphabeticalOrder",
    label: "Letters cannot be in alphabetical order",
  },
  {
    value: "digitsLessThan",
    label: "All digits must be less than X",
  },
  {
    value: "cannotBeAdjacent",
    label: "Two characters cannot be adjacent",
  },
  {
    value: "adjacentLettersPair",
    label: "At least one adjacent pair must both be letters",
  },
  {
    value: "lettersFirstHalf",
    label: "All letters must be A–M",
  },
  {
    value: "lettersSecondHalf",
    label: "All letters must be N–Z",
  },
  {
    value: "endsMirror",
    label: "First and last characters must match",
  },
  {
    value: "noAdjacentDuplicates",
    label: "No identical adjacent characters",
  },
  {
    value: "exactDistinctCount",
    label: "Exactly N distinct characters",
  },
];

const hasAny = (rules: Rule[], types: Rule["type"][]): boolean =>
  rules.some((r) => types.includes(r.type));

export function getAvailableTemplateOptions(rules: Rule[]): TemplateOption[] {
  const digitsLessRule = rules.find(
    (r): r is Extract<Rule, { type: "digitsLessThan" }> =>
      r.type === "digitsLessThan"
  );

  const exactDistinctRule = rules.find(
    (r): r is Extract<Rule, { type: "exactDistinctCount" }> =>
      r.type === "exactDistinctCount"
  );

  const hasAllUnique = hasAny(rules, ["allUnique"]);
  const hasLettersOrder = hasAny(rules, ["lettersInAlphabeticalOrder"]);
  const hasLettersNotOrder = hasAny(rules, ["lettersNotInAlphabeticalOrder"]);
  const hasLettersOrderEither = hasLettersOrder || hasLettersNotOrder;
  const hasDigitsLessThan = !!digitsLessRule;
  const hasExactDistinct = !!exactDistinctRule;
  const hasLettersFirstHalf = hasAny(rules, ["lettersFirstHalf"]);
  const hasLettersSecondHalf = hasAny(rules, ["lettersSecondHalf"]);
  const hasLettersHalfEither = hasLettersFirstHalf || hasLettersSecondHalf;
  const hasEndsMirror = hasAny(rules, ["endsMirror"]);
  const hasNoAdjacentDuplicates = hasAny(rules, ["noAdjacentDuplicates"]);
  const hasExactLettersDigits = hasAny(rules, ["exactLettersDigits"]);
  const hasPositionEquals = hasAny(rules, ["positionEquals"]);
  const hasAdjacentLettersPair = hasAny(rules, ["adjacentLettersPair"]);

  const distinctTooLowForPatterns =
    exactDistinctRule && exactDistinctRule.distinctCount < 3;

  return templateOptions.filter((opt) => {
    const t = opt.value;

    switch (t) {
      case "positionEquals":
        return !hasPositionEquals;

      // allUnique and exactDistinctCount are overlapping; don’t offer both.
      case "allUnique":
        if (hasAllUnique) return false;
        if (hasExactDistinct) return false;
        return true;

      case "exactDistinctCount":
        if (hasExactDistinct) return false;
        if (hasAllUnique) return false;
        return true;

      case "digitsLessThan":
        return !hasDigitsLessThan;

      case "adjacentLettersPair":
        return !hasAdjacentLettersPair;

      case "lettersFirstHalf":
        if (hasLettersHalfEither) return false;
        return true;

      case "lettersSecondHalf":
        if (hasLettersHalfEither) return false;
        return true;

      // 🔹 Updated per your request:
      // Hide if already present OR if allUnique is active (redundant).
      case "endsMirror":
        if (hasEndsMirror) return false;
        if (hasAllUnique) return false;
        return true;

      case "noAdjacentDuplicates":
        if (hasNoAdjacentDuplicates) return false;
        if (hasAllUnique) return false;
        return true;

      // Alphabetical order pair: hide if one is already active, or if
      // exactDistinctCount < 3 (too cramped to be interesting).
      case "lettersInAlphabeticalOrder":
      case "lettersNotInAlphabeticalOrder":
        if (hasLettersOrderEither) return false;
        if (distinctTooLowForPatterns) return false;
        return true;

      // exactLettersDigits compatibility (your rules):
      // - digitsLessThan.maxDigit === 1 → effectively no digits allowed.
      // - exactDistinctCount < 3 → too cramped.
      case "exactLettersDigits":
        if (hasExactLettersDigits) return false;
        if (digitsLessRule && digitsLessRule.maxDigit === 1) return false;
        if (distinctTooLowForPatterns) return false;
        return true;

      // Always allowed; duplicates blocked later by isDuplicateRule(...)
      case "positionKind":
      case "mustComeBefore":
      case "mustContainChar":
      case "forbiddenChar":
      case "cannotBeAdjacent":
        return true;

      default:
        return true;
    }
  });
}
