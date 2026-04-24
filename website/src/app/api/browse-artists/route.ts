import { NextResponse } from "next/server";
import { getAllArtists } from "@/lib/db/merged-data";
import { checkRateLimit } from "@/lib/rate-limit";

// GET: return all artists (static + database) for the browse page
export async function GET(request: Request) {
  const limited = await checkRateLimit(request, 60, 60000);
  if (limited) return limited;
  try {
    const artists = await getAllArtists();
    return NextResponse.json({ artists });
  } catch (err) {
    console.error("Browse artists error:", err);
    return NextResponse.json({ artists: [] }, { status: 500 });
  }
}

// Revalidate every 60 seconds for ISR-like behavior
export const revalidate = 60;
