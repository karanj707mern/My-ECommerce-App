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
  return <InfoPage pageKey="wellness-journal" />;
});

export const head: DocumentHead = ({ resolveValue }) => {
  const image = resolveValue(useHeroImage);
  return buildHead({
    title: "Wellness Journal",
    description: "Practical moringa guidance, daily routine ideas, and wellness education from Moringa Store Online.",
    path: "/wellness-journal",
    image,
  });
};
