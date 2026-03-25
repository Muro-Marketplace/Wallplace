# Section 8: Business Model and Operating Model

## 8.1 Launch Model Recommendation

### Options Evaluated

| Model | Description | Pros | Cons | Verdict |
|---|---|---|---|---|
| **Managed concierge marketplace** | Wallspace handles all curation, matching, logistics. Venues and artists interact through Wallspace, not directly. | Maximum quality control. Highest learning rate. Best venue experience. Creates strong brand. | Labour-intensive. Hard to scale without hiring. | **Recommended for launch** |
| Lightly self-serve marketplace | Artists upload work, venues browse and request. Wallspace provides tools but limited hands-on service. | Scales faster. Lower operational cost. | Quality control is poor. Venue experience suffers. Loses curation differentiator. Cold-start problem with empty catalogue. | Not recommended for launch |
| Art placement agency with software layer | Wallspace operates as a traditional agency (relationship-driven placement) with internal tools to manage workflow. | High-touch, high quality. | Does not scale. No network effects. Becomes a services business. | Not recommended |
| Hybrid model | Self-serve tools available, but concierge service as default/premium. | Flexibility. | Confusing positioning. Splits engineering focus. | Consider for Year 2+ |

### Recommendation: Managed Concierge Marketplace

Launch as a fully managed concierge marketplace. Every artist application, venue onboarding, artwork curation, placement decision, delivery, installation, and sale is handled by Wallspace.

**Why this is right for launch:**

1. **Quality is the product.** At launch, Wallspace has no brand recognition. The only way to build trust with venues and artists is to deliver an exceptional, high-touch experience. Self-serve at launch means mediocre experiences.

2. **Learning rate.** Every manual interaction generates insight: what venues want, what artists struggle with, what art sells, what logistics fail. This learning cannot happen through a self-serve platform. It happens through conversations, site visits, and hands-on problem-solving.

3. **Cold-start solution.** Marketplaces fail at cold start because neither side has reason to join an empty platform. A concierge model bypasses this: Wallspace recruits artists, curates selections, and places them in venues. The marketplace dynamics emerge later, once both sides are populated.

4. **Operational simplicity.** Paradoxically, a concierge model is operationally simpler at small scale than a self-serve platform. No complex matching algorithms, no UX for venue browsing, no artist self-service tools. Just a small team doing the work directly.

5. **Transition path.** A concierge model naturally evolves into a platform. Manual processes reveal which workflows should be automated. The concierge team becomes the product specification for the software.

**When to transition:** Begin building self-serve tools when the concierge team is handling 50+ active venue relationships and the bottleneck shifts from demand generation to operational capacity. Likely Month 9-12.

---

## 8.2 Revenue Model

### Revenue Stream 1: Artist Memberships (Primary, Recurring)

| Tier | Monthly | Annual (2 months free) | What's Included |
|---|---|---|---|
| **Founding** | £29/mo | £290/yr | Profile, portfolio hosting, venue matching, up to 5 works listed, basic analytics, community access. Limited to first 50 artists. |
| **Core** | £49/mo | £490/yr | Everything in Founding + up to 15 works listed, priority venue matching, professional photography guidance, featured in venue pitches. |
| **Premium** | £89/mo | £890/yr | Everything in Core + unlimited works listed, dedicated account manager, priority placement, professional photography session (1x/yr), exhibition event support, premium analytics. |

**Why memberships, not just commissions:**
- Commissions alone create a chicken-and-egg problem: no revenue until sales happen, but sales require infrastructure that costs money.
- Memberships create predictable recurring revenue from day one.
- Membership creates commitment. Artists who pay are more engaged, responsive, and invested in quality.
- Membership funds the concierge service that makes the model work.

### Revenue Stream 2: Sales Commissions (Secondary, Variable)

