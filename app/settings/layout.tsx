import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageUrl } from "../lib/assets";

export const metadata: Metadata = {
  title: "Settings | pdfcmprs",
  description: "Set catalog language, content width, and keyboard shortcuts.",
  alternates: { canonical: pageUrl("/settings") },
  openGraph: {
    title: "Settings | pdfcmprs",
    description: "Set catalog language, content width, and keyboard shortcuts.",
    url: pageUrl("/settings"),
  },
};

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return children;
}
