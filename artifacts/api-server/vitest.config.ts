import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // ESM-safe pool — avoids hoisting issues with vi.mock in native ESM
    pool: "forks",
    globals: false,
  },
});