| Sale Type | Commission Rate | Rationale |
|---|---|---|
| **Customer purchase from venue** | 20% of sale price | Customer discovers art in venue, purchases through Wallspace. Higher commission justified by Wallspace-created demand. |
| **Direct venue purchase** | 15% of sale price | Venue purchases artwork for permanent display. Lower commission because venue is an existing relationship. |

**Commission mechanics:**
- All sales processed through Wallspace. No direct artist-to-buyer transactions for works placed through Wallspace.
- Artist receives sale price minus commission within 14 days of confirmed payment.
- VAT handled by Wallspace where applicable.
- Commission applies to original artwork sales only. Print sales have separate economics (see below).

### Revenue Stream 3: Print and Framing Services (Future, High Margin)

| Service | Pricing | Margin | Timeline |
|---|---|---|---|
| **Giclée prints** | £40-£150 depending on size | 30-40% | Month 6+ |
| **Professional framing** | £60-£200 depending on size and frame | 35-45% | Month 6+ |
| **Print + frame packages** | £90-£300 | 35-40% | Month 6+ |

This is a high-margin, low-complexity revenue stream. Wallspace partners with a print lab and framing workshop (both readily available in London) and marks up their services. Artists benefit from professional reproduction of their work. Venues benefit from being able to offer affordable prints alongside originals.

### Revenue Stream 4: Premium Venue Services (Future)

| Service | Pricing | Timeline |
|---|---|---|
| **Curated rotation programme** | £99-£199/mo per venue | Year 2+ |
| **Exhibition event hosting** | £250-£500 per event | Month 9+ |
| **Branded art programme** | £299-£499/mo | Year 2+ |
| **Multi-site coordination** | Custom pricing | Year 2+ |

These are not launch revenue streams. They become relevant when Wallspace has proven the core model and venues begin requesting enhanced services.

---

## 8.3 End-to-End Operating Model

### Phase 1: Artist Acquisition and Onboarding

```
Artist discovers Wallspace (Instagram, word of mouth, outreach)
    → Visits website, views value proposition
    → Submits application (portfolio link, 10-15 sample works, bio, statement)
    → Wallspace reviews application (target: 48-hour response)
        → Rejected: Polite decline with feedback and invitation to reapply
        → Accepted: Welcome email, membership selection, onboarding call
    → Artist selects membership tier and pays
    → Artist completes full profile:
        - Bio and artist statement
        - High-res images of available works (Wallspace provides image specs)
        - Pricing for each work
        - Dimensions, medium, framing status
        - Availability and lead times
    → Wallspace reviews and approves profile
    → Artist enters the "available for placement" pool
```

**What is manual at launch:**
- Application review (founder reviews every portfolio personally)
- Onboarding calls (15-20 min video call with each accepted artist)
- Profile review and quality check on images
- Ongoing relationship management via WhatsApp/email

**What should be automated later:**
- Application form and status tracking (simple web form with admin dashboard)
- Payment processing (Stripe subscriptions from day one)
- Image upload and basic quality checks (resolution, aspect ratio)
- Profile publishing workflow
- Automated welcome sequences and onboarding emails

**Operational burden points:**
- Image quality. Artists frequently submit low-resolution or poorly lit photos. This is the single biggest quality bottleneck. Consider offering a photography guide or partnering with a photographer for launch cohort.
- Pricing guidance. Artists often misprice their work (too high for the hospitality market, or too low to be sustainable). Wallspace should provide pricing guidance during onboarding.
- Responsiveness. Artists who do not respond to placement opportunities within 48 hours create operational drag. Set clear expectations during onboarding.

---

### Phase 2: Venue Acquisition and Onboarding

