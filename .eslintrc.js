module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import', "simple-import-sort"],
  extends: ['plugin:@typescript-eslint/recommended', '@ehacke/eslint-config', 'plugin:import/typescript'],
  settings: {
    'import/resolver': {
      'typescript': {},
      'node': {
        'extensions': ['.js', '.jsx', '.ts', '.tsx', '.d.ts']
      }
    }
  },
  rules: {
    '@typescript-eslint/camelcase': 'warn',
    '@typescript-eslint/no-explicit-any': 'off',
    "simple-import-sort/sort": "error",
    'sort-imports': 'off',
    'import/default': 'off',
    'import/order': 'off',

    // TODO: fix eventually
    'unicorn/prevent-abbreviations': 'off',
    'max-classes-per-file': 'off',
  }
};
