import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Calculator } from "./Calculator";

// These tests drive the whole frontend (keys, reducer, hook and HTTP client)
// against an in-memory backend that follows docs/api.md; only fetch is fake.

afterEach(() => {
  vi.unstubAllGlobals();
});

type Backend = (operation: string, operands: { a: number; b?: number }) => Response | Promise<Response>;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function apiError(code: string, status = 422): Response {
  return json({ error: { code, message: `${code} from the fake backend` } }, status);
}

const arithmetic: Backend = (operation, { a, b = Number.NaN }) => {
  switch (operation) {
    case "add":
      return json({ result: a + b });
    case "subtract":
      return json({ result: a - b });
    case "multiply":
      return json({ result: a * b });
    case "divide":
      return b === 0 ? apiError("DIVISION_BY_ZERO") : json({ result: a / b });
    case "power":
      return json({ result: a ** b });
    case "sqrt":
      return a < 0 ? apiError("INVALID_OPERAND") : json({ result: Math.sqrt(a) });
    case "percentage":
      return json({ result: a / 100 });
    default:
      return apiError("UNKNOWN_OPERATION", 404);
  }
};

function renderCalculator(backend: Backend = arithmetic) {
  const fetchMock = vi.fn(
    (input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        const operation = String(input).replace("/api/v1/", "");
        Promise.resolve(backend(operation, JSON.parse(String(init?.body)))).then(resolve, reject);
      }),
  );
  vi.stubGlobal("fetch", fetchMock);

  const user = userEvent.setup();
  render(<Calculator />);

  /** Clicks keypad keys by their accessible name. */
  async function press(...names: string[]) {
    for (const name of names) {
      await user.click(screen.getByRole("button", { name }));
    }
  }
  return { user, press, fetchMock };
}

/** Waits until the main line of the display shows exactly `text`. */
async function expectDisplay(text: string) {
  await waitFor(() => expect(screen.getByRole("status").textContent).toBe(text));
}

describe("Calculator", () => {
  it("starts at 0", async () => {
    renderCalculator();
    await expectDisplay("0");
  });

  it("adds with the keypad, through the API, and shows the full expression", async () => {
    const { press, fetchMock } = renderCalculator();

    await press("2", "Add", "3", "Equals");

    await expectDisplay("5");
    expect(screen.getByText("2 + 3 =")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/add",
      expect.objectContaining({ method: "POST", body: '{"a":2,"b":3}' }),
    );
  });

  it("evaluates a chain from left to right", async () => {
    const { press } = renderCalculator();

    await press("2", "Add", "3", "Multiply", "4", "Equals");

    await expectDisplay("20");
    expect(screen.getByText("5 × 4 =")).toBeInTheDocument();
  });

  it("shows 0.1 + 0.2 as 0.3", async () => {
    const { press } = renderCalculator();

    await press("Decimal point", "1", "Add", "Decimal point", "2", "Equals");

    await expectDisplay("0.3");
  });

  it("applies a percentage inside an operation: 150 × 20 % = 30", async () => {
    const { press } = renderCalculator();

    await press("1", "5", "0", "Multiply", "2", "0", "Percent", "Equals");

    await expectDisplay("30");
  });

  it("continues from a result with another operation", async () => {
    const { press } = renderCalculator();

    await press("2", "Power", "1", "0", "Equals");
    await expectDisplay("1024");
    await press("Square root");

    await expectDisplay("32");
    expect(screen.getByText("√(1024) =")).toBeInTheDocument();
  });

  it("explains API errors in the user's words and recovers on the next number", async () => {
    const { press } = renderCalculator();

    await press("1", "Divide", "0", "Equals");
    expect(await screen.findByRole("alert")).toHaveTextContent("Cannot divide by zero");

    await press("7");
    await expectDisplay("7");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("rejects the square root of a negative number", async () => {
    const { press } = renderCalculator();

    await press("4", "Change sign", "Square root");

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid input");
  });

  it("tells the user when the backend is down", async () => {
    // The Next.js proxy answers with a plain-text 500 when it cannot reach the backend.
    const { press } = renderCalculator(() => new Response("Internal Server Error", { status: 500 }));

    await press("2", "Add", "3", "Equals");

    expect(await screen.findByRole("alert")).toHaveTextContent("Calculator service unavailable");
  });

  it("shows that a slow calculation is in progress, and AC cancels it", async () => {
    const { press } = renderCalculator(() => new Promise<Response>(() => {}));

    await press("2", "Add", "3", "Equals");

    expect(screen.getByText("Calculating…")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Display" })).toHaveAttribute("aria-busy", "true");

    await press("All clear");
    expect(screen.queryByText("Calculating…")).not.toBeInTheDocument();
    await expectDisplay("0");
  });

  it("stops accepting digits at twelve", async () => {
    const { user } = renderCalculator();

    await user.keyboard("1234567890123");

    await expectDisplay("123456789012");
  });

  it("works from the physical keyboard", async () => {
    const { user } = renderCalculator();

    await user.keyboard("12+30{Enter}");
    await expectDisplay("42");

    await user.keyboard("2^10=");
    await expectDisplay("1024");

    await user.keyboard("78{Backspace}");
    await expectDisplay("7");

    await user.keyboard("{Escape}");
    await expectDisplay("0");
  });

  it("treats Enter as = even while a key has focus", async () => {
    const { user, press, fetchMock } = renderCalculator();

    await press("5", "Add", "5");
    screen.getByRole("button", { name: "7" }).focus();
    await user.keyboard("{Enter}");

    await expectDisplay("10");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("does not leave focus on a clicked key, so typing afterwards draws no focus ring", async () => {
    const { press } = renderCalculator();

    await press("5");

    expect(screen.getByRole("button", { name: "5" })).not.toHaveFocus();
  });

  it("keeps focus on a key pressed from the keyboard, so Tab navigation is not lost", async () => {
    const { user } = renderCalculator();
    const key = screen.getByRole("button", { name: "5" });

    key.focus();
    await user.keyboard(" ");

    await expectDisplay("5");
    expect(key).toHaveFocus();
  });

  it("leaves browser shortcuts alone", async () => {
    const { user, fetchMock } = renderCalculator();

    await user.keyboard("{Control>}5{/Control}");

    await expectDisplay("0");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
