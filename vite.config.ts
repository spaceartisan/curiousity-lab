import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
export default defineConfig({
  base: "/curiousity-lab/",
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        home: resolve("index.html"),
        play: resolve("play/index.html"),
        companion: resolve("companion/index.html"),
        insights: resolve("insights/index.html"),
      },
    },
  },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["tests/setup.ts"],
  },
});
