import { defineConfig } from 'eslint/config';
import prettierPlugin from 'eslint-plugin-prettier';
import globals from 'globals';

export default defineConfig([
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
    },
  },
]);
