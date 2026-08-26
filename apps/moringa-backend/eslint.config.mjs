// @ts-check
import { defineConfig } from 'eslint/config';
import prettierPlugin from 'eslint-plugin-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// typescript-eslint meta-package configs already register the @typescript-eslint
// parser + plugin internally. We only layer parserOptions on top for typed
// linting. Manually re-registering the parser/plugin here would create a
// duplicate plugin instance under the same namespace -> "rule not found".
export default defineConfig({
  files: ['src/**/*.ts'],
  extends: [
    tseslint.configs.recommended,
    tseslint.configs.recommendedTypeChecked,
  ],
  languageOptions: {
    globals: {
      ...globals.node,
      ...globals.es2021,
    },
    parserOptions: {
      project: ['./tsconfig.eslint.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
  plugins: {
    prettier: prettierPlugin,
  },
  rules: {
    'prettier/prettier': 'error',
    // Standard convention: leading-underscore marks intentionally-unused
    // parameters/variables (e.g. decorator callbacks, mock signatures).
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
    ],
  },
});
