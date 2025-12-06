import sortKeysFix from 'eslint-plugin-sort-keys-fix';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import stdConfig from '@ehacke/eslint-config';

export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: true,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/explicit-module-boundary-types': 'error',
    },
  },
  {
    plugins: {
      'sort-keys-fix': sortKeysFix,
    },

    rules: {
      'no-underscore-dangle': 'off',
      'sort-keys-fix/sort-keys-fix': 'error',
    },
  },
  {
    ignores: ['eslint.config.mjs', 'dist/**/*', 'scratch.*'],
  },
  {
    plugins: {
      '@ehacke/eslint-config': stdConfig,
    },
  },
];
