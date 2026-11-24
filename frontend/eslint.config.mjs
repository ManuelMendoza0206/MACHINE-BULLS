import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import nextPlugin from '@next/eslint-plugin-next';
import prettier from 'eslint-config-prettier/flat';

/**
 * ESLint 10 flat config using native ESLint 10 compatible plugins directly
 * (@eslint/js, typescript-eslint, eslint-plugin-react-hooks, @next/eslint-plugin-next).
 */
export default defineConfig([
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
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat['recommended-latest'],
  nextPlugin.configs['core-web-vitals'],
  prettier,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
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
