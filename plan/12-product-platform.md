# Section 12: Product and Platform Design

## Purpose

This section defines what to build, what to buy, what to fake, and in what order. The operating principle is brutal: build the minimum that lets Wallspace function professionally from the outside while the founder runs operations manually behind the scenes. Every feature proposed must pass the test: "Will not having this prevent us from serving artists and venues in the next 90 days?"

---

## 12.1 Design Philosophy

1. **Concierge first, platform second.** The founder is the product for the first 6-12 months. The platform exists to support the founder's work, not to replace it.
2. **Professional facade, manual backend.** The artist and venue experience should feel polished and intentional. The internal operations can be held together with spreadsheets, Airtable, and manual processes.
3. **No-code until it breaks.** Do not write custom code until a no-code tool demonstrably cannot handle the workflow. Custom code is expensive, slow, and creates maintenance burden.
4. **Ship in weeks, not months.** v1 must be live within 4-6 weeks of starting build. If a feature takes more than a week to implement, it probably should not be in v1.
5. **Every tool earns its place.** Do not adopt a tool because it is trendy. Adopt it because it solves a specific problem better than the alternative (including doing it manually).

---

## 12.2 Feature Triage: Build, Buy, Manual, or Wait

### Category 1: Must Exist in v1 (Weeks 1-6)

| Feature | Implementation | Tool/Method |
|---|---|---|
| **Public website** (landing page, artist gallery, venue info, about) | Buy (no-code) | Webflow or Carrd |
| **Artist application form** | Buy | Typeform |
| **Artist membership payments** (recurring billing) | Buy | Stripe (Payment Links or Checkout) |
| **Artist portfolio display** (public-facing gallery per artist) | Buy (no-code) | Webflow CMS or Notion (published pages) |
| **Venue enquiry form** | Buy | Typeform embedded on website |
| **Operational database** (artists, venues, artworks, placements) | Buy | Airtable |
| **Email communication** | Buy | Gmail + Mailchimp (or Loops) for sequences |
| **Basic CRM / pipeline tracking** | Manual + tool | Airtable or Notion |
| **Customer artwork purchase flow** (QR code at venue) | Manual + Stripe | Stripe Payment Links (one per artwork) |
| **Invoicing / payout to artists** | Manual | Stripe payouts or bank transfer + spreadsheet |
| **Legal agreements** (artist terms, venue terms) | Manual | Google Docs / PDF, signed via DocuSign or HelloSign |

### Category 2: Manual Behind the Scenes in v1 (Founder Does It)

| Function | How It Works Manually |
|---|---|
| **Curation and matching** | Founder reviews artist portfolios, knows venue spaces, selects matches manually |
| **Artwork shortlists for venues** | Founder creates a PDF or email with 3-5 artwork images and descriptions for each venue |
| **Placement scheduling** | Founder maintains a calendar (Google Calendar or Airtable) of installations and rotations |
| **Sales attribution** | Founder tracks which artwork is in which venue; when a Stripe payment comes in, matches it to the artist and venue manually |
| **Commission calculation** | Spreadsheet: sale price, artist share (80-85%), venue commission (15-20%), Wallspace cut |
| **Artwork rotation management** | Founder schedules and executes rotations; updates Airtable records |
| **Venue feedback collection** | Founder sends a brief email or WhatsApp message after each placement |
| **Artist onboarding** | Founder runs a 15-minute call, sends welcome email with manual instructions |
| **Reporting** | Monthly email to each artist with their stats, assembled manually from Airtable |

### Category 3: Wait (Not Needed for v1)

