import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_UPDATED } from "../updated";

export const metadata: Metadata = {
  title: "Cookies policy",
  description:
    "How pdfcmprs handles cookies, browser storage, and preferences.",
  alternates: { canonical: "https://pdfcmprs.duckdns.org/cookies" },
  openGraph: {
    title: "Cookies policy | pdfcmprs",
    description:
      "How pdfcmprs handles cookies, browser storage, and preferences.",
    type: "website",
    url: "https://pdfcmprs.duckdns.org/cookies",
  },
  twitter: {
    card: "summary",
    title: "Cookies policy | pdfcmprs",
    description:
      "How pdfcmprs handles cookies, browser storage, and preferences.",
  },
};

export default function PolicyPage() {
  return (
    <>
      <h1>Cookies policy</h1>
      <p className="text-xs text-muted-foreground tabular-nums">
        Last updated <time dateTime={LEGAL_UPDATED}>15 September 2026</time>
      </p>
      <h2>Cookies</h2>
      <p>
        The application does not set cookies. It has no advertising, analytics,
        or consent-management cookies. Its own browser storage supports
        preferences, offline use, and OCR, not tracking.
      </p>
      <h2>What is stored instead</h2>
      <ul>
        <li>
          <code>theme</code>: light or dark, stored in local storage. The theme
          provider may save the resolved system theme on first load.
        </li>
        <li>
          <code>pdfcmprs-settings-v1</code>: language, compact layout, and
          keyboard-shortcut preferences in local storage.
        </li>
        <li>
          The service worker caches site pages and assets for offline use in a
          versioned <code>pdfcmprs-</code> cache. It does not cache uploaded
          PDFs or generated results.
        </li>
        <li>
          OCR stores downloaded language models in IndexedDB so they can be
          reused. These are recognition models, not the documents you recognise.
        </li>
      </ul>
      <p>
        These values and caches have no fixed expiry. They remain until you
        clear them, the browser removes them, or the app replaces them. Local
        storage is not automatically attached to HTTP requests, and this app
        does not send these preferences to the server.
      </p>

      <h2>Removing stored data</h2>
      <p>
        Open your browser’s site settings for this domain and clear site data.
        This removes local preferences, offline caches, and OCR models; assets
        and models are downloaded again when needed. Browser-managed caches may
        also be cleared through browsing-data settings. Downloaded files and
        clipboard contents are separate and must be removed using your device’s
        controls.
      </p>
      <h2>Why there is no consent banner</h2>
      <p>
        There are no optional tracking or advertising technologies to accept.
        Storage supports the site’s functions and preferences. If optional
        tracking is introduced, this policy will change and consent will be
        requested before it starts where required.
      </p>
      <h2>Third parties and server logs</h2>
      <p>
        Links to external sites are governed by their policies once you follow
        them. The timestamp tool makes a request to the selected timestamp
        authority only when you use it. Server request logs are separate from
        browser storage and are covered by the{" "}
        <Link href="/privacy">privacy policy</Link>.
      </p>
      <h2>Questions and changes</h2>
      <p>
        Contact{" "}
        <a href="mailto:contact@gaya.anonaddy.com">contact@gaya.anonaddy.com</a>
        . Changes to storage will be described here with a revised update date.
      </p>
      <p>
        <Link href="/privacy">Privacy policy</Link> ·{" "}
        <Link href="/">Back to pdfcmprs</Link>
      </p>
    </>
  );
}
