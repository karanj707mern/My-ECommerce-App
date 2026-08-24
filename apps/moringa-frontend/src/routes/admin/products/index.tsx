import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import ProductsManager from "../../../components/admin/ProductsManager";

export default component$(() => {
  return <ProductsManager />;
});

export const head: DocumentHead = { title: "Admin · Products" };
