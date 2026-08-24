import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import NewArrivalsHeroManager from "../../../components/admin/NewArrivalsHeroManager";

export default component$(() => {
  return <NewArrivalsHeroManager />;
});

export const head: DocumentHead = { title: "Admin · New Arrivals & Hero" };
