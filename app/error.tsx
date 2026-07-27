"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto grid min-h-screen max-w-lg place-content-center gap-4 px-6 text-center">
      <h1 className="font-heading text-4xl">Something went wrong</h1>
      <p className="text-muted-foreground">Your files remain on this device. Try the action again.</p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