| Feature | Why It Waits | When to Build |
|---|---|---|
| **Self-serve artist dashboard** | Founder handles everything; artists do not need to log in | v2 (month 6-9) |
| **Self-serve venue dashboard** | Venues interact through the founder, not a portal | v2 (month 6-9) |
| **Automated placement matching** | Not enough data or volume to automate; founder taste is the algorithm | v3 (month 12+) |
| **In-app messaging between artists and venues** | All communication goes through the founder | v2+ |
| **Customer accounts or wishlists** | Unnecessary friction at this scale | v3 |
| **Automated artwork rotation scheduling** | Founder manages manually with calendar | v2 |
| **Revenue-share auto-calculation and payout** | Spreadsheet is fine for 10-15 venues | v2 |
| **Mobile app (artist or venue)** | Web-based tools are sufficient; app adds cost and complexity | v3+ |
| **Bulk order handling** | Edge case at launch; handle ad hoc | v2 |
| **Advanced analytics / reporting dashboard** | Airtable + spreadsheet covers reporting needs | v2 |
| **API integrations (POS, accounting)** | Not enough volume to justify | v3+ |
| **Automated email sequences** | Mailchimp/Loops handles basic sequences; full automation is premature | v2 |

---

## 12.3 Recommended Tech Stack (v1)

### Public-Facing

| Layer | Tool | Cost | Why |
|---|---|---|---|
| **Main website** | **Webflow** | ~$29/mo (CMS plan) | Professional design, CMS for artist/venue pages, custom domain, SEO-friendly. Superior to Carrd for a site that needs multiple dynamic pages. |
| **Venue landing page** | **Webflow** (subpage) | Included | Part of the main site. Dedicated /venues path. |
| **Artist profiles/gallery** | **Webflow CMS** | Included | Each artist gets a CMS item with bio, images, pricing. Public-facing gallery. |
| **Application forms** | **Typeform** | ~$25/mo (Basic plan) | Clean UX for artist applications and venue enquiries. Integrates with Airtable via Zapier. |
| **Customer purchase (QR flow)** | **Stripe Payment Links** | 1.4% + 20p per transaction (UK cards) | One payment link per artwork. QR code printed and placed next to each piece in venue. Customer scans, pays, done. |

### Operational Backend

| Layer | Tool | Cost | Why |
|---|---|---|---|
| **Master database** | **Airtable** | Free or $20/mo (Plus) | Relational database for artists, artworks, venues, placements, sales. Views, filters, automations. Core operational tool. |
| **CRM / pipeline** | **Airtable** (or Notion) | Included / Free | Track venue prospect pipeline, artist applications, follow-ups. Kanban view for pipeline stages. |
| **Task management** | **Notion** | Free | Internal docs, SOPs, meeting notes, checklists. |
| **Email sequences** | **Mailchimp** (or Loops) | Free tier initially | Automated welcome sequences, follow-ups, monthly reports. |
| **Automation glue** | **Zapier** (or Make) | ~$20/mo | Connect Typeform submissions to Airtable, Stripe payments to Airtable, trigger email notifications. |
| **Payments and billing** | **Stripe** | Transaction fees only | Membership billing (recurring), artwork sales (one-time), payouts to artists. |
| **Contracts** | **HelloSign** (or DocuSign) | Free tier (3 docs/mo) or $15/mo | Artist agreements, venue agreements. Professional and legally binding. |
| **Scheduling** | **Google Calendar** | Free | Installation calendar, rotation schedule, meeting bookings. |
| **Communication** | **Gmail + WhatsApp** | Free | Email for formal communication, WhatsApp for quick operational messages with artists and venues. |
| **File storage** | **Google Drive** | Free | Artist portfolio images, contracts, case study materials, installation photos. |

### Total Monthly Cost (v1)

| Tool | Monthly Cost |
|---|---|
| Webflow | $29 |
| Typeform | $25 |
| Airtable | $0-20 |
| Zapier | $20 |
| Mailchimp | $0 |
| HelloSign | $0-15 |
| Stripe | Transaction fees only |
| Google Workspace | $0 (personal) or $6 |
| **Total** | **$74-115/mo (~$60-95/mo)** |

This is intentionally minimal. The entire tech stack costs less than two artist memberships per month.

---

## 12.4 Detailed Feature Specifications (v1)

### 12.4.1 Public Website (Webflow)

**Pages:**

1. **Homepage**
   - Hero: headline, subheadline, hero image of artwork in a venue
   - How it works (3 steps for artists, 3 steps for venues)
   - Featured artwork grid (pulls from CMS)
   - Testimonial section (when available)
   - Two CTAs: "I'm an artist" and "I'm a venue"

