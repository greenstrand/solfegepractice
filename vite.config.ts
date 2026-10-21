import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// base applies on build and preview; dev uses /.
export default defineConfig(({ command, isPreview }) => ({
  base: command === "build" || isPreview === true ? "/solfegepractice/" : "/",
  plugins: [react()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    passWithNoTests: true,
  },
}));
