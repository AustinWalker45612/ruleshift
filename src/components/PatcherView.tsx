import React from "react";
import type { Rule, RuleTemplate } from "../game/gameTypes";
import { ActiveRulesPanel} from "./activeRulesPanel";

type PatcherViewProps = {
  mode: "patcher";
  currentPatcherName: string;

  patcherSecretCode: string;
  setPatcherSecretCode: React.Dispatch<React.SetStateAction<string>>;

  selectedTemplate: RuleTemplate;
  setSelectedTemplate: React.Dispatch<React.SetStateAction<RuleTemplate>>;

  positionIndex: number;
  setPositionIndex: React.Dispatch<React.SetStateAction<number>>;
  positionChar: string;
  setPositionChar: React.Dispatch<React.SetStateAction<string>>;

  positionKind: "letter" | "digit";
  setPositionKind: React.Dispatch<React.SetStateAction<"letter" | "digit">>;

  lettersCount: number;
  setLettersCount: React.Dispatch<React.SetStateAction<number>>;
  digitsCount: number;
  setDigitsCount: React.Dispatch<React.SetStateAction<number>>;

  firstChar: string;
  setFirstChar: React.Dispatch<React.SetStateAction<string>>;
  secondChar: string;
  setSecondChar: React.Dispatch<React.SetStateAction<string>>;

  mustContainChar: string;
  setMustContainChar: React.Dispatch<React.SetStateAction<string>>;
  forbiddenChar: string;
  setForbiddenChar: React.Dispatch<React.SetStateAction<string>>;

  maxDigitValue: number;
  setMaxDigitValue: React.Dispatch<React.SetStateAction<number>>;

  cannotAdjCharA: string;
  setCannotAdjCharA: React.Dispatch<React.SetStateAction<string>>;
  cannotAdjCharB: string;
  setCannotAdjCharB: React.Dispatch<React.SetStateAction<string>>;

  distinctCount: number;
  setDistinctCount: React.Dispatch<React.SetStateAction<number>>;

  availableTemplateOptions: { value: RuleTemplate; label: string }[];

  patcherRuleError: string | null;
  handleConfirmPatcherSetup: () => void;

  visibleRules: Rule[];
  validCodesCount: number;

};

