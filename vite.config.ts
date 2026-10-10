import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(() => {
  return {
    plugins: [react()],
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
