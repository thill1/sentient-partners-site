import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, '.', '');
  
  return {
    plugins: [react()],
    // Use relative base path so the app works in subdirectories (like GitHub Pages)
    base: './', 
    define: {
  'process.env.API_KEY': JSON.stringify(env.API_KEY),
  },
    // Empty polyfill for other process.env accesses to prevent runtime crashes
      'process.env': {} 
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      minify: 'esbuild',
      // Ensure rollup handles chunks cleanly for GitHub Pages
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'lucide-react'],
            genai: ['@google/genai']
          }
        }
      }
    },
    server: {
      host: true, // Listen on all addresses
      port: 5173,
    }
  };
});
