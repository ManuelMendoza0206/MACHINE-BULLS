import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.next', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      // Sprint 1: coverage is measured and uploaded but does NOT gate CI —
      // real suites arrive with Tarea 1+. The merge gate (>=80%) lands in Sprint 2 (P1#8).
      all: false,
      exclude: [
        'node_modules/',
        'tests/',
        '.next/',
        '**/*.config.{ts,js,mjs}',
        '**/*.d.ts',
        'src/app/**/{layout,page,loading,not-found,error}.tsx',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/tests': path.resolve(__dirname, './tests'),
    },
  },
});
