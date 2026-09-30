import type { Metadata } from "next";
import Link from "next/link";
import { pageUrl } from "../../lib/assets";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "Terms for the pdfcmprs website, documentation, and software.",
  alternates: { canonical: pageUrl("/terms") },
  openGraph: {
    title: "Terms of use | pdfcmprs",
    description: "Terms for the pdfcmprs website, documentation, and software.",
    type: "website",
    url: pageUrl("/terms"),
  },
  twitter: {
    card: "summary",
    title: "Terms of use | pdfcmprs",
    description: "Terms for the pdfcmprs website, documentation, and software.",
  },
};

export default function TermsPage() {
  return (
    <>
      <h1>Terms of use</h1>
      <p className="text-xs text-muted-foreground tabular-nums">
        Last updated <time dateTime="2026-09-30">30 September 2026</time>
      </p>
      <h2>Scope</h2>
      <p>
        These terms cover this website and its browser tools. The pdfcmprs
        software is governed by its license, described below. Using the site
        means you accept these terms.
      </p>
      <h2>Software license</h2>
      <p>
        pdfcmprs is open-source software released under the{" "}
        <a href="https://github.com/kacigaya/pdfcmprs/blob/main/LICENSE">
          GNU Affero General Public License v3.0 or later
        </a>
        . The license alone sets your rights to use, modify, and redistribute
        the code, and nothing here narrows or extends it. The documentation and
        site source live in the same repository under the same license unless a
        file says otherwise.
      </p>
      <h2>Responsible use</h2>
      <p>
        Process only documents you are entitled to use. You are responsible
        for complying with applicable data protection, copyright, and other
        laws. Keep original files and check exported results before relying on
        them. If you use signing or timestamping, you are responsible for the
        certificate and service you choose.
      </p>
      <h2>Documentation and results</h2>
      <p>
        Documentation and examples are provided for information and may lag
        the latest release. Results depend on your inputs and environment;
        review them before relying on them.
      </p>
      <h2>No warranty</h2>
      <p>
        The site, documentation, and software are provided “as is”, without
        warranties of any kind. To the extent the law allows, the operator is
        not liable for damages arising from their use, including loss of
        data or claims by third parties. Nothing here limits liability that cannot be limited by law, or rights you hold as a
        consumer.
      </p>
      <h2>Trademarks</h2>
      <p>
        Third-party names and marks belong to their owners. References to
        them describe compatibility or functionality. pdfcmprs is not
        affiliated with or endorsed by those owners.
      </p>
      <h2>Governing law</h2>
      <p>
        These terms are governed by French law. If you are a consumer, you also
        keep the protection of the mandatory rules of your country of
        residence.
      </p>
      <h2>Changes and contact</h2>
      <p>
        These terms may change; the date above identifies the latest revision.
        Questions go to{" "}
        <a href="mailto:contact@gaya.anonaddy.com">contact@gaya.anonaddy.com</a>
        .
      </p>
      <p>
        <Link href="/legal-notice">Legal notice</Link> ·{" "}
        <Link href="/privacy">Privacy policy</Link> ·{" "}
        <Link href="/">Back to pdfcmprs</Link>
      </p>
    </>
  );
}
