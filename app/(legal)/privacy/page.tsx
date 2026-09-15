import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_UPDATED } from "../updated";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How pdfcmprs handles data, hosting requests, and your privacy.",
  alternates: { canonical: "https://pdfcmprs.duckdns.org/privacy" },
  openGraph: {
    title: "Privacy policy | pdfcmprs",
    description:
      "How pdfcmprs handles data, hosting requests, and your privacy.",
    type: "website",
    url: "https://pdfcmprs.duckdns.org/privacy",
  },
  twitter: {
    card: "summary",
    title: "Privacy policy | pdfcmprs",
    description:
      "How pdfcmprs handles data, hosting requests, and your privacy.",
  },
};

export default function PolicyPage() {
  return (
    <>
      <h1>Privacy policy</h1>
      <p className="text-xs text-muted-foreground tabular-nums">
        Last updated <time dateTime={LEGAL_UPDATED}>15 September 2026</time>
      </p>
      <h2>About this site</h2>
      <p>
        This policy covers pdfcmprs, operated by Gaya KACI in Paris, France. The
        site has no accounts, advertising, audience analytics, or tracking
        scripts. We do not sell visitor data or use it for marketing.
      </p>
      <h2>Who is responsible</h2>
      <p>
        Gaya KACI operates this site. For privacy questions or requests, email{" "}
        <a href="mailto:contact@gaya.anonaddy.com">contact@gaya.anonaddy.com</a>
        .
      </p>
      <h2>Your files</h2>
      <p>
        PDFs, images, passwords, and signing certificates are processed in your
        browser. The app does not upload your documents to its server or keep a
        server-side document history. Downloaded results remain on your device
        until you remove them.
      </p>
      <p>
        If you use timestamping, your browser contacts the selected timestamp
        authority with a cryptographic digest, rather than the full PDF. That
        authority receives your IP address and request metadata. Its own privacy
        and retention rules apply. Ordinary PDF operations do not require that
        request.
      </p>
      <h2>Hosting and request logs</h2>
      <p>
        This site is hosted on a VPS administered by Gaya KACI, on Oracle Cloud
        Infrastructure in its Paris region. Serving a page requires processing
        your IP address and request details. Oracle provides the infrastructure
        that carries this traffic and holds the server’s data.
      </p>
      <p>
        The VPS web server records request times, IP addresses, requested URLs,
        response status and size, duration, and browser headers such as
        User-Agent and Referer. IP masking is not enabled for this site. Request
        bodies are not included in these access logs. Logs are used to
        investigate errors and abuse, not to profile visitors or measure
        audiences.
      </p>
      <p>
        Access logs use size-based rotation. Rotated files are subject to the
        server’s default limit of 10 files and 90-day age cleanup when rotation
        runs. This is not a maximum age for every entry: the active log can
        remain longer when traffic is low. There is no fixed 30-day deletion
        guarantee.
      </p>
      <h2>Browser storage</h2>
      <p>
        The site remembers its theme in local storage. This is a browser
        preference, not a visitor identifier, and the app does not transmit it
        to its server. The <Link href="/cookies">cookies policy</Link> lists
        storage and explains how to clear it.
      </p>
      <h2>Contact and external links</h2>
      <p>
        If you email{" "}
        <a href="mailto:contact@gaya.anonaddy.com">contact@gaya.anonaddy.com</a>
        , addy.io forwards the message to the operator’s mailbox. Those mail
        services process the message to deliver it. Correspondence is kept while
        needed to answer your request; you can ask for deletion.
      </p>
      <p>
        External links take you to independently operated services under their
        own policies. Fonts and site assets are served with the site; there are
        no embedded advertising or analytics widgets.
      </p>
      <h2>Your rights</h2>
      <p>
        Where the GDPR applies, you can request access, correction, erasure,
        restriction, or portability where applicable, and object to processing
        based on legitimate interests. Operating and securing the site and
        answering correspondence rely on those legitimate interests. Email the
        operator to exercise these rights. We normally respond within one month.
        You can also complain to your data protection authority, including the{" "}
        <a href="https://www.cnil.fr/">CNIL</a> in France.
      </p>
      <p>
        Browser-only files and preferences are not available to the operator.
        For those, use your browser’s site-data controls or remove your
        downloaded files yourself.
      </p>
      <h2>Changes</h2>
      <p>
        This page will be updated when the site’s data handling changes. The
        date above identifies the latest revision.
      </p>
      <p>
        <Link href="/cookies">Cookies policy</Link> ·{" "}
        <Link href="/">Back to pdfcmprs</Link>
      </p>
    </>
  );
}
