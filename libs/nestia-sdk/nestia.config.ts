import nestia from "nestia";
import { AppModule } from "@moringa/backend";

/**
 * Nestia SDK Configuration
 *
 * IMPORTANT ARCHITECTURAL RULE:
 * The frontend MUST ONLY consume API through this auto-generated SDK.
 * It MUST NEVER import from @moringa/backend internal modules.
 *
 * Run: nx run nestia-sdk:generate
 */
export const sdk = nestia.NestiaApplication.create<AppModule>({
  output: "src",
});

export default sdk;
