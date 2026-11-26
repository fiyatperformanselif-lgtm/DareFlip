import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    watch: {
      ignored: [
        "**/artifacts/**",
        "**/android/**",
        "**/ios/**",
        "**/test-results/**",
      ],
    },
  },
  test: { include: ["src/**/*.test.{ts,tsx}"], environment: "node" },
});
