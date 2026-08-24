import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import BlogManager from "../../../components/admin/BlogManager";

export default component$(() => {
  return <BlogManager />;
});

export const head: DocumentHead = { title: "Admin · Blog" };
