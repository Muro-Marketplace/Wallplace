// /api/account/delete — POST GDPR right-to-erasure (hard delete).
//
// Hard-deletes the authenticated user's auth row + every profile / artefact
// owned by them. Idempotent at row level (DELETE WHERE matches nothing
// returns success).
//
// This sits alongside DELETE /api/account, which is a soft-delete /
// anonymisation flow. The two endpoints intentionally serve different
// purposes:
//   - DELETE /api/account     anonymises rows but preserves order history
//                             for tax/compliance reasons (confirm: "DELETE")
//   - POST   /api/account/delete   hard-erases everything we own
//                                  (confirm: "DELETE MY ACCOUNT")
//
// One policy is shared with the sibling, not different (C14a): orders and
// refund_requests are financial records with a lawful retention basis, so
// even the hard path RETAINS those rows and anonymises the personal
// identifiers in them (buyer_email, the name/address inside the shipping
// json, requester_email) instead of deleting them. This route used to
// hard-delete both, contradicting the retention policy the sibling
// documents.
//
// The confirmation string is a soft seatbelt against XSS / replay — a
// CSRF-style fluke can't accidentally delete an account because the body
// has to literally read "DELETE MY ACCOUNT".
//
// Security: userId comes from auth.user.id (the verified bearer token),
// NEVER from anything in the request body. A caller who smuggles
// `{ user_id: "..." }` cannot delete someone else's account. The
// email-keyed passes below match only the account's own verified email
// (auth.user.email), so they can never scrub another person's rows.
//
// Migration audit (2026-05-02): tables in TABLES_USER_ID below were verified
// against supabase/migrations/*.sql. Tables that were in the original plan
// but do not exist (e.g. messages.recipient_id — the actual column is
// recipient_user_id) have been corrected. Tables added after the plan was
// drafted (visualizer suite from 035, purchase_offers from 045, artwork
// requests/responses/commissions from 046, feature_requests from 044,
// placement_records/photos/archives/reviews, terms/email/curation rows)
// are now included.
//
// Two gaps this route carried for a long time are closed as of the UK
// compliance audit (10 September 2026, finding DP-7):
//
//   Storage. Not one object was ever deleted. A deleted artist's artwork
//   images and their avatar, which is often a photograph of them, stayed in
//   public buckets at working URLs forever. purgeUserStorage now clears every
//   bucket, paged, before the row deletes.
//
//   Email-keyed PII. newsletter_subscribers, email_suppressions,
//   artist_applications, venue_registrations, contact_submissions, enquiries
//   and the email_events rows with a null user_id were documented as
//   persisting by design. They are erased now, matched strictly against the
//   account's own VERIFIED email so this can never reach another person's rows.
//
// One email-keyed row is deliberately NOT deleted: an `email_suppressions`
// entry with reason 'complaint' or 'hard_bounce' is the record that stops us
// mailing an address. Deleting it on erasure would let a re-signup resume mail
// to an address that had asked us to stop. See the pass below, which keeps
// those two reasons and clears the rest.

import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendEmail } from "@/lib/email/send";
import { AccountDeletionConfirmed } from "@/emails/templates/account/AccountDeletionConfirmed";
import { AccountDeletionRequested } from "@/emails/templates/account/AccountDeletionRequested";
import {
  ERASURE_TABLES,
  ERASURE_TABLES_BY_EMAIL,
  purgeUserStorage,
} from "@/lib/account-erasure";

const CONFIRM_STRING = "DELETE MY ACCOUNT";

/**
 * Suppression reasons that go with the account.
 *
 * `complaint` and `hard_bounce` are deliberately absent. Those two are not the
 * user's data to remove: they are the record of an address asking us to stop,
 * or of it not existing. Deleting them on erasure would let a re-signup resume
 * mail to an address that had opted out, which is the PECR failure the
 * suppression list exists to prevent.
 */
const REMOVABLE_SUPPRESSION_REASONS = ["soft_bounce", "unsubscribe", "manual", "invalid"];
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://wallplace.co.uk").replace(/\/$/, "");

// Email audit, 2026-09-04. Two account templates existed for this flow and
// nothing sent them. Now:
//
//   account_deletion_confirmed  after auth.admin.deleteUser succeeds, to the
//                               address captured from the token before the
//                               user was removed. No userId on the send: the
//                               auth user is gone and every row keyed to it
//                               was just deleted, so the event row must not
//                               reference it.
//   account_deletion_requested  ONLY on the retained path below, where the
//                               scrub could not finish and support completes
//                               the erasure by hand. That is the one state in
//                               which "scheduled, and you can still cancel"
//                               is true; on the ordinary path the account is
//                               erased in this same request, and a "you can
//                               cancel" email a second before "it is deleted"
//                               would be a lie. The Stripe-abort path sends
//                               nothing: nothing was removed and the response
//                               already says to try again.
//
// Both are keyed on the user id plus the request timestamp, so a retried
// request is a new event and a Vercel replay of the same one is not.

function firstNameOf(user: User): string {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const displayName = typeof meta.display_name === "string" ? meta.display_name : "";
  return displayName.trim().split(" ").filter(Boolean)[0] || "there";
}

