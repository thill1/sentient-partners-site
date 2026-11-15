import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: { __INSIGHTS_LIVE__: false },
  test: {
    environment: 'node',
    exclude: ['node_modules', 'dist', 'dist-preview', '.worktrees', '.git'],
  },
});
