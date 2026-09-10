# Record of processing activities

**Controller:** Wallplace (sole trader, not yet incorporated), London, United Kingdom
**Contact:** privacy@wallplace.co.uk
**Data protection officer:** none appointed, and none required
**ICO registration:** to be confirmed by the owner. See section 6.
**Written:** 10 September 2026
**Next review:** 10 September 2027, or whenever a new feature starts collecting a category not listed here

UK GDPR Article 30 requires a controller to maintain a record of its processing activities. The exemption in Article 30(5) for organisations under 250 staff does not rescue Wallplace, because the processing is not occasional, and because it includes data about people who are not employees on a regular basis. The record is required, so here it is.

This is the internal record. The public-facing version of the same facts is the [Privacy Policy](../../src/app/(pages)/privacy/page.tsx), and the two are meant to agree. If they ever disagree, this document is what the code was written against and the Privacy Policy is what people were told, which makes the disagreement itself the finding.

---

## 1. Processing activities

| # | Activity | Categories of data subject | Categories of personal data | Purpose | Lawful basis | Recipients | Transfers | Retention |
|---|---|---|---|---|---|---|---|---|
| 1 | Account and authentication | Artists, venues, buyers, administrators | Email address, password hash, display name, role | Create and operate an account | Art 6(1)(b) contract | Supabase | Ireland | Life of the account |
| 2 | Artist profile and listing | Artists | Name or trading name, biography, discipline, links, postcode, derived coordinates (2dp), profile images, trader status | Publish a public profile and enable local search | Art 6(1)(b) contract | Supabase, public web | Ireland | Life of the account |
| 3 | Venue profile | Venue staff | Venue name, postal address, postcode, contact name, phone, email, interior photographs | Match with artists and arrange placements | Art 6(1)(b) contract | Supabase, entitled users only | Ireland | Life of the account |
| 4 | Artwork and uploads | Artists | Images, titles, descriptions, dimensions, prices | List and promote work | Art 6(1)(b) contract, plus the licence in the Artist Agreement | Supabase, public web | Ireland | Life of the listing plus 90 days |
| 5 | Private messaging | Artists, venue staff | Message content, attachments, sender and recipient identity | Enable negotiation, and evidence what was agreed | Art 6(1)(b) contract | Supabase | Ireland | Life of the account |
| 6 | Orders and fulfilment | Buyers, artists | Name, delivery address, email, order contents and value, tracking | Process the order and deliver the artwork | Art 6(1)(b) contract; Art 6(1)(c) for the accounting record | Supabase, Stripe, the selling artist | Ireland, US | 7 years, identifiers removed on erasure |
| 7 | Payments and payouts | Buyers, artists | Amounts, outcomes, Stripe identifiers. **No card data reaches Wallplace** | Take payment and pay artists | Art 6(1)(b) contract | Stripe | Ireland, US | 7 years |
| 8 | Subscriptions | Artists, venues | Plan, status, period, Stripe identifiers | Bill for membership and curation | Art 6(1)(b) contract | Stripe | Ireland, US | 7 years |
| 9 | Server-side analytics | Site visitors | Daily-rotating SHA-256 of IP plus user-agent, page or QR label viewed, referrer, timestamp | Give artists and venues honest performance figures | Art 6(1)(f) legitimate interests | Supabase | Ireland | 24 months |
| 10 | Contract acceptance record | All users | Email, agreement version and type, IP address, user-agent, age declaration | Evidence what was agreed and when | Art 6(1)(f) legitimate interests | Supabase | Ireland | 7 years, identifiers cleared at that point |
| 11 | Email delivery and suppression | All users, newsletter subscribers | Email address, template, delivery outcome, complaints, unsubscribes | Deliver mail, avoid duplicates, honour opt-outs | Art 6(1)(b) contract for transactional; Art 6(1)(f) for the send log; Art 6(1)(c) for honouring an opt-out under PECR | Resend, Supabase | US, Ireland | 24 months |
| 12 | Marketing | All users, newsletter subscribers | Email address, category preferences | Send tips, recommendations, the newsletter and offers | **Art 6(1)(a) consent**, and PECR reg 22 | Resend, Supabase | US, Ireland | Until withdrawn |
| 13 | Reports, moderation and disputes | Reporters, reported users, disputants | Identity of both parties, what was reported, decision and reasoning | Keep the platform safe and meet Online Safety Act record-keeping | Art 6(1)(f) legitimate interests; Art 6(1)(c) | Supabase | Ireland | At least 6 years |
| 14 | Support and enquiries | Anyone who contacts us | Name, email, message content | Answer the enquiry | Art 6(1)(f) legitimate interests | Supabase | Ireland | 24 months |
| 15 | Applications and registrations | Applicant artists, registering venues | Name, email, location, portfolio links, social handles, personal statement, trader status, VAT number | Assess an application | Art 6(1)(b) pre-contractual steps | Supabase | Ireland | 12 months if unsuccessful; becomes activity 2 or 3 if accepted |
| 16 | Postcode geocoding | Artists, venues, buyers using local search | Postcode | Convert a postcode to approximate coordinates | Art 6(1)(b) contract | postcodes.io | United Kingdom | Not retained; only the 2dp result is stored |
| 17 | Administration and audit | Administrators | Admin user id, action, target, timestamp, context | Accountability for administrative action | Art 6(1)(f) legitimate interests | Supabase | Ireland | At least 6 years |

