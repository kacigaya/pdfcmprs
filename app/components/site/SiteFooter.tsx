const SOURCE_URL = "https://github.com/kacigaya/pdfcmprs";

export function SiteFooter() {
  return (
    <footer className="mx-auto flex w-full max-w-6xl flex-wrap justify-between gap-3 border-t border-border px-4 py-6 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground sm:px-6">
      <span>Processed client-side · No server upload</span>
      <span>
        {/* AGPL-3.0 section 13: users interacting over a network are offered the source. */}
        <a
          href={SOURCE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-foreground"
        >
          Source (AGPL-3.0)
        </a>
        {" · "}
        <span translate="no">
          <em className="font-heading normal-case italic tracking-normal">
            pdfcmprs
          </em>
        </span>{" "}
        · {new Date().getFullYear()}
      </span>
    </footer>
  );
}