```
Wallspace identifies target venue (neighbourhood research, foot traffic, aesthetic fit)
    → Initial outreach (in-person visit preferred, email/Instagram DM as backup)
    → Venue meeting / site visit:
        - Assess wall space (quantity, dimensions, lighting, mounting options)
        - Understand venue brand, clientele, aesthetic preferences
        - Photograph the space
        - Explain Wallspace model (free art, we handle everything)
        - Discuss any preferences (photography vs painting, colour palette, subject matter)
    → Venue agrees to participate
    → Venue signs simple agreement:
        - Wallspace provides art at no cost
        - Venue displays art in agreed locations
        - Venue allows Wallspace signage/cards near artwork
        - Venue facilitates customer enquiries (directs to Wallspace)
        - Either party can end arrangement with 14 days notice
        - Venue is not liable for minor wear (reasonable care expected)
        - Wallspace handles insurance for artwork
    → Venue enters the "active venues" pool
    → Wallspace creates venue profile (internal):
        - Photos of wall spaces with measurements
        - Brand/aesthetic notes
        - Clientele profile
        - Contact details and preferred communication channel
        - Logistical notes (access hours, parking, mounting restrictions)
```

**What is manual at launch:**
- All venue outreach (founder does in-person visits)
- Site assessment and photography
- Agreement signing (simple PDF or paper, not a complex legal process)
- Relationship management

**What should be automated later:**
- Venue CRM (track outreach status, follow-ups, active venues)
- Venue profile creation with standardised fields
- Agreement generation and e-signature
- Venue self-service portal (view current artwork, request rotation, report issues)

**Operational burden points:**
- Venue acquisition is high-effort, high-reward. Each venue requires an in-person visit and relationship building. Budget 2-3 hours per venue for initial outreach and onboarding.
- Venue expectations must be managed. Some venues will expect Wallspace to act as an interior designer. Scope must be clear: Wallspace curates and places art, not furniture or lighting.
- Access logistics. Getting into venues to install art requires coordination. Venues are often only accessible during off-hours (before opening or after closing).

---

### Phase 3: Curation and Matching

```
Wallspace reviews venue profile and available artist pool
    → Selects 6-10 candidate artworks based on:
        - Venue aesthetic and brand
        - Wall dimensions and lighting
        - Clientele and neighbourhood demographics
        - Price range appropriate for the venue's audience
        - Mix of styles and artists (avoid putting all one artist's work in one venue)
    → Creates a "mood board" or selection proposal for venue
    → Shares proposal with venue owner (email with images, or in-person presentation)
    → Venue approves selection (or requests adjustments)
    → Wallspace confirms availability with selected artists
    → Artists prepare works for delivery (Wallspace provides packaging guidelines)
    → Delivery and installation scheduled
```

**What is manual at launch:**
- All curation decisions (founder selects works for each venue personally)
- Proposal creation (simple email with photos, not a sophisticated tool)
- Artist coordination (WhatsApp/email to confirm availability)

**What should be automated later:**
- Matching algorithm that suggests artworks based on venue profile and artwork attributes
- Digital proposal builder with drag-and-drop layout
- Automated availability checking and artist notification
- Rotation scheduling

**Operational burden points:**
- Curation is the core value creation. It should remain human-led even as tools are built to support it. The algorithm suggests; the human decides.
- Venue owners are busy. Getting them to review and approve selections can take multiple follow-ups. Build in a 1-week response window and default to "approved" if no objections raised.

**Where standardisation matters most:**
- Artwork photography standards (consistent lighting, backgrounds, resolution)
- Artwork metadata (dimensions, medium, weight, framing status, price, minimum display period)
- Venue assessment template (wall measurements, lighting conditions, mounting options, access details)
- Proposal format (consistent presentation of curated selections)

---

### Phase 4: Logistics, Delivery, and Installation

```
Artworks confirmed for placement
    → Artist packages work per Wallspace guidelines
        (or Wallspace arranges collection if artist is local)
    → Wallspace receives/collects artworks
    → Quality check: condition, framing, hanging hardware
    → Wallspace delivers to venue
    → Installation:
        - Hang artwork in agreed positions
        - Place Wallspace information cards (artist name, title, price, QR code)
        - Take installation photos for artist and for records
    → Confirm installation with artist (share photos)
    → Update internal tracking (which works are in which venues)
```

