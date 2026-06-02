import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: false,
    // Exclude git worktrees created by parallel agents — they live inside the
    // repo and would otherwise be double-counted by the test runner.
    exclude: [...configDefaults.exclude, '**/.claude/worktrees/**'],
  },
})
