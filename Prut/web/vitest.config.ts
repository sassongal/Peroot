import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    include: ["**/*.test.ts", "**/*.test.tsx", "**/*.test.js"],
    exclude: ["**/node_modules/**", "**/.worktrees/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary"],
      include: ["src/lib/**", "src/hooks/**"],
      exclude: ["**/*.test.*", "**/__tests__/**"],
    },
  },
});
