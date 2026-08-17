"use client";

import Footer from "@/components/Footer";
import MainNavbar from "@/components/MainNavbar";
import { usePathname } from "next/navigation";

function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideSiteChrome = pathname === "/";

  return (
    <>
      {!hideSiteChrome && <MainNavbar />}
      {children}
      {!hideSiteChrome && <Footer />}
    </>
  );
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SiteShell>{children}</SiteShell>;
}
