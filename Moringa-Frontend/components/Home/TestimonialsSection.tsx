"use client";

import { useEffect } from "react";

const TESTIMONIALS = [
  {
    name: "Asha Nair",
    role: "Yoga instructor, Kochi",
    quote:
      "Moringa tea and powder became my go-to morning ritual — simple, clean, and genuinely energizing.",
  },
  {
    name: "Rohan Mehta",
    role: "Startup founder, Bengaluru",
    quote:
      "Browsing the full range before signing in made the entire shopping experience feel thoughtful and stress-free.",
  },
  {
    name: "Divya Sharma",
    role: "Nutrition coach, Jaipur",
    quote:
      "Transparent ingredients, premium quality, and the wellness combo delivers real value for health-conscious buyers.",
  },
];

export interface TestimonialsSectionProps {
  testimonialIndex: number;
  onTestimonialIndexChange: (index: number) => void;
}

export default function TestimonialsSection({
  testimonialIndex,
  onTestimonialIndexChange,
}: TestimonialsSectionProps) {
  const activeTestimonial = TESTIMONIALS[testimonialIndex];

  useEffect(() => {
    const testimonialTimer = window.setInterval(() => {
      onTestimonialIndexChange((testimonialIndex + 1) % TESTIMONIALS.length);
    }, 11000);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        window.clearInterval(testimonialTimer);
      } else {
        onTestimonialIndexChange((testimonialIndex + 1) % TESTIMONIALS.length);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(testimonialTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [testimonialIndex, onTestimonialIndexChange]);

  return (
    <section
      className="bg-gradient-to-b from-[var(--bg-primary)] via-emerald-50/40 to-[var(--bg-primary)] dark:from-[var(--bg-primary)] dark:via-emerald-900/20 dark:to-[var(--bg-primary)]"
      aria-labelledby="testimonials-heading"
    >
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-base font-semibold uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-200">
              Testimonials
            </p>
            <span className="hidden sm:inline text-emerald-400/60">—</span>
            <h2
              id="testimonials-heading"
              className="font-serif text-2xl text-[var(--text-primary)] sm:text-3xl"
            >
              What customers say about Moringa Store products
            </h2>
          </div>

          <p className="max-w-xl text-base leading-7 text-[var(--text-secondary)]">
            hear how moringa fits naturally into everyday routines.
          </p>
        </div>

        <div className="mt-10 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[var(--text-primary)] via-emerald-900 to-teal-900 p-[2px] shadow-2xl">
          <div className="rounded-[2.4rem] bg-gradient-to-br from-[var(--text-primary)] via-emerald-900 to-teal-900 p-8 text-white sm:p-12">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bg-secondary)]/10 text-emerald-200">
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-7 w-7"
                  aria-hidden="true"
                >
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4.995v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
              </div>

              <blockquote className="mt-8 max-w-3xl text-lg leading-relaxed sm:text-xl sm:leading-8">
                &ldquo;{activeTestimonial?.quote || ""}&rdquo;
              </blockquote>

              <div className="mt-8 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 text-lg font-bold text-emerald-950">
                  {activeTestimonial?.name?.charAt(0) || "?"}
                </div>
                <div className="text-left">
                  <p className="text-base font-semibold text-white">
                    {activeTestimonial?.name || "Buyer story"}
                  </p>
                  <p className="text-sm text-emerald-200/80">
                    {activeTestimonial?.role || ""}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-1 text-amber-300">
                {Array.from({ length: 5 }).map((_, index) => (
                  <span key={index} aria-hidden="true">
                    ★
                  </span>
                ))}
                <span className="ml-2 text-xs uppercase tracking-[0.1em] text-emerald-200/70">
                  Verified buyer
                </span>
              </div>
            </div>

            <div className="mt-10 flex items-center justify-between">
              <p className="text-sm text-emerald-200/80">
                {testimonialIndex + 1} / {TESTIMONIALS.length}
              </p>
              <div className="flex items-center gap-3">
                {TESTIMONIALS.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => onTestimonialIndexChange(index)}
                    className={`h-4 w-4 rounded-full transition-all duration-300 ${
                      index === testimonialIndex
                        ? "bg-emerald-300 shadow-[0_0_8px_rgba(167,243,208,0.5)]"
                        : "bg-[var(--bg-secondary)]/30 hover:bg-[var(--bg-secondary)]/50"
                    }`}
                    aria-label={`Show testimonial ${index + 1}`}
                  />
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() =>
                    onTestimonialIndexChange(
                      (testimonialIndex - 1 + TESTIMONIALS.length) %
                        TESTIMONIALS.length,
                    )
                  }
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 text-white transition hover:bg-[var(--bg-secondary)]/10"
                  aria-label="Previous testimonial"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onTestimonialIndexChange(
                      (testimonialIndex + 1) % TESTIMONIALS.length,
                    )
                  }
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 text-white transition hover:bg-[var(--bg-secondary)]/10"
                  aria-label="Next testimonial"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
