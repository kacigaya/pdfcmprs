import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { AppRuntime } from "./components/site/AppRuntime";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pdfcmprs.netlify.app"),
  title: "pdfcmprs: Browser PDF tools",
  description:
    "Compress, merge, split, inspect, extract text from, and convert PDFs in your browser.",
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "pdfcmprs: Browser PDF tools",
    description:
      "Compress, merge, split, inspect, extract text from, and convert PDFs in your browser.",
    siteName: "pdfcmprs",
    images: [
      {
        url: "/pdfcmprs-banner.png",
        width: 1200,
        height: 630,
        alt: "pdfcmprs preview banner",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "pdfcmprs: Browser PDF tools",
    description:
      "Compress, merge, split, inspect, extract text from, and convert PDFs in your browser.",
    images: [
      {
        url: "/pdfcmprs-banner.png",
        alt: "pdfcmprs preview banner",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1ead8" },
    { media: "(prefers-color-scheme: dark)", color: "#14110d" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Resolve the theme before first paint, otherwise dark users see a light flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var s=localStorage.getItem("theme");if(s?s==="dark":matchMedia("(prefers-color-scheme: dark)").matches)document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
      </head>
      <body
        className={`${fraunces.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
      >
        <ThemeProvider><AppRuntime />{children}</ThemeProvider>
      </body>
    </html>
  );
}
