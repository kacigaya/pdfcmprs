import { Navbar } from "@/components/site/navbar";
import { SiteFooter } from "./components/site/SiteFooter";
import { ToolCatalog } from "./components/site/ToolCatalog";

export default function HomePage() {
  return (
    <div className="relative z-10">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 pt-10 pb-16 sm:px-6">
        <section className="mb-8 animate-rise-in">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            Browser PDF toolkit
          </p>
          <h1 className="mt-2 max-w-[22ch] text-balance font-heading text-4xl leading-[1.05] tracking-tight sm:text-5xl">
            PDF tools that stay{" "}
            <em className="italic text-primary">on your device</em>
          </h1>
          <p className="mt-3 max-w-[52ch] text-pretty font-heading italic text-lg leading-normal text-muted-foreground">
            Compress, merge, split, convert, and sign PDFs right in your
            browser. Your files never leave your machine.
          </p>
        </section>

        <ToolCatalog />
      </main>
      <SiteFooter />
    </div>
  );
}
