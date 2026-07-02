import type { ReactNode } from "react";

interface PanelHeaderProps {
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
}

export function PanelHeader({ eyebrow, title, lede }: PanelHeaderProps) {
  return (
    <header className="mb-6 border-b border-border pb-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        {eyebrow}
      </p>
      <h2 className="mt-1 font-heading text-3xl leading-tight tracking-tight sm:text-4xl [&_em]:italic [&_em]:text-primary">
        {title}
      </h2>
      {lede ? (
        <p className="mt-3 max-w-[52ch] font-heading italic leading-normal text-muted-foreground [&_em]:text-primary">
          {lede}
        </p>
      ) : null}
    </header>
  );
}
