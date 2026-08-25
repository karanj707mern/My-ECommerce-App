import { component$, Slot } from "@builder.io/qwik";
import { SiteNav } from "../../components/SiteNav";
import { Footer } from "../../components/Footer";

export default component$(() => {
  return (
    <div class="min-h-screen flex flex-col">
      <SiteNav />
      <main class="flex-1">
        <Slot />
      </main>
      <Footer />
    </div>
  );
});
