"use client";

import { useEffect } from "react";

const ThemeScript = () => {
  useEffect(() => {
    try {
      const m = document.cookie.match(/(?:^|; )theme=([^;]*)/);
      const cookieTheme = m ? decodeURIComponent(m[1]) : null;
      const ls =
        typeof window !== "undefined"
          ? window.localStorage.getItem("theme")
          : null;
      const theme = cookieTheme || ls;
      if (theme === "dark" || theme === "light") {
        document.documentElement.setAttribute("data-theme", theme);
      }
    } catch (e) {
      console.error("Theme hydration error", e);
    }
  }, []);

  return null;
};

export default ThemeScript;
