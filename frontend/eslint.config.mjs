import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

/**
 * ESLint 9 flat config. Rules mirror the previous `.eslintrc.json` (Next 16 removed
 * `next lint`, so the ESLint CLI drives linting now — see `package.json` scripts).
 */
export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  prettier,
  globalIgnores([
    '.next/',
    'node_modules/',
    'out/',
    'build/',
    'coverage/',
    'playwright-report/',
    'test-results/',
    'next-env.d.ts',
  ]),
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
]);
