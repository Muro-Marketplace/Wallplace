import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-14 lg:pt-16">{children}</main>
      <Footer />
    </div>
  );
}
