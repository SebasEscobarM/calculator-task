import {
  isUnaryOperation,
  type BinaryOperation,
  type Operation,
  type UnaryOperation,
} from "@/lib/api/types";
import { MAX_DIGITS, OPERATION_SYMBOLS, countDigits, formatNumber } from "./format";

// The calculator works like a pocket calculator with immediate execution:
// "2 + 3 × 4 =" computes 2 + 3 first, then 5 × 4. The reducer never calls the
// API itself. When a key needs a result it stores a `request`, useCalculator
// sends it, and the outcome comes back as a "resolved" or "failed" action.
// Every transition, including what a result does, stays pure and testable.

export type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

/** The number on the main display. */
export type Operand =
  /** Being typed. Kept as text so that "0." and "-0" survive. */
  | { kind: "input"; text: string }
  /** Computed by the API. Typing replaces it instead of editing it. */
  | { kind: "result"; value: number };

/** A calculation for the API, plus what to do with its result. */
export interface CalculationRequest {
  /** Tells the response to this request apart from those to earlier ones. */
  id: number;
  operation: Operation;
  operands: number[];
  /** Operator that takes the result as its left operand, as in "2 + 3 ×". */
  next: BinaryOperation | null;
}

export interface CalculatorState {
  operand: Operand;
  /** Left operand and operator waiting for a right operand, as after "12 +". */
  pending: { left: number; operator: BinaryOperation } | null;
  /** True right after an operator is pressed, until a right operand is entered. */
  awaitingOperand: boolean;
  /** Secondary display line, such as "12 +" or "12 + 5 =". */
  expression: string;
  /** Calculation waiting for the API. Keys are ignored until it settles. */
  request: CalculationRequest | null;
  /** Shown instead of a result after a calculation fails. */
  error: string | null;
  lastRequestId: number;
}

export type CalculatorAction =
  | { type: "digit"; digit: Digit }
  | { type: "decimal" }
  | { type: "toggleSign" }
  | { type: "backspace" }
  | { type: "operator"; operator: BinaryOperation }
  | { type: "unary"; operation: UnaryOperation }
  | { type: "equals" }
  | { type: "clear" }
  | { type: "resolved"; id: number; result: number }
  | { type: "failed"; id: number; message: string };

type InputAction = Exclude<CalculatorAction, { type: "clear" | "resolved" | "failed" }>;

export const initialState: CalculatorState = {
  operand: { kind: "input", text: "0" },
  pending: null,
  awaitingOperand: false,
  expression: "",
  request: null,
  error: null,
  lastRequestId: 0,
};

export function calculatorReducer(state: CalculatorState, action: CalculatorAction): CalculatorState {
  switch (action.type) {
    case "clear":
      return reset(state);
    case "resolved":
      return state.request?.id === action.id ? applyResult(state, state.request, action.result) : state;
    case "failed":
      return state.request?.id === action.id ? { ...state, request: null, error: action.message } : state;
    default:
      return handleInput(state, action);
  }
}

/** Text for the main display. */
export function displayValue(state: CalculatorState): string {
  return state.operand.kind === "input" ? state.operand.text : formatNumber(state.operand.value);
}

function handleInput(state: CalculatorState, action: InputAction): CalculatorState {
  if (state.request) {
    return state; // Keys pressed while the API works are dropped, not queued.
  }
  if (state.error) {
    // After an error only a new number makes sense, so typing one starts over.
    const startsNumber = action.type === "digit" || action.type === "decimal";
    return startsNumber ? handleInput(reset(state), action) : state;
  }

  switch (action.type) {
    case "digit":
      return typeDigit(state, action.digit);
    case "decimal":
      return typeDecimal(state);
    case "toggleSign":
      return toggleSign(state);
    case "backspace":
      return backspace(state);
    case "operator":
      return chooseOperator(state, action.operator);
    case "unary":
      return startCalculation(state, action.operation, [currentValue(state)], null);
    case "equals":
      return state.pending
        ? startCalculation(state, state.pending.operator, [state.pending.left, currentValue(state)], null)
        : state;
  }
}

function reset(state: CalculatorState): CalculatorState {
  // Request ids keep counting, so a response to a cleared request stays stale.
  return { ...initialState, lastRequestId: state.lastRequestId };
}

