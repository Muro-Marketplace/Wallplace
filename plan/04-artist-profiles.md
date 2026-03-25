# Section 4: Artist Profile and Commercial Availability Model

## Strategic Intent

Artist profiles on Wallspace are not portfolio pages. They are **commercial availability records** -- structured data that lets Wallspace (and eventually venue operators) answer one question fast: *Can this artist supply the right work, in the right format, on the right terms, to this venue, this week?*

Every design decision in this section serves that function. If a field does not help match an artist to a placement or close a transaction, it does not belong on the profile.

---

## Profile Architecture Overview

The profile has three layers:

| Layer | Who sees it | Purpose |
|---|---|---|
| **Public profile** | Venues, buyers, anyone browsing | Attract interest, convey style and quality |
| **Structured commercial fields** | Wallspace ops team; selected fields exposed to venues via filters | Enable fast matching, filtering, and placement logistics |
| **Internal ops notes** | Wallspace team only | Track relationship status, reliability, issues, preferences not captured in structured fields |

---

## Public-Facing Profile Fields

These fields are visible on the artist's public profile page and in search/browse results.

### Identity

| Field | Type | Required | Notes |
|---|---|---|---|
| **Display name** | Text (max 60 chars) | Yes | Artist name or brand name. No real-name requirement. |
| **Profile photo** | Image (square crop, min 400x400) | Yes | Headshot or brand mark. Displayed at thumbnail and full size. |
| **Short bio** | Text (max 300 chars) | Yes | One paragraph. Written in third person. Wallspace may edit for consistency. |
| **Extended bio** | Text (max 1500 chars) | No | Longer story, background, artistic statement. Hidden behind "Read more". |
| **Website URL** | URL | No | Link to personal site. Opens in new tab. |
| **Instagram handle** | Text | No | Displayed as linked icon. Useful social proof for venues. |

### Portfolio

| Field | Type | Required | Notes |
|---|---|---|---|
| **Portfolio gallery** | Image array (min 6, max 40 images) | Yes (min 6) | High-res images of available or representative work. Each image tagged with metadata below. |
| **Per-image: Title** | Text | Yes | |
| **Per-image: Medium** | Select (from controlled list) | Yes | e.g., Photography, Oil on Canvas, Acrylic, Mixed Media, Digital Print, Screen Print, Illustration |
| **Per-image: Dimensions** | Structured (H x W, unit) | Yes | In cm. Displayed in cm and inches. |
| **Per-image: Year created** | Year | No | |
| **Per-image: Edition info** | Text | No | e.g., "Edition of 25", "1/10", "Open edition", "Original" |
| **Per-image: Price indicator** | Select | No | Options: "Under 100", "100-250", "250-500", "500-1000", "1000-2500", "2500+" -- exact price is internal |
| **Per-image: Currently available** | Boolean | Yes (default true) | Controls whether it shows in active listings |

### Style and Categorisation

| Field | Type | Required | Notes |
|---|---|---|---|
| **Primary medium** | Select (one) | Yes | From controlled list: Photography, Painting, Print, Illustration, Mixed Media, Digital Art, Textile Art |
| **Secondary medium** | Select (one) | No | |
| **Style tags** | Multi-select (max 5) | Yes (min 1) | From controlled list. Examples: Abstract, Landscape, Portrait, Urban, Botanical, Minimalist, Bold/Graphic, Documentary, Figurative, Geometric, Textural, Monochrome, Colourful, Vintage, Contemporary |
| **Colour palette tendency** | Multi-select (max 3) | No | Warm, Cool, Neutral, Monochrome, Bold/Vibrant, Muted/Earthy. Useful for venue matching. |
| **Best suited venue types** | Multi-select | Yes (min 1) | Cafes, Restaurants, Hotels, Offices, Coworking, Salons, Clinics, Retail, Bars, Event Spaces |

### Commercial Summary (Public)

