"use client";

import VenuePortalLayout from "@/components/VenuePortalLayout";
import MessageInbox from "@/components/MessageInbox";
import { useAuth } from "@/context/AuthContext";

export default function VenueMessagesPage() {
  const { displayName } = useAuth();

  // Use display name as slug identifier — in production would be venue slug
  const userSlug = displayName || "venue";

  return (
    <VenuePortalLayout>
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl">Messages</h1>
        <p className="text-sm text-muted mt-1">Conversations with artists</p>
      </div>
      <MessageInbox userSlug={userSlug} portalType="venue" />
    </VenuePortalLayout>
  );
}
