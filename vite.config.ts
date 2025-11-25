import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file + environment variables for this mode
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    // Use relative base path so the app works in subdirectories (like GitHub Pages)
    base: './',
    define: {
      // Inject Gemini API key at build time
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'lucide-react'],
            genai: ['@google/genai'],
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
