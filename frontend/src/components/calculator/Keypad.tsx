import type { CalculatorAction } from "@/lib/calculator/reducer";
import { KEYS, type KeyDefinition } from "./keys";

const VARIANT_CLASSES: Record<KeyDefinition["variant"], string> = {
  number: "bg-grey-olive text-platinum",
  operation: "bg-lime-cream text-charcoal-blue",
  control: "bg-silver text-charcoal-blue",
};

const SPAN_CLASSES: Record<NonNullable<KeyDefinition["span"]>, string> = {
  wide: "col-span-2",
  tall: "row-span-2",
};

interface KeypadProps {
  onPress: (action: CalculatorAction) => void;
}

export function Keypad({ onPress }: KeypadProps) {
  return (
    // Rows shrink on short screens so the whole calculator fits, but never
    // below 2.75rem (44px), the minimum comfortable touch target.
    <div role="group" aria-label="Keypad" className="grid auto-rows-[clamp(2.75rem,8dvh,4rem)] grid-cols-4 gap-3">
      {KEYS.map((key) => (
        <button
          key={key.label}
          type="button"
          aria-label={key.name}
          onClick={(event) => {
            onPress(key.action);
            // A mouse or touch click (detail > 0) should not leave focus on the
            // key, or typing afterwards would draw a focus ring around it. Keys
            // pressed from the keyboard (detail 0) keep focus for Tab navigation.
            if (event.detail > 0) {
              event.currentTarget.blur();
            }
          }}
          className={[
            "touch-manipulation rounded-2xl text-2xl font-semibold shadow-sm transition select-none",
            "hover:brightness-110 active:scale-95 active:brightness-95",
            "focus-visible:ring-4 focus-visible:ring-platinum focus-visible:outline-none",
            VARIANT_CLASSES[key.variant],
            key.span ? SPAN_CLASSES[key.span] : "",
          ].join(" ")}
        >
          {key.label}
        </button>
      ))}
    </div>
  );
}