| Field | Type | Required | Notes |
|---|---|---|---|
| **Offers originals** | Boolean | Yes | |
| **Offers prints** | Boolean | Yes | At least one of originals/prints must be true |
| **Offers framed work** | Boolean | Yes | |
| **Offers unframed work** | Boolean | Yes | |
| **Available sizes** | Multi-select | Yes | Small (under 30cm), Medium (30-60cm), Large (60-100cm), Extra Large (100cm+) |
| **Location** | Text (borough/area level) | Yes | e.g., "Hackney, London". Never full address. |
| **Open to commissions** | Boolean | No | Whether they take custom/bespoke work requests |

---

## Structured Commercial and Logistics Fields

These fields are **not shown on the public profile**. They are used by Wallspace ops for matching, filtering, and placement logistics. Selected fields may be surfaced to venues in a filtered search view in future product iterations, but for launch they are internal.

### Placement Preferences

| Field | Type | Default | Notes |
|---|---|---|---|
| **Open to free-loan placements** | Boolean | true | Artist lends work to venue at no cost; Wallspace facilitates |
| **Open to revenue-share placements** | Boolean | true | Artist earns share of sales made from venue display |
| **Open to outright venue purchase** | Boolean | false | Venue buys work directly |
| **Open to customer sales from venue** | Boolean | true | Work displayed in venue; customers buy from Wallspace |
| **Preferred revenue-share split** | Select | "Standard (80/20)" | Options: Standard (80/20), Negotiable, Custom (with notes field) |
| **Minimum price for venue purchase** | Currency (GBP) | null | Floor price for direct venue sales. Internal only. |

### Logistics and Fulfilment

| Field | Type | Default | Notes |
|---|---|---|---|
| **Can provide frames** | Boolean | false | Artist supplies work already framed |
| **Can arrange framing** | Boolean | false | Artist has framing relationship / can organise |
| **Preferred framer** | Text | null | Internal note: which framer they use |
| **Can deliver themselves** | Boolean | false | |
| **Delivery radius** | Select | null | Options: Local (within borough), Inner London, Greater London, South East, National |
| **Can help with installation** | Boolean | false | Will attend venue to hang/install work |
| **Lead time for new work** | Select | null | Options: Ready now, 1 week, 2 weeks, 1 month, 6+ weeks |
| **Lead time for print fulfilment** | Select | null | Options: 3 days, 1 week, 2 weeks (for print-on-demand or edition prints) |
| **Can fulfil bulk orders** | Boolean | false | e.g., 10+ prints for an office fit-out |
| **Bulk order lead time** | Select | null | Options: 1 week, 2 weeks, 1 month, 6+ weeks |
| **Print fulfilment method** | Select | null | Self-printed, Lab-printed, Print-on-demand partner, N/A |

### Inventory and Availability

| Field | Type | Default | Notes |
|---|---|---|---|
| **Works currently available for placement** | Number | 0 | How many pieces are ready to go now |
| **Works currently placed in venues** | Number | 0 | Tracked by Wallspace, not self-reported |
| **Maximum concurrent placements** | Number | null | How many venues they can supply at once |
| **Willing to rotate work** | Boolean | true | Will swap out pieces on a schedule |
| **Preferred rotation frequency** | Select | "Quarterly" | Options: Monthly, Quarterly, Biannually, Annually, Flexible |

### Exclusivity and Terms

| Field | Type | Default | Notes |
|---|---|---|---|
| **Exclusive to Wallspace** | Boolean | false | Whether they list/place only through Wallspace |
| **Also listed on** | Multi-select | null | Options: Saatchi Art, Artfinder, Etsy, Own website, Gallery representation, Other |
| **Has gallery representation** | Boolean | false | Important context for pricing and exclusivity |
| **Represented by** | Text | null | Gallery name, if applicable |
| **Special terms or conditions** | Long text | null | Anything non-standard: "Won't place in bars", "Requires insurance", etc. |

---

## Internal Ops Notes Fields

These are free-form fields visible only to the Wallspace team. They capture soft intelligence that does not fit structured fields.

