import { Navbar } from "@/components/site/navbar";
import { PdfWorkspace } from "./components/pdf/PdfWorkspace";

export default function HomePage() {
  return (
    <div className="relative z-10">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 pt-10 pb-16 sm:px-6">
        <PdfWorkspace />
      </main>
      <footer className="mx-auto flex w-full max-w-6xl flex-wrap justify-between gap-3 border-t border-border px-4 py-6 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground sm:px-6">
        <span>Processed client-side · No server upload</span>
        <span>
          <a
            href="https://github.com/kacigaya/pdfcmprs"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-foreground"
          >
            GitHub
          </a>
          {" · "}
          <em className="font-heading normal-case italic tracking-normal">
            pdfcmprs
          </em>{" "}
          · {new Date().getFullYear()}
        </span>
      </footer>
    </div>
  );
}