**What is manual at launch:**
- All logistics (founder or contractor collects, delivers, installs)
- Quality checking
- Information card printing and placement
- Installation photography

**What should be automated later:**
- Logistics scheduling and route planning
- Inventory tracking system (which artwork is where, condition, display duration)
- Automated installation photo capture and sharing
- QR code generation linking to artwork/artist profile and purchase page

**Operational burden points:**
- Logistics is the highest operational cost at launch. Collecting art from artists, transporting it, and installing it in venues requires time, a vehicle, and basic installation skills.
- Packaging quality varies wildly between artists. Provide clear packaging guidelines and consider supplying standard packaging materials to artists.
- Installation hardware. Venues have different wall types (brick, plasterboard, concrete). Carry a full range of hanging hardware.
- Insurance. Artworks in transit and on display need coverage. Arrange a simple policy covering loss, theft, and damage up to a reasonable per-work limit.

**Standardisation priorities:**
- Packaging specifications (minimum requirements for safe transport)
- Information card template (consistent branding, QR code format)
- Installation checklist (hanging height, spacing, card placement, photography)
- Condition reporting (document artwork condition at pickup, delivery, and return)

---

### Phase 5: Sales and Transactions

```
Customer in venue sees artwork they want to buy
    → Scans QR code on information card (or asks venue staff)
    → Directed to Wallspace purchase page:
        - Artwork details, artist bio, price
        - "Buy this artwork" button
        - Option to enquire / request similar
    → Customer completes purchase (Stripe checkout)
    → Wallspace receives payment
    → Wallspace notifies artist of sale
    → Artist receives payout (sale price minus commission) within 14 days
    → Wallspace arranges replacement artwork for the venue
    → Sold artwork either:
        - Stays on wall until replacement arrives (if customer agrees to wait)
        - Is taken down and delivered to customer
        - Customer collects from venue (simplest option)
    → Replacement artwork installed

Alternative: Venue wants to purchase artwork
    → Venue contacts Wallspace to purchase displayed work
    → Wallspace invoices venue at listed price minus venue discount (15% commission instead of 20%)
    → Artist receives payout
    → Replacement artwork arranged
```

**What is manual at launch:**
- Purchase page can be a simple Stripe payment link per artwork (no complex e-commerce needed)
- Customer communication (confirmation emails, delivery coordination)
- Artist payout (manual bank transfer initially, move to automated payouts)
- Replacement coordination

**What should be automated later:**
- Full e-commerce purchase flow with cart, checkout, and order management
- Automated artist payouts via Stripe Connect
- Replacement artwork suggestion engine
- Customer CRM and follow-up (encourage repeat purchases, notify of new works)
- Sales analytics dashboard for artists

**Operational burden points:**
- Replacement logistics. Every sale creates an installation gap. Having "ready to place" inventory or fast-turnaround artists reduces downtime.
- Delivery to customer. If the customer does not want to collect from the venue, Wallspace needs a delivery solution. At launch, use a courier service for London deliveries.
- Refunds and disputes. Establish a clear returns policy. Original artwork sales are typically final, but damaged-on-arrival situations need a process.

---

### Phase 6: Rotation and Ongoing Management

```
Artwork has been displayed for agreed period (typically 2-3 months)
    → Wallspace contacts venue: rotation due, any preferences for new selection?
    → New curation cycle begins (return to Phase 3)
    → Old artworks returned to artists (or moved to different venue)
    → New artworks installed
    → Cycle repeats
```

**What is manual at launch:**
- Rotation scheduling (spreadsheet or calendar)
- Venue check-ins (in-person or phone)
- Artwork return logistics

