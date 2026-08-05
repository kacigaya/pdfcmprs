"use client";

import { useEffect } from "react";
import { useSettings } from "../../lib/settings";

export function AppRuntime() {
  const [settings] = useSettings();
  useEffect(() => {
    document.documentElement.lang = settings.language;
    document.documentElement.dataset.compact = String(settings.compact);
  }, [settings]);
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") navigator.serviceWorker.register("/sw.js");
  }, []);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!settings.shortcuts || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "/" && !/input|textarea|select/i.test((event.target as HTMLElement).tagName)) {
        event.preventDefault();
        document.querySelector<HTMLInputElement>("#tool-search")?.focus();
      }
      if (event.key === "Escape") (document.activeElement as HTMLElement)?.blur?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [settings.shortcuts]);
  return null;
}
