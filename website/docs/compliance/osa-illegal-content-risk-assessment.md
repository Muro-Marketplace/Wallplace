# Illegal content risk assessment

**Service:** Wallplace (wallplace.co.uk)
**Provider:** Wallplace (sole trader, not yet incorporated)
**Service type:** Regulated user-to-user service, not categorised
**Duty:** Online Safety Act 2023 s.9, recorded under s.23
**Assessment carried out:** 10 September 2026
**Next review:** 10 September 2027, or immediately on any trigger in section 7

> This assessment was produced late. Ofcom's risk assessment guidance was published on 16 December 2024 with a completion deadline of 16 March 2025, and the illegal content codes took effect on 17 March 2025. Recording that plainly is part of the record.
>
> One thing to verify before relying on this document externally: Ofcom's statement on additional safety measures was expected in autumn 2026. Section 8 lists what to check.

---

## 1. Why the service is in scope

Section 3(1) catches any internet service by which content generated, uploaded or shared by a user may be encountered by another user. Wallplace has:

- **Private one-to-one messaging with file attachments** between artists and venues (181 messages at the date of assessment).
- **Publicly visible user-generated content**: artwork images, artwork descriptions, artist bios and profiles, venue profiles and interior photographs, artist-authored blog posts.

Private messaging alone is sufficient. No Schedule 1 exemption applies: this is not email, not SMS, not a limited-functionality comments-only service, and not an internal business service. There is no size threshold in the Act, and Ofcom operates a Small but Risky Services taskforce, so 47 accounts is not shelter.

Wallplace is not a search service. It is not a Category 1, 2A or 2B service and the additional duties on categorised services do not apply.

## 2. The service and its users

A UK marketplace connecting independent artists with commercial venues and buyers. Four roles: artist (application and paid subscription), venue (free, commercial premises), customer (free), administrator (one account).

At the date of assessment: 47 accounts, 36 artworks, 91 placements, 19 orders, 181 private messages, 4 blog posts, 0 reports ever filed.

**Risk-relevant characteristics.** The user base is small, identified and commercially motivated. Every posting role needs a verified email; the artist role additionally needs a reviewed application and a payment card; the venue role needs a real commercial premises. There is no anonymous posting, no ephemeral content, no livestreaming, no group chat, no video, and no public commenting. Content that reaches the public is either an image of a physical artwork or a blog post that passes through moderation first.

## 3. Risk by kind of priority illegal content

Assessed against the priority offences in Schedule 7. Likelihood reflects the functionalities the service actually has, not a generic platform.

| Kind of illegal content | Likelihood | Reasoning | Impact if it occurred |
|---|---|---|---|
| **Fraud and financial offences** | **Medium** | The highest risk here by a distance, and the one that fits the service. Vectors: a fake artist listing work they cannot supply; artwork materially not as described; a party pushing a transaction off-platform to take payment outside the protections; an artist listing work that is not theirs and taking the money. | High for the individual defrauded. Money moves through Stripe, so a chargeback route exists, and the platform holds the order and message record. |
| **Sale of goods it is unlawful to sell** | Low | The catalogue is original physical artwork, reviewed at application. No listing category could carry a controlled item without an admin approving the artist first. | High |
| **Harassment, stalking, threats, abuse** | **Medium** | Private messaging between two identified commercial parties is the vector. A negotiation that goes badly, or unwanted repeated contact after a decline. | High for the recipient |
| **Hate offences** | Low | No public commenting, no feed, no anonymity. Would have to arrive as artwork content, an artwork description, a blog post or a private message. | High |
| **Intimate image abuse** | Low | Requires an account and an artwork upload or a message attachment. Both are attributable, and uploads pass the artist's own IP warranty. Not zero: an image upload is an image upload. | Very high for the subject |
| **Child sexual abuse material** | Low | Same vector as above and the same attribution. Every upload is tied to a verified account, and for artists to a reviewed application and a payment card. The absence of anonymity is the material control. | Very high, and the platform's response is immediate and non-discretionary |
| **Terrorism content** | Low | No feed, no reach, no anonymity, no audience of the kind such content seeks. | Very high |
| **Encouraging or assisting serious self-harm** | Low | No feed and no public commenting. Private messaging is the only realistic vector. | Very high |
| **Controlling or coercive behaviour** | Low | Messaging is between commercial counterparties who are not usually in a domestic relationship. | High |
| **Drugs, psychoactive substances, firearms, knives** | Low | See sale of goods above. | High |
| **Proceeds of crime** | Low | Possible in principle through art sales. Stripe performs KYC on every artist receiving payouts through Connect, which is the substantive control. | High |
| **Immigration and human trafficking offences** | Very low | No functionality that facilitates it. | Very high |
| **Sexual exploitation of adults** | Very low | No functionality that facilitates it. | Very high |
| **Unlawful immigration** | Very low | No functionality that facilitates it. | High |
| **Foreign interference** | Very low | No political content, no reach. | High |
| **Animal welfare offences** | Very low | Would have to be the subject of an artwork. | Medium |
| **Epilepsy trolling** | Very low | No video, no animation in user content, no ability to send an image directly into another user's view outside a conversation they opened. | High |

