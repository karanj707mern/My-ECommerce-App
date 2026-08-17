import { Project } from "@moringa/backend";
import { NestiaApplication } from "nestia";

/**
 * Nestia SDK Configuration
 * 
 * IMPORTANT ARCHITECTURAL RULE:
 * The frontend MUST ONLY consume API through this auto-generated SDK.
 * It MUST NEVER import directly from @moringa/backend internal modules.
 * 
 * Run: nx run nestia-sdk:generate
 */
export const sdk = NestiaApplication.create<
  import("@moringa/backend").AppModule
>({
  output: "src",
});

export default sdk;
