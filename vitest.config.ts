import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./packages/datepicker/tests/setup.ts"],
    include: ["packages/datepicker/tests/**/*.test.{ts,tsx}"],
    coverage: {
      reporter: ["text", "html"],
      include: ["packages/datepicker/src/**/*.{ts,tsx}"],
    },
  },
})
