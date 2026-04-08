"use client";

import { CartProvider } from "@/context/CartContext";
import { SavedProvider } from "@/context/SavedContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <SavedProvider>{children}</SavedProvider>
    </CartProvider>
  );
}
