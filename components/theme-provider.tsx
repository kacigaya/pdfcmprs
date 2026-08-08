"use client";

import { useEffect, type ReactNode } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const stored = localStorage.getItem("theme");
      root.classList.toggle("dark", stored ? stored === "dark" : media.matches);
    };
    apply();
    // CSS no longer tracks the OS preference, so follow it while nothing is stored.
    media.addEventListener("change", apply);

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        event.key.toLowerCase() !== "d" ||
        target?.closest("input, textarea, select, [contenteditable]")
      )
        return;
      const dark = root.classList.toggle("dark");
      localStorage.setItem("theme", dark ? "dark" : "light");
    };
    addEventListener("keydown", onKeyDown);
    return () => {
      removeEventListener("keydown", onKeyDown);
      media.removeEventListener("change", apply);
    };
  }, []);

  return children;
}
