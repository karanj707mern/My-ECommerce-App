/**
 * WHAT IS THIS FILE?
 *
 * SSR entry point. This module is intended to be used with rendering environments
 * that run on the server (SSR). The default export is the render function Qwik City
 * invokes to stream a route to the client.
 */
import {
  renderToStream,
  type RenderToStreamOptions,
} from "@builder.io/qwik/server";
import { manifest } from "@qwik-client-manifest";
import Root from "./root";

export default function (opts: RenderToStreamOptions) {
  return renderToStream(<Root />, {
    manifest,
    ...opts,
    containerAttributes: {
      lang: "en-us",
      ...opts.containerAttributes,
    },
    serverData: {
      ...opts.serverData,
    },
  });
}
