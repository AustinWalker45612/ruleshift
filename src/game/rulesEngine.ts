// src/game/rulesEngine.ts
import type { Rule } from "./gameTypes";

export const CODE_REGEX = /^[A-Z0-9]{4}$/;
export const CHAR_REGEX = /^[A-Z0-9]$/;
export const ALL_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");

const isLetter = (c: string) => /[A-Z]/.test(c);
const isDigit = (c: string) => /[0-9]/.test(c);

export function passesAllRules(code: string, rules: Rule[]): boolean {
  // Base format check: 4 chars, A–Z / 0–9
  if (!CODE_REGEX.test(code)) return false;

  for (const rule of rules) {
    switch (rule.type) {
      case "positionEquals": {
        const pos = rule.position;
        if (code[pos] !== rule.char) return false;
        break;
      }
      case "positionKind": {
        const pos = rule.position;
        const ch = code[pos];
        if (rule.kind === "letter") {
          if (!isLetter(ch)) return false;
        } else {
          if (!isDigit(ch)) return false;
        }
        break;
      }
      case "exactLettersDigits": {
        let letters = 0;
        let digits = 0;
        for (const ch of code) {
          if (isLetter(ch)) letters++;
          else if (isDigit(ch)) digits++;
        }
        if (!(letters === rule.letters && digits === rule.digits)) return false;
        break;
      }
      case "mustComeBefore": {
        const i1 = code.indexOf(rule.firstChar);
        const i2 = code.indexOf(rule.secondChar);
        // Only enforce order if BOTH appear in the code.
        // If one or both are missing, this rule is satisfied.
        if (i1 !== -1 && i2 !== -1 && i1 >= i2) return false;
        break;
      }
      case "allUnique": {
        const set = new Set(code.split(""));
        if (set.size !== 4) return false;
        break;
      }
      case "mustContainChar": {
        if (!code.includes(rule.char)) return false;
        break;
      }
      case "forbiddenChar": {
        if (code.includes(rule.char)) return false;
        break;
      }
      case "lettersInAlphabeticalOrder": {
        const letters = code.split("").filter(isLetter);
        if (letters.length <= 1) break; // trivially in order
        for (let i = 1; i < letters.length; i++) {
          if (letters[i] < letters[i - 1]) {
            // not in non-decreasing order => rule fails
            return false;
          }
        }
        break;
      }
      case "lettersNotInAlphabeticalOrder": {
        const letters = code.split("").filter(isLetter);
        // If 0 or 1 letters, they are trivially in order → this violates the rule
        if (letters.length <= 1) return false;
        let nonDecreasing = true;
        for (let i = 1; i < letters.length; i++) {
          if (letters[i] < letters[i - 1]) {
            nonDecreasing = false;
            break;
          }
        }
        if (nonDecreasing) return false; // all letters are in order, not allowed
        break;
      }
      case "digitsLessThan": {
        for (const ch of code) {
          if (isDigit(ch)) {
            const d = Number(ch);
            if (!(d < rule.maxDigit)) return false;
          }
        }
        break;
      }
      case "cannotBeAdjacent": {
        const A = rule.charA;
        const B = rule.charB;
        const containsA = code.includes(A);
        const containsB = code.includes(B);
        if (containsA && containsB) {
          for (let i = 0; i < code.length - 1; i++) {
            const pair = code[i] + code[i + 1];
            if (pair === A + B || pair === B + A) {
              return false;
            }
          }
        }
        break;
      }
      case "adjacentLettersPair": {
        let found = false;
        for (let i = 0; i < code.length - 1; i++) {
          if (isLetter(code[i]) && isLetter(code[i + 1])) {
            found = true;
            break;
          }
        }
        if (!found) return false;
        break;
      }
      case "lettersFirstHalf": {
        for (const ch of code) {
          if (isLetter(ch) && (ch < "A" || ch > "M")) {
            return false;
          }
        }
        break;
      }
      case "lettersSecondHalf": {
        for (const ch of code) {
          if (isLetter(ch) && (ch < "N" || ch > "Z")) {
            return false;
          }
        }
        break;
      }
      case "endsMirror": {
        if (code[0] !== code[3]) return false;
        break;
      }
      case "noAdjacentDuplicates": {
        for (let i = 0; i < code.length - 1; i++) {
          if (code[i] === code[i + 1]) return false;
        }
        break;
      }
      case "exactDistinctCount": {
        const distinct = new Set(code.split("")).size;
        if (distinct !== rule.distinctCount) return false;
        break;
      }
      default:
        break;
    }
  }

  return true;
}

// Check if a newly constructed rule is a duplicate or conflicts with existing rules.
export function isDuplicateRule(newRule: Rule, rules: Rule[]): boolean {
  switch (newRule.type) {
    case "allUnique":
      return rules.some((r) => r.type === "allUnique");
    case "exactLettersDigits":
      return rules.some((r) => r.type === "exactLettersDigits");
    case "positionEquals":
      // Hard cap: only ONE positionEquals rule per duel.
      return rules.some((r) => r.type === "positionEquals");
    case "positionKind":
      return rules.some(
        (r) =>
          r.type === "positionKind" &&
          r.position === newRule.position &&
          r.kind === newRule.kind
      );
    case "mustComeBefore":
      return rules.some(
        (r) =>
          r.type === "mustComeBefore" &&
          r.firstChar === newRule.firstChar &&
          r.secondChar === newRule.secondChar
      );
    case "mustContainChar":
      return rules.some(
        (r) => r.type === "mustContainChar" && r.char === newRule.char
      );
    case "forbiddenChar":
      return rules.some(
        (r) => r.type === "forbiddenChar" && r.char === newRule.char
      );
    case "lettersInAlphabeticalOrder":
      // Mutually exclusive pair with lettersNotInAlphabeticalOrder
      return rules.some(
        (r) =>
          r.type === "lettersInAlphabeticalOrder" ||
          r.type === "lettersNotInAlphabeticalOrder"
      );
    case "lettersNotInAlphabeticalOrder":
      return rules.some(
        (r) =>
          r.type === "lettersInAlphabeticalOrder" ||
          r.type === "lettersNotInAlphabeticalOrder"
      );
    case "digitsLessThan":
      return rules.some((r) => r.type === "digitsLessThan");
    case "cannotBeAdjacent": {
      const A = newRule.charA;
      const B = newRule.charB;
      return rules.some(
        (r) =>
          r.type === "cannotBeAdjacent" &&
          ((r.charA === A && r.charB === B) ||
            (r.charA === B && r.charB === A))
      );
    }
    case "adjacentLettersPair":
      return rules.some((r) => r.type === "adjacentLettersPair");
    case "lettersFirstHalf":
    case "lettersSecondHalf":
      // Mutually exclusive pair
      return rules.some(
        (r) => r.type === "lettersFirstHalf" || r.type === "lettersSecondHalf"
      );
    case "endsMirror":
      return rules.some((r) => r.type === "endsMirror");
    case "noAdjacentDuplicates":
      return rules.some((r) => r.type === "noAdjacentDuplicates");
    case "exactDistinctCount":
      return rules.some((r) => r.type === "exactDistinctCount");
    default:
      return false;
  }
}