/** Best-effort: the erasure outcome stands whatever the mail does. */
async function notifyDeletionRequested(
  email: string,
  userId: string,
  firstName: string,
  requestedAt: string,
): Promise<void> {
  if (!email) return;
  try {
    await sendEmail({
      idempotencyKey: `account_deletion_requested:${userId}:${requestedAt}`,
      template: "account_deletion_requested",
      category: "security",
      to: email,
      userId,
      subject: "Your Wallplace account is scheduled for deletion",
      react: AccountDeletionRequested({
        firstName,
        // No date: support finishes this by hand. Cancelling is a message to
        // support too, since nothing else can stop a manual erasure.
        cancelDeletionUrl: `${SITE}/support`,
        supportUrl: `${SITE}/support`,
      }),
      metadata: { requestedAt },
    });
  } catch (err) {
    console.error("[account/delete] deletion-requested email failed:", err);
  }
}

async function notifyDeletionConfirmed(
  email: string,
  userId: string,
  firstName: string,
  requestedAt: string,
): Promise<void> {
  if (!email) return;
  try {
    await sendEmail({
      idempotencyKey: `account_deletion_confirmed:${userId}:${requestedAt}`,
      template: "account_deletion_confirmed",
      category: "security",
      to: email,
      subject: "Your Wallplace account has been deleted",
      react: AccountDeletionConfirmed({ firstName, supportUrl: `${SITE}/support` }),
      metadata: { requestedAt },
    });
  } catch (err) {
    console.error("[account/delete] deletion-confirmed email failed:", err);
  }
}

