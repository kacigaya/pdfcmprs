import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/site/navbar";
import { ToolShell } from "../components/pdf/ToolShell";
import { SiteFooter } from "../components/site/SiteFooter";
import { getTool, TOOLS } from "../features/pdf/registry";

export const dynamicParams = false;

interface ToolPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return TOOLS.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({
  params,
}: ToolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) return {};
  return {
    title: tool.title,
    description: tool.summary,
    alternates: { canonical: `/${tool.slug}` },
    openGraph: {
      title: `${tool.title} — pdfcmprs`,
      description: tool.summary,
      url: `/${tool.slug}`,
    },
    twitter: {
      title: `${tool.title} — pdfcmprs`,
      description: tool.summary,
    },
  };
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();

  return (
    <div className="relative z-10">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 pt-10 pb-16 sm:px-6">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          All tools
        </Link>
        <ToolShell slug={tool.slug} />
      </main>
      <SiteFooter />
    </div>
  );
}
