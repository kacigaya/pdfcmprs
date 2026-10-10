"use client";

import { useEffect, type ReactNode } from "react";
import { useSettings } from "@/app/lib/settings";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, , ready] = useSettings();
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
        !ready || !settings.shortcuts || event.defaultPrevented ||
        event.metaKey || event.ctrlKey || event.altKey ||
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
  }, [ready, settings.shortcuts]);

  return children;
}
