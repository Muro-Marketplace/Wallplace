"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { portalPathForRole } from "@/lib/auth-roles";

/**
 * Wraps signup / register pages. If a user is already logged in, send
 * them to their portal so they can't accidentally create a duplicate
 * account or be confused by a fresh signup form.
 */
export default function RedirectIfLoggedIn({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, userType, loading } = useAuth();

  useEffect(() => {
    if (loading || !user) return;
    router.replace(portalPathForRole(userType));
  }, [loading, user, userType, router]);

  if (!loading && user) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-sm text-muted">You&rsquo;re already signed in. Redirecting&hellip;</p>
      </div>
    );
  }

  return <>{children}</>;
}
