"use client";

import { useEffect, type ReactNode } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    const stored = localStorage.getItem("theme");
    root.classList.toggle(
      "dark",
      stored ? stored === "dark" : matchMedia("(prefers-color-scheme: dark)").matches,
    );

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
    return () => removeEventListener("keydown", onKeyDown);
  }, []);

  return children;
}
