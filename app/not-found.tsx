"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main-content" className="mx-auto grid min-h-screen max-w-lg place-content-center gap-4 px-6 text-center">
      <h1 className="text-balance font-heading text-4xl">Page Not Found</h1>
      <p className="text-pretty text-muted-foreground">That PDF tool does not exist.</p>
      <Link className={buttonVariants()} href="/">
        Back to <span translate="no">pdfcmprs</span>
      </Link>
    </main>
  );
}