function currentValue(state: CalculatorState): number {
  return state.operand.kind === "input" ? Number(state.operand.text) : state.operand.value;
}

/** Returns the expression to keep after the user edits the operand. */
function expressionAfterEdit(state: CalculatorState): string {
  // Editing a finished calculation's result starts a new one, so its
  // expression no longer applies; a pending operation's still does.
  return state.pending ? state.expression : "";
}

function withInput(state: CalculatorState, text: string): CalculatorState {
  return {
    ...state,
    operand: { kind: "input", text },
    awaitingOperand: false,
    expression: expressionAfterEdit(state),
  };
}

function typeDigit(state: CalculatorState, digit: Digit): CalculatorState {
  if (state.operand.kind === "result") {
    return withInput(state, digit);
  }
  const { text } = state.operand;
  if (countDigits(text) >= MAX_DIGITS) {
    return state;
  }
  // Replace a lone zero instead of adding a leading one: "0" → "7", "-0" → "-7".
  return withInput(state, text === "0" || text === "-0" ? text.slice(0, -1) + digit : text + digit);
}

function typeDecimal(state: CalculatorState): CalculatorState {
  if (state.operand.kind === "result") {
    return withInput(state, "0.");
  }
  const { text } = state.operand;
  return text.includes(".") ? state : withInput(state, `${text}.`);
}

function toggleSign(state: CalculatorState): CalculatorState {
  if (state.awaitingOperand) {
    return withInput(state, "-0"); // Starts a negative right operand.
  }
  if (state.operand.kind === "result") {
    return {
      ...state,
      operand: { kind: "result", value: -state.operand.value },
      expression: expressionAfterEdit(state),
    };
  }
  const { text } = state.operand;
  return withInput(state, text.startsWith("-") ? text.slice(1) : `-${text}`);
}

function backspace(state: CalculatorState): CalculatorState {
  if (state.operand.kind === "result") {
    return state; // Results are not editable.
  }
  const text = state.operand.text.slice(0, -1);
  return withInput(state, text === "" || text === "-" ? "0" : text);
}

function chooseOperator(state: CalculatorState, operator: BinaryOperation): CalculatorState {
  const value = currentValue(state);
  if (state.pending && !state.awaitingOperand) {
    // "2 + 3 ×": 2 + 3 goes to the API first; its result becomes ×'s left operand.
    return startCalculation(state, state.pending.operator, [state.pending.left, value], operator);
  }
  // Starts an operation, or swaps the operator if no right operand was entered ("2 + ×").
  return {
    ...state,
    operand: { kind: "result", value },
    pending: { left: value, operator },
    awaitingOperand: true,
    expression: `${formatNumber(value)} ${OPERATION_SYMBOLS[operator]}`,
  };
}

function startCalculation(
  state: CalculatorState,
  operation: Operation,
  operands: number[],
  next: BinaryOperation | null,
): CalculatorState {
  const id = state.lastRequestId + 1;
  return { ...state, request: { id, operation, operands, next }, lastRequestId: id };
}

function applyResult(state: CalculatorState, request: CalculationRequest, result: number): CalculatorState {
  const { operation, operands, next } = request;
  const settled: CalculatorState = { ...state, operand: { kind: "result", value: result }, request: null };

  if (isUnaryOperation(operation)) {
    // The result replaces the operand it came from, so a pending operation
    // takes it as its right operand: "150 × 20 % =" is 150 × 0.2.
    return {
      ...settled,
      awaitingOperand: false,
      expression: state.pending ? state.expression : `${unaryExpression(operation, operands[0])} =`,
    };
  }
  if (next) {
    return {
      ...settled,
      pending: { left: result, operator: next },
      awaitingOperand: true,
      expression: `${formatNumber(result)} ${OPERATION_SYMBOLS[next]}`,
    };
  }
  const [left, right] = operands;
  return {
    ...settled,
    pending: null,
    awaitingOperand: false,
    expression: `${formatNumber(left)} ${OPERATION_SYMBOLS[operation]} ${formatNumber(right)} =`,
  };
}

function unaryExpression(operation: UnaryOperation, operand: number): string {
  const value = formatNumber(operand);
  return operation === "sqrt" ? `√(${value})` : `${value}%`;
}
