import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      'figma-sync-core': fileURLToPath(
        new URL('./packages/core/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    include: ['packages/*/src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      all: true,
      // Only enforce coverage on the TypeScript source for core + CLI + plugin.
      include: [
        'packages/core/src/**/*.ts',
        'packages/cli/src/**/*.ts',
        'packages/plugin/src/**/*.ts',
      ],
      exclude: ['**/*.test.ts'],
      thresholds: {
        lines: 90,
        functions: 75,
        statements: 90,
        branches: 90,
      },
    },
  },
});

