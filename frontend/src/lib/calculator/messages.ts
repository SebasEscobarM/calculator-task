import { ApiError } from "@/lib/api/client";
import type { ApiErrorCode } from "@/lib/api/types";

const UNAVAILABLE = "Calculator service unavailable";
const UNEXPECTED = "Something went wrong";

// A Record forces a message for every code, so a new code cannot be forgotten.
const MESSAGES: Record<ApiErrorCode, string> = {
  DIVISION_BY_ZERO: "Cannot divide by zero",
  INVALID_OPERAND: "Invalid input",
  RESULT_OUT_OF_RANGE: "Result is too large",
  NETWORK_ERROR: UNAVAILABLE,
  UNEXPECTED_RESPONSE: UNAVAILABLE,
  TIMEOUT: "Calculator service timed out",
  // The rest mean the request itself was wrong: a bug in this client, not
  // something the user can fix.
  INVALID_JSON: UNEXPECTED,
  MISSING_OPERAND: UNEXPECTED,
  UNKNOWN_OPERATION: UNEXPECTED,
  NOT_FOUND: UNEXPECTED,
  METHOD_NOT_ALLOWED: UNEXPECTED,
  PAYLOAD_TOO_LARGE: UNEXPECTED,
  INTERNAL_ERROR: UNEXPECTED,
};

/** Message for the display when a calculation fails. */
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? MESSAGES[error.code] : UNEXPECTED;
}
