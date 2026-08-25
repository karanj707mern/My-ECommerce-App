/**
 * Smoke-test server entry.
 *
 * Bundled by `npm run smoke` (`vite build --ssr`) so the Qwik City plan
 * virtual module (@qwik-city-plan) and the client manifest are resolved
 * exactly like a production deployment. The default export is the ready-made
 * connect-style middleware pair consumed by `scripts/smoke.mjs`.
 */
// @ts-nocheck -- virtual modules (@qwik-city-plan) have no type declarations;
// this entry is intentionally outside tsconfig's include graph.
import { createQwikCity } from "@builder.io/qwik-city/middleware/node";
import qwikCityPlan from "@qwik-city-plan";
import render from "../src/entry.ssr";

export default createQwikCity({ render, qwikCityPlan });
