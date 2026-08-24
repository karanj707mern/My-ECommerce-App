/**
 * WHAT IS THIS FILE?
 *
 * Production server entry for the Qwik City frontend.
 * Uses the Qwik City Node adapter to create a standalone HTTP server
 * that handles SSR, client assets, and API proxying.
 *
 * Run: node dist/server/entry.mjs (after `vite build`)
 */
import { createQwikCity } from "@builder.io/qwik-city/middleware/node";
import qwikCityPlan from "@qwik-city-plan";
import render from "./entry.ssr";
import { createServer } from "node:http";

// Create the Qwik City request handler
const { router, notFound, staticFile } = createQwikCity({
  render,
  qwikCityPlan,
});

const server = createServer((req, res) => {
  router(req, res, () => {
    staticFile(req, res, () => {
      notFound(req, res, () => {
        // Final fallback — should not reach here
        res.statusCode = 404;
        res.end("Not found");
      });
    });
  });
});

const port = Number(process.env.PORT || 3000);
server.listen(port, "0.0.0.0", () => {
  console.log(`Frontend server listening on port ${port}`);
});
