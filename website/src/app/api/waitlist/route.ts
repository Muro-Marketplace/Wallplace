// UK compliance audit, 10 September 2026, finding DP-16.
//
// This route used the ANON client for its insert, which is why the table
// carried an always-true `WITH CHECK (true)` INSERT policy for anon. The
// publishable key ships in the browser bundle, so that policy let anyone write
// rows straight into a table an admin reads, skipping this route's zod
// validation, its rate limit and its notification side effects.
//
// The route runs server side and has the service-role key, so there was never
// a reason for the anon path. Switched to the admin client, which is what
// every other write route here does; migration 143 then drops the policy and
// revokes the grant behind it. Both halves are needed and the order matters:
// dropping the policy while this still used the anon client would have taken
// the form offline.
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { waitlistSchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/send";
import { CustomerWaitlistConfirmation } from "@/emails/templates/customer-sales/CustomerWaitlistConfirmation";
import { afterResponse } from "@/lib/after-response";

export async function POST(request: Request) {
  const limited = await checkRateLimit(request, 5, 60000);
  if (limited) return limited;
  try {
    const body = await request.json();
    const parsed = waitlistSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Name, email, and user type are required" },
        { status: 400 }
      );
    }

    const { name, email, userType, phone, venueName, venueLocation } = parsed.data;

    // The inserted row's id keys the confirmation below. Email audit
    // 2026-09-03 (fix 5): it was keyed on the bare address, so anyone removed
    // from the list and signing up again was silently swallowed by the
    // idempotency guard for ever. One signup, one key.
    const { data: inserted, error } = await getSupabaseAdmin()
      .from("waitlist_signups")
      .insert({
        name,
        email,
        user_type: userType,
        // Migration 129. The form asks for these three and they were discarded
        // at the validation boundary, so a venue's own name and location, the
        // only things that make this list workable, were thrown away every time.
        // `|| null` rather than "" so a blank field reads as "not given" instead
        // of as an empty answer.
        phone: phone || null,
        venue_name: venueName || null,
        venue_location: venueLocation || null,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle<{ id: string }>();

    // E36d. A duplicate used to answer 409 "This email is already on the
    // waitlist", making a public unauthenticated form an account-existence
    // oracle. Byte-identical output to a fresh signup now; the signal moves to
    // a server log line, which is where it belonged.
    const alreadyOnList = error?.code === "23505";
    if (alreadyOnList) {
      console.warn("[waitlist] duplicate signup for an existing email");
    } else if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 }
      );
    }

    // E36d. Off the response path: awaiting the send here made the fresh branch
    // measurably slower than the duplicate one, so identical status codes would
    // still have leaked through latency.
    if (!alreadyOnList) {
      const signupRef = inserted?.id ?? `t${Date.now()}`;
      afterResponse(() =>
        sendEmail({
          idempotencyKey: `customer_waitlist_confirmation:${signupRef}`,
          template: "customer_waitlist_confirmation",
          category: "security",
          to: email,
          subject: "You're on the Wallplace waitlist",
          react: CustomerWaitlistConfirmation({
            firstName: (name || "there").split(" ")[0],
          }),
          metadata: { userType },
        }),
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
