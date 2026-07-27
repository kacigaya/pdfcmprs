"use client";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-screen max-w-lg place-content-center gap-4 px-6 text-center">
      <h1 className="font-heading text-4xl">Page not found</h1>
      <p className="text-muted-foreground">That PDF tool does not exist.</p>
      <a className={buttonVariants()} href="/">Back to pdfcmprs</a>
    </main>
  );
}