**The honest summary.** The two risks that fit this service are **fraud** and **abuse in private messaging**. Everything else is low or very low, and is low because of one structural fact rather than because of any control we built: there is no anonymity, no reach and no audience. A person committing most of these offences wants an audience, and Wallplace does not offer one.

## 4. Controls in place

| Control | Where | Which risk |
|---|---|---|
| No anonymous posting; verified email for every role | Supabase Auth | All |
| Artist applications reviewed before any listing appears | `/admin/applications` | Fraud, all upload-borne content |
| Stripe Connect KYC before any payout | Stripe | Fraud, proceeds of crime |
| IP warranty confirmed at every artwork upload | Upload flow | Fraudulent and stolen artwork |
| Blog posts moderated before publication | `moderation_queue`, `blogs.status` | All public-content risks |
| In-product reporting on artwork, profiles and collections | `ReportContentButton`, `POST /api/reports` | All |
| In-product reporting inside a conversation | `POST /api/messages/report` | Harassment, fraud |
| Illegal-content report categories, marked urgent, raising an immediate admin alert | `URGENT_REPORT_REASONS` | All illegal content |
| A route for non-users to report | `report@wallplace.co.uk`, published on the Acceptable Use page | All |
| User blocking, enforced at the send path and in the inbox | `user_blocks`, `POST /api/messages/block` | Harassment |
| Automated message filter | `moderateMessage()` | Spam and scam phrasing, off-platform payment |
| Complaints and appeals process with named timescales | Acceptable Use, Complaints Policy | Wrongful removal |
| Admin audit log of every moderation decision | `admin_audit_log` | Record keeping |
| Copyright takedown with SLAs, counter-notice and three strikes | IP Policy | Stolen artwork |
| Order state machine, dispute flow, refund flow, QR attribution tokens | Various | Fraud |

**Named as a weakness rather than a control.** `moderateMessage()` is a regex filter aimed at spam phrasing and platform-fee circumvention. It is a commercial control, not a safety one, and it detects no illegal-harm signal. That is a deliberate position at this scale, not an oversight: Ofcom's illegal content codes do not require proactive technology of a small service, and a keyword filter over 181 messages would produce false positives and no true ones. What the Act does require is that reports are acted on, and that is where the effort has gone.

## 5. Residual risk

**Fraud: medium.** Reduced by application review, Stripe KYC, the order state machine and the dispute flow, but not eliminated, because a determined seller can still misdescribe a physical object. The residual exposure is a buyer out of pocket with a chargeback route and a platform record.

**Harassment in messaging: low to medium.** Reduced by non-anonymity, enforced blocking, in-conversation reporting and the admin alert. The residual exposure is one message reaching one person before they block or report.

**Everything else: low.** Accepted as low on the reasoning in section 3, and reviewed on the triggers in section 7.

## 6. Measures adopted following this assessment

Adopted on 10 September 2026 as part of the compliance remediation:

1. **Illegal-content categories added to the report taxonomy**, replacing a set in which every option protected the marketplace and none named illegal content. A user reporting the most serious thing they will ever tell us no longer has to choose "Something else".
2. **Urgent handling for those categories**, with a marked admin alert on receipt.
3. **An Acceptable Use and Content Standards page** setting out what is prohibited, how to report it, what happens next, how long we take and how to appeal, satisfying the s.10 terms duty which prohibited-conduct lists alone did not.
4. **A reporting route for non-users**, published, because ss.20 to 21 cover affected persons and not only users.
5. **This assessment and the children's access assessment**, recorded and version-controlled.

## 7. Review triggers

Reviewed immediately, not at the annual date, on any of:

1. A new functionality that changes the risk picture: public commenting, group messaging, video, livestreaming, anonymous posting, or anything with the shape of a feed.
2. Opening the platform to a new content category or a new country.
3. Any report in an illegal-content category, whatever its outcome. One report is enough to require the assessment to be re-read.
4. Ofcom publishing a new or revised priority-offence statement, a new code of practice, or revised risk assessment guidance.
5. An order-of-magnitude growth in users or content.
6. Incorporation, or any change in who the provider is.

## 8. To verify before relying on this externally

My knowledge of Ofcom's position is current to May 2026, and this document was written on 10 September 2026. Before this assessment is submitted to Ofcom or relied on in a commercial context, check:

- Ofcom's **additional safety measures statement**, expected autumn 2026, and whether any newly recommended measure applies to a non-categorised service of this size.
- Ofcom's **priority offences statement on serious self-harm and cyberflashing** (published 25 June 2026), and whether the risk table in section 3 needs revising against it.
- Whether the **mandatory CSAM reporting duty** that commenced 7 April 2026 imposes any registration or process step on a service of this size, beyond the escalation already described in the Acceptable Use page.

## 9. Record

Held at `docs/compliance/osa-illegal-content-risk-assessment.md`, version-controlled, with its history in git. Section 23 requires the provider to keep a written record of this assessment and of the measures taken; this document is that record.
