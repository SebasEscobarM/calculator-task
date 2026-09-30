import { describe, expect, it } from "vitest";
import {
  calculatorReducer,
  displayValue,
  initialState,
  type CalculatorAction,
  type CalculatorState,
  type Digit,
} from "./reducer";

/** Presses keys by their label: digits and "." (several per label), + - * / ^ √ % = ± ⌫ AC. */
function press(state: CalculatorState, ...labels: string[]): CalculatorState {
  return labels.flatMap(toActions).reduce(calculatorReducer, state);
}

function toActions(label: string): CalculatorAction[] {
  switch (label) {
    case "+":
      return [{ type: "operator", operator: "add" }];
    case "-":
      return [{ type: "operator", operator: "subtract" }];
    case "*":
      return [{ type: "operator", operator: "multiply" }];
    case "/":
      return [{ type: "operator", operator: "divide" }];
    case "^":
      return [{ type: "operator", operator: "power" }];
    case "√":
      return [{ type: "unary", operation: "sqrt" }];
    case "%":
      return [{ type: "unary", operation: "percentage" }];
    case "=":
      return [{ type: "equals" }];
    case "±":
      return [{ type: "toggleSign" }];
    case "⌫":
      return [{ type: "backspace" }];
    case "AC":
      return [{ type: "clear" }];
    default:
      return [...label].map((char): CalculatorAction =>
        char === "." ? { type: "decimal" } : { type: "digit", digit: char as Digit },
      );
  }
}

/** Answers the calculation in flight, as useCalculator does when the API responds. */
function resolve(state: CalculatorState, result: number): CalculatorState {
  if (!state.request) {
    throw new Error("no calculation in flight");
  }
  return calculatorReducer(state, { type: "resolved", id: state.request.id, result });
}

function fail(state: CalculatorState, message: string): CalculatorState {
  if (!state.request) {
    throw new Error("no calculation in flight");
  }
  return calculatorReducer(state, { type: "failed", id: state.request.id, message });
}

describe("typing a number", () => {
  it("starts at 0", () => {
    expect(displayValue(initialState)).toBe("0");
  });

  it("appends digits without leading zeros", () => {
    expect(displayValue(press(initialState, "123"))).toBe("123");
    expect(displayValue(press(initialState, "007"))).toBe("7");
  });

  it("accepts a single decimal point, adding a 0 before it if needed", () => {
    expect(displayValue(press(initialState, "1..5"))).toBe("1.5");
    expect(displayValue(press(initialState, ".5"))).toBe("0.5");
  });

  it("stops at twelve digits, not counting the 0 of 0.", () => {
    expect(displayValue(press(initialState, "1234567890123"))).toBe("123456789012");
    expect(displayValue(press(initialState, "0.1234567890123"))).toBe("0.123456789012");
  });

  it("toggles the sign, including of zero", () => {
    expect(displayValue(press(initialState, "5", "±"))).toBe("-5");
    expect(displayValue(press(initialState, "5", "±", "±"))).toBe("5");
    expect(displayValue(press(initialState, "±", "3"))).toBe("-3");
  });

  it("deletes the last character, falling back to 0", () => {
    expect(displayValue(press(initialState, "12", "⌫"))).toBe("1");
    expect(displayValue(press(initialState, "5", "⌫"))).toBe("0");
    expect(displayValue(press(initialState, "5", "±", "⌫"))).toBe("0");
  });
});

describe("binary operations", () => {
  it("wait for the right operand after the operator", () => {
    const state = press(initialState, "12", "+");

    expect(displayValue(state)).toBe("12");
    expect(state.expression).toBe("12 +");
    expect(state.pending).toEqual({ left: 12, operator: "add" });
    expect(state.request).toBeNull();
  });

  it("swap the operator when no right operand was entered", () => {
    const state = press(initialState, "12", "+", "*");

    expect(state.expression).toBe("12 ×");
    expect(state.pending).toEqual({ left: 12, operator: "multiply" });
    expect(state.request).toBeNull();
  });

  it("request the calculation on = and show the result with its expression", () => {
    const requested = press(initialState, "12", "+", "5", "=");
    expect(requested.request).toMatchObject({ operation: "add", operands: [12, 5], next: null });

    const done = resolve(requested, 17);
    expect(displayValue(done)).toBe("17");
    expect(done.expression).toBe("12 + 5 =");
    expect(done.pending).toBeNull();
    expect(done.request).toBeNull();
  });

  it("keep the operand order of non-commutative operations", () => {
    expect(press(initialState, "10", "-", "4", "=").request).toMatchObject({
      operation: "subtract",
      operands: [10, 4],
    });
    expect(press(initialState, "2", "^", "10", "=").request).toMatchObject({
      operation: "power",
      operands: [2, 10],
    });
  });

  it("start the right operand with a decimal point or a minus sign", () => {
    const decimal = press(initialState, "12", "+", ".5");
    expect(displayValue(decimal)).toBe("0.5");
    expect(decimal.expression).toBe("12 +");

    expect(press(initialState, "12", "+", "±", "3", "=").request).toMatchObject({
      operation: "add",
      operands: [12, -3],
    });
  });

  it("reuse the left operand when = follows the operator", () => {
    expect(press(initialState, "12", "+", "=").request).toMatchObject({ operands: [12, 12] });
  });

  it("ignore = when there is no operator", () => {
    const state = press(initialState, "5");
    expect(press(state, "=")).toBe(state);
  });

  it("chain: the next operator first computes the pending operation", () => {
    let state = press(initialState, "2", "+", "3", "*");
    expect(state.request).toMatchObject({ operation: "add", operands: [2, 3], next: "multiply" });

    state = resolve(state, 5);
    expect(displayValue(state)).toBe("5");
    expect(state.expression).toBe("5 ×");
    expect(state.pending).toEqual({ left: 5, operator: "multiply" });

    state = press(state, "4", "=");
    expect(state.request).toMatchObject({ operation: "multiply", operands: [5, 4], next: null });
  });
});

