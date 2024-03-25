module.exports = {
  extends: ['eslint-config-airbnb-base', 'plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    'import/extensions': 'off',
    'no-use-before-define': 'off',
    '@typescript-eslint/no-use-before-define': ['error', { ignoreTypeReferences: true }],
    'no-prototype-builtins': 'off',
    'import/prefer-default-export': 'off',
    'prettier/prettier': [
      'error',
      {
        endOfLine: 'auto',
      },
    ],
    'import/no-import-module-exports': 'off',
    'consistent-return': 'off',
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.ts'],
        moduleDirectory: ['node_modules', './src', 'example/*.ts', './run-debug'],
      },
    },
  },
  parserOptions: {
    project: './tsconfig.dev.json',
    tsconfigRootDir: __dirname,
  },
}
