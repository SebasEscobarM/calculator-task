// Types for the calculator REST API. The contract is documented in
// docs/api.md at the repository root.

export type BinaryOperation = "add" | "subtract" | "multiply" | "divide" | "power";
export type UnaryOperation = "sqrt" | "percentage";
export type Operation = BinaryOperation | UnaryOperation;

export function isUnaryOperation(operation: Operation): operation is UnaryOperation {
  return operation === "sqrt" || operation === "percentage";
}

/** Error codes the API can return. */
export const SERVER_ERROR_CODES = [
  "INVALID_JSON",
  "MISSING_OPERAND",
  "UNKNOWN_OPERATION",
  "NOT_FOUND",
  "METHOD_NOT_ALLOWED",
  "PAYLOAD_TOO_LARGE",
  "DIVISION_BY_ZERO",
  "INVALID_OPERAND",
  "RESULT_OUT_OF_RANGE",
  "INTERNAL_ERROR",
] as const;

export type ServerErrorCode = (typeof SERVER_ERROR_CODES)[number];

/** Failures the client detects when no usable API response arrives. */
export type ClientErrorCode =
  /** The request got no response at all, e.g. the network is down. */
  | "NETWORK_ERROR"
  /** The response did not arrive in time. */
  | "TIMEOUT"
  /** A response arrived but is not the API's JSON, e.g. the proxy's error page while the backend is down. */
  | "UNEXPECTED_RESPONSE";

export type ApiErrorCode = ServerErrorCode | ClientErrorCode;

export interface CalculationResponse {
  result: number;
}

export interface ErrorResponse {
  error: { code: ServerErrorCode; message: string };
}
