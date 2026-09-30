import { describe, expect, it } from "vitest";
import { countDigits, formatNumber } from "./format";

describe("formatNumber", () => {
  it.each([
    [5, "5"],
    [-42, "-42"],
    [3.5, "3.5"],
    [0.000001, "0.000001"],
    [999_999_999_999, "999999999999"],
  ])("shows %s as %s", (value, expected) => {
    expect(formatNumber(value)).toBe(expected);
  });

  it.each([
    [0.1 + 0.2, "0.3"],
    [1.1 * 1.1, "1.21"],
    [4.35 * 100, "435"],
  ])("hides floating-point noise in %s", (value, expected) => {
    expect(formatNumber(value)).toBe(expected);
  });

  it("rounds to twelve significant digits", () => {
    expect(formatNumber(1 / 3)).toBe("0.333333333333");
    expect(formatNumber(2 / 3)).toBe("0.666666666667");
  });

  it.each([
    [1e12, "1e+12"],
    [123_456_789_012_345, "1.23456789012e+14"],
    [-1.5e20, "-1.5e+20"],
    [1e-7, "1e-7"],
    [0.00000123456789012345, "1.23456789012e-6"],
  ])("uses exponent notation for %s", (value, expected) => {
    expect(formatNumber(value)).toBe(expected);
  });

  it("never shows a negative zero", () => {
    expect(formatNumber(-0)).toBe("0");
  });
});

describe("countDigits", () => {
  it("ignores the sign and the decimal point", () => {
    expect(countDigits("-12.50")).toBe(4);
  });

  it("ignores the 0 in front of a decimal point", () => {
    expect(countDigits("0.25")).toBe(2);
    expect(countDigits("-0.5")).toBe(1);
    expect(countDigits("0.")).toBe(0);
  });

  it("counts a lone zero", () => {
    expect(countDigits("0")).toBe(1);
  });
});
