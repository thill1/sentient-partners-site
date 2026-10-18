import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { loadIssues } from "./insights/lib.mjs";

export default defineConfig(() => {
  // The footer's Insights link only appears when this build has issues.
  const insightsLive = loadIssues().length > 0;
  return {
    plugins: [react()],
    define: { __INSIGHTS_LIVE__: JSON.stringify(insightsLive) },
    base: "/",
    server: {
      proxy: {
        "^/api/(booking|settings)$": {
          target: "https://sentientpartners.ai",
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: "dist",
      assetsDir: "assets",
      sourcemap: false,
      minify: "esbuild",
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom", "lucide-react"],
            genai: ["@google/genai"],
          },
        },
      },
    },
  };
});
