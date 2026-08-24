import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import OrdersManager from "../../../components/admin/OrdersManager";

export default component$(() => {
  return <OrdersManager />;
});

export const head: DocumentHead = { title: "Admin · Orders" };
