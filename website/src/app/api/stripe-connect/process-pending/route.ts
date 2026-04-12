import { NextResponse } from "next/server";
import { processPendingTransfers } from "@/lib/stripe-connect";

/**
 * POST /api/stripe-connect/process-pending
 *
 * Processes all pending transfers that have passed their 14-day hold period.
 * Call this via a cron job (e.g. Vercel Cron, daily) or manually from admin.
 *
 * Protected by a simple secret token to prevent abuse.
 */
export async function POST(request: Request) {
  // Simple auth — check for admin secret or admin auth
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processPendingTransfers();
    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors?.length ? result.errors : undefined,
    });
  } catch (err) {
    console.error("Process pending transfers error:", err);
    return NextResponse.json(
      { error: "Failed to process pending transfers" },
      { status: 500 }
    );
  }
}
