import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import SupportManager from "../../../components/admin/SupportManager";

export default component$(() => {
  return <SupportManager />;
});

export const head: DocumentHead = { title: "Admin · Support" };