## 2. Special category and criminal offence data

None is deliberately collected. Wallplace asks for no data about health, race, religion, politics, sex life, sexual orientation, trade union membership, genetics or biometrics, and performs no biometric identification.

Two places where it could arrive incidentally, and how that is handled:

- **A report of illegal content** may name an alleged criminal offence. That is Article 10 data (criminal offence data). It is processed under Art 6(1)(c) and Art 6(1)(f), with the DPA 2018 Schedule 1 Part 2 paragraph 12 condition (preventing or detecting unlawful acts), and access is limited to the administrator handling it.
- **An artwork or an artwork description** could depict or state something in a special category. It is not solicited and not indexed as such. Where it becomes a problem it is a moderation matter under the Acceptable Use standards.

## 3. Legitimate interests assessments

Four activities rely on Art 6(1)(f). Each has been balanced rather than asserted.

**Activity 9, analytics.** The interest is giving an artist an honest count of who looked at their work, which is a core part of what they pay for and cannot be produced without counting. The impact on a visitor is minimal by construction: the identifier is a hash that rotates every day, so nobody can be recognised across days or linked to any account, and nothing is stored on the visitor's device. There is no profiling, no advertising and no third party. A visitor can object, and the objection route is in the Privacy Policy. **Balance: proceeds.**

**Activity 10, contract acceptance.** The interest is being able to show what a user agreed to. The IP address and user-agent are what make the record hard to repudiate. The impact is a stored IP address, which is why it is cleared once the limitation period has run rather than kept indefinitely. **Balance: proceeds, with the retention limit as the mitigation.**

**Activity 13, reports and moderation.** The interest is other users' safety, and it is also a duty. The impact falls on a reported user whose identity is held alongside an allegation. Mitigated by restricting access to the handling administrator, by an appeal route, and by the reporter's identity never being disclosed to the reported user. **Balance: proceeds.**

**Activity 17, admin audit.** The interest is being able to say who did what. The subject is an administrator, in a work context, and there is no reasonable expectation that administrative action is unlogged. **Balance: proceeds.**

## 4. International transfers

| Recipient | Where | Mechanism | Assessed |
|---|---|---|---|
| Supabase | Ireland (EEA), with US support access | UK adequacy regulations for the EEA. US support access under the processor's DPA, incorporating the UK IDTA Addendum | Yes |
| Vercel | **United States** | UK IDTA Addendum to the EU SCCs, under Vercel's DPA | **Owner action: confirm the DPA is executed and record the transfer risk assessment** |
| Stripe | Ireland and United States | Stripe's DPA with the UK Addendum | Yes |
| Resend | United States | Resend's DPA with the UK Addendum | **Owner action: confirm the DPA is executed** |
| postcodes.io | United Kingdom | No transfer | Not applicable |

The Vercel row is the material one. The production deployment runs in region `iad1` (Washington DC) despite `vercel.json` declaring `dub1`, which means every serverless function execution, and therefore every request that touches personal data, happens in the United States. Two ways to resolve it, and the owner has to pick: move the functions to a UK or Irish region and verify it took effect, or keep them where they are and complete the paperwork above.

## 5. Technical and organisational measures

Summarised; the detail is in the codebase and in `docs/security/`.

- TLS everywhere, HSTS with a two-year max-age and preload. Encryption at rest on the database and on file storage.
- Passwords hashed by Supabase Auth (bcrypt). No password material in application code.
- Row-level security on every table, with party-scoped policies. Tables written only by the service role carry RLS with no client policy, which is deny-all, and that is documented as deliberate in `docs/security/service-role-only-tables.md`.
- Column-level grants remove contact PII and payment identifiers from the roles the browser can reach.
- Private storage buckets for message attachments, venue photographs, wall renders and contracts, served through short-lived signed URLs issued only after the reader's entitlement is checked.
- Upload restrictions by MIME type and size at the bucket level, and folder ownership enforced by policy so a user can only write under their own prefix.
- Admin access requires an env allowlist entry or an `admin_users` row, fails closed, and every administrative action is audited.
- Security headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS. Content Security Policy is currently report-only, which is a known gap with a recorded decision.
- Dependency advisories checked; the production tree is clean as of 10 September 2026.
- Data subject access and erasure are self-service and immediate, not a manual process.

## 6. Owner actions outstanding

These cannot be completed in code and are the controller's to do:

1. **Register with the ICO and pay the data protection fee.** Tier 1, £52 a year, on turnover under £632,000 and fewer than 10 staff. No exemption applies: the processing is for commerce and marketing, not solely core business administration.
2. **Resolve the Vercel region question** and record the outcome in section 4.
3. **Confirm the Vercel and Resend DPAs are executed**, and file them.
4. **Confirm the Supabase plan tier**, and with it whether point-in-time recovery is enabled. Availability is an Article 32(1)(c) measure and the answer is currently unknown.
5. **Enable Supabase leaked-password protection**, a single dashboard toggle, and enrol MFA on the administrator account.
6. **Set the missing production environment variables**: Upstash (rate limiting is otherwise per-instance and provides no protection on serverless), Turnstile (the bot challenge otherwise never renders), and the Resend webhook secret (without it nothing records a spam complaint or a hard bounce).
