// @ts-check
import tseslint from 'typescript-eslint';

/**
 * Minimal lint surface for framework-agnostic shared utilities.
 * Deliberately not type-checked: this package is consumed by both the NestJS
 * backend and the Qwik frontend, whose tsconfigs differ.
 */
export default tseslint.config(
  {
    files: ['src/**/*.ts'],
    extends: [tseslint.configs.recommended],
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  }
);
