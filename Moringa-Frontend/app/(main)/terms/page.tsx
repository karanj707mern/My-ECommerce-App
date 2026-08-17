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
      default: "Terms and Conditions",
      template: "%s | Moringa Store Online",
    },
    description:
      "Read the purchase terms, store policies, and website conditions for Moringa Store Online.",
    alternates: { canonical: "/terms" },
    openGraph: {
      type: "website",
      locale: "en_IN",
      siteName: "Moringa Store Online",
      title: "Terms and Conditions | Moringa Store Online",
      description:
        "Read the purchase terms, store policies, and website conditions for Moringa Store Online.",
      images: [
        {
          url: heroImage,
          width: 1200,
          height: 630,
          alt: "Terms and Conditions - Moringa Store Online",
        },
      ],
      url: `${siteUrl}/terms`,
    },
    twitter: {
      card: "summary_large_image",
      title: "Terms and Conditions | Moringa Store Online",
      description:
        "Read the purchase terms, store policies, and website conditions for Moringa Store Online.",
      images: [heroImage],
    },
  };
}

export default function TermsPage() {
  return <InfoPage pageKey="terms" />;
}
