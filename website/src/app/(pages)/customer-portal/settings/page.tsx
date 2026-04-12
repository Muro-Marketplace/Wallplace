"use client";

import { useState, useEffect } from "react";
import CustomerPortalLayout from "@/components/CustomerPortalLayout";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

const PREFS_KEY = "wallplace-notification-prefs";

interface NotificationPrefs {
  orderUpdates: boolean;
  newArtwork: boolean;
  newsletter: boolean;
}

const defaultPrefs: NotificationPrefs = {
  orderUpdates: true,
  newArtwork: false,
  newsletter: false,
};

export default function CustomerSettingsPage() {
  const { user, displayName } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(PREFS_KEY);
    if (stored) {
      try {
        setPrefs({ ...defaultPrefs, ...JSON.parse(stored) });
      } catch {
        /* ignore */
      }
    }
  }, []);

  function updatePref(key: keyof NotificationPrefs, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  }

  async function handlePasswordReset() {
    if (!user?.email) return;
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetLoading(false);
    if (!error) setResetSent(true);
  }

  return (
    <CustomerPortalLayout>
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl">Settings</h1>
        <p className="text-sm text-muted mt-1">Manage your account and preferences</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Account Details */}
        <div className="bg-surface border border-border rounded-sm p-6">
          <h2 className="text-base font-medium mb-4">Account Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-muted uppercase tracking-wider mb-1">Name</label>
              <p className="text-sm text-foreground bg-background border border-border rounded-sm px-3 py-2">
                {displayName || "Not set"}
              </p>
            </div>
            <div>
              <label className="block text-xs text-muted uppercase tracking-wider mb-1">Email</label>
              <p className="text-sm text-foreground bg-background border border-border rounded-sm px-3 py-2">
                {user?.email || "Not set"}
              </p>
            </div>
            <div>
              <label className="block text-xs text-muted uppercase tracking-wider mb-1">Password</label>
              {resetSent ? (
                <p className="text-sm text-accent">Password reset email sent. Check your inbox.</p>
              ) : (
                <button
                  onClick={handlePasswordReset}
                  disabled={resetLoading}
                  className="text-sm text-accent hover:text-accent-hover transition-colors disabled:opacity-50"
                >
                  {resetLoading ? "Sending..." : "Change Password"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="bg-surface border border-border rounded-sm p-6">
          <h2 className="text-base font-medium mb-4">Notification Preferences</h2>
          <div className="space-y-3">
            {([
              { key: "orderUpdates" as const, label: "Order updates" },
              { key: "newArtwork" as const, label: "New artwork from saved artists" },
              { key: "newsletter" as const, label: "Newsletter" },
            ]).map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs[key]}
                  onChange={(e) => updatePref(key, e.target.checked)}
                  className="w-4 h-4 rounded border-border text-accent focus:ring-accent/30"
                />
                <span className="text-sm text-foreground">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-surface border border-red-200 rounded-sm p-6">
          <h2 className="text-base font-medium text-red-700 mb-2">Danger Zone</h2>
          <p className="text-sm text-foreground mb-1">Delete my account</p>
          <p className="text-sm text-muted">
            Contact{" "}
            <a href="mailto:hello@wallplace.co.uk" className="text-accent hover:text-accent-hover transition-colors">
              hello@wallplace.co.uk
            </a>{" "}
            to delete your account. This action is permanent and cannot be undone.
          </p>
        </div>
      </div>
    </CustomerPortalLayout>
  );
}
