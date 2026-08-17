import type { Metadata } from "next";
import { getFirstActiveHeroImage } from "@/lib/api/hero";
import InfoPage from "@/components/InfoPage";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://my-nest-project-pearl.vercel.app";

  let heroImage =
    "https://my-nest-project-pearl.vercel.app/images/home-hero-1.webp";

  try {
    const firstHero = await getFirstActiveHeroImage();
    if (firstHero?.url) {
      heroImage = firstHero.url;
    }
  } catch {
    // Keep fallback on error
  }

  return {
    title: {
      default: "Wellness Journal",
      template: "%s | Moringa Store Online",
    },
    description:
      "Explore moringa wellness guidance, product tips, and simple routines for everyday health.",
    alternates: { canonical: "/wellness-journal" },
    openGraph: {
      type: "website",
      locale: "en_IN",
      siteName: "Moringa Store Online",
      title: "Wellness Journal | Moringa Store Online",
      description:
        "Explore moringa wellness guidance, product tips, and simple routines for everyday health.",
      images: [
        {
          url: heroImage,
          width: 1200,
          height: 630,
          alt: "Wellness Journal - Moringa Store Online",
        },
      ],
      url: `${siteUrl}/wellness-journal`,
    },
    twitter: {
      card: "summary_large_image",
      title: "Wellness Journal | Moringa Store Online",
      description:
        "Explore moringa wellness guidance, product tips, and simple routines for everyday health.",
      images: [heroImage],
    },
  };
}

export default function WellnessJournalPage() {
  return <InfoPage pageKey="wellness-journal" />;
}
