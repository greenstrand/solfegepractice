import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// base is production/preview-only so npm run dev stays at /.
export default defineConfig(({ command, isPreview }) => ({
  base: command === "build" || isPreview === true ? "/solfegepractice/" : "/",
  plugins: [react()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    passWithNoTests: true,
  },
}));
