import type { CalculatorAction, Digit } from "@/lib/calculator/reducer";

export type KeyVariant = "number" | "operation" | "control";

export interface KeyDefinition {
  /** Text on the key. */
  label: string;
  /** Accessible name, for keys whose label is a symbol. */
  name?: string;
  action: CalculatorAction;
  variant: KeyVariant;
  /** `KeyboardEvent.key` values that press this key. */
  shortcuts: string[];
  /** Keys bigger than one cell of the grid. */
  span?: "wide" | "tall";
}

function digit(value: Digit): KeyDefinition {
  return { label: value, action: { type: "digit", digit: value }, variant: "number", shortcuts: [value] };
}

/** The keypad, in grid order: four keys per row. */
export const KEYS: KeyDefinition[] = [
  { label: "AC", name: "All clear", action: { type: "clear" }, variant: "control", shortcuts: ["Escape"] },
  { label: "⌫", name: "Backspace", action: { type: "backspace" }, variant: "control", shortcuts: ["Backspace"] },
  { label: "±", name: "Change sign", action: { type: "toggleSign" }, variant: "control", shortcuts: [] },
  {
    label: "÷",
    name: "Divide",
    action: { type: "operator", operator: "divide" },
    variant: "operation",
    shortcuts: ["/"],
  },

  {
    label: "√",
    name: "Square root",
    action: { type: "unary", operation: "sqrt" },
    variant: "operation",
    shortcuts: [],
  },
  {
    label: "xʸ",
    name: "Power",
    action: { type: "operator", operator: "power" },
    variant: "operation",
    shortcuts: ["^"],
  },
  {
    label: "%",
    name: "Percent",
    action: { type: "unary", operation: "percentage" },
    variant: "operation",
    shortcuts: ["%"],
  },
  {
    label: "×",
    name: "Multiply",
    action: { type: "operator", operator: "multiply" },
    variant: "operation",
    shortcuts: ["*", "x"],
  },

  digit("7"),
  digit("8"),
  digit("9"),
  {
    label: "−",
    name: "Subtract",
    action: { type: "operator", operator: "subtract" },
    variant: "operation",
    shortcuts: ["-"],
  },

  digit("4"),
  digit("5"),
  digit("6"),
  { label: "+", name: "Add", action: { type: "operator", operator: "add" }, variant: "operation", shortcuts: ["+"] },

  digit("1"),
  digit("2"),
  digit("3"),
  {
    label: "=",
    name: "Equals",
    action: { type: "equals" },
    variant: "operation",
    shortcuts: ["Enter", "="],
    span: "tall",
  },

  { ...digit("0"), span: "wide" },
  { label: ".", name: "Decimal point", action: { type: "decimal" }, variant: "number", shortcuts: [".", ","] },
];

const actionsByShortcut = new Map(
  KEYS.flatMap((key) => key.shortcuts.map((shortcut) => [shortcut, key.action] as const)),
);

/** The action for a physical key press, or undefined when the calculator does not use it. */
export function actionForKey(
  event: Pick<KeyboardEvent, "key" | "ctrlKey" | "altKey" | "metaKey">,
): CalculatorAction | undefined {
  // Ctrl and Cmd shortcuts belong to the browser. AltGr, which Windows reports
  // as Ctrl+Alt, types characters such as ^ on some layouts, so it is allowed.
  const browserShortcut = (event.ctrlKey && !event.altKey) || event.metaKey;
  return browserShortcut ? undefined : actionsByShortcut.get(event.key);
}
