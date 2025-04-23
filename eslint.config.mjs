import sortKeysFix from 'eslint-plugin-sort-keys-fix';
import tseslint from 'typescript-eslint';
import stdConfig from '@ehacke/eslint-config';

export default tseslint.config([
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
  tseslint.configs.recommended,
  {
    plugins: {
      '@ehacke/eslint-config': stdConfig,
    },
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'error',
    },
  },
]);
