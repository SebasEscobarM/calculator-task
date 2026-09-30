import { describe, expect, it } from "vitest";
import type { CalculatorAction } from "@/lib/calculator/reducer";
import { KEYS, actionForKey } from "./keys";

function keyDown(key: string, modifiers: { ctrlKey?: boolean; altKey?: boolean; metaKey?: boolean } = {}) {
  return actionForKey({ key, ctrlKey: false, altKey: false, metaKey: false, ...modifiers });
}

describe("actionForKey", () => {
  it.each<[string, CalculatorAction]>([
    ["7", { type: "digit", digit: "7" }],
    [",", { type: "decimal" }],
    ["x", { type: "operator", operator: "multiply" }],
    ["Enter", { type: "equals" }],
    ["=", { type: "equals" }],
    ["Escape", { type: "clear" }],
  ])("maps %j", (key, action) => {
    expect(keyDown(key)).toEqual(action);
  });

  it("ignores keys the calculator does not use", () => {
    expect(keyDown("a")).toBeUndefined();
  });

  it("leaves Ctrl and Cmd shortcuts to the browser", () => {
    expect(keyDown("+", { ctrlKey: true })).toBeUndefined();
    expect(keyDown("c", { metaKey: true })).toBeUndefined();
  });

  it("accepts characters typed with AltGr, which Windows reports as Ctrl+Alt", () => {
    expect(keyDown("^", { ctrlKey: true, altKey: true })).toEqual({ type: "operator", operator: "power" });
  });
});

describe("KEYS", () => {
  it("has one key per label, including every digit", () => {
    const labels = KEYS.map((key) => key.label);
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels).toEqual(expect.arrayContaining([..."0123456789"]));
  });

  it("gives each shortcut to a single key", () => {
    const shortcuts = KEYS.flatMap((key) => key.shortcuts);
    expect(new Set(shortcuts).size).toBe(shortcuts.length);
  });

  it("fills whole rows of the four-column grid", () => {
    const cells = KEYS.reduce((total, key) => total + (key.span ? 2 : 1), 0);
    expect(cells % 4).toBe(0);
  });
});
