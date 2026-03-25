# Section 13: Operations and SOPs

## Operating Philosophy

Wallspace is a concierge marketplace. The operational backbone must feel seamless to both artists and venues while remaining manageable for a solo founder scaling to a small team. Every SOP below is designed to be executed manually at first, then systematised as volume demands.

**Core operating principles:**
- Every interaction is a brand moment -- no automated replies, no impersonal templates at launch
- Process discipline matters most where money or artwork changes hands
- The founder personally controls quality gates until at least 50 artists and 15 venues are live
- SOPs are written to be delegatable -- each one should be handable to a VA or ops hire with minimal training

---

## SOP 1: Artist Application Review

**Trigger:** Artist submits application via website form or is referred/invited.

**Steps:**
1. Application lands in shared inbox or Airtable form submission (includes name, medium, portfolio link, Instagram, statement, pricing expectations).
2. Founder reviews within 48 hours.
3. Score against curation criteria:
   - Visual quality and consistency (1-5)
   - Commercial viability for venue settings (1-5)
   - Portfolio depth -- minimum 10 display-ready works (Y/N)
   - Professional presentation (1-5)
   - Photography-first priority in Phase 1 (Y/N)
4. Decision: Accept / Waitlist / Decline.
5. If accepted: send personalised acceptance email with onboarding link and next steps.
6. If waitlisted: send warm hold email explaining curation rounds and timeline.
7. If declined: send respectful decline with brief reasoning and invitation to reapply in 6 months.
8. Log decision and reasoning in Airtable.

**Owner:** Founder (personally, until curation panel is formed at ~100 artists).

**Tools:** Airtable, Gmail/shared inbox, website form (Tally or Typeform).

**Completion criteria:** Artist record updated with decision, communication sent within 48 hours.

**Process discipline notes:**
- This is the single most important quality gate. Accepting weak artists destroys venue trust.
- Never batch-accept to hit targets. Each artist must pass on merit.
- Keep acceptance rate visible (target 30-40% to maintain curation credibility).
- Document rejection reasons -- patterns inform future application form improvements.

---

## SOP 2: Artist Onboarding

**Trigger:** Artist accepted and confirms interest in joining.

**Steps:**
1. Send onboarding pack (digital): welcome guide, how Wallspace works, membership tiers, commission structure, what to expect.
2. Artist selects membership tier (Founding £29/mo, Core £49/mo, Premium £89/mo).
3. Artist signs Artist Agreement (digital signature via DocuSign or PandaDoc).
4. Set up payment method via Stripe for monthly billing.
5. First payment collected (or trial period begins if applicable).
6. Artist granted access to portfolio submission process (email or shared folder in Phase 1, dashboard later).
7. Founder conducts 15-minute welcome call or voice note -- sets expectations, answers questions, builds relationship.
8. Artist submits initial portfolio (minimum 10 works with dimensions, medium, pricing, edition info).
9. Portfolio reviewed and approved (see SOP 4).
10. Artist marked as "Active" in Airtable.
11. Artist added to private community channel (WhatsApp group or Slack in Phase 1).

**Owner:** Founder.

**Tools:** DocuSign/PandaDoc, Stripe, Airtable, Google Drive (for portfolio submissions), WhatsApp/Slack.

**Completion criteria:** Agreement signed, first payment collected, portfolio submitted and reviewed, artist marked Active.

**What breaks easily:**
- Artists who sign up but never submit portfolio -- chase at Day 3, Day 7, Day 14, then archive.
- Artists who submit poor-quality images -- have clear image spec requirements upfront (min resolution, white background or in-situ, no watermarks on submission copies).
- Artists who don't understand commission vs membership -- the welcome call must clarify this.

---

## SOP 3: Membership Billing

**Trigger:** Monthly billing cycle (automated via Stripe).

