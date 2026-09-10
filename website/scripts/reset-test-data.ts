#!/usr/bin/env tsx
/**
 * Clear the pre-launch test transactions from a Wallplace database.
 *
 *   SUPABASE_SERVICE_ROLE_KEY=... npm run data:reset-test        # dry run
 *   SUPABASE_SERVICE_ROLE_KEY=... npm run data:reset-test -- --apply
 *
 * WHY THIS EXISTS.
 *
 * The 10 September 2026 launch RAG told the owner to "clear them with the
 * test-data reset". No such reset existed; the phrase named a script nobody had
 * written, and acting on it by hand is where the damage would have come from.
 *
 * WHAT IT IS FOR, and what it is NOT for.
 *
 * Every payment taken on Wallplace up to 10 September 2026 was a test. That is
 * the owner's own statement, and it is the only thing that makes deleting
 * financial records defensible. Read that sentence again before running this
 * with --apply against any database where it might not be true.
 *
 * This is deliberately all-or-nothing over the order set. An earlier audit
 * proposed clearing the six orders that carry no artist_user_id, which is worse
 * than clearing all of them or none: those six are not a distinct population,
 * they are the six that audit happened to notice. Nineteen of nineteen orders
 * are test payments, so a partial clear leaves thirteen identical rows behind
 * and makes the data harder to reason about, not easier.
 *
 * THE ORDER OF DELETION IS NOT ARBITRARY. From the live FK graph:
 *
 *   refund_requests.order_id -> orders          ON DELETE RESTRICT
 *       so refund_requests must go first, or the orders delete simply fails.
 *
 *   order_events.order_id -> orders             NO FOREIGN KEY AT ALL
 *       nothing cascades and nothing complains. Delete these explicitly or
 *       they survive as rows pointing at orders that no longer exist. This is
 *       the trap in the whole job: the database will not warn you.
 *
 *   stripe_transfers                            keyed by order, checked below
 *   purchase_offers.paid_order_id -> orders     nullable pointer, cleared
 *
 * WHAT IT LEAVES ALONE, on purpose:
 *
 *   artists, venues, works, placements, messages. None of that is a test
 *   payment. Placements in particular are real supply (91 rows) and a
 *   placement whose status is 'sold' is a record of a decision somebody made.
 *
 *   curation_requests, refund_requests and purchase_offers that were already
 *   voided rather than deleted by migration 147. Those rows are the only
 *   evidence their chains were ever exercised at all, which is worth keeping
 *   for a platform whose settlement path has never run with real money.
 *
 * BEFORE YOU RUN IT WITH --apply: schema backup_20260910 holds a full copy of
 * every table below, taken by migration 146. If that schema has been dropped,
 * take a fresh snapshot first. There is no point-in-time recovery on this
 * project; the Supabase organisation is on the free plan.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");

type Counts = Record<string, number>;

function client(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL is required");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function countOf(db: SupabaseClient, table: string): Promise<number> {
  const { count, error } = await db.from(table).select("*", { count: "exact", head: true });
  if (error) throw new Error(`counting ${table}: ${error.message}`);
  return count ?? 0;
}

/** Every order id, which is what the child cleanups key off. */
async function orderIds(db: SupabaseClient): Promise<string[]> {
  const { data, error } = await db.from("orders").select("id");
  if (error) throw new Error(`reading orders: ${error.message}`);
  return (data ?? []).map((row) => String(row.id));
}

async function main(): Promise<void> {
  const db = client();
  const ids = await orderIds(db);

  const before: Counts = {
    orders: ids.length,
    order_events: await countOf(db, "order_events"),
    refund_requests: await countOf(db, "refund_requests"),
    stripe_transfers: await countOf(db, "stripe_transfers"),
  };

  console.log(APPLY ? "APPLYING" : "DRY RUN, nothing will be written");
  console.log("Rows currently present:");
  for (const [table, n] of Object.entries(before)) {
    console.log(`  ${table.padEnd(18)} ${n}`);
  }

  if (ids.length === 0) {
    console.log("\nNo orders. Nothing to do.");
    return;
  }

  if (!APPLY) {
    console.log(
      "\nWith --apply this would delete, in this order:" +
        "\n  1. refund_requests for those orders   (RESTRICT: must precede orders)" +
        "\n  2. stripe_transfers for those orders" +
        "\n  3. order_events for those orders      (NO FK: will not cascade, will not warn)" +
        "\n  4. purchase_offers.paid_order_id cleared, the offers themselves kept" +
        "\n  5. the orders themselves" +
        "\n\nRe-run with --apply once schema backup_20260910 is confirmed present.",
    );
    return;
  }

  // 1. RESTRICT parent, so this genuinely must come first.
  const { error: refundErr } = await db.from("refund_requests").delete().in("order_id", ids);
  if (refundErr) throw new Error(`deleting refund_requests: ${refundErr.message}`);

  // 2. Transfers reference the order they paid out for.
  const { error: transferErr } = await db.from("stripe_transfers").delete().in("order_id", ids);
  if (transferErr) throw new Error(`deleting stripe_transfers: ${transferErr.message}`);

  // 3. The silent one. No FK, so nothing here is enforced by the database.
  const { error: eventErr } = await db.from("order_events").delete().in("order_id", ids);
  if (eventErr) throw new Error(`deleting order_events: ${eventErr.message}`);

  // 4. Offers outlive the order they were paid through: the negotiation is a
  //    record of what two people agreed, which the payment does not own.
  const { error: offerErr } = await db
    .from("purchase_offers")
    .update({ paid_order_id: null })
    .in("paid_order_id", ids);
  if (offerErr) throw new Error(`clearing purchase_offers.paid_order_id: ${offerErr.message}`);

  // 5. Finally the orders.
  const { error: orderErr } = await db.from("orders").delete().in("id", ids);
  if (orderErr) throw new Error(`deleting orders: ${orderErr.message}`);

  const after: Counts = {
    orders: await countOf(db, "orders"),
    order_events: await countOf(db, "order_events"),
    refund_requests: await countOf(db, "refund_requests"),
    stripe_transfers: await countOf(db, "stripe_transfers"),
  };

  console.log("\nDone. Rows remaining:");
  for (const [table, n] of Object.entries(after)) {
    console.log(`  ${table.padEnd(18)} ${n}`);
  }

  const strays = after.order_events;
  if (strays > 0) {
    console.log(
      `\nNote: ${strays} order_events rows remain. They belong to orders that were` +
        " not in this run, which is expected only if orders were created while it ran.",
    );
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
