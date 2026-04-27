import type { Metadata } from "next";
import { DM_Sans, Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pdfcmprs.vercel.app"),
  title: "pdfcmprs — A press for your PDFs",
  description:
    "Compress, merge, and split your PDFs directly in the browser. No server upload, fully offline.",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "pdfcmprs — A press for your PDFs",
    description:
      "Compress, merge, and split your PDFs directly in the browser. No server upload, fully offline.",
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
    title: "pdfcmprs — A press for your PDFs",
    description:
      "Compress, merge, and split your PDFs directly in the browser. No server upload, fully offline.",
    images: [
      {
        url: "/pdfcmprs-banner.png",
        alt: "pdfcmprs preview banner",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fraunces.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
