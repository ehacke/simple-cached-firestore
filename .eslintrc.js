module.exports = {
  extends: ['@gapizza/eslint-config-ts'],
  'parserOptions': {
    'project': ['tsconfig.json']
  },
  rules: {
    'no-restricted-syntax': 'off',
  },
  overrides: [
    {
      'files': ['tests/*.ts', 'tests/**/*.ts'],
      rules: {
        '@typescript-eslint/ban-ts-ignore': 'off',
        '@typescript-eslint/camelcase': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        'class-methods-use-this': 'off',
        'dot-notation': 'off',
        'eslint-comments/disable-enable-pair': 'off',
        'func-names': 'off',
        'no-console': 'warn',
        'no-magic-numbers': 'off',
        'require-jsdoc': 'off',
        'sonarjs/no-identical-functions': 'off',
        'unicorn/filename-case': 'off',
        'unicorn/no-array-push-push': 'off',
        'valid-jsdoc': 'off',
      },
    }
  ]
};
