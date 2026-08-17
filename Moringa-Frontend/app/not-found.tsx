"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const HELPFUL_LINKS = [
  {
    label: "Shop all products",
    href: "/shop",
    description: "Browse moringa powders, teas, and oils",
    icon: "🌿",
  },
  {
    label: "Wellness journal",
    href: "/blog",
    description: "Read articles about natural health",
    icon: "📖",
  },
  {
    label: "About Moringa",
    href: "/about-us",
    description: "Learn about our sourcing and quality",
    icon: "🌱",
  },
  {
    label: "Contact support",
    href: "/contact",
    description: "Get help with orders and questions",
    icon: "💬",
  },
  {
    label: "Shipping & returns",
    href: "/shipping",
    description: "Delivery info and return policy",
    icon: "📦",
  },
  {
    label: "Track your order",
    href: "/orders",
    description: "Check active order status",
    icon: "🚚",
  },
];

export default function NotFoundPage() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved) setTheme(saved as "light" | "dark");
  }, []);

  useEffect(() => {
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return (
    <div
      className={`relative min-h-[100dvh] overflow-hidden ${theme === "dark" ? "bg-gradient-to-br from-emerald-950 via-teal-950 to-green-950" : "bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50"} text-[var(--text-primary)]`}
    >
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30 focus:outline-none"
        aria-label="Toggle theme"
      >
        <svg
          className="h-6 w-6"
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          {theme === "light" ? (
            <path d="M12 4.5V2m0 20v-2.5M5.618 5.618A12 12 0 0112 4.5a12 12 0 115.656 5.657" />
          ) : (
            <path d="M21 12.79A9 9 0 1012 2.21l-6.19 6.19A9 9 0 0021 12.79z" />
          )}
        </svg>
      </button>
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Symbolic leaf silhouettes */}
        <svg
          className="absolute -left-10 -top-10 h-96 w-96 opacity-10 dark:opacity-20"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M100 20C60 60 20 80 20 120C20 160 60 180 100 180C140 180 180 160 180 120C180 80 140 60 100 20Z"
            stroke="currentColor"
            strokeWidth="2"
            className="text-emerald-600 dark:text-emerald-400"
          />
          <path
            d="M100 40C70 70 40 90 40 120C40 150 70 170 100 170C130 170 160 150 160 120C160 90 130 70 100 40Z"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-emerald-500 dark:text-emerald-300"
          />
          <line
            x1="100"
            y1="20"
            x2="100"
            y2="180"
            stroke="currentColor"
            strokeWidth="1"
            className="text-emerald-400 dark:text-emerald-200"
          />
        </svg>
        <svg
          className="absolute -right-10 top-1/3 h-80 w-80 opacity-10 dark:opacity-20"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M100 20C60 60 20 80 20 120C20 160 60 180 100 180C140 180 180 160 180 120C180 80 140 60 100 20Z"
            stroke="currentColor"
            strokeWidth="2"
            className="text-teal-600 dark:text-teal-400"
          />
          <path
            d="M100 40C70 70 40 90 40 120C40 150 70 170 100 170C130 170 160 150 160 120C160 90 130 70 100 40Z"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-teal-500 dark:text-teal-300"
          />
          <line
            x1="100"
            y1="20"
            x2="100"
            y2="180"
            stroke="currentColor"
            strokeWidth="1"
            className="text-teal-400 dark:text-teal-200"
          />
        </svg>
        <svg
          className="absolute -bottom-10 left-1/3 h-72 w-72 opacity-10 dark:opacity-20"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M100 20C60 60 20 80 20 120C20 160 60 180 100 180C140 180 180 160 180 120C180 80 140 60 100 20Z"
            stroke="currentColor"
            strokeWidth="2"
            className="text-lime-600 dark:text-lime-400"
          />
          <path
            d="M100 40C70 70 40 90 40 120C40 150 70 170 100 170C130 170 160 150 160 120C160 90 130 70 100 40Z"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-lime-500 dark:text-lime-300"
          />
          <line
            x1="100"
            y1="20"
            x2="100"
            y2="180"
            stroke="currentColor"
            strokeWidth="1"
            className="text-lime-400 dark:text-lime-200"
          />
        </svg>

        {/* Floating symbolic particles */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute text-4xl opacity-10"
            style={{
              left: `${20 + i * 15}%`,
              top: `${10 + i * 15}%`,
              animation: `float ${3 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
          >
            {["🌿", "🍃", "🌱", "✨", "💚", "🌿"][i]}
          </div>
        ))}
      </div>

      <div className="relative mx-auto flex min-h-[100dvh] max-w-6xl flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-10">
        <div
          className={`w-full max-w-4xl transition-all duration-1000 ${
            isLoaded ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          {/* Main 404 content */}
          <div className="rounded-[3rem] border border-white/40 bg-[var(--bg-secondary)]/80 p-8 shadow-2xl backdrop-blur-xl sm:p-14 card">
            <div className="mx-auto max-w-2xl text-center">
              {/* Animated 404 number */}
              <div className="relative mb-8">
                <div className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 sm:text-9xl">
                  404
                </div>
                <div className="absolute -right-4 -top-4 text-6xl animate-bounce">
                  🌿
                </div>
              </div>

              {/* Heading with gradient */}
              <h1 className="font-serif text-4xl text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 via-teal-600 to-green-600 dark:from-emerald-300 dark:via-teal-400 dark:to-green-300 sm:text-5xl lg:text-6xl">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 via-teal-600 to-green-600 dark:from-emerald-300 dark:via-teal-400 dark:to-green-300">
                  Oops! Page not found
                </span>
              </h1>

              {/* Description */}
              <p className="mt-6 text-lg leading-8 text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 via-teal-600 to-green-600 dark:from-emerald-300 dark:via-teal-400 dark:to-green-300 sm:text-xl">
                Looks like this page has wandered off into the wilderness.
                Don&apos;t worry — our moringa products are still here waiting
                for you! 🌱
              </p>

              {/* CTA buttons */}
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <Link
                  href="/"
                  className="group relative overflow-hidden rounded-full bg-gradient-to-r from-emerald-700 to-teal-700 px-8 py-4 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105"
                >
                  <span className="relative z-10">Back to home</span>
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-teal-700 to-emerald-700 transition-transform duration-300 group-hover:translate-x-0" />
                </Link>
                <Link
                  href="/shop"
                  className="rounded-full border-2 border-[var(--border-color)] bg-[var(--bg-secondary)] px-8 py-4 text-base font-semibold text-[var(--text-primary)] transition-all duration-300 hover:border-emerald-300 hover:bg-emerald-50 hover:scale-105"
                >
                  Browse shop
                </Link>
              </div>
            </div>

            {/* Helpful links section */}
            <div className="mt-16">
              <p className="text-center text-xs uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-500 to-green-600 dark:from-emerald-300 dark:via-teal-400 dark:to-green-300">
                Popular destinations
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {HELPFUL_LINKS.map((link, index) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group relative overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg"
                    style={{
                      animationDelay: `${index * 0.1}s`,
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-3xl">{link.icon}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 via-teal-600 to-green-600 dark:from-emerald-300 dark:via-teal-400 dark:to-green-300 group-hover:text-emerald-700 transition-colors">
                          {link.label}
                        </p>
                        <p className="mt-1 text-xs leading-6 text-[var(--text-secondary)]">
                          {link.description}
                        </p>
                      </div>
                      <svg
                        className="h-5 w-5 text-[var(--text-muted)] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-emerald-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Footer text */}
          <div className="mt-12 text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              Need help? Contact us at{" "}
              <a
                href="mailto:moringastoreonline@gmail.com"
                className="font-semibold text-emerald-700 underline underline-offset-4 transition hover:text-emerald-800"
              >
                moringastoreonline@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
          }
        }
        @keyframes wobble {
          0% {
            transform: translate(0, 0) rotate(0deg);
          }
          15% {
            transform: translate(-4px, 2px) rotate(-1deg);
          }
          30% {
            transform: translate(4px, -2px) rotate(1deg);
          }
          45% {
            transform: translate(-3px, 3px) rotate(-0.5deg);
          }
          60% {
            transform: translate(3px, -3px) rotate(0.5deg);
          }
          75% {
            transform: translate(-2px, 1px) rotate(-0.2deg);
          }
          90% {
            transform: translate(2px, -1px) rotate(0.2deg);
          }
          100% {
            transform: translate(0, 0) rotate(0deg);
          }
        }
        .card:hover {
          animation: wobble 1.8s ease-in-out infinite;
        }
        .delay-1000 {
          animation-delay: 1s;
        }
        .delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}