export const PatcherView: React.FC<PatcherViewProps> = ({
  mode,
  currentPatcherName,
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

}) => {
  const isPhone = mode === "patcher";

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
        {currentPatcherName}&apos;s Turn (PATCHER)
        {isPhone && " 📱"}
      </h2>

      <p style={{ fontSize: 13, marginBottom: 16 }}>
        Secretly choose a 4-character code that follows all active rules. Then
        add exactly one new rule to tighten the system.
      </p>

      <ActiveRulesPanel
        visibleRules={visibleRules}
        validCodesCount={validCodesCount}
      />

      <label style={{ display: "block", marginBottom: 12 }}>
        Secret Code (4 chars, A–Z / 0–9):
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
          value={patcherSecretCode}
          maxLength={4}
          onChange={(e) => setPatcherSecretCode(e.target.value.toUpperCase())}
          placeholder="e.g. A3B7"
        />
      </label>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 8 }}>
          New Rule Template:
          <select
            style={{
              width: "100%",
              marginTop: 4,
              padding: 8,
              borderRadius: 8,
              border: "1px solid #374151",
              background: "#020617",
              color: "#e5e7eb",
            }}
            value={selectedTemplate}
            onChange={(e) =>
              setSelectedTemplate(e.target.value as RuleTemplate)
            }
          >
            {availableTemplateOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {/* === TEMPLATE CONFIG === */}

        {selectedTemplate === "positionEquals" && (
          <div style={{ fontSize: 13 }}>
            <label style={{ display: "block", marginBottom: 8 }}>
              Position (1–4):
              <select
                style={{
                  width: "100%",
                  marginTop: 4,
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                }}
                value={positionIndex}
                onChange={(e) => setPositionIndex(Number(e.target.value) || 1)}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </select>
            </label>
            <label style={{ display: "block" }}>
              Required character (A–Z or 0–9):
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
                maxLength={1}
                value={positionChar}
                onChange={(e) => setPositionChar(e.target.value.toUpperCase())}
                placeholder="e.g. A"
              />
            </label>
          </div>
        )}

        {selectedTemplate === "positionKind" && (
          <div style={{ fontSize: 13 }}>
            <label style={{ display: "block", marginBottom: 8 }}>
              Position (1–4):
              <select
                style={{
                  width: "100%",
                  marginTop: 4,
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                }}
                value={positionIndex}
                onChange={(e) => setPositionIndex(Number(e.target.value) || 1)}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </select>
            </label>
            <label style={{ display: "block" }}>
              Must be:
              <select
                style={{
                  width: "100%",
                  marginTop: 4,
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                }}
                value={positionKind}
                onChange={(e) =>
                  setPositionKind(e.target.value as "letter" | "digit")
                }
              >
                <option value="letter">Letter (A–Z)</option>
                <option value="digit">Digit (0–9)</option>
              </select>
            </label>
          </div>
        )}

        {selectedTemplate === "exactLettersDigits" && (
          <div style={{ fontSize: 13 }}>
            <p style={{ opacity: 0.8, marginBottom: 8 }}>
              Letters + digits must always equal 4. Changing one updates the
              other.
            </p>
            <label style={{ display: "block", marginBottom: 8 }}>
              Number of letters:
              <input
                type="number"
                min={0}
                max={4}
                style={{
                  width: "100%",
                  marginTop: 4,
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                }}
                value={lettersCount}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  let clamped = isNaN(val) ? 0 : val;
                  if (clamped < 0) clamped = 0;
                  if (clamped > 4) clamped = 4;
                  setLettersCount(clamped);
                  setDigitsCount(4 - clamped);
                }}
              />
            </label>
            <label style={{ display: "block" }}>
              Number of digits:
              <input
                type="number"
                min={0}
                max={4}
                style={{
                  width: "100%",
                  marginTop: 4,
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                }}
                value={digitsCount}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  let clamped = isNaN(val) ? 0 : val;
                  if (clamped < 0) clamped = 0;
                  if (clamped > 4) clamped = 4;
                  setDigitsCount(clamped);
                  setLettersCount(4 - clamped);
                }}
              />
            </label>
          </div>
        )}

        {selectedTemplate === "mustComeBefore" && (
          <div style={{ fontSize: 13 }}>
            <p style={{ opacity: 0.8, marginBottom: 8 }}>
              If both characters appear in the code, the first must be before
              the second. If one is missing, this rule is satisfied.
            </p>
            <label style={{ display: "block", marginBottom: 8 }}>
              First character:
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
                maxLength={1}
                value={firstChar}
                onChange={(e) => setFirstChar(e.target.value.toUpperCase())}
                placeholder="e.g. A"
              />
            </label>
            <label style={{ display: "block" }}>
              Second character:
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
                maxLength={1}
                value={secondChar}
                onChange={(e) => setSecondChar(e.target.value.toUpperCase())}
                placeholder="e.g. 3"
              />
            </label>
          </div>
        )}

        {selectedTemplate === "allUnique" && (
          <p
            style={{
              fontSize: 12,
              opacity: 0.8,
              marginTop: 4,
            }}
          >
            All 4 characters must be different. No repeats allowed.
          </p>
        )}

        {selectedTemplate === "mustContainChar" && (
          <div style={{ fontSize: 13 }}>
            <label style={{ display: "block" }}>
              Character that must appear:
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
                maxLength={1}
                value={mustContainChar}
                onChange={(e) =>
                  setMustContainChar(e.target.value.toUpperCase())
                }
                placeholder="e.g. X"
              />
            </label>
          </div>
        )}

        {selectedTemplate === "forbiddenChar" && (
          <div style={{ fontSize: 13 }}>
            <label style={{ display: "block" }}>
              Character that cannot appear:
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
                maxLength={1}
                value={forbiddenChar}
                onChange={(e) =>
                  setForbiddenChar(e.target.value.toUpperCase())
                }
                placeholder="e.g. Z"
              />
            </label>
          </div>
        )}

        {selectedTemplate === "lettersInAlphabeticalOrder" && (
          <p
            style={{
              fontSize: 12,
              opacity: 0.8,
              marginTop: 4,
            }}
          >
            Consider only letters (A–Z) in the code and ignore digits. Those
            letters must appear in non-decreasing alphabetical order.
          </p>
        )}

        {selectedTemplate === "lettersNotInAlphabeticalOrder" && (
          <p
            style={{
              fontSize: 12,
              opacity: 0.8,
              marginTop: 4,
            }}
          >
            Consider only letters (A–Z) in the code and ignore digits. Those
            letters must <strong>not</strong> all be in alphabetical order —
            there has to be at least one letter out of order.
          </p>
        )}

        {selectedTemplate === "digitsLessThan" && (
          <div style={{ fontSize: 13 }}>
            <p style={{ opacity: 0.8, marginBottom: 8 }}>
              Any digits in the code must be strictly less than the chosen
              number.
            </p>
            <label style={{ display: "block" }}>
              Maximum allowed digit (1–9, digits must be &lt; this):
              <input
                type="number"
                min={1}
                max={9}
                style={{
                  width: "100%",
                  marginTop: 4,
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                }}
                value={maxDigitValue}
                onChange={(e) =>
                  setMaxDigitValue(Number(e.target.value) || 1)
                }
              />
            </label>
          </div>
        )}

        {selectedTemplate === "cannotBeAdjacent" && (
          <div style={{ fontSize: 13 }}>
            <p style={{ opacity: 0.8, marginBottom: 8 }}>
              If both characters appear in the code, they cannot be adjacent in
              either order (XY or YX).
            </p>
            <label style={{ display: "block", marginBottom: 8 }}>
              First character:
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
                maxLength={1}
                value={cannotAdjCharA}
                onChange={(e) =>
                  setCannotAdjCharA(e.target.value.toUpperCase())
                }
                placeholder="e.g. A"
              />
            </label>
            <label style={{ display: "block" }}>
              Second character:
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
                maxLength={1}
                value={cannotAdjCharB}
                onChange={(e) =>
                  setCannotAdjCharB(e.target.value.toUpperCase())
                }
                placeholder="e.g. 3"
              />
            </label>
          </div>
        )}

        {selectedTemplate === "adjacentLettersPair" && (
          <p
            style={{
              fontSize: 12,
              opacity: 0.8,
              marginTop: 4,
            }}
          >
            At least one pair of adjacent characters must both be letters
            (ignoring digits).
          </p>
        )}

        {selectedTemplate === "lettersFirstHalf" && (
          <p
            style={{
              fontSize: 12,
              opacity: 0.8,
              marginTop: 4,
            }}
          >
            All letters must be in the range A–M. Digits are ignored by this
            rule.
          </p>
        )}

        {selectedTemplate === "lettersSecondHalf" && (
          <p
            style={{
              fontSize: 12,
              opacity: 0.8,
              marginTop: 4,
            }}
          >
            All letters must be in the range N–Z. Digits are ignored by this
            rule.
          </p>
        )}

        {selectedTemplate === "endsMirror" && (
          <p
            style={{
              fontSize: 12,
              opacity: 0.8,
              marginTop: 4,
            }}
          >
            The first and last characters of every valid code must match (e.g.
            A1B<strong>A</strong>, 3ZZ<strong>3</strong>).
          </p>
        )}

        {selectedTemplate === "noAdjacentDuplicates" && (
          <p
            style={{
              fontSize: 12,
              opacity: 0.8,
              marginTop: 4,
            }}
          >
            No two adjacent characters can be the same (e.g. AA or 33 anywhere
            in the code is forbidden).
          </p>
        )}

        {selectedTemplate === "exactDistinctCount" && (
          <div style={{ fontSize: 13 }}>
            <p style={{ opacity: 0.8, marginBottom: 8 }}>
              Controls how many different characters can appear in a code. For
              example, 1 = AAAA, 2 = AABB, 4 = ABCD, etc.
            </p>
            <label style={{ display: "block" }}>
              Distinct characters (1–4):
              <input
                type="number"
                min={1}
                max={4}
                style={{
                  width: "100%",
                  marginTop: 4,
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                }}
                value={distinctCount}
                onChange={(e) =>
                  setDistinctCount(Number(e.target.value) || 1)
                }
              />
            </label>
          </div>
        )}

        {patcherRuleError && (
          <p
            style={{
              marginTop: 8,
              fontSize: 12,
              color: "#f97373",
            }}
          >
            {patcherRuleError}
          </p>
        )}
      </div>

      <button
        onClick={handleConfirmPatcherSetup}
        style={{
          width: "100%",
          padding: "10px 0",
          borderRadius: 999,
          border: "none",
          fontWeight: 600,
          cursor: "pointer",
          background: "#16a34a",
          color: "#e5e7eb",
        }}
      >
        Confirm &amp; Pass to Breaker
      </button>
    </div>
  );
};