| Field | Purpose |
|---|---|
| **Relationship status** | Select: Lead, Onboarding, Active, Paused, Churned, Declined |
| **Onboarding date** | Date |
| **Membership tier** | Select: Founding (GBP 29), Core (GBP 49), Premium (GBP 89) |
| **Membership status** | Select: Active, Paused, Cancelled, Trial |
| **Account manager notes** | Long text. Running log of interactions, preferences, issues. |
| **Reliability rating** | Select: Excellent, Good, Average, Below Average, Do Not Place |
| **Response speed** | Select: Same day, 1-2 days, 3-5 days, Slow/unreliable |
| **Quality assessment** | Select: Exhibition-grade, Strong commercial, Solid, Needs development |
| **Portfolio review notes** | Long text. Notes from initial curation review. |
| **Flagged issues** | Long text. Any problems: late delivery, damage, complaints, unresponsive. |
| **Preferred contact method** | Select: Email, WhatsApp, Phone, Instagram DM |
| **Last contacted** | Date |
| **Next follow-up due** | Date |
| **Referred by** | Text. How they found Wallspace or who referred them. |
| **Priority for placement** | Select: High, Medium, Low. Used for matching queue. |

---

## Recommended Filters for Matching and Search

### Admin-Side Matching Filters (Used by Wallspace Ops)

These filters let the ops team quickly find the right artist for a specific venue placement.

| Filter | Type | Use case |
|---|---|---|
| **Medium** | Multi-select | "Find all photographers" |
| **Style tags** | Multi-select | "Find minimalist or botanical work for a yoga studio" |
| **Available sizes** | Multi-select | "Need large-format work for a restaurant wall" |
| **Offers originals / prints** | Toggle | "Venue wants originals only" |
| **Framed / unframed** | Toggle | "Venue needs framed, ready-to-hang" |
| **Open to free-loan** | Toggle | "Filter to artists who will lend for free" |
| **Open to revenue-share** | Toggle | |
| **Open to venue purchase** | Toggle | |
| **Can deliver themselves** | Toggle | "Venue is in Peckham, need someone local" |
| **Delivery radius** | Select | |
| **Can help with installation** | Toggle | |
| **Lead time** | Select | "Need work placed by Friday" |
| **Works available for placement** | Range (min) | "Only show artists with 5+ pieces ready" |
| **Best suited venue types** | Multi-select | "Show artists who suit cafes" |
| **Reliability rating** | Select (min) | "Only show Good or Excellent" |
| **Membership tier** | Select | |
| **Colour palette** | Multi-select | "Venue wants warm tones" |
| **Price indicator range** | Range | "Venue budget is under GBP 500 per piece" |
| **Exclusive to Wallspace** | Toggle | |
| **Location** | Text/area | "Artists based in South London" |

### Future Venue-Facing Filters (Not for Launch)

When venue self-serve browsing is introduced, expose a simplified subset:

- Medium
- Style tags
- Size
- Framed/unframed
- Originals/prints
- Colour palette
- Price range (broad bands only)
- Venue type suitability

Revenue-share terms, reliability ratings, and internal ops data are never exposed to venues.

---

## Field Visibility Matrix

| Field category | Public | Venue-filtered (future) | Admin/ops |
|---|---|---|---|
| Identity (name, photo, bio) | Yes | Yes | Yes |
| Portfolio gallery | Yes | Yes | Yes |
| Style tags, medium, size | Yes | Yes | Yes |
| Originals/prints, framed/unframed | Yes | Yes | Yes |
| Location (area level) | Yes | Yes | Yes |
| Price indicators (broad bands) | Yes | Yes (bands) | Yes (exact) |
| Placement preferences (free-loan, rev-share) | No | No | Yes |
| Revenue-share split terms | No | No | Yes |
| Logistics (delivery, framing, installation) | No | No | Yes |
| Inventory counts | No | No | Yes |
| Exclusivity status | No | No | Yes |
| Internal ops notes | No | No | Yes |
| Reliability/quality ratings | No | No | Yes |
| Membership and billing | No | No | Yes |

