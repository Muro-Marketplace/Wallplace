"use client";

import { use } from "react";
import PlacementDetailClient from "./PlacementDetailClient";

export default function PlacementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <PlacementDetailClient placementId={id} />;
}