**Steps:**
1. Stripe processes monthly charge on anniversary of signup.
2. If payment succeeds: receipt sent automatically, no action needed.
3. If payment fails:
   a. Stripe retries automatically (3 attempts over 7 days).
   b. After first failure: automated email sent ("payment issue, please update card").
   c. After second failure: personal email from founder.
   d. After third failure: membership paused, artist notified, artwork remains in venues for 14-day grace period.
   e. After 14-day grace: artist moved to Inactive, venue removal scheduled.
4. For cancellations:
   a. Artist requests cancellation via email.
   b. Founder acknowledges within 24 hours.
   c. Brief exit survey sent.
   d. Billing stopped at end of current period (no pro-rata refunds unless within first 14 days -- cooling-off period).
   e. Artwork collection from venues scheduled within 30 days.
   f. Artist moved to "Alumni" status in Airtable.

**Owner:** Automated (Stripe) with founder oversight on failures and cancellations.

**Tools:** Stripe, Airtable, Gmail.

**Completion criteria:** Payment collected or failure pathway completed; cancellations processed within 24 hours.

**Founder control:** Personally handle every cancellation for at least 6 months -- understand why people leave.

---

## SOP 4: Portfolio Upload and Review

**Trigger:** Artist submits new works or initial portfolio.

**Steps:**
1. Artist submits via email or shared Google Drive folder (Phase 1) or dashboard (Phase 2+).
2. Each work must include:
   - High-resolution image (min 3000px longest edge, sRGB)
   - Title
   - Medium and materials
   - Dimensions (H x W, framed and unframed)
   - Year created
   - Edition details (if applicable -- edition size, number)
   - Retail price (artist's asking price)
   - Frame status (framed/unframed, frame description)
   - Weight (for installation planning)
3. Founder reviews for:
   - Image quality sufficient for marketing and venue presentation
   - Pricing sanity check (aligned with market, not wildly over/underpriced)
   - Physical readiness (is the work actually ready to hang?)
   - Suitability for commercial venues
4. Feedback sent to artist within 5 business days:
   - Approved works marked as "Available" in catalogue
   - Works needing better images flagged with specific requests
   - Works not suitable explained with reasoning
5. Approved works added to master catalogue (Airtable) with all metadata.
6. Works photographed/resized for venue presentation materials.

**Owner:** Founder (can delegate image processing to VA).

**Tools:** Airtable, Google Drive, image editing software (Canva/Photoshop for resizing).

**Completion criteria:** Each submitted work has a status (Approved/Needs Revision/Declined) and approved works are in the live catalogue.

**What breaks easily:**
- Artists submitting phone photos instead of proper documentation. Be strict early -- it sets the standard.
- Incomplete metadata. Reject submissions missing any required field.
- Pricing misalignment. If an unknown artist prices a small print at £2,000, have an honest conversation.

---

## SOP 5: Commercial Availability Setup

**Trigger:** Artist's works approved and ready for venue placement.

**Steps:**
1. For each approved work, confirm with artist:
   - Available for free loan to venues? (Y/N)
   - Available for purchase by venue visitors? (Y/N, and at what price)
   - Available for direct venue purchase? (Y/N, and at what price -- typically discounted)
   - Minimum loan period (default: 3 months)
   - Geographic restrictions (if any)
   - Insurance value for transit and display
2. Set commission structure per work:
   - Customer purchase from venue: 20% Wallspace commission
   - Direct venue purchase: 15% Wallspace commission
3. Update Airtable record with commercial terms.
4. Generate QR code for each work (links to artist profile/purchase page).
5. Prepare venue presentation card for each work (small card with artist name, title, price, QR code).

**Owner:** Founder.

**Tools:** Airtable, QR code generator (QR Code Monkey or similar), Canva (for presentation cards).

**Completion criteria:** Each work has full commercial terms set, QR code generated, presentation card created.

---

## SOP 6: Venue Onboarding

**Trigger:** Venue owner/manager agrees to participate (after outreach or inbound enquiry).

**Steps:**
1. Initial meeting (in-person preferred for London venues): explain model, show sample artwork, discuss their space.
2. Venue assessment:
   - Wall space available (linear metres, number of hanging points)
   - Lighting quality and type
   - Footfall estimate (daily covers / visitors)
   - Customer demographic assessment
   - Existing decor style and any restrictions
   - Security considerations (CCTV, staff oversight)
   - Insurance status (public liability minimum)
3. If suitable, send Venue Agreement for review and signature.
4. Key agreement terms:
   - Artwork provided on free loan (no cost to venue)
   - Venue provides wall space, hanging hardware, and reasonable care
   - Venue allows signage/QR codes near artwork
   - Revenue share on sales facilitated through venue (venue receives nothing on customer sales in v1, but gets beautified space)
   - Standard loan period: 3 months with rolling renewal
   - Either party can end with 30 days notice
5. Venue signs agreement (digital signature).
6. Schedule installation date.
7. Create venue profile in Airtable (address, contact, wall specs, capacity, style preferences).
8. Add venue to venue map/directory.
9. Send venue welcome pack (printed): how it works for their staff, FAQ card for customer questions, Wallspace contact details.

**Owner:** Founder (personally, for at least the first 25 venues).

**Tools:** DocuSign/PandaDoc, Airtable, Google Maps (for venue mapping), Canva (for welcome pack).

**Completion criteria:** Agreement signed, venue assessed, profile created, installation date scheduled.

**Founder control:** The founder must personally visit and assess every venue for the first 25. This is where curation credibility is built. A mediocre venue damages the artist proposition.

---

## SOP 7: Venue Curation Request

**Trigger:** Venue is onboarded and ready for artwork selection, or existing venue requests a refresh.

**Steps:**
1. Review venue profile: style, dimensions, demographic, existing decor.
2. Pull shortlist from available catalogue (8-12 works for a venue needing 4-6 pieces).
3. Consider:
   - Style match (modern cafe vs traditional restaurant)
   - Size appropriateness for wall spaces
   - Price range match for customer demographic
   - Colour palette compatibility
   - Mix of artists (don't put all one artist in one venue unless requested)
   - Previous sales data (if available) for similar venues
4. Create curation proposal: digital document with images, dimensions, pricing, and suggested placement.
5. Send proposal to venue for approval.
6. Venue reviews and confirms (or requests changes).
7. If changes requested: adjust selection within 48 hours.
8. Final selection confirmed and locked.
9. Notify selected artists that their work has been placed.
10. Schedule delivery/installation.

**Owner:** Founder (this is the core creative/curatorial skill -- last thing to delegate).

**Tools:** Airtable (catalogue filtering), Canva or Google Slides (for proposals), Gmail.

**Completion criteria:** Venue approves final selection, artists notified, installation scheduled.

**What breaks easily:**
- Proposing works that are too large/small for the space. Always work from measured wall dimensions.
- Ignoring venue aesthetic. A gritty street photography series in a pastel brunch spot will not work.
- Not having enough variety in catalogue to offer meaningful choices. This is why minimum 30 artists matters at launch.

---

## SOP 8: Artwork Matching

**Trigger:** New venue needs artwork OR new artist works become available for placement.

**Steps:**
1. Maintain a live "matching board" in Airtable:
   - Column 1: Venues with open wall space (with style tags, size requirements)
   - Column 2: Available works (with style tags, dimensions, price range)
2. Weekly review: scan for new matches.
3. Matching criteria (weighted):
   - Style compatibility (40%)
   - Size fit (25%)
   - Price appropriateness for venue demographic (20%)
   - Artist hasn't been shown at this venue before (10%)
   - Geographic convenience for delivery (5%)
4. When strong match identified: add to next curation proposal for that venue.
5. Track placement history: which works went where, how long, any sales.

**Owner:** Founder (can be assisted by VA for data entry, but matching decisions stay with founder).

**Tools:** Airtable (with filtered views), spreadsheet for tracking.

**Completion criteria:** All venues with open space have pending matches; no work sits unmatched for more than 30 days.

---

## SOP 9: Shipping, Delivery, and Installation

**Trigger:** Curation confirmed, installation date set.

**Steps:**
1. Coordinate artwork collection:
   - If artist is local (London): arrange collection or ask artist to deliver to Wallspace hub/venue directly.
   - If artist is non-local: arrange courier (artist ships to Wallspace or directly to venue).
   - Founder handles delivery personally for Phase 1 (first 15 venues).
2. Pre-delivery checklist:
   - All works condition-checked and photographed (condition report).
   - Hanging hardware confirmed (D-rings, wire, or specific system).
   - Wall fixings confirmed with venue (screws, hooks, picture rail).
   - QR code cards and signage printed and ready.
   - Venue contact confirmed for access and timing.
3. Installation:
   - Arrive at scheduled time (ideally during quiet hours -- early morning for cafes).
   - Hang works according to agreed placement plan.
   - Install signage and QR code cards.
   - Take installed photos for records and marketing.
   - Brief venue staff: what to say when customers ask, how purchase process works, who to call if issues.
4. Post-installation:
   - Update Airtable: works marked as "On Display" with venue and date.
   - Send installed photos to artists.
   - Send thank-you note to venue.
   - Post installation photos on Wallspace social media (with venue and artist tags).

**Owner:** Founder (personally for first 15 venues, then trained installer/VA).

**Tools:** Airtable, basic tools (drill, level, hooks, measuring tape), camera/phone, vehicle or courier service.

**Completion criteria:** All works hung, signage placed, staff briefed, records updated, photos taken.

**What breaks easily:**
- Arriving at a venue to find the walls are concrete and you brought plasterboard fixings. Always confirm wall type in advance.
- Artwork arriving damaged in transit. Always photograph before shipping and use proper art packaging.
- Venue staff not understanding the model. The staff briefing is critical -- leave a printed FAQ card.

**Strong process discipline required:** Condition reports before and after every move. This is your insurance evidence.

---

## SOP 10: Signage and QR Code Placement

**Trigger:** Artwork installed at venue.

**Steps:**
1. For each work, place a small presentation card nearby:
   - Artist name
   - Work title
   - Medium
   - Price (if for sale)
   - QR code linking to purchase page or artist profile
   - Wallspace branding (subtle, tasteful)
2. Card design: consistent brand template, printed on quality card stock (not flimsy paper).
3. Placement: next to or below artwork, secured with adhesive putty or small acrylic holder.
4. Venue-level signage: one small "Art curated by Wallspace" card or decal near entrance or till area.
5. Optional: table cards or menu inserts mentioning the art programme (if venue agrees).
6. Photograph all signage placement for records.

**Owner:** Founder (during installation), can be delegated to installer.

**Tools:** Canva (card design), quality printer or print service (Vistaprint, Printed.com), QR code generator.

**Completion criteria:** Every displayed work has a corresponding card; venue-level signage is in place.

---

## SOP 11: Customer Purchase in Venue

**Trigger:** Customer in venue wants to buy a displayed artwork.

**Steps:**
1. Customer scans QR code on artwork card, or asks venue staff.
2. QR code leads to Wallspace purchase page for that specific work.
3. Customer completes purchase online (Stripe checkout):
   - Price as listed
   - Shipping/collection options (collect from venue, or delivery arranged)
   - Standard consumer rights apply (14-day cooling-off for distance sale)
4. Wallspace receives payment notification.
5. Within 24 hours:
   - Confirm order to customer (email receipt and next steps).
   - Notify artist of sale (congratulations email with details).
   - Notify venue (thank-you and logistics for removal).
6. Arrange artwork removal from venue:
   - If customer collects from venue: coordinate timing with venue.
   - If delivery: collect from venue and ship to customer, or arrange courier.
7. Replace sold work at venue with new piece (from same artist or matched alternative).
8. Process payout:
   - Sale price minus 20% Wallspace commission = artist payout.
   - Payout processed within 14 days of sale (after cooling-off period).
9. Update all records: Airtable (work marked "Sold"), sales tracking, commission log.

**Owner:** Founder manages process; payment automated via Stripe.

**Tools:** Stripe, Airtable, Gmail, website/purchase page.

**Completion criteria:** Customer has artwork, artist has been paid, venue has replacement, all records updated.

**What breaks easily:**
- Customer buys online then venue staff don't know it's been sold -- someone else tries to buy the same piece. Notification to venue must be immediate.
- Cooling-off period: don't ship/hand over artwork until 14-day distance selling cooling-off has passed, OR get explicit waiver from customer.
- Replacement delays: always have a "next up" piece identified for each venue slot.

---

## SOP 12: Venue Purchase

**Trigger:** Venue owner/manager wants to buy a displayed work for permanent installation.

**Steps:**
1. Venue expresses interest (usually verbally during a visit or via email).
2. Confirm pricing: venue purchase price (may be same as listed or negotiated -- founder discretion).
3. Send invoice to venue (Stripe invoice or manual invoice).
4. Commission: 15% Wallspace (lower than customer rate as venue is a partner).
5. Upon payment:
   - Confirm to artist (with payout details).
   - Transfer ownership: artwork stays in place, signage updated or removed.
   - Update records: work marked "Sold to Venue."
6. Process artist payout within 14 days.
7. Discuss replacement for the now-purchased wall space (venue may want to fill it with another loaned work, or may keep the purchased piece and not need a replacement).

**Owner:** Founder.

**Tools:** Stripe (invoicing), Airtable, Gmail.

**Completion criteria:** Payment received, artist paid, records updated, replacement discussed.

---

## SOP 13: Payout Flow

**Trigger:** Sale completed and cooling-off period passed (or venue invoice paid).

**Steps:**
1. Calculate payout:
   - Customer sale: Sale price - 20% commission = artist payout.
   - Venue sale: Sale price - 15% commission = artist payout.
2. Deduct any agreed costs (e.g., if Wallspace covered framing -- rare in v1).
3. Confirm payout amount with artist via email (transparent breakdown).
4. Process payout via Stripe Connect (or bank transfer if Stripe Connect not yet set up).
5. Send payout confirmation with breakdown:
   - Sale price
   - Commission deducted
   - Net payout
   - Payment method and expected arrival date
6. Log in payout ledger (Airtable or spreadsheet).
7. Issue self-billing invoice or confirm artist will issue invoice (VAT implications -- see Section 14).

**Owner:** Founder (finance function -- last thing to delegate, first thing to systematise).

**Tools:** Stripe Connect (ideal) or bank transfer, Airtable, accounting software (Xero or FreeAgent).

**Completion criteria:** Artist paid, confirmation sent, ledger updated, invoice documented.

**Strong process discipline required:** Payout accuracy and timeliness builds artist trust faster than anything else. Never be late. Never be unclear about the maths.

---

## SOP 14: Artwork Replacement and Refresh

**Trigger:** Scheduled refresh (every 3 months default), artwork sold, or venue/artist requests change.

**Steps:**
1. 30 days before scheduled refresh: review current placement.
2. Check with venue: are they happy with current works? Any they want to keep longer? Any not working?
3. Check with artists: any works they want to recall? New works available?
4. Prepare replacement curation proposal (same process as SOP 7).
5. Confirm new selection with venue.
6. Schedule swap day:
   - Collect outgoing works (condition check on removal).
   - Install incoming works.
   - Update all signage and QR codes.
   - Brief staff on new works.
7. Return outgoing works to artists or reassign to another venue.
8. Update all records.
9. Post refresh photos on social media.

**Owner:** Founder (scheduling and curation); can delegate physical swap to installer.

**Tools:** Airtable (refresh calendar with automated reminders), same installation tools as SOP 9.

**Completion criteria:** Venue refreshed, all works accounted for, records updated, social content posted.

**What breaks easily:**
- Forgetting refresh dates. Set calendar reminders at 30 days, 14 days, and 3 days before.
- Not having replacement works ready. Maintain a "bench" of available works for each venue style profile.
- Outgoing works getting lost in the shuffle. Every work must be tracked from wall to next destination.

---

## SOP 15: Damage, Loss, and Dispute Handling

**Trigger:** Artwork reported damaged, lost, or stolen while at a venue or in transit.

**Steps:**
1. Receive report (from venue staff, artist, or discovered during visit).
2. Within 24 hours:
   - Document damage with photographs.
   - Record incident details: what happened, when, who discovered it.
   - Secure the artwork (if damaged but salvageable, remove from display).
3. Notify artist within 24 hours with honest assessment.
4. Determine liability:
   - Damage during Wallspace-arranged transit: Wallspace liability.
   - Damage while on display at venue (accident): venue liability per agreement.
   - Damage while on display (customer caused): venue liability, venue may pursue customer.
   - Theft: venue liability if inadequate security per agreement; otherwise shared risk.
5. Resolution options:
   - Minor damage repairable: arrange and pay for restoration.
   - Significant damage: compensate artist at agreed insurance value (set during availability setup).
   - Loss/theft: compensate artist at agreed insurance value.
6. File insurance claim if applicable (Wallspace transit insurance or venue's public liability).
7. Document outcome and update records.
8. Review and improve prevention: do we need better packaging? Does this venue need better hanging? Do we need to exclude certain types of work from certain venues?

**Owner:** Founder (personally handles every damage/dispute case).

**Tools:** Camera/phone (documentation), Airtable (incident log), email.

**Completion criteria:** Artist compensated or artwork restored, incident logged, preventive measures identified.

**Founder control:** Handle every damage case personally. How you handle the first few incidents defines artist trust in the platform. Be fast, be fair, be generous where possible.

---

## SOP 16: Returns and Collection

**Trigger:** Artist leaves platform, venue ends participation, or artwork needs to be recalled.

**Steps:**
1. Identify all works currently placed at venues for the departing artist/venue.
2. Schedule collection within 14 days (30 days maximum).
3. Notify all affected parties:
   - If artist leaving: notify venues that works will be collected and replacements arranged.
   - If venue ending: notify all artists with works at that venue.
4. Collect works:
   - Condition check at point of collection.
   - Compare to original condition report.
   - Photograph.
5. Return works to artists:
   - Arrange collection by artist or delivery to artist.
   - Get signed receipt/confirmation of return.
6. For venue exits: remove all Wallspace signage, collect QR cards, thank venue.
7. Update all records: works marked as "Returned to Artist" or "In Storage."
8. Process any outstanding payments or refunds.
9. If artist leaving: process final payout for any pending sales, close account.
10. Send professional exit communication -- leave the door open for return.

**Owner:** Founder.

**Tools:** Airtable, email, vehicle/courier.

**Completion criteria:** All works accounted for and returned, signage removed, records updated, final payments processed.

---

## SOP 17: Bulk Sales for Groups

**Trigger:** Corporate client, interior designer, or organisation wants to purchase multiple works or commission a curated selection.

**Steps:**
1. Inbound enquiry received (email, website, or referral).
2. Discovery call (15-30 minutes):
   - Number of works needed
   - Budget range
   - Style preferences
   - Space details (dimensions, photos)
   - Timeline
   - Purchase or loan preference
3. Prepare bespoke proposal:
   - Curated selection of works (oversupply by 50% to allow choice).
   - Pricing (volume discount may apply -- founder discretion, max 10% discount).
   - Installation included.
   - Ongoing refresh option (if loan model).
4. Present proposal (in-person or video call for orders over £1,000).
5. If accepted: collect deposit (50% for purchases, first quarter for loans).
6. Coordinate with artists: confirm availability, arrange collection.
7. Deliver and install.
8. Invoice balance.
9. Process artist payouts.
10. Follow up at 30 days for satisfaction check.

**Owner:** Founder (sales), VA can assist with logistics.

**Tools:** Canva/InDesign (proposals), Stripe (invoicing), Airtable.

**Completion criteria:** Works delivered and installed, full payment received, artists paid, client satisfied.

---

## SOP 18: Multi-Site Rollouts

**Trigger:** Venue group or chain wants Wallspace across multiple locations.

**Steps:**
1. Account management meeting with group decision-maker.
2. Assess all sites:
   - Visit each location (or collect detailed photos and dimensions).
   - Note style variations between sites.
   - Assess wall space, lighting, footfall per site.
3. Create master agreement:
   - Covers all sites under one contract.
   - Standard terms with site-specific annexes (wall specs, contact person per site).
   - Volume benefits: priority curation, dedicated account management, faster refresh cycles.
4. Develop site-by-site curation plan.
5. Phase rollout: don't try to launch all sites simultaneously.
   - Week 1-2: Flagship site installation.
   - Week 3-4: Review, adjust, get feedback.
   - Week 5+: Roll out to remaining sites in batches of 2-3.
6. Assign site-level contacts (venue manager at each location).
7. Create rollout tracker in Airtable.
8. Install site by site per SOP 9.
9. Monthly check-in call with group account contact.
10. Quarterly business review: sales data, feedback, refresh planning.

**Owner:** Founder (account relationship), can delegate installations.

**Tools:** Airtable (rollout tracker), DocuSign (master agreement), Google Slides (business review decks).

**Completion criteria:** All sites live, master agreement signed, ongoing account management in place.

---

## Operational Priority Matrix

### Must have strong process discipline (failure here kills the business):
1. **Condition reporting** -- photograph every work before and after every move
2. **Payout accuracy and timeliness** -- never be late paying artists
3. **Curation quality** -- never place work that doesn't fit the venue
4. **Damage response** -- fast, fair, transparent
5. **Billing and payment collection** -- automate via Stripe, monitor failures

### Most likely to break:
1. **Refresh scheduling** -- easy to let venues go stale; calendar discipline is essential
2. **Portfolio completeness** -- artists submit incomplete metadata; enforce standards early
3. **Venue staff knowledge** -- they forget how the programme works; regular check-ins and simple FAQ cards
4. **Artwork tracking** -- knowing where every piece is at all times; Airtable must be the single source of truth
5. **Communication gaps** -- artist doesn't know their work was placed, or venue doesn't know a work sold

### Founder must personally control at launch:
1. Artist application review and acceptance decisions
2. Venue assessment and onboarding meetings
3. Curation and matching decisions
4. Damage and dispute resolution
5. Payout processing and financial oversight
6. First 15 venue installations
7. Cancellation conversations

### Can be delegated early (with SOPs):
1. Image processing and resizing
2. QR code and signage production
3. Airtable data entry and maintenance
4. Delivery logistics (once process is proven)
5. Social media posting of installation photos
6. Routine email communications (using approved templates)
7. Physical installation (once trained)

---

## Tools Stack Summary

| Function | Tool | Cost Estimate |
|----------|------|---------------|
| CRM / Operations Database | Airtable | Free-£20/mo |
| Billing & Payments | Stripe + Stripe Connect | Transaction fees only |
| Contracts & Signatures | PandaDoc or DocuSign | £15-25/mo |
| Email | Gmail / Google Workspace | £5/mo |
| Portfolio / File Storage | Google Drive | Included with Workspace |
| Design (cards, proposals) | Canva Pro | £10/mo |
| QR Codes | QR Code Monkey | Free |
| Accounting | Xero or FreeAgent | £15-30/mo |
| Communication | WhatsApp Business | Free |
| Project Management | Notion or Trello | Free |
| Website | Webflow, Squarespace, or custom | £15-40/mo |

**Total operational tooling cost: approximately £60-150/month at launch.**

---

## Operational Capacity Planning

### Solo founder capacity (realistic):
- Artist applications: 10-15 per week
- Artist onboardings: 3-5 per week
- Venue onboardings: 1-2 per week
- Installations: 2-3 per week
- Curation proposals: 2-3 per week
- Refreshes: 1-2 per week (after first quarter)

### First hire trigger points:
- **Operations / logistics VA:** When managing more than 15 active venues or 50 active artists
- **Curation assistant:** When managing more than 25 venues
- **Finance / admin:** When processing more than 20 payouts per month

### Scaling bottleneck: The founder's time for in-person venue visits and installations is the primary constraint. Plan for this becoming the first outsourced function at ~20 venues.