2. **For Artists**
   - Value proposition
   - How membership works
   - Pricing tiers (Founding: 29/mo, Core: 49/mo, Premium: 89/mo)
   - FAQ
   - CTA: "Apply to Join" (links to Typeform)

3. **For Venues**
   - Value proposition (it is free, we handle everything)
   - How it works
   - Case studies (when available)
   - FAQ
   - CTA: "Get in Touch" (links to Typeform or contact form)

4. **Gallery / Artists**
   - Grid of artist cards (CMS-driven)
   - Each card: artist name, thumbnail image, medium, brief bio
   - Click through to individual artist page

5. **Individual Artist Page** (CMS template)
   - Artist name, bio, photo
   - Portfolio gallery (6-20 images)
   - Pricing information (range or per-piece)
   - Available for: display / sale / commission
   - "Enquire about this artist" button

6. **About**
   - Wallspace story, mission, founder bio
   - How curation works

7. **Contact**
   - Simple contact form
   - Email address, social links

### 12.4.2 Artist Application (Typeform)

**Fields:**

1. Full name
2. Email address
3. Phone number
4. Location (postcode or borough)
5. Primary medium (Photography / Painting / Printmaking / Illustration / Mixed Media / Other)
6. Instagram handle
7. Portfolio website (optional)
8. Upload 10-20 images of available work (or link to online portfolio)
9. Brief artist statement (100-300 words): "Tell us about your work and practice"
10. Price range for available pieces (dropdown: Under 100 / 100-250 / 250-500 / 500-1000 / 1000+)
11. Are your works available as prints/editions? (Yes / No / Some)
12. Can you deliver and/or install within London? (Yes / No / Need assistance)
13. How did you hear about Wallspace?
14. Anything else you'd like us to know? (optional)

**Post-submission:** Auto-confirmation email. Application lands in Airtable via Zapier for review.

### 12.4.3 Venue Enquiry (Typeform)

**Fields:**

1. Venue name
2. Your name and role
3. Email address
4. Phone number
5. Venue address
6. Venue type (Cafe / Restaurant / Bar / Co-working / Office / Other)
7. Instagram handle (optional)
8. Approximate wall space available (Small: 1-2 walls / Medium: 3-4 walls / Large: 5+ walls)
9. Are you currently displaying artwork? (Yes / No)
10. What kind of work would suit your space? (Photography / Paintings / Prints / Open to anything)
11. How did you hear about Wallspace?

**Post-submission:** Auto-confirmation email. Enquiry lands in Airtable. Founder follows up within 24 hours.

### 12.4.4 Airtable Database Structure

**Table 1: Artists**
- Name, Email, Phone, Location, Medium, Instagram, Website
- Application date, Application score, Status (Applied / Under Review / Accepted / Waitlisted / Declined)
- Membership tier, Membership start date, Stripe customer ID
- Bio, Statement, Portfolio images (attachments or links)
- Number of pieces listed, Number of active placements, Total sales

**Table 2: Artworks**
- Title, Artist (linked to Artists table), Medium, Dimensions, Price
- Edition info (if applicable), Image (attachment)
- Status (Available / Placed / Sold / Unavailable)
- Current venue (linked to Venues table), Placement date
- Stripe Payment Link URL, QR code image

**Table 3: Venues**
- Name, Address, Neighbourhood, Type, Contact name, Email, Phone, Instagram
- Prospect status (Identified / Contacted / Interested / Meeting Scheduled / Onboarded / Declined)
- Wall space assessment, Aesthetic notes
- Number of active placements, Pieces currently displayed (linked to Artworks)
- Onboarding date, Agreement signed (checkbox)
- Referral source

**Table 4: Placements**
- Artwork (linked), Venue (linked), Artist (linked)
- Installation date, Planned removal date, Actual removal date
- Status (Scheduled / Active / Completed / Cancelled)
- Notes

**Table 5: Sales**
- Artwork (linked), Artist (linked), Venue (linked)
- Sale date, Sale price, Sale type (Customer QR / Direct venue purchase)
- Artist payout amount, Venue commission amount, Wallspace revenue
- Payout status (Pending / Paid), Payout date
- Stripe payment ID

