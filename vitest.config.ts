import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Unit tests for business logic (permissions, validation, i18n integrity).
// Pure functions only — no DB / Next runtime needed.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "lib/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
