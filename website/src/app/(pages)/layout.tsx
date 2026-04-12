"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPortal = pathname?.startsWith("/artist-portal") || pathname?.startsWith("/venue-portal") || pathname?.startsWith("/customer-portal") || pathname?.startsWith("/admin");

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-14 lg:pt-16">{children}</main>
      {!isPortal && <Footer />}
    </div>
  );
}
