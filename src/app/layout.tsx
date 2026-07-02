import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import AuthCodeHandler from "@/components/auth/AuthCodeHandler";
import SessionTimeoutManager from "@/components/auth/SessionTimeoutManager";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Limited Search — AI-Powered Search Engine",
    template: "%s | Limited Search",
  },
  description:
    "Search across the web, films, and music with AI. Get instant answers powered by Gemini AI, Brave Search, TMDB, and Spotify.",
  keywords: [
    "AI search engine",
    "web search",
    "film search",
    "music search",
    "Gemini AI",
    "universal search",
  ],
  authors: [{ name: "Limited Search" }],
  creator: "Limited Search",
  publisher: "Limited Search",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "https://www.limited-search.com",
    siteName: "Limited Search",
    title: "Limited Search — AI-Powered Search Engine",
    description:
      "Search across the web, films, and music with AI. Get instant answers powered by Gemini AI.",
    images: [
      {
        url: "https://www.limited-search.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Limited Search — AI-Powered Search Engine",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Limited Search — AI-Powered Search Engine",
    description: "Search across the web, films, and music with AI.",
    images: ["https://www.limited-search.com/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: "/favicon.ico",
  },
  manifest: "/site.webmanifest",
  metadataBase: new URL("https://www.limited-search.com"),
  alternates: {
    canonical: "https://www.limited-search.com",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.className} bg-[#212121] text-white antialiased`}
      >
        <Suspense fallback={null}>
          <AuthCodeHandler />
        </Suspense>
        <SessionTimeoutManager />
        {children}
      </body>
    </html>
  );
}
