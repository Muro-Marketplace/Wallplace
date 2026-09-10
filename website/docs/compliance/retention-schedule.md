# Wallplace retention schedule

**Owner:** Wallplace (data controller)
**Version:** 1.0
**Written:** 10 September 2026
**Next review:** 10 September 2027, or sooner if a new feature starts collecting a category not listed here

This is the Article 5(1)(e) storage-limitation record and part of the Article 5(2) accountability record. It exists because the 10 September 2026 compliance audit found that nothing in the platform deleted or anonymised anything on a schedule, while the Privacy Policy promised deletion within 90 days of account closure and seven-year retention for transactions. A promise with nothing behind it is worse than no promise, because it has been made to every data subject.

## How it is enforced

The rules live in [`src/lib/retention.ts`](../../src/lib/retention.ts) as data, and this document is generated from them, so the two cannot drift. They are applied by `GET /api/cron/retention`, which runs daily at 03:00 UTC and is listed in `vercel.json`.

A cron, not an admin button. Per the data invariant in `AGENTS.md`, a job that runs when a human remembers is stale by construction, and the entire value of a retention schedule is that it runs whether anyone is watching or not.

Each run returns the number of rows every rule reached, so a rule that has quietly stopped matching is visible rather than indistinguishable from a rule with nothing to do. If every rule fails, the run returns 500 and raises an admin alert, because that means the job is broken rather than that it met a bad row.

## The schedule

| Table | Age measured from | Retention | Action | Why this period |
|---|---|---|---|---|
| `analytics_events` | `created_at` | 24 months | Delete | Artist and venue analytics are useful for year-on-year comparison and stop being useful after that. The visitor id is a daily-rotating hash, so a row older than a day cannot be linked to a person anyway; this is about not keeping a behavioural record with no purpose left. |
| `cart_sessions` | `expires_at` | 1 month | Delete | An abandoned checkout holds the buyer's name, delivery address and email in `shipping`. The row already carries an expires_at that nothing enforced. A month past expiry is long enough to reconcile a late Stripe webhook and no longer. |
| `email_events` | `created_at` | 24 months | Delete | The send log holds a recipient address per row. Two years covers deliverability investigation and any "did you email me" question, which is the only reason to keep it. |
| `waitlist_signups` | `created_at` | 18 months | Delete | A pre-launch expression of interest that has not converted in eighteen months is not a live relationship, and the lawful basis for holding it has run out with it. |
| `contact_submissions` | `created_at` | 24 months | Delete | Support correspondence, kept long enough to show a pattern of complaint handling and to answer a follow-up, then gone. |
| `enquiries` | `created_at` | 24 months | Delete | An enquiry that did not become a placement or an order is a lead, and a two-year-old lead is a record with no purpose. |
| `artist_applications` | `created_at` | 12 months | Delete (accepted applications excluded) | A rejected or abandoned application holds a name, an email, a location, social handles and a personal statement. Twelve months covers a re-application and an appeal. Accepted applicants have an `artist_profiles` row, which is the live record; this only reaches the ones that went nowhere. |
| `venue_registrations` | `created_at` | 12 months | Delete | Same reasoning as artist applications: a registration that never became a `venue_profiles` row is an unconverted lead holding a contact name, phone number and postal address. |
| `terms_acceptances` | `accepted_at` | 7 years | Anonymise (`ip_address`, `user_agent`) | The acceptance itself is contractual evidence and is kept for the six-year limitation period plus a margin. The IP address and user agent are the anti-repudiation detail around it, and they stop being worth holding once the limitation period has run. The row survives; the identifiers do not. |

## What is deliberately not on the schedule

Storage limitation is not "delete everything eventually". Each of these has a purpose that outlives the account, and a retention job that reached them would be destroying evidence rather than minimising data.

| Category | Tables | Why it is kept |
|---|---|---|
| Financial records | `orders`, `refund_requests`, `stripe_transfers`, `placement_recurring_billings`, `programme_rent_accruals` | HMRC expects six years from the end of the accounting period. The Privacy Policy says seven, and that is the promise that binds. Personal identifiers inside them are anonymised on erasure rather than the row being deleted. |
| Admin audit trail | `admin_audit_log` | The record of what an administrator did. A retention job that trimmed it would be a retention job that erased evidence, including evidence about itself. |
| Online Safety Act records | `reports`, `conversation_reports`, `moderation_queue`, `disputes` | Ofcom expects a provider to be able to show what it was told and what it did about it. The reporter's identity is cleared by the foreign key when their account is erased; the report survives. |
| Conversation history | `messages` | The contractual record of a negotiation between two users. Neither party alone should be able to age out a record the other relies on. Cleared on erasure at the request of a party. |
| Live account data | `artist_profiles`, `venue_profiles`, `customer_profiles`, `artist_works`, `placements`, `walls` | Held for as long as the account is open, and removed by the erasure route when it closes. That is the correct trigger for this category, not elapsed time. |

## Deletion on request

Separately from this schedule, `POST /api/account/delete` erases a user's data on request under Article 17. It clears every storage bucket, every table keyed on their user id, and every table keyed on their verified email, and it anonymises rather than deletes the financial records above. See [`src/lib/account-erasure.ts`](../../src/lib/account-erasure.ts) for the list and the reasons.

One exception worth stating: an `email_suppressions` row with reason `complaint` or `hard_bounce` is kept. It is not the user's data to remove, it is the record of an address asking us to stop, and deleting it would let a re-signup resume mail to someone who opted out.
