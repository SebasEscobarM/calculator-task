import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError, type calculate } from "@/lib/api/client";
import { displayValue, type CalculatorAction } from "./reducer";
import { useCalculator } from "./useCalculator";

const twoPlusThree: CalculatorAction[] = [
  { type: "digit", digit: "2" },
  { type: "operator", operator: "add" },
  { type: "digit", digit: "3" },
  { type: "equals" },
];

/** A fake API call that never answers, but rejects like fetch when aborted. */
function neverAnswering() {
  return vi.fn<typeof calculate>(
    (_operation, _operands, options) =>
      new Promise((_resolve, reject) => {
        options?.signal?.addEventListener("abort", () => reject(options.signal?.reason));
      }),
  );
}

function renderCalculator(initial: typeof calculate) {
  const { result, rerender } = renderHook(({ calculate }) => useCalculator(calculate), {
    initialProps: { calculate: initial },
  });
  return {
    state: () => result.current[0],
    press: (actions: CalculatorAction[]) =>
      act(() => {
        actions.forEach((action) => result.current[1](action));
      }),
    swapApi: (calculate: typeof initial) => rerender({ calculate }),
  };
}

describe("useCalculator", () => {
  it("sends the requested calculation to the API and shows the result", async () => {
    const fake = vi.fn<typeof calculate>().mockResolvedValue(5);
    const calculator = renderCalculator(fake);

    calculator.press(twoPlusThree);

    await waitFor(() => expect(displayValue(calculator.state())).toBe("5"));
    expect(fake).toHaveBeenCalledOnce();
    expect(fake).toHaveBeenCalledWith("add", [2, 3], { signal: expect.any(AbortSignal) });
  });

  it("turns a failed calculation into a message for the user", async () => {
    const fake = vi
      .fn<typeof calculate>()
      .mockRejectedValue(new ApiError("DIVISION_BY_ZERO", "cannot divide by zero", 422));
    const calculator = renderCalculator(fake);

    calculator.press(twoPlusThree);

    await waitFor(() => expect(calculator.state().error).toBe("Cannot divide by zero"));
  });

  it("aborts the request when the calculator is cleared, without reporting an error", async () => {
    const fake = neverAnswering();
    const calculator = renderCalculator(fake);

    calculator.press(twoPlusThree);
    const signal = fake.mock.calls[0][2]?.signal;
    calculator.press([{ type: "clear" }]);

    expect(signal?.aborted).toBe(true);
    await Promise.resolve(); // Let the rejection settle before checking the state.
    expect(calculator.state().error).toBeNull();
    expect(displayValue(calculator.state())).toBe("0");
  });

  it("does not count an attempt aborted by a re-run of the effect as a failure", async () => {
    // The effect can run again for the same request, e.g. when React shows a
    // hidden <Activity> again. The first attempt is then superseded, not failed.
    const first = neverAnswering();
    const calculator = renderCalculator(first);
    calculator.press(twoPlusThree);

    const second = vi.fn<typeof calculate>().mockResolvedValue(5);
    calculator.swapApi(second);

    await waitFor(() => expect(displayValue(calculator.state())).toBe("5"));
    expect(first.mock.calls[0][2]?.signal?.aborted).toBe(true);
    expect(calculator.state().error).toBeNull();
  });
});
