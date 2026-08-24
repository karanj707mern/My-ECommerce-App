import { IConfiguration } from "nestia/lib/module";

/**
 * Nestia SDK Configuration
 *
 * IMPORTANT ARCHITECTURAL RULE:
 * The frontend MUST ONLY consume API through this auto-generated SDK.
 * It MUST NEVER import from @moringa/backend internal modules.
 *
 * Run: nx run nestia-sdk:generate
 */
const config: IConfiguration = {
  input: ["apps/moringa-backend/src/**/*.controller.ts"],
  output: "src",
  swagger: {
    output: "src/swagger.json",
  },
};

export default config;
