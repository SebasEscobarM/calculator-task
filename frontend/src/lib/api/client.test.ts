import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, calculate } from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(implementation: typeof fetch) {
  const fetchMock = vi.fn(implementation);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** A fetch that never answers, but rejects like the real one when its signal aborts. */
const hangingFetch: typeof fetch = (_input, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
  });

async function expectApiError(promise: Promise<unknown>, expected: Partial<ApiError>) {
  await expect(promise).rejects.toBeInstanceOf(ApiError);
  await expect(promise).rejects.toMatchObject(expected);
}

describe("calculate", () => {
  it("posts both operands of a binary operation and resolves with the result", async () => {
    const fetchMock = stubFetch(async () => jsonResponse({ result: 5 }));

    await expect(calculate("add", [2, 3])).resolves.toBe(5);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/add");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Content-Type")).toBe("application/json");
    expect(init?.body).toBe('{"a":2,"b":3}');
  });

  it("sends only a for unary operations", async () => {
    const fetchMock = stubFetch(async () => jsonResponse({ result: 3 }));

    await expect(calculate("sqrt", [9])).resolves.toBe(3);

    expect(fetchMock.mock.calls[0][1]?.body).toBe('{"a":9}');
  });

  it("rejects with the code, message and status of an API error", async () => {
    stubFetch(async () =>
      jsonResponse({ error: { code: "DIVISION_BY_ZERO", message: "cannot divide by zero" } }, 422),
    );

    await expectApiError(calculate("divide", [1, 0]), {
      code: "DIVISION_BY_ZERO",
      message: "cannot divide by zero",
      status: 422,
    });
  });

  it("reports a non-JSON response, like the proxy's error page while the backend is down", async () => {
    stubFetch(async () => new Response("Internal Server Error", { status: 500 }));

    await expectApiError(calculate("add", [2, 3]), { code: "UNEXPECTED_RESPONSE", status: 500 });
  });

  it("reports JSON that does not match the contract", async () => {
    stubFetch(async () => jsonResponse({ value: 5 }));

    await expectApiError(calculate("add", [2, 3]), { code: "UNEXPECTED_RESPONSE", status: 200 });
  });

  it("does not trust error codes outside the contract", async () => {
    stubFetch(async () => jsonResponse({ error: { code: "TEAPOT", message: "short and stout" } }, 418));

    await expectApiError(calculate("add", [2, 3]), { code: "UNEXPECTED_RESPONSE", status: 418 });
  });

  it("reports a network failure", async () => {
    stubFetch(async () => {
      throw new TypeError("Failed to fetch");
    });

    await expectApiError(calculate("add", [2, 3]), { code: "NETWORK_ERROR" });
  });

  it("gives up after the timeout", async () => {
    stubFetch(hangingFetch);

    await expectApiError(calculate("add", [2, 3], { timeoutMs: 10 }), { code: "TIMEOUT" });
  });

  it("rejects with the abort reason, not an ApiError, when the caller cancels", async () => {
    stubFetch(hangingFetch);
    const controller = new AbortController();

    const promise = calculate("add", [2, 3], { signal: controller.signal });
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
    await expect(promise).rejects.not.toBeInstanceOf(ApiError);
  });
});
