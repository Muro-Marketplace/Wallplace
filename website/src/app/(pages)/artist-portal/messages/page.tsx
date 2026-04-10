"use client";

import ArtistPortalLayout from "@/components/ArtistPortalLayout";
import MessageInbox from "@/components/MessageInbox";
import { useAuth } from "@/context/AuthContext";
import { artists } from "@/data/artists";

const artist = artists[0];

export default function ArtistMessagesPage() {
  const { displayName } = useAuth();

  // Use the artist slug - in production this would come from the user's profile
  const userSlug = artist.slug;

  return (
    <ArtistPortalLayout activePath="/artist-portal/messages">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl">Messages</h1>
        <p className="text-sm text-muted mt-1">Enquiries and conversations with venues and buyers</p>
      </div>
      <MessageInbox userSlug={userSlug} portalType="artist" />
    </ArtistPortalLayout>
  );
}
