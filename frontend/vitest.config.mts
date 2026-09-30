import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      // The root layout only wires up <html> and the global styles.
      exclude: ["src/**/*.test.{ts,tsx}", "src/app/layout.tsx"],
      reporter: ["text", "html", "lcov"],
    },
  },
});
