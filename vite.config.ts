import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  // Use root base for production unless explicitly overridden
  // - For GitHub Pages, set VITE_BASE=./ in that environment
  const base = env.VITE_BASE || "/";

  return {
    plugins: [react()],
    base,
    define: {
      // NOTE: this still bakes into the client bundle if used in browser code.
      // Prefer server-side proxy for real production security.
      "process.env.API_KEY": JSON.stringify(env.API_KEY || ""),
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
    server: {
      host: true,
      port: 5173,
    },
  };
});
