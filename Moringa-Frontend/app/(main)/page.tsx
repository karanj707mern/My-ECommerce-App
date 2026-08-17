import type { Metadata } from "next";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://my-nest-project-pearl.vercel.app";

  return {
    title: {
      default: "Coming Soon - Moringa Store Online",
      template: "%s | Moringa Store Online",
    },
    description:
      "Moringa Store Online is coming soon. We're working hard to bring you premium moringa products. Stay tuned!",
    robots: {
      index: true,
      follow: true,
    },
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: "en_IN",
      siteName: "Moringa Store Online",
      title: "Coming Soon - Moringa Store Online",
      description:
        "Moringa Store Online is coming soon. We're working hard to bring you premium moringa products.",
      url: siteUrl,
    },
    twitter: {
      card: "summary_large_image",
      title: "Coming Soon - Moringa Store Online",
      description:
        "Moringa Store Online is coming soon. We're working hard to bring you premium moringa products.",
    },
  };
}

export default function ComingSoonPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        <div className="mb-8 inline-flex items-center justify-center rounded-full bg-emerald-900/10 p-6 dark:bg-emerald-400/10">
          <svg
            className="h-16 w-16 text-emerald-700 dark:text-emerald-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1 className="mb-4 text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl dark:text-stone-100">
          We&apos;re Under Development
        </h1>

        <p className="mb-6 text-lg text-stone-600 dark:text-stone-400">
          Our website is currently being updated with fresh new features and
          products. We&apos;ll be back very soon with an enhanced shopping
          experience.
        </p>

        <p className="text-base text-stone-500 dark:text-stone-500">
          Thank you for your patience. We&apos;ll be back very soon.
        </p>
      </div>
    </div>
  );
}