**Table 6: Pipeline (Venue Prospects)**
- Venue name, Contact, Email, Source
- Stage (Identified / First Touch / Follow Up / Meeting / Proposal / Negotiation / Won / Lost)
- Next action, Next action date
- Notes, Objections, Follow-up history

### 12.4.5 Customer QR Purchase Flow

**How it works:**

1. Each artwork in a venue has a small printed card next to it: artwork title, artist name, price, and a QR code.
2. Customer scans QR code with their phone.
3. QR code opens a Stripe Payment Link page: shows the artwork image, title, artist, price, and a "Buy" button.
4. Customer enters payment details and completes purchase.
5. Stripe sends payment confirmation to customer and notification to founder.
6. Founder updates Airtable: marks artwork as sold, records sale, triggers payout calculation.
7. Founder contacts artist and venue: confirms sale, arranges artwork handover or shipping.

**Physical materials needed per artwork:**
- Printed card (business card size or slightly larger): artwork title, artist name, price, QR code, Wallspace branding.
- Cards can be printed in bulk using a service like Moo or Vistaprint. Cost: approximately 10-20p per card.

**QR code generation:**
- Stripe generates a unique Payment Link URL for each artwork.
- Convert URL to QR code using any free QR generator (or use Stripe's built-in QR feature).
- Embed QR in the printed card template (Canva for design).

### 12.4.6 Venue Purchase Flow

**For direct venue purchases (venue buys the artwork for permanent display):**

1. Venue expresses interest in purchasing a piece to the founder.
2. Founder confirms price (venue purchase commission is 15%, lower than customer QR at 20%).
3. Founder sends a Stripe Payment Link or invoice to the venue.
4. Venue pays. Founder arranges handover.
5. Artist receives payout (85% of sale price).
6. Wallspace retains 15%.

**For revenue-share arrangements:**

At v1 scale, revenue share is handled manually. If a venue wants a non-sale arrangement (e.g., artwork rental or display fee), the founder negotiates terms on a case-by-case basis and tracks in Airtable. This is an edge case at launch and does not require a system.

### 12.4.7 Membership Management

**Stripe setup:**

- Create three Stripe Products:
  - Founding Membership: 29/mo (recurring)
  - Core Membership: 49/mo (recurring)
  - Premium Membership: 89/mo (recurring)
- Each product has a Stripe Checkout link or Payment Link.
- After artist is accepted, founder sends the appropriate payment link.
- Stripe handles recurring billing, failed payment retries, and cancellation.
- Founder monitors Stripe dashboard for churn, failed payments, and new subscriptions.

**Cancellation policy:**

- Artists can cancel anytime. Membership runs until end of billing period.
- Founder receives Stripe webhook notification (or checks dashboard) and updates Airtable.
- Active placements are managed through remaining billing period, then artwork is returned.

### 12.4.8 Payout Management

**v1 process (manual):**

1. When an artwork sells, Stripe captures the payment.
2. Founder logs the sale in the Sales table in Airtable.
3. Founder calculates artist payout:
   - Customer QR sale: Artist receives 80% (Wallspace keeps 20%)
   - Direct venue purchase: Artist receives 85% (Wallspace keeps 15%)
4. Venue commission (if applicable) is calculated and recorded.
5. Founder initiates payout to artist via bank transfer or Stripe Connect (if set up).
6. Payout frequency: monthly, for all sales in the preceding month. Payouts processed on the 1st of each month.
7. Artist receives a payout summary email: list of sales, amounts, payout total.

**Stripe Connect consideration:**

Stripe Connect allows automated split payments (artist gets their share automatically when a sale occurs). This is worth implementing once sales volume exceeds 10-15 per month. For v1, manual payouts are simpler and avoid the Stripe Connect onboarding complexity.

---

## 12.5 What the Leanest v1 Looks Like

### Absolute Minimum to Launch

If pressed to launch in 2 weeks instead of 6, this is the irreducible core:

| Component | Implementation | Time to Build |
|---|---|---|
| Single-page website | Carrd ($19/yr) | 1 day |
| Artist application | Google Form (free) | 1 hour |
| Venue enquiry | Google Form (free) | 1 hour |
| Operational database | Airtable (free) | 1 day |
| Payment collection (membership) | Stripe Payment Links | 2 hours |
| Payment collection (artwork sales) | Stripe Payment Links | 2 hours per artwork |
| Contracts | Google Doc template + email signature | 1 day |
| Communication | Gmail + phone | Already exists |
| QR cards for artwork | Canva + local print shop | 1 day |

**Total build time:** 4-5 days. **Total cost:** Under 20 per month.

This version works. It is not beautiful, but it is functional. The founder is the product. The tools just keep track.

### Recommended v1 (4-6 Week Build)

The recommended v1 adds Webflow (for a more professional public presence), Typeform (for better application UX), and Zapier (to reduce manual data entry). This is the version described in detail throughout this section. It costs 60-95 per month and takes 4-6 weeks to set up properly.

---

## 12.6 v2 Roadmap (Month 6-9)

When the manual processes start breaking (typically at 50+ artists, 20+ venues, 10+ sales per month), begin building v2:

| Feature | Trigger to Build | Build or Buy |
|---|---|---|
| **Artist dashboard** (view placements, sales, payouts) | Artists asking for self-serve access to their data | Build (Softr or Stacker on top of Airtable) or custom |
| **Venue dashboard** (view current artwork, request changes) | Venues wanting to browse/request artwork without calling | Build (Softr) or custom |
| **Automated payout via Stripe Connect** | Sales volume exceeds 10-15/month; manual payouts too slow | Buy (Stripe Connect) |
| **Automated artwork rotation reminders** | Founder forgetting rotation dates; venues asking when next swap is | Airtable automations or Zapier |
| **Email reporting automation** | Manual monthly reports taking too long | Mailchimp/Loops + Airtable automation |
| **Artwork catalogue with search/filter** | Public site needs better browsability for venues and customers | Webflow CMS enhancements |

### v2 Tech Decision: No-Code vs. Custom Code

At the v2 stage, evaluate whether no-code tools (Softr, Stacker, Glide, Retool) can handle the dashboards, or whether a custom-built web application is needed.

**Stay no-code if:**
- User base is under 200 artists and 50 venues.
- Workflows are relatively standard (view data, submit forms, track status).
- Budget is constrained and there is no developer on the team.

**Move to custom code if:**
- Complex business logic (automated matching, dynamic pricing, multi-party revenue splits) is needed.
- No-code tools cannot handle the data relationships or performance requirements.
- There is budget for a developer (freelance or part-time) and the founder's time is better spent on growth than on duct-taping no-code tools together.

**Likely custom code stack (when the time comes):**
- Frontend: Next.js or similar React framework
- Backend: Node.js or Python (Django/FastAPI)
- Database: PostgreSQL
- Payments: Stripe Connect
- Hosting: Vercel or Railway
- Auth: Clerk or Auth0

---

## 12.7 v3 Roadmap (Month 12+)

| Feature | Purpose |
|---|---|
| **Automated placement matching** | Algorithm suggests artwork-venue matches based on style, dimensions, price range, venue type, and past performance |
| **Customer accounts and wishlists** | Repeat buyers can save favourites, get notifications when an artist has new work |
| **In-app messaging** | Artists and venues can communicate within the platform (founder retains visibility) |
| **Mobile app for artists** | Portfolio management, placement notifications, sales tracking on mobile |
| **POS integration** | Sync with venue POS systems for seamless artwork sales tracking |
| **Analytics dashboard** | Advanced reporting: conversion rates, popular artists/venues, sales trends, retention metrics |
| **Multi-city expansion tools** | City-specific curation, local curator management, regional dashboards |
| **Bulk order and trade tools** | For interior designers or venues wanting to purchase multiple pieces at once |

---

## 12.8 Key Technical Decisions and Rationale

### Why Webflow Over Carrd

Carrd is cheaper and faster for a single landing page. But Wallspace needs multiple pages (artist gallery, individual artist profiles, venue page, about). Webflow's CMS allows dynamic artist pages that update when new artists join. This is worth the extra cost.

### Why Airtable Over Notion for Operations

Notion is great for docs and knowledge management. Airtable is better for structured, relational data with multiple views. An artwork belongs to an artist and is placed in a venue -- this is a relational data model that Airtable handles natively. Use Notion for internal docs and SOPs. Use Airtable for operational data.

### Why Stripe Payment Links Over a Custom Checkout

At v1 scale (50 artworks, 10-15 venues), creating a Stripe Payment Link per artwork is fast and requires zero code. The tradeoff is that each artwork needs a manually created link. This becomes unwieldy at 200+ artworks, at which point Stripe Checkout with dynamic product creation (via API or Zapier) is the upgrade path.

### Why Not Build a Full Platform from Day One

Building a marketplace platform takes 3-6 months of full-time development and costs 20,000-100,000+. Before building, Wallspace needs to validate:
1. Do artists want to pay for this service?
2. Do venues actually display the work and keep it up?
3. Do customers buy artwork via QR codes in cafes?
4. Is the unit economics viable?

These questions are answered with a concierge model and no-code tools, not with a custom platform. Build the platform after the business model is proven.

---

## 12.9 Operational Workflows (How It All Connects)

### Workflow 1: Artist Joins Wallspace

```
Artist finds Wallspace (Instagram, referral, community)
  --> Visits website, clicks "Apply"
    --> Fills out Typeform application
      --> Zapier sends application to Airtable (status: Applied)
        --> Founder reviews portfolio, scores using rubric
          --> If accepted: Founder sends acceptance email + Stripe membership link
            --> Artist pays membership via Stripe
              --> Founder creates Webflow CMS entry (artist profile goes live)
                --> Founder schedules onboarding call
                  --> Artist is active on roster
```

### Workflow 2: Venue Joins Wallspace

```
Venue owner contacted (walk-in, email, referral)
  --> Interest expressed
    --> Founder visits venue, assesses walls
      --> Founder curates 3-5 artwork options from roster
        --> Sends shortlist email/PDF to venue owner
          --> Venue approves selection
            --> Founder prepares artwork + QR cards
              --> Founder installs artwork at venue
                --> Airtable updated: placements recorded
                  --> Venue is live
```

### Workflow 3: Customer Buys Artwork

```
Customer sees artwork in venue
  --> Scans QR code on card
    --> Stripe Payment Link opens on phone
      --> Customer completes payment
        --> Stripe notification to founder
          --> Founder updates Airtable (artwork marked as sold)
            --> Founder contacts artist (confirms sale, arranges delivery/handover)
              --> Founder contacts venue (confirms removal, schedules replacement)
                --> Founder calculates payouts (artist 80-85%, venue commission)
                  --> Payouts processed on 1st of following month
                    --> Replacement artwork installed at venue
```

### Workflow 4: Artwork Rotation

```
Rotation date approaches (Airtable reminder or calendar alert)
  --> Founder contacts venue: "Time for a refresh -- here are some new options"
    --> Venue approves new selection
      --> Founder removes current artwork, returns to artists
        --> Founder installs new artwork + new QR cards
          --> Airtable updated: old placements closed, new placements created
            --> Venue Instagram post with new artwork (founder photographs)
```

---

## 12.10 Risk: What Breaks First

| Scale Trigger | What Breaks | Fix |
|---|---|---|
| 30+ artworks | Manual Stripe Payment Link creation is slow | Batch creation via Stripe API or template |
| 50+ artists | Manual monthly reporting is unsustainable | Automate with Airtable + email tool |
| 20+ venues | Founder cannot personally manage all venue relationships | Hire part-time venue coordinator |
| 15+ sales/month | Manual payout calculation is error-prone | Stripe Connect automated splits |
| 100+ artworks | Webflow CMS management becomes tedious | Consider custom artist portal |
| 30+ venues | Installation logistics overwhelm one person | Hire installation assistant or contractor |
| 100+ artists | Application review backlog | Structured review committee (2-3 people) |

The goal is to reach each breaking point, recognise it, and solve it just in time -- not before.
