import Link from "next/link";

const PAGE_CONTENT: Record<
  string,
  {
    eyebrow: string;
    title: string;
    description: string;
    sections: { heading: string; body: string }[];
  }
> = {
  "about-us": {
    eyebrow: "About Us",
    title: "Rooted in natural wellness and everyday trust",
    description:
      "Moringa Store is built around clear product information, honest pricing, and a calm buying experience for people who want plant-based wellness essentials.",
    sections: [
      {
        heading: "What we stand for",
        body: "We focus on clean product presentation, practical routines, and a storefront that helps buyers make decisions with confidence instead of pressure.",
      },
      {
        heading: "What customers can expect",
        body: "Reliable product pages, visible stock information, secure checkout, order tracking, and support that stays clear from purchase to delivery.",
      },
    ],
  },
  "wellness-journal": {
    eyebrow: "Wellness Journal",
    title: "Simple guidance for better daily routines",
    description:
      "Use moringa in ways that fit your schedule, from powders and teas to oils and wellness bundles. This page can grow into your real content hub over time.",
    sections: [
      {
        heading: "Content ideas to publish next",
        body: "How to choose between tea, powder, capsules, and oil. Best beginner products. Morning routines. Storage tips. Nutrition-focused blog posts and FAQ answers.",
      },
      {
        heading: "Why this matters",
        body: "A real commerce brand earns trust through education, not just product listings. Search traffic, repeat visits, and higher conversion all benefit from a strong journal.",
      },
    ],
  },
  shipping: {
    eyebrow: "Shipping",
    title: "Delivery, dispatch, and order support",
    description:
      "Orders are processed after confirmation and moved through clear delivery stages so customers know what is happening after checkout.",
    sections: [
      {
        heading: "Dispatch window",
        body: "Most in-stock orders should be packed and handed to the courier within 1 to 2 business days unless otherwise stated during checkout.",
      },
      {
        heading: "Delivery support",
        body: "Customers receive timeline updates for payment confirmation, shipping, out-for-delivery, and delivery completion inside the order history page.",
      },
    ],
  },
  returns: {
    eyebrow: "Returns",
    title: "Returns, cancellations, and issue resolution",
    description:
      "Return, refund, and replacement requests are accepted for 7 days after delivery. After that window closes, customers can still contact support for payment disputes where applicable.",
    sections: [
      {
        heading: "7-day return window",
        body: "Customers can request a return, refund, or replacement within 7 days from the delivered date shown in their order history.",
      },
      {
        heading: "Support review",
        body: "Each request is reviewed by support. Items must match the store policy for damage, incorrect product, missing item, or approved replacement cases.",
      },
    ],
  },
  "privacy-policy": {
    eyebrow: "Privacy Policy",
    title: "How customer information is handled",
    description:
      "A hosted store needs a formal legal privacy policy, but this page already gives you a place to publish the data-handling commitments your customers expect.",
    sections: [
      {
        heading: "Data used by this store",
        body: "Account details, delivery addresses, order records, authentication data, and payment references needed to complete purchases and support customers.",
      },
      {
        heading: "Before going live",
        body: "Replace this page with your lawyer-reviewed policy covering storage, third-party processors, analytics, cookies, data retention, and customer rights under the laws that apply to your audience.",
      },
    ],
  },
  terms: {
    eyebrow: "Terms",
    title: "Store terms and purchase conditions",
    description:
      "Professional storefronts should publish purchase terms, acceptable use, pricing disclaimers, fulfilment rules, and support boundaries in one place.",
    sections: [
      {
        heading: "What this page should cover",
        body: "Order acceptance, pricing accuracy, stock availability, fulfilment limitations, cancellation rules, returns, dispute handling, and website usage terms.",
      },
      {
        heading: "Launch note",
        body: "Use this page as a placeholder now, but replace it with business-specific and legally reviewed terms before public hosting.",
      },
    ],
  },
  contact: {
    eyebrow: "Contact",
    title: "Get in touch with Moringa Store",
    description:
      "Customers should always know how to reach the business before and after placing an order.",
    sections: [
      {
        heading: "Customer support",
        body: "Email: moringastoreonline@gmail.com. Phone: +91 90332 27627. Location: Ahmedabad, Gujarat, India.",
      },
      {
        heading: "Recommended support promise",
        body: "Reply to new customer enquiries within one business day and urgent order issues within a few working hours during business time.",
      },
    ],
  },
};

export default function InfoPage({ pageKey }: { pageKey: string }) {
  const page = PAGE_CONTENT[pageKey] ?? PAGE_CONTENT["about-us"];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] px-4 py-12 text-[var(--text-primary)] sm:px-6 sm:py-16 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <Link href="/" className="btn-secondary inline-flex">
          Back to home
        </Link>

        <div className="mt-8 rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 shadow-sm sm:mt-10 sm:p-10">
          <p className="text-sm uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
            {page.eyebrow}
          </p>
          <h1 className="mt-4 font-serif text-3xl leading-tight text-[var(--text-primary)] sm:text-4xl lg:text-5xl">
            {page.title}
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-[var(--text-secondary)]">
            {page.description}
          </p>

          <div className="mt-10 space-y-6">
            {page.sections.map((section) => (
              <section
                key={section.heading}
                className="rounded-[1.5rem] bg-[var(--bg-primary)] p-5 sm:p-6"
              >
                <h2 className="font-serif text-2xl text-[var(--text-primary)]">
                  {section.heading}
                </h2>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                  {section.body}
                </p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
