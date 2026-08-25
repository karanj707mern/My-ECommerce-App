/**
 * Minimal Vite-style import.meta typing so the shared SDK stays
 * dependency-free while remaining consumable by the Vite frontend.
 */
interface ImportMetaEnv {
  readonly DEV?: boolean;
  readonly MODE?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
