"use client";

import Link from "next/link";
import { useToast } from "@/hooks/useToast";

const SHOP_LINKS = [
  { label: "Shop", to: "/shop" },
  { label: "Blog", to: "/blog" },
  { label: "About Us", to: "/about-us" },
  { label: "Wellness Journal", to: "/wellness-journal" },
];

const SUPPORT_LINKS = [
  { label: "Contact", to: "/contact" },
  { label: "Shipping", to: "/shipping" },
  { label: "Returns", to: "/returns" },
  { label: "Privacy Policy", to: "/privacy-policy" },
  { label: "Terms", to: "/terms" },
];

const SOCIAL_LINKS = [
  {
    label: "Instagram",
    href: "#",
    className:
      "bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 text-white hover:opacity-90",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    ),
  },
  {
    label: "Facebook",
    href: "#",
    className: "bg-[#1877F2] text-white hover:opacity-90",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
      </svg>
    ),
  },
  {
    label: "WhatsApp",
    href: "https://wa.me/919033227627",
    className: "bg-[#25D366] text-white hover:opacity-90",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.365.195 1.88.118.574-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.815 11.815 0 00-3.479-8.414z" />
      </svg>
    ),
  },
];

const CONTACT_INFO = [
  {
    icon: "✉",
    text: "moringastoreonline@gmail.com",
    href: "mailto:moringastoreonline@gmail.com",
  },
  { icon: "📞", text: "+91 90332 27627", href: "tel:+919033227627" },
  { icon: "📍", text: "Ahmedabad, Gujarat, India" },
  { icon: "🕐", text: "9:00 AM to 7:00 PM" },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const toast = useToast();

  return (
    <footer className="border-t border-[var(--border-color)] bg-[var(--bg-primary)]">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16 lg:px-10">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="text-base font-semibold uppercase tracking-[0.18em] text-emerald-900 dark:text-emerald-200">
              Moringa Store
            </p>
            <h2 className="mt-5 font-serif text-4xl text-[var(--text-primary)] sm:text-5xl">
              Wellness shopping that feels calm, clear, and intentional
            </h2>
            <p className="mt-5 max-w-md text-lg leading-8 text-[var(--text-secondary)]">
              Premium moringa essentials, curated for your everyday wellness.
            </p>
            <div className="mt-8 flex items-center gap-4">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.label}
                  title={social.label}
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-full transition hover:scale-110 sm:h-14 sm:w-14 ${social.className}`}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            <h3 className="text-base font-semibold uppercase tracking-[0.1em] text-[var(--text-primary)]">
              Shop
            </h3>
            <div className="mt-5 space-y-4 text-lg text-[var(--text-secondary)]">
              {SHOP_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.to}
                  className="block transition hover:text-emerald-900 dark:hover:text-[#4ade80]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            <h3 className="text-base font-semibold uppercase tracking-[0.1em] text-[var(--text-primary)]">
              Support
            </h3>
            <div className="mt-5 space-y-4 text-lg text-[var(--text-secondary)]">
              {SUPPORT_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.to}
                  className="block transition hover:text-emerald-900 dark:hover:text-[#4ade80]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4">
            <h3 className="text-base font-semibold uppercase tracking-[0.1em] text-[var(--text-primary)]">
              Contact
            </h3>
            <div className="mt-5 space-y-4 text-lg text-[var(--text-secondary)]">
              {CONTACT_INFO.map((item) =>
                item.href ? (
                  <a
                    key={item.text}
                    href={item.href}
                    className="flex items-center gap-3 break-all transition hover:text-emerald-900 dark:hover:text-[#4ade80]"
                  >
                    <span aria-hidden="true" className="text-xl leading-none">
                      {item.icon}
                    </span>
                    <span className="break-all">{item.text}</span>
                  </a>
                ) : (
                  <p
                    key={item.text}
                    className="flex items-center gap-3 text-[var(--text-secondary)]"
                  >
                    <span aria-hidden="true" className="text-xl leading-none">
                      {item.icon}
                    </span>
                    <span>{item.text}</span>
                  </p>
                ),
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
        <div className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 shadow-sm sm:p-8 card">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-200">
                Wellness newsletter
              </p>
              <h3 className="mt-3 font-serif text-2xl text-[var(--text-primary)] sm:text-3xl">
                Get tips, recipes, and 10% off your first order
              </h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Join the Moringa Store community. No spam, just practical
                wellness advice and occasional offers.
              </p>
            </div>
            <form
              className="flex flex-col gap-3 md:w-auto"
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.target.elements.namedItem(
                  "newsletterEmail",
                ) as HTMLInputElement | null;
                if (
                  input &&
                  input.value &&
                  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)
                ) {
                  toast.showToast({
                    severity: "success",
                    summary: "Subscribed!",
                    detail: "We will send your 10% off code shortly.",
                    life: 4000,
                  });
                  input.value = "";
                } else {
                  toast.showToast({
                    severity: "error",
                    summary: "Invalid email",
                    detail: "Please enter a valid email address.",
                    life: 4000,
                  });
                }
              }}
            >
              <input
                id="newsletterEmail"
                name="newsletterEmail"
                type="email"
                placeholder="you@example.com"
                required
                className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500 md:w-80"
              />
              <button type="submit" className="btn-primary w-full md:w-auto">
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="footer-bottom-bar border-t border-[var(--border-strong)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-5 py-6 text-center sm:flex-row sm:text-left sm:px-8 sm:py-7 lg:px-10">
          <p className="text-base">
            © {currentYear} Moringa Store Online. All rights reserved.
          </p>
          <p className="text-base">Built with care for natural wellness.</p>
        </div>
      </div>
    </footer>
  );
}
