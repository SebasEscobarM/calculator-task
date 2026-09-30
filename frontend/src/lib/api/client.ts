import {
  SERVER_ERROR_CODES,
  type ApiErrorCode,
  type CalculationResponse,
  type ErrorResponse,
  type Operation,
} from "./types";

const DEFAULT_TIMEOUT_MS = 5_000;

const serverErrorCodes: ReadonlySet<string> = new Set(SERVER_ERROR_CODES);

/** A calculation that did not produce a result. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  /** HTTP status of the response, when one arrived. */
  readonly status?: number;

  constructor(code: ApiErrorCode, message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export interface CalculateOptions {
  /** Cancels the request; the promise then rejects with the abort reason. */
  signal?: AbortSignal;
  timeoutMs?: number;
}

/**
 * Asks the API to apply an operation to its operands (one for unary
 * operations, two for binary ones) and resolves with the result.
 *
 * It rejects with an ApiError when there is no result, or with the abort
 * reason when the caller cancels through `signal`.
 */
export async function calculate(
  operation: Operation,
  operands: readonly number[],
  { signal, timeoutMs = DEFAULT_TIMEOUT_MS }: CalculateOptions = {},
): Promise<number> {
  const timeout = AbortSignal.timeout(timeoutMs);
  const [a, b] = operands;

  let response: Response;
  try {
    response = await fetch(`/api/v1/${operation}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ a, b }), // Leaves b out when it is undefined.
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }
    if (timeout.aborted) {
      throw new ApiError("TIMEOUT", "The calculator service did not respond in time");
    }
    throw new ApiError("NETWORK_ERROR", "Could not reach the calculator service");
  }

  const body: unknown = await response.json().catch(() => undefined);
  if (response.ok && isCalculationResponse(body)) {
    return body.result;
  }
  if (isErrorResponse(body)) {
    throw new ApiError(body.error.code, body.error.message, response.status);
  }
  throw new ApiError(
    "UNEXPECTED_RESPONSE",
    `Unexpected response from the calculator service (HTTP ${response.status})`,
    response.status,
  );
}

function isCalculationResponse(body: unknown): body is CalculationResponse {
  return isObject(body) && typeof body.result === "number";
}

function isErrorResponse(body: unknown): body is ErrorResponse {
  if (!isObject(body) || !isObject(body.error)) {
    return false;
  }
  const { code, message } = body.error;
  return typeof code === "string" && serverErrorCodes.has(code) && typeof message === "string";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
