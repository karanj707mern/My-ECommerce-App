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
      default: "Shipping Information",
      template: "%s | Moringa Store Online",
    },
    description:
      "Read dispatch, delivery, and shipping support details for Moringa Store Online orders.",
    alternates: { canonical: "/shipping" },
    openGraph: {
      type: "website",
      locale: "en_IN",
      siteName: "Moringa Store Online",
      title: "Shipping Information | Moringa Store Online",
      description:
        "Read dispatch, delivery, and shipping support details for Moringa Store Online orders.",
      images: [
        {
          url: heroImage,
          width: 1200,
          height: 630,
          alt: "Shipping Information - Moringa Store Online",
        },
      ],
      url: `${siteUrl}/shipping`,
    },
    twitter: {
      card: "summary_large_image",
      title: "Shipping Information | Moringa Store Online",
      description:
        "Read dispatch, delivery, and shipping support details for Moringa Store Online orders.",
      images: [heroImage],
    },
  };
}

export default function ShippingPage() {
  return <InfoPage pageKey="shipping" />;
}
