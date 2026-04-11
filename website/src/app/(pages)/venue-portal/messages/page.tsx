"use client";

import { useSearchParams } from "next/navigation";
import VenuePortalLayout from "@/components/VenuePortalLayout";
import MessageInbox from "@/components/MessageInbox";
import { useCurrentVenue } from "@/hooks/useCurrentVenue";

export default function VenueMessagesPage() {
  const { venue, loading } = useCurrentVenue();
  const searchParams = useSearchParams();

  const initialArtistSlug = searchParams.get("artist") || undefined;
  const initialArtistName = searchParams.get("artistName") || undefined;

  // Wait for venue profile to load so we have the correct slug
  if (loading || !venue?.slug) {
    return (
      <VenuePortalLayout>
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl">Messages</h1>
          <p className="text-sm text-muted mt-1">Conversations with artists</p>
        </div>
        <p className="text-muted text-sm py-16 text-center">Loading messages...</p>
      </VenuePortalLayout>
    );
  }

  return (
    <VenuePortalLayout>
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl">Messages</h1>
        <p className="text-sm text-muted mt-1">Conversations with artists</p>
      </div>
      <MessageInbox
        userSlug={venue.slug}
        portalType="venue"
        initialArtistSlug={initialArtistSlug}
        initialArtistName={initialArtistName}
      />
    </VenuePortalLayout>
  );
}
