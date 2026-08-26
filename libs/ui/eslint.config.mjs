// @ts-check
import tseslint from 'typescript-eslint';

/** Minimal lint surface for presentational UI components. */
export default tseslint.config(
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    extends: [tseslint.configs.recommended],
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  }
);
