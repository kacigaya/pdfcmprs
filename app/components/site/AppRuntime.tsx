"use client";

import { useEffect } from "react";
import { assetUrl } from "../../lib/assets";
import { useSettings } from "../../lib/settings";

export function AppRuntime() {
  const [settings, , ready] = useSettings();
  useEffect(() => {
    document.documentElement.lang = settings.language;
    document.documentElement.dataset.compact = String(settings.compact);
  }, [settings]);
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      // Static hosts rely on the worker to add COOP/COEP (see public/sw.js).
      // Reload when it takes control so threaded engines get SharedArrayBuffer.
      if (!window.crossOriginIsolated) {
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => window.location.reload(),
          { once: true },
        );
      }
      navigator.serviceWorker
        .register(assetUrl("/sw.js"), { updateViaCache: "none" })
        .catch((error: unknown) =>
          console.error("Service worker registration failed", error),
        );
    }
  }, []);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!ready || !settings.shortcuts || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "/" && !/input|textarea|select/i.test((event.target as HTMLElement).tagName)) {
        event.preventDefault();
        document.querySelector<HTMLInputElement>("#tool-search")?.focus();
      }
      if (event.key === "Escape") (document.activeElement as HTMLElement)?.blur?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [ready, settings.shortcuts]);
  return null;
}
