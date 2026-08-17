import ErrorBoundary from "@/components/ErrorBoundary";
import PageTransition from "@/components/PageTransition";
import SessionHydrator from "@/components/SessionHydrator";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/ToastProvider";
import GoToTop from "@/components/GoToTop";
import ThemeScript from "@/components/ThemeScript";
import type { Viewport } from "next";
import "@/app/globals.css";

export const metadata = {
  title: {
    default: "Moringa Store Online",
  },
  description:
    "Shop premium moringa powder, tea, capsules, oil, and wellness bundles from Moringa Store Online.",
  verification: {
    google: "tIaavh_6SAQWHlDqfLaqahePUlU-k9dyhwK5-CoeCB8",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#166534",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link
          rel="preconnect"
          href="https://my-nest-project-pearl.vercel.app"
        />
        <ThemeScript />
      </head>
      <body>
        <ThemeProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-full focus:bg-emerald-700 focus:px-4 focus:py-2 focus:text-sm focus:text-white focus:shadow-lg"
          >
            Skip to main content
          </a>
          <ToastProvider>
            <SessionHydrator />
            <ErrorBoundary>
              <PageTransition>
                <div id="main-content">{children}</div>
              </PageTransition>
            </ErrorBoundary>
          </ToastProvider>
          <GoToTop />
        </ThemeProvider>
      </body>
    </html>
  );
}
