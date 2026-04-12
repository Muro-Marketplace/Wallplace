"use client";

import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { SavedProvider } from "@/context/SavedContext";
import { CookieConsentProvider } from "@/context/CookieConsentContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CookieConsentProvider>
      <AuthProvider>
        <CartProvider>
          <SavedProvider>{children}</SavedProvider>
        </CartProvider>
      </AuthProvider>
    </CookieConsentProvider>
  );
}
