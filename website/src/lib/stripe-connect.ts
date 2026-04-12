import { stripe } from "./stripe";
import { getSupabaseAdmin } from "./supabase-admin";

export async function createTransfer(params: {
  orderId: string;
  recipientType: "venue" | "artist";
  recipientUserId: string;
  connectAccountId: string;
  amountCents: number;
}) {
  const transfer = await stripe.transfers.create({
    amount: params.amountCents,
    currency: "gbp",
    destination: params.connectAccountId,
    transfer_group: params.orderId,
  });

  const db = getSupabaseAdmin();
  await db.from("stripe_transfers").insert({
    order_id: params.orderId,
    recipient_type: params.recipientType,
    recipient_user_id: params.recipientUserId,
    stripe_transfer_id: transfer.id,
    stripe_connect_account_id: params.connectAccountId,
    amount_cents: params.amountCents,
    status: "paid",
  });

  return transfer;
}
