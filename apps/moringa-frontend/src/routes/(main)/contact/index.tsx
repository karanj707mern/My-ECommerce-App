import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { InfoPage } from "../../../components/InfoPage";
import { getFirstActiveHeroImage } from "../../../lib/api/hero";
import { buildHead } from "../../../lib/seo";

export const useHeroImage = routeLoader$(async () => {
  try {
    const hero = await getFirstActiveHeroImage();
    return hero?.url ?? null;
  } catch {
    return null;
  }
});

export default component$(() => {
  return <InfoPage pageKey="contact" />;
});

export const head: DocumentHead = ({ resolveValue }) => {
  const image = resolveValue(useHeroImage);
  return buildHead({
    title: "Contact",
    description:
      "Reach Moringa Store Online support by email or phone before or after placing an order.",
    path: "/contact",
    image,
  });
};