describe("unary operations", () => {
  it("apply to the number on the display", () => {
    const requested = press(initialState, "16", "√");
    expect(requested.request).toMatchObject({ operation: "sqrt", operands: [16], next: null });

    const done = resolve(requested, 4);
    expect(displayValue(done)).toBe("4");
    expect(done.expression).toBe("√(16) =");
  });

  it("feed their result into a pending operation: 150 × 20 % = 30", () => {
    let state = press(initialState, "150", "*", "20", "%");
    expect(state.request).toMatchObject({ operation: "percentage", operands: [20] });

    state = resolve(state, 0.2);
    expect(displayValue(state)).toBe("0.2");
    expect(state.expression).toBe("150 ×");

    state = press(state, "=");
    expect(state.request).toMatchObject({ operation: "multiply", operands: [150, 0.2] });
  });

  it("describe percentages in the expression", () => {
    expect(resolve(press(initialState, "20", "%"), 0.2).expression).toBe("20% =");
  });
});

describe("after a result", () => {
  const result = resolve(press(initialState, "12", "+", "5", "="), 17);

  it("typing starts a new number and clears the expression", () => {
    const state = press(result, "4");
    expect(displayValue(state)).toBe("4");
    expect(state.expression).toBe("");
  });

  it("an operator continues from the result", () => {
    const state = press(result, "+");
    expect(state.expression).toBe("17 +");
    expect(state.pending).toEqual({ left: 17, operator: "add" });
  });

  it("± negates the result", () => {
    const state = press(result, "±");
    expect(displayValue(state)).toBe("-17");
    expect(state.expression).toBe("");
  });

  it("⌫ leaves the result alone", () => {
    expect(press(result, "⌫")).toBe(result);
  });

  it("the display rounds away floating-point noise", () => {
    const state = resolve(press(initialState, "0.1", "+", "0.2", "="), 0.30000000000000004);
    expect(displayValue(state)).toBe("0.3");
  });
});

describe("while a calculation is in flight", () => {
  const inFlight = press(initialState, "12", "+", "5", "=");

  it("ignores other keys", () => {
    expect(press(inFlight, "7", "+", "=", "±", "⌫")).toBe(inFlight);
  });

  it("AC cancels it, and its late result is ignored", () => {
    const cleared = press(inFlight, "AC");
    expect(cleared.request).toBeNull();
    expect(displayValue(cleared)).toBe("0");

    const late = calculatorReducer(cleared, { type: "resolved", id: inFlight.request!.id, result: 17 });
    expect(late).toBe(cleared);
  });

  it("ignores responses to other requests", () => {
    const otherId = inFlight.request!.id + 1;
    expect(calculatorReducer(inFlight, { type: "resolved", id: otherId, result: 1 })).toBe(inFlight);
    expect(calculatorReducer(inFlight, { type: "failed", id: otherId, message: "x" })).toBe(inFlight);
  });
});

describe("after an error", () => {
  const failed = fail(press(initialState, "1", "/", "0", "="), "Cannot divide by zero");

  it("shows the message and stops waiting", () => {
    expect(failed.error).toBe("Cannot divide by zero");
    expect(failed.request).toBeNull();
  });

  it("ignores keys that need a number", () => {
    expect(press(failed, "+", "√", "=", "±", "⌫")).toBe(failed);
  });

  it("starts over when a new number is typed", () => {
    const state = press(failed, "7");
    expect(state.error).toBeNull();
    expect(displayValue(state)).toBe("7");
    expect(state.pending).toBeNull();
    expect(state.expression).toBe("");
    expect(displayValue(press(failed, "."))).toBe("0.");
  });

  it("AC clears it", () => {
    const state = press(failed, "AC");
    expect(state.error).toBeNull();
    expect(displayValue(state)).toBe("0");
  });
});
