import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isDevelopmentMode = process.env.NEXT_PUBLIC_DEVELOPMENT_MODE === "true";

function isAllowed(pathname: string): boolean {
  if (pathname === "/") {
    return true;
  }

  if (
    pathname.startsWith("/_next/") ||
    pathname.match(
      /\.(ico|png|jpg|jpeg|svg|webp|avif|css|js|json|webmanifest|woff2?|ttf)$/
    )
  ) {
    return true;
  }

  return false;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isDevelopmentMode) {
    if (!isAllowed(pathname)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (pathname.startsWith("/admin")) {
    const sessionCookie = request.cookies.get("session");
    const accessToken = request.cookies.get("accessToken");

    if (!sessionCookie && !accessToken) {
      const loginUrl = new URL("/auth", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api).*)"],
};
