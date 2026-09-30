"use client";

import { useEffect } from "react";
import { displayValue } from "@/lib/calculator/reducer";
import { useCalculator } from "@/lib/calculator/useCalculator";
import { Display } from "./Display";
import { Keypad } from "./Keypad";
import { actionForKey } from "./keys";

export function Calculator() {
  const [state, dispatch] = useCalculator();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const action = actionForKey(event);
      if (!action) {
        return;
      }
      // Enter always means "=", even while a key has focus, and "/" must not
      // open the browser's quick find.
      event.preventDefault();
      dispatch(action);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dispatch]);

  return (
    <div className="w-full max-w-sm rounded-[2rem] bg-charcoal-blue p-5 shadow-2xl ring-1 shadow-black/40 ring-white/10">
      <Display
        value={displayValue(state)}
        expression={state.expression}
        error={state.error}
        busy={state.request !== null}
      />
      <div className="mt-5">
        <Keypad onPress={dispatch} />
      </div>
    </div>
  );
}
