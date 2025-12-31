import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  // Root base for Cloudflare Pages by default.
  // If you still deploy to GitHub Pages, you can set VITE_BASE=./ in that workflow.
  const base = env.VITE_BASE || "/";

  return {
    plugins: [react()],
    base,
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
    server: {
      host: true,
      port: 5173,
    },
  };
});
