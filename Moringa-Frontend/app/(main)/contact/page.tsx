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
      default: "Contact Us",
      template: "%s | Moringa Store Online",
    },
    description:
      "Contact Moringa Store Online for support, order help, and general store enquiries.",
    alternates: { canonical: "/contact" },
    openGraph: {
      type: "website",
      locale: "en_IN",
      siteName: "Moringa Store Online",
      title: "Contact Us | Moringa Store Online",
      description:
        "Contact Moringa Store Online for support, order help, and general store enquiries.",
      images: [
        {
          url: heroImage,
          width: 1200,
          height: 630,
          alt: "Contact Moringa Store Online",
        },
      ],
      url: `${siteUrl}/contact`,
    },
    twitter: {
      card: "summary_large_image",
      title: "Contact Us | Moringa Store Online",
      description:
        "Contact Moringa Store Online for support, order help, and general store enquiries.",
      images: [heroImage],
    },
  };
}

export default function ContactPage() {
  return <InfoPage pageKey="contact" />;
}
