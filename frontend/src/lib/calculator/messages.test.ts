import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/client";
import type { ApiErrorCode } from "@/lib/api/types";
import { errorMessage } from "./messages";

describe("errorMessage", () => {
  it.each<[ApiErrorCode, string]>([
    ["DIVISION_BY_ZERO", "Cannot divide by zero"],
    ["INVALID_OPERAND", "Invalid input"],
    ["RESULT_OUT_OF_RANGE", "Result is too large"],
    ["NETWORK_ERROR", "Calculator service unavailable"],
    ["UNEXPECTED_RESPONSE", "Calculator service unavailable"],
    ["TIMEOUT", "Calculator service timed out"],
    ["INVALID_JSON", "Something went wrong"],
    ["INTERNAL_ERROR", "Something went wrong"],
  ])("explains %s as %j", (code, expected) => {
    expect(errorMessage(new ApiError(code, "details for developers"))).toBe(expected);
  });

  it("falls back to a generic message for anything that is not an ApiError", () => {
    expect(errorMessage(new Error("boom"))).toBe("Something went wrong");
  });
});
