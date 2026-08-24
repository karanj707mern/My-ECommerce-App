import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import SettingsManager from "../../../components/admin/SettingsManager";

export default component$(() => {
  return <SettingsManager />;
});

export const head: DocumentHead = { title: "Admin · Settings" };
