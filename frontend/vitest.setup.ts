import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Testing Library only unmounts rendered trees on its own when test globals
// are enabled, and this project imports them explicitly instead.
afterEach(() => {
  cleanup();
});
