import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import OrdersPage from "../../../components/orders/OrdersPage";
import { buildHead } from "../../../lib/seo";

export default component$(() => {
  return <OrdersPage />;
});

export const head: DocumentHead = () =>
  buildHead({
    title: "Your Orders",
    description:
      "Track active orders, review delivered purchases, manage cancellations, and follow support tickets.",
    path: "/orders",
  });
