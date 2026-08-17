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
      default: "About Us",
      template: "%s | Moringa Store Online",
    },
    description:
      "Learn about Moringa Store Online, our wellness focus, and how we help customers shop with clarity and confidence.",
    alternates: { canonical: "/about-us" },
    openGraph: {
      type: "website",
      locale: "en_IN",
      siteName: "Moringa Store Online",
      title: "About Us | Moringa Store Online",
      description:
        "Learn about Moringa Store Online, our wellness focus, and how we help customers shop with clarity and confidence.",
      images: [
        {
          url: heroImage,
          width: 1200,
          height: 630,
          alt: "About Moringa Store Online",
        },
      ],
      url: `${siteUrl}/about-us`,
    },
    twitter: {
      card: "summary_large_image",
      title: "About Us | Moringa Store Online",
      description:
        "Learn about Moringa Store Online, our wellness focus, and how we help customers shop with clarity and confidence.",
      images: [heroImage],
    },
  };
}

export default function AboutUsPage() {
  return <InfoPage pageKey="about-us" />;
}
