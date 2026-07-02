import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import "./globals.css";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: {
    default: "Limited Search — AI-Powered Search",
    template: "%s | Limited Search",
  },
  description:
    "Ask anything and get cited, up-to-date answers from the web — powered by AI.",
  keywords: ["AI search engine", "web search", "AI answers", "Limited Search"],
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
    locale: "en_US",
    url: "https://www.limited-search.com",
    siteName: "Limited Search",
    title: "Limited Search — AI-Powered Search",
    description:
      "Ask anything and get cited, up-to-date answers from the web — powered by AI.",
  },
  twitter: {
    card: "summary",
    title: "Limited Search — AI-Powered Search",
    description:
      "Ask anything and get cited, up-to-date answers from the web — powered by AI.",
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          geistSans.variable,
          geistMono.variable,
          "font-sans antialiased",
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
