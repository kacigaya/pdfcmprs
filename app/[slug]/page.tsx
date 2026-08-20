import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/site/navbar";
import { ToolShell } from "../components/pdf/ToolShell";
import { SiteFooter } from "../components/site/SiteFooter";
import { CATEGORIES, getTool, TOOLS } from "../features/pdf/registry";

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
      title: `${tool.title} | pdfcmprs`,
      description: tool.summary,
      url: `/${tool.slug}`,
    },
    twitter: {
      title: `${tool.title} | pdfcmprs`,
      description: tool.summary,
    },
  };
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();
  const category = CATEGORIES.find((item) => item.id === tool.category);

  return (
    <div className="relative z-10">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 pt-10 pb-16 sm:px-6">
        <Link
          href={`/?category=${tool.category}#catalog`}
          className="mb-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          All tools <span aria-hidden>/</span> {category?.label}
        </Link>
        <ToolShell slug={tool.slug} />
      </main>
      <SiteFooter />
    </div>
  );
}
