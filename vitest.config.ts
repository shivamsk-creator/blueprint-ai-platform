import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["tests/**/*.test.ts", "packages/**/*.test.ts", "apps/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
    },
  },
  resolve: {
    alias: {
      "@blueprint/domain": path.resolve(__dirname, "packages/domain/src/index.ts"),
      "@blueprint/validation": path.resolve(__dirname, "packages/validation/src/index.ts"),
      "@blueprint/database": path.resolve(__dirname, "packages/database/src/index.ts"),
      "@blueprint/ai-providers": path.resolve(__dirname, "packages/ai-providers/src/index.ts"),
      "@blueprint/ui": path.resolve(__dirname, "packages/ui/src/index.ts"),
      "@": path.resolve(__dirname, "apps/web"),
    },
  },
});
