import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif-display",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Wallspace — Curated Art for Commercial Spaces",
  description:
    "Wallspace is a curated art marketplace connecting independent venues with emerging and established artists. Source artwork risk-free. Get discovered by commercial spaces.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${dmSerifDisplay.variable}`}
    >
      <body className="min-h-screen flex flex-col antialiased">
        <Header />
        <main className="flex-1 pt-14 lg:pt-16">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
