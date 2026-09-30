import { useEffect, useReducer } from "react";
import { calculate as calculateWithApi } from "@/lib/api/client";
import { errorMessage } from "./messages";
import { calculatorReducer, initialState } from "./reducer";

/**
 * Calculator state, plus the side effect the reducer leaves out: sending each
 * requested calculation to the API and dispatching how it went. A request is
 * aborted when it stops being current, e.g. after AC or on unmount.
 *
 * `calculate` is injectable for tests and must be a stable function.
 */
export function useCalculator(calculate = calculateWithApi) {
  const [state, dispatch] = useReducer(calculatorReducer, initialState);
  const { request } = state;

  useEffect(() => {
    if (!request) {
      return;
    }
    const controller = new AbortController();
    calculate(request.operation, request.operands, { signal: controller.signal }).then(
      (result) => dispatch({ type: "resolved", id: request.id, result }),
      (error: unknown) => {
        // An aborted attempt was superseded, not failed: the effect may even
        // run again for this same request, e.g. when a hidden <Activity> shows.
        if (!controller.signal.aborted) {
          dispatch({ type: "failed", id: request.id, message: errorMessage(error) });
        }
      },
    );
    return () => controller.abort();
  }, [calculate, request]);

  return [state, dispatch] as const;
}
