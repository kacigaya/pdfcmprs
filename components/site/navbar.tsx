"use client";

import { buttonVariants } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="sticky top-3 z-40 px-4 sm:px-6">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 rounded-2xl border border-border bg-card/85 px-4 shadow-xs backdrop-blur sm:px-5">
        <a
          href="/"
          className="font-heading text-2xl leading-none tracking-tight text-foreground"
        >
          pdf
          <em className="-ml-[0.04em] italic text-primary">cmprs</em>
        </a>
        <div className="flex items-center gap-3">
          <a
            className={buttonVariants({ variant: "outline", size: "sm" })}
            href="https://github.com/kacigaya/pdfcmprs"
            target="_blank"
            rel="noreferrer"
            // AGPL-3.0 section 13: offer the corresponding source to users.
            title="Source code (AGPL-3.0)"
          >
            Source
          </a>
        </div>
      </div>
    </header>
  );
}
