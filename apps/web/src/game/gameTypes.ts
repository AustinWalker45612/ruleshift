// src/game/gameTypes.ts

export type Player = {
    name: string;
  };
  
  export type Phase =
    | "enterNames"
    | "patcherSetup"
    | "passToBreaker"
    | "breakerTurn"
    | "validResult"
    | "exactResult"
    | "breakerWin"
    | "patcherWin";
  
  export type GuessResult = "INVALID" | "VALID" | "EXACT";
  
  export type Guess = {
    value: string;
    result: GuessResult;
  };
  
  export type Round = {
    roundNumber: number;
    patcherIndex: number; // 0 or 1
    secretCode: string;
    ruleText: string;
    guesses: Guess[];
  };
  
  // Templates user can choose from in the UI
  export type RuleTemplate =
    | "positionEquals"
    | "positionKind"
    | "exactLettersDigits"
    | "mustComeBefore"
    | "allUnique"
    | "mustContainChar"
    | "forbiddenChar"
    | "lettersInAlphabeticalOrder"
    | "lettersNotInAlphabeticalOrder"
    | "digitsLessThan"
    | "cannotBeAdjacent"
    | "adjacentLettersPair"
    | "lettersFirstHalf"
    | "lettersSecondHalf"
    | "endsMirror"
    | "noAdjacentDuplicates"
    | "exactDistinctCount";
  
  // Concrete rules stored in the engine
  export type Rule =
    | {
        id: number;
        type: "positionEquals";
        position: 0 | 1 | 2 | 3; // 0-based index
        char: string; // single A–Z or 0–9
        description: string;
      }
    | {
        id: number;
        type: "positionKind";
        position: 0 | 1 | 2 | 3;
        kind: "letter" | "digit";
        description: string;
      }
    | {
        id: number;
        type: "exactLettersDigits";
        letters: number;
        digits: number;
        description: string;
      }
    | {
        id: number;
        type: "mustComeBefore";
        firstChar: string;
        secondChar: string;
        description: string;
      }
    | {
        id: number;
        type: "allUnique";
        description: string;
      }
    | {
        id: number;
        type: "mustContainChar";
        char: string;
        description: string;
      }
    | {
        id: number;
        type: "forbiddenChar";
        char: string;
        description: string;
      }
    | {
        id: number;
        type: "lettersInAlphabeticalOrder";
        description: string;
      }
    | {
        id: number;
        type: "lettersNotInAlphabeticalOrder";
        description: string;
      }
    | {
        id: number;
        type: "digitsLessThan";
        maxDigit: number;
        description: string;
      }
    | {
        id: number;
        type: "cannotBeAdjacent";
        charA: string;
        charB: string;
        description: string;
      }
    | {
        id: number;
        type: "adjacentLettersPair";
        description: string;
      }
    | {
        id: number;
        type: "lettersFirstHalf";
        description: string;
      }
    | {
        id: number;
        type: "lettersSecondHalf";
        description: string;
      }
    | {
        id: number;
        type: "endsMirror";
        description: string;
      }
    | {
        id: number;
        type: "noAdjacentDuplicates";
        description: string;
      }
    | {
        id: number;
        type: "exactDistinctCount";
        distinctCount: number;
        description: string;
      };
  