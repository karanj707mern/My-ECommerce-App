/**
 * Public surface of @moringa/sdk.
 *
 * `api.functional.<controller>.<method>` — typed HTTP clients generated from
 * backend controllers. `createConnection()` — preconfigured transport with
 * cookie credentials and environment-aware host resolution.
 *
 * The frontend consumes the API exclusively through this package; raw fetch
 * calls bypass the compile-time contract and are reserved for uploads/SSE.
 */
export * as api from "./api";
export { createConnection, resolveApiBaseUrl } from "./connection";
export type { IConnection } from "@nestia/fetcher";
