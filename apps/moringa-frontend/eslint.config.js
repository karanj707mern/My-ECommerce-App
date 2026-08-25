const js = require("@eslint/js");
const tseslint = require("@typescript-eslint/eslint-plugin");
const tsparser = require("@typescript-eslint/parser");

/**
 * ESLint flat config for the Qwik City frontend.
 * Kept intentionally lean: correctness rules only, no stylistic enforcement
 * (formatting is owned by Prettier).
 */
module.exports = [
  { ignores: ["dist/**", "server/**", "tmp/**", "node_modules/**"] },
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "no-undef": "off",
    },
  },
  {
    // NodeNext module-contract enforcement.
    //
    // Rule 1: `import.meta` may appear ONLY in src/lib/env.ts. Under
    // `module/moduleResolution: NodeNext` with no `"type": "module"`, tsc
    // rejects import.meta in CommonJS-flavoured files (TS1470); Vite replaces
    // the token at build time, so access is centralized in that single
    // quarantined seam.
    //
    // Rule 2: `@moringa/sdk` may be imported ONLY through lib/api seams
    // (client.ts / sdk-server.ts). Route components consume those wrappers so
    // connection construction, cookie forwarding and error normalization stay
    // auditable in one place.
    files: ["src/**/*.ts", "src/**/*.tsx"],
    ignores: ["src/lib/env.ts", "src/lib/api/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MetaProperty[meta.name='import'][property.name='meta']",
          message:
            "import.meta is restricted to src/lib/env.ts (NodeNext CJS seam policy). Use lib/env.ts accessors instead.",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@moringa/sdk", "@moringa/sdk/*"],
              message:
                "Consume the generated SDK through src/lib/api/client.ts (browser plane) or src/lib/api/sdk-server.ts (server plane) only.",
            },
          ],
        },
      ],
    },
  },
];