**Decision: Revenue-share percentages are internal-only.** Venues do not need to know what split the artist gets. Wallspace presents a single price to the venue and manages the split behind the scenes. This avoids awkward negotiations and keeps Wallspace in control of margin.

---

## How to Make Profiles Commercially Useful Without Feeling Clunky

### For Artists (Filling Out Their Profile)

1. **Progressive disclosure.** Onboarding collects only: name, photo, bio, 6+ portfolio images, medium, style tags, sizes, originals/prints, framed/unframed, location. Total time: 15-20 minutes.
2. **Commercial fields are collected conversationally.** During the concierge onboarding call, the account manager fills in logistics and placement preferences on behalf of the artist. The artist never sees a 40-field form.
3. **Defaults are generous.** Open to free-loan: true. Open to revenue-share: true. Open to customer sales: true. Most artists say yes to everything at first. Only adjust when they specify otherwise.
4. **Portfolio metadata is minimal per image.** Title, medium, dimensions, availability. Edition info and price are optional. The ops team can enrich later.

### For Venues (Browsing or Being Matched)

1. **Venues do not browse profiles at launch.** Wallspace curates a shortlist and presents 3-5 artist options per placement, with a mini-portfolio deck (PDF or link). The profile system powers this internally.
2. **When venue-facing browse launches**, the profile page shows: gallery, bio, style tags, sizes, framed/unframed, originals/prints. Clean, visual, gallery-like. No logistics clutter.
3. **Commercial details are handled in conversation.** Venue says "I like this artist's work." Wallspace handles terms, logistics, and scheduling. The profile is the hook; the ops team is the closer.

### For Wallspace Ops (The Power Users)

1. **Admin view shows everything.** Full structured data, filters, notes, history. This is the real product at launch.
2. **Matching workflow.** Ops receives a venue brief (e.g., "Cafe in Peckham, 4 walls, wants photography, warm tones, ready-to-hang, within 2 weeks"). Ops applies filters. System returns ranked matches. Ops curates shortlist. Sends to venue.
3. **The profile is the single source of truth** for artist capability, availability, and reliability. No spreadsheets, no memory, no guesswork.

---

## How This System Makes Wallspace Commercial Art Placement Infrastructure

This profile architecture is not a nice-to-have. It is the core data layer that makes Wallspace operationally scalable.

**Without structured profiles:** Every placement requires the ops team to remember or re-ask what each artist can do, what sizes they have, whether they deliver, whether they have frames. This is a concierge service that breaks at 50 artists.

**With structured profiles:** Every placement is a query against structured data. "Find me 3 photographers in South London with large-format framed prints available now, open to free-loan, reliable." That query returns results in seconds. The ops team spends time on relationships and curation, not logistics detective work.

**The progression:**
1. **Now (launch):** Profiles power internal matching. Ops team uses filters and notes.
2. **6 months:** Profiles power a venue-facing browse experience. Venues can explore curated artists.
3. **12 months:** Profiles power semi-automated matching. System suggests artists for new venue briefs. Ops approves and refines.
4. **18+ months:** Profiles power self-serve placement requests. Venues browse, select, request. Wallspace confirms and coordinates.

The profile schema defined here is designed to support all four stages without restructuring. Every field has a reason. Every field will earn its place.

---

## Implementation Notes

- **Data storage:** Use a structured database (not a CMS or spreadsheet). Every field should be queryable.
- **MVP tech:** For launch, this can be a well-structured Airtable base or a simple admin panel. Do not over-engineer. But do enforce the schema.
- **Portfolio images:** Store originals at high resolution. Generate thumbnails and web-optimised versions. Images are the product; they must look excellent.
- **Profile completeness score:** Track what percentage of structured fields are filled per artist. Target 80%+ for active artists. Use this to prioritise onboarding follow-ups.
- **Data hygiene:** Review and update artist profiles quarterly. Inventory counts, availability, and placement preferences go stale fast.