**What should be automated later:**
- Rotation scheduling engine with automated reminders
- Venue satisfaction surveys after each rotation
- Artwork lifecycle tracking (total display time, venues visited, enquiries, sales)
- Automated re-curation suggestions based on previous placements and sales data

---

## 8.4 Technology Stack (Launch vs. Later)

### Launch (Months 1-6): Minimum Viable Operations

| Function | Tool | Cost |
|---|---|---|
| Artist applications | Typeform or Google Forms | Free-£25/mo |
| Artist payments | Stripe Subscriptions | 1.4% + 20p per transaction |
| Artist communication | WhatsApp Business + Email | Free |
| Venue CRM | Notion or Airtable | Free-£20/mo |
| Artwork tracking | Airtable or Google Sheets | Free-£20/mo |
| Purchase pages | Stripe Payment Links | Included in Stripe |
| Artist payouts | Manual bank transfer (then Stripe Connect) | Free (then Stripe fees) |
| Information cards | Canva + local print shop | £50-100/mo |
| Website | Simple landing page (Carrd, Squarespace, or custom) | £10-£30/mo |
| QR codes | Free QR generator | Free |
| Social media | Instagram, managed manually | Free |
| Accounting | Xero or FreeAgent | £25-£35/mo |

**Total launch tech cost: approximately £100-£250/month**

### Later (Months 6-18): Platform Build

| Function | Build or Buy | Priority |
|---|---|---|
| Artist dashboard (profile, portfolio, analytics) | Build | High |
| Venue dashboard (current art, rotation requests) | Build | Medium |
| Curation/matching tool | Build | High |
| E-commerce (artwork purchase flow) | Build on Stripe | High |
| Automated payouts (Stripe Connect) | Build on Stripe | High |
| Inventory/logistics management | Build or adapt (e.g., Airtable to custom) | Medium |
| Customer-facing browse/discover | Build | Medium |
| Print ordering integration | Partner API | Low |
| Mobile app | Not yet | Low |

---

## 8.5 Operating Model Summary

### What Creates Operational Burden (Ranked)

1. **Logistics (collection, delivery, installation, returns).** This is the single largest operational cost and time sink. It requires physical movement of fragile goods across London. Every placement, sale, and rotation triggers logistics.

2. **Curation and matching.** Human curation is the core value but does not scale linearly. Each new venue requires fresh curation work.

3. **Artist image quality.** Getting consistently high-quality images from artists requires ongoing effort, guidance, and sometimes re-shoots.

4. **Venue relationship management.** Venues need regular check-ins, rotation coordination, and issue resolution. This is relationship work that does not automate easily.

5. **Sales processing and payouts.** Until automated with Stripe Connect, every sale requires manual payment processing and artist payout.

### What Must Be Standardised From Day One

1. **Artwork metadata format.** Every artwork must have: title, medium, dimensions (cm), weight, framing status, price, high-res image(s), artist ID. No exceptions.

2. **Venue assessment template.** Every venue assessment must capture: wall measurements, lighting conditions, wall type, mounting options, access hours, brand notes, clientele notes. Standardise this from the first venue visit.

3. **Information card format.** Consistent branding, layout, and QR code placement on every card in every venue.

4. **Packaging standards.** Minimum packaging requirements for artist-to-Wallspace handoff.

5. **Commission and payout terms.** Clear, written, consistent terms for every artist. No ad-hoc deals.

6. **Venue agreement.** One standard agreement for all venues. Resist the temptation to customise terms per venue.

### Transition Triggers: Manual to Automated

| Trigger | Action |
|---|---|
| 30+ active artists | Build artist dashboard with self-serve profile editing |
| 15+ active venues | Build venue CRM and rotation scheduler |
| 10+ sales/month | Implement Stripe Connect for automated payouts |
| 50+ artworks in circulation | Build inventory tracking system |
| Curation taking 5+ hours/week | Build matching/suggestion tool |
| 3+ venue complaints about logistics | Hire part-time logistics coordinator or partner with art handler |
