import type { Metadata } from "next";
import { Suspense } from "react";
import { Manrope, Newsreader } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { TopNav, BottomNav, Toast } from "@/components/layout";
import { ThemeProvider } from "next-themes";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: "Kairoku — Remember every story",
  description:
    "Track the anime you watch, write down what you felt, and never miss the next episode.",
  openGraph: {
    title: "Kairoku — Remember every story",
    description: "Your personal anime journal. Track, rate, review, remember.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth" className={`${manrope.variable} ${newsreader.variable}`}>
      <body className="min-h-screen">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <StoreProvider>
            <Suspense>
              <TopNav />
            </Suspense>
            <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 md:pb-12">
              {children}
            </main>
            <Suspense>
              <BottomNav />
            </Suspense>
            <Toast />
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
