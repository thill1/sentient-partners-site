import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(() => {
  return {
    plugins: [react()],
    base: "/",
    server: {
      proxy: {
        // Run `npm run dev:api` alongside Vite for real Pages Functions.
        "/api": "http://127.0.0.1:8788",
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
