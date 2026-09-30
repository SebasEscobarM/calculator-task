import type { Operation } from "@/lib/api/types";

/** Most digits the display shows, and the most a user can type. */
export const MAX_DIGITS = 12;

/** Symbols for the keys and the expression line. */
export const OPERATION_SYMBOLS: Record<Operation, string> = {
  add: "+",
  subtract: "−",
  multiply: "×",
  divide: "÷",
  power: "^",
  sqrt: "√",
  percentage: "%",
};

/**
 * Formats a number for the display. Rounding to MAX_DIGITS significant digits
 * also hides binary floating-point noise, so 0.1 + 0.2 shows as 0.3. Numbers
 * that would need more digits than that switch to exponent notation, and
 * negative zero shows as 0.
 */
export function formatNumber(value: number): string {
  const rounded = Number(value.toPrecision(MAX_DIGITS));
  const plain = String(rounded); // String(-0) is "0".
  if (!plain.includes("e") && countDigits(plain) <= MAX_DIGITS) {
    return plain;
  }
  return rounded.toExponential();
}

/**
 * Counts the digits a number's text takes up on the display. The sign, the
 * decimal point and the 0 in front of "0." don't count, so 0.333333333333
 * has twelve digits, like 333333333333.
 */
export function countDigits(text: string): number {
  return text.replace(/^-?0\./, ".").replace(/\D/g, "").length;
}
