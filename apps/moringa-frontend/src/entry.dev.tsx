/**
 * WHAT IS THIS FILE?
 *
 * Development entry point when using client-only rendering during development
 * (`vite --mode csr` style workflows). It is not part of the production build.
 */
import { render, type RenderOptions } from "@builder.io/qwik";
import Root from "./root";

export default function (opts: RenderOptions) {
  return render(document, <Root />, opts);
}