// Tables to wipe rows from, keyed by the user_id (or equivalent) column.
// Order matters: child tables before parents so foreign-key cascades
// don't fight us. artist_profiles / venue_profiles / customer_profiles
// come last because other rows (artist_works, etc.) FK to them.
//
// orders and refund_requests are deliberately NOT in this list: they are
// retained and anonymised instead (C14a), see the passes after the loop.
// The list lives in src/lib/account-erasure.ts so this route and the sibling
// soft-delete cannot drift apart on what counts as the user's data.
const TABLES_USER_ID = ERASURE_TABLES;

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;

  // request.json() returns null (not an exception) when the body is
  // literal JSON `null`, so we must defensively guard against `body`
  // being null/undefined before reading `body.confirm`.
  let body: { confirm?: string } | null = {};
  try {
    body = await request.json();
  } catch {
    /* fall through — body stays {} and the confirm check below will fail */
  }

  if (!body || body.confirm !== CONFIRM_STRING) {
    return NextResponse.json(
      { error: `To confirm, the body must contain { "confirm": "${CONFIRM_STRING}" }.` },
      { status: 400 },
    );
  }

  const db = getSupabaseAdmin();
  const userId = auth.user!.id; // ← from verified bearer token, never from body
  const email = auth.user!.email || "";
  const anonTag = `[deleted-${userId.slice(0, 8)}]`;
  const requestedAt = new Date().toISOString();
  const firstName = firstNameOf(auth.user!);

  // C14c: every step is checked, and failures COLLECT rather than
  // short-circuit — same idiom as the sibling DELETE /api/account. A scrub
  // that stops at the first error leaves MORE data behind than one that
  // carries on and reports, and deleting the auth user anyway is what makes
  // failures invisible: the account is gone, so nobody can log in and
  // notice their data survived.
  const failures: string[] = [];

  // WS3.2 (missing-events gap 2, CRITICAL): deletion must stop the money.
  // Before this, a deleted person's Stripe subscriptions kept billing forever:
  // their SaaS plan, any paid-loan placements they were paying for as a
  // venue, and any managed curation retainer. Cancellation failures collect
  // like every other step, and a failure ABORTS the deletion below, because
  // "account gone, card still charged monthly" is the one outcome worse than
  // asking the user to try again.
  const cancelStripeSub = async (label: string, subId: string | null | undefined) => {
    if (!subId) return;
    try {
      const { stripe } = await import("@/lib/stripe");
      await stripe.subscriptions.cancel(subId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Already-cancelled or missing is the state we wanted.
      if (/canceled subscription/i.test(msg) || /No such subscription/i.test(msg)) return;
      failures.push(`${label}: ${msg}`);
    }
  };
  {
    const { data: artistRow } = await db
      .from("artist_profiles")
      .select("stripe_subscription_id")
      .eq("user_id", userId)
      .maybeSingle<{ stripe_subscription_id: string | null }>();
    await cancelStripeSub("stripe (artist plan)", artistRow?.stripe_subscription_id);

    const { data: paidLoans } = await db
      .from("placement_recurring_billings")
      .select("stripe_subscription_id, status")
      .eq("payer_user_id", userId)
      .in("status", ["active", "past_due", "paused"]);
    for (const row of (paidLoans || []) as Array<{ stripe_subscription_id: string | null; status: string }>) {
      await cancelStripeSub("stripe (paid loan)", row.stripe_subscription_id);
    }

    const { data: curations } = await db
      .from("curation_requests")
      .select("stripe_subscription_id, status")
      .eq("requester_user_id", userId)
      .in("status", ["in_progress", "past_due", "paused"]);
    for (const row of (curations || []) as Array<{ stripe_subscription_id: string | null; status: string }>) {
      await cancelStripeSub("stripe (curation)", row.stripe_subscription_id);
    }
  }

  // Abort BEFORE the scrub, not after. The generic failure check at the end of
  // this route refuses to delete the auth user, but by then the data is
  // already gone, which would leave the worst of both: a scrubbed account that
  // still exists and still cannot be deleted while Stripe stays unreachable.
  // Stopping here costs the user a retry and loses nothing.
  if (failures.length > 0) {
    console.error("[account/delete] aborted before scrub, Stripe cancel failed:", failures);
    return NextResponse.json(
      {
        error:
          "We could not stop your active billing, so we have not deleted anything yet. " +
          "Nothing has been removed and nothing has been charged. Please try again shortly, " +
          "or contact support and we will finish it by hand.",
      },
      { status: 500 },
    );
  }

  const step = async (label: string, run: () => PromiseLike<{ error: unknown } | void>) => {
    try {
      const result = await run();
      const err = result && typeof result === "object" && "error" in result ? result.error : null;
      if (err) {
        failures.push(`${label}: ${(err as { message?: string }).message ?? String(err)}`);
      }
    } catch (err) {
      failures.push(`${label}: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // 0. Storage first. If a bucket cannot be cleared the failure is collected
  //    and the auth user is retained below, so the person keeps an account they
  //    can log into while support finishes the job. Doing it before the row
  //    deletes matters: the rows are how support would find the files again.
  const storage = await purgeUserStorage(db, userId);
  failures.push(...storage.failures);

  // 1. Hard-delete the rows we own outright. delete().eq() matching no rows
  //    is a success path (`error: null, count: 0`).
  for (const { table, col } of TABLES_USER_ID) {
    await step(`${table}.${col}`, () => db.from(table).delete().eq(col, userId));
  }

  // 2. Retained financial records (C14a): keep the rows, strip the person.
  //    shipping holds the buyer's name and address; buyer_email /
  //    requester_email are the other PII columns. Mirrors step 4 of the
  //    sibling soft-delete.
  await step("orders (anonymise by user id)", () =>
    db.from("orders").update({ buyer_email: anonTag, shipping: {} }).eq("buyer_user_id", userId),
  );
  await step("refund_requests (anonymise by user id)", () =>
    db.from("refund_requests").update({ requester_email: anonTag }).eq("requester_user_id", userId),
  );

  // 3. Guest rows (C14b): orders placed while logged out carry no
  //    buyer_user_id, only the email typed at checkout, so the pass above
  //    never sees them. Match strictly by the account's own verified email
  //    so this can never touch another person's order.
  if (email) {
    await step("orders (anonymise by email)", () =>
      db.from("orders").update({ buyer_email: anonTag, shipping: {} }).eq("buyer_email", email),
    );
    await step("refund_requests (anonymise by email)", () =>
      db.from("refund_requests").update({ requester_email: anonTag }).eq("requester_email", email),
    );
    await step("purchase_offers (anonymise by email)", () =>
      db.from("purchase_offers").update({ buyer_email: anonTag }).eq("buyer_email", email),
    );

    // 3b. The email-keyed tables that used to be the documented gap. Matched
    //     against the VERIFIED email off the token, never a body value.
    for (const { table, col } of ERASURE_TABLES_BY_EMAIL) {
      if (table === "email_suppressions") continue; // handled just below
      await step(`${table}.${col}`, () => db.from(table).delete().eq(col, email));
    }

    // A suppression recorded because the recipient complained or the address
    // hard-bounced is not the user's data to remove: it is the record of them
    // asking us to stop, and deleting it would let a re-signup resume mail to
    // an address that had opted out. Anything else (a manual entry, an
    // unsubscribe) goes with the rest.
    await step("email_suppressions (non-complaint)", () =>
      db
        .from("email_suppressions")
        .delete()
        .in("reason", REMOVABLE_SUPPRESSION_REASONS)
        .eq("email", email),
    );
  }

  // Refuse to delete the auth user while personal data is still standing
  // (C14c). Same contract as the sibling: nothing gets half-removed, and
  // the person keeps an account they can log into while support finishes
  // the job by hand.
  if (failures.length > 0) {
    console.error("[account/delete] erasure incomplete, auth user RETAINED", { userId, failures });
    await notifyDeletionRequested(email, userId, firstName, requestedAt);
    return NextResponse.json(
      {
        error:
          "We could not fully delete your data, so we have not closed the account. " +
          "Nothing has been half-removed. Please contact support and we will finish it by hand.",
      },
      { status: 500 },
    );
  }

  const { error: deleteErr } = await db.auth.admin.deleteUser(userId);
  if (deleteErr) {
    console.error("[account/delete] auth.deleteUser failed:", deleteErr);
    return NextResponse.json(
      { error: "Could not complete account deletion. Contact support." },
      { status: 500 },
    );
  }

  await notifyDeletionConfirmed(email, userId, firstName, requestedAt);
  return NextResponse.json({ ok: true });
}
