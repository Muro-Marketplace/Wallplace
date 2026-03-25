# 20. Prioritisation

## Decisive Recommendations for Launch

This section is deliberately opinionated. These are not options to consider — they are recommendations to execute.

---

## 20.1 Exact Launch Niche

**Start with: photographers who shoot urban/architectural/lifestyle work, displayed in independent cafes and restaurants in East and South London.**

Rationale: Photographers produce print-ready work with minimal production overhead. Their work suits cafe environments better than abstract painting or sculpture. Urban and lifestyle photography resonates with the demographic that frequents independent coffee shops. East and South London (Peckham, Bermondsey, Shoreditch, Hackney, Brixton) have the highest density of design-conscious independent venues and the strongest emerging creative community in London.

Do not attempt to serve all of London. Do not attempt to serve galleries, hotels, or offices yet. Do not attempt to serve painters, sculptors, or textile artists yet. Start narrow. Dominate one corridor. Expand from strength.

---

## 20.2 What Type of Artists to Recruit First

**Recruit emerging photographers with 1,000–10,000 Instagram followers who are already selling prints occasionally but lack consistent retail exposure.**

These artists are:
- Hungry enough to pay £29/month for a real opportunity
- Professional enough to deliver print-ready files and consistent quality
- Active enough on social media to co-promote their venue placements
- Unlikely to have gallery representation (so Wallspace fills a genuine gap)

Do not recruit hobbyists (they won't produce reliable quality). Do not recruit established gallery artists (they won't see the value at this price point). The sweet spot is the talented-but-underexposed photographer who knows their work could sell but has no retail channel.

---

## 20.3 Exact Membership Model

**Launch with two tiers only. Do not launch with three.**

| Tier | Price | What's Included |
|------|-------|----------------|
| **Founding Member** | £29/month | 1 venue placement at a time, basic portfolio page, Wallspace handles installation and rotation, 80% of sale proceeds to artist |
| **Core Member** | £49/month | Up to 3 venue placements at a time, featured portfolio page, priority matching to new venues, 80% of sale proceeds, quarterly performance report |

The Premium tier (£89) should not exist at launch. It adds complexity to onboarding, requires features you haven't built yet, and splits your small user base across too many segments. Introduce it at Month 4–6 when you understand what power users actually want to pay more for.

The Founding Member tier is your acquisition tool. It exists to reduce friction for early adopters. Cap it at the first 50 artists and close it permanently. This creates genuine urgency and rewards early trust.

---

## 20.4 Pricing to Test First

**Lead with £29/month Founding tier. This is the price to validate.**

The critical question is not "will artists pay £49?" — it is "will artists pay anything at all for this?" The £29 price point is low enough to get a fast yes/no signal. If artists won't pay £29/month for guaranteed venue placement, the value proposition is broken and needs reworking before you test higher prices.

Once you have 30+ paying artists at £29, begin onboarding new artists at £49 only. Monitor conversion rate. If it holds above 40% of applicants converting, the price is right. If it drops below 25%, the value delivery needs improvement before the price can sustain.

Do not offer free trials. Free trials attract tyre-kickers and create churn cliffs. Instead, offer a money-back guarantee for the first month: "If we don't place your work in a venue within 30 days, you get a full refund." This is better than free because it signals confidence and filters for serious artists.

---

## 20.5 Exact Venue Offer

**Lead with this pitch: "We will curate and install professional artwork in your venue for free. No cost, no commitment, no hassle. If a customer buys a piece, you earn a share. We handle everything."**

The venue offer must be:
- **Free.** Always. Venues should never pay Wallspace anything. The moment you charge venues, you lose the supply-side advantage that makes this model work.
- **Zero-effort for the venue.** Wallspace selects the art, delivers it, installs it, prices it, handles the sale, removes and replaces it. The venue does nothing except enjoy better-looking walls and occasional commission cheques.
- **Low-commitment.** No minimum display period beyond 4 weeks. If they hate it, you remove it. This eliminates the objection before it forms.
- **Revenue-sharing on sales (not mandatory).** Offer venues 10% of the sale price as a thank-you when a customer purchases a piece. This is not the main pitch — it is the sweetener. Most venues will be motivated by the aesthetic upgrade, not the revenue.

The single most important thing in the venue pitch: make it feel like they are getting a free interior design service. The art is the mechanism; the transformed space is the value.

---

## 20.6 What to Ignore Initially

**Ignore all of the following until at least Month 6:**

1. **Building a self-serve platform or app.** You do not need software. You need a spreadsheet, a phone, and a van. Every hour spent building technology is an hour not spent signing artists and venues.

2. **Corporate clients, hotels, and offices.** These are longer sales cycles, different decision-makers, and different art requirements. They will distract you from proving the indie cafe model works.

3. **Art genres beyond photography.** Paintings, prints of digital art, ceramics, textiles — all valid eventually. But each genre has different production, pricing, and installation requirements. Start with one.

4. **Geography beyond East/South London.** Resist the temptation to say yes to a venue in North London or a photographer in Bristol. Density drives efficiency. Spread kills you.

5. **PR and press coverage.** Press is vanity. It does not reliably convert to paying artists or venue partnerships. Pursue it passively (have a press page, respond to inbound) but do not invest time pitching journalists.

6. **Partnerships with art schools, galleries, or institutions.** These take months to formalise, involve committees, and rarely yield results proportional to the effort. Talk to individual artists directly.

7. **Elaborate branding and design systems.** A clean logo, a simple website, and a consistent Instagram presence is enough. Do not hire a brand agency. Do not spend two weeks on colour palettes.

8. **Revenue optimisation and pricing experiments.** Get the first 30 paying artists. Then optimise. Premature optimisation is the root of all startup failure.

---

## 20.7 The True MVP

**The MVP is: 10 photographers paying £29/month, displayed in 5 cafes, with at least 2 artworks sold within 60 days.**

That is it. Everything else is a feature, not the product.

The MVP requires:
- A way to collect monthly payments (Stripe link or simple checkout page)
- A curated portfolio of each artist's work (can be a PDF, a simple webpage, or an Instagram highlight)
- A method for matching art to venues (founder judgment, not an algorithm)
- Physical installation capability (founder + a drill + a spirit level)
- A sales mechanism at the venue (QR code linking to a purchase page, or a simple "enquire to buy" sign with a phone number)
- A way to process artwork sales and split proceeds (Stripe + manual bank transfer)

The MVP does not require:
- A marketplace platform
- An artist dashboard
- Automated matching
- Inventory management software
- A mobile app
- A CMS
- SEO
- Email marketing automation

---

## 20.8 What to Handle Manually First

**Everything.** Specifically:

| Process | Manual Method | Automate When? |
|---------|--------------|----------------|
| Artist applications | Google Form or Typeform | Never (curation should always be human) |
| Artist onboarding | Personal phone/video call | Month 6+ (recorded walkthrough video) |
| Venue-artist matching | Founder visits venue, selects art personally | Month 9+ (internal tool) |
| Installation | Founder does it | Month 6+ (hire part-time handler) |
| Rotation scheduling | Calendar reminders | Month 4+ (Airtable automation) |
| Sales processing | Manual Stripe payment link + founder coordinates delivery | Month 6+ (simple e-commerce page) |
| Artist payments | Manual bank transfer after sale | Month 4+ (Stripe Connect) |
| Venue communication | WhatsApp / phone | Keep forever (relationships matter) |
| Marketing | Founder posts on Instagram | Keep for Year 1 |
| Accounting | Spreadsheet + Xero | Month 3+ (accountant reviews quarterly) |

The manual phase is not a bug — it is the product. Concierge service is the differentiator. You learn more from doing things manually for 3 months than you would from building software for 3 months.

---

## 20.9 Biggest Distractions

Ranked by how tempting and how destructive they are:

1. **Building technology too early.** The urge to build a "proper platform" will be overwhelming. Resist it. You are a service business that uses technology, not a technology company. Build tech only when manual processes are genuinely breaking.

2. **Saying yes to opportunities outside your niche.** A hotel chain wants to talk. An office building wants 50 pieces. A painter in Manchester heard about you. Every "yes" outside your core niche dilutes focus. Say "not yet" to all of them and write down the lead for later.

3. **Spending time on brand and design.** Perfecting the website, redesigning the logo, creating a brand book. None of this matters if you don't have 10 paying artists in 5 venues. Ship ugly. Refine later.

4. **Comparing yourself to competitors.** Researching what Rise Art, Artfinder, Artsy, or anyone else is doing. They are not your competitors — they serve different segments with different models. Stop looking sideways.

5. **Fundraising.** This business does not need external capital to reach product-market fit. Do not spend time on pitch decks, investor meetings, or accelerator applications until you have proven the model with real revenue. Fundraising is a full-time job that produces zero revenue.

---

## 20.10 Biggest Risks

Ranked by likelihood multiplied by impact:

1. **Artists don't see enough value to keep paying.** If artists pay for 2 months, get placed in a venue, sell nothing, and cancel — the business model fails. Mitigation: ensure every artist gets placed within 30 days and receives at least one serious enquiry within 60 days.

2. **Venues lose interest after initial novelty.** The cafe owner loves the idea, agrees enthusiastically, then stops caring after 4 weeks. Artwork gathers dust, sales materials get buried, the QR code gets covered by a menu. Mitigation: regular check-ins (bi-weekly WhatsApp), scheduled rotations that give venues fresh content, and making the venue feel like a partner, not a passive host.

3. **Founder burnout.** One person doing sales, ops, installation, marketing, finance, and customer service is not sustainable beyond 6 months. Mitigation: rigorous prioritisation (this document), time-boxing activities, and hiring the first part-time role as soon as revenue supports it.

4. **Quality control failures.** A poorly framed print, a badly installed piece that damages a wall, an artist who misrepresents their work. Any of these erodes trust with venues and makes the next venue harder to sign. Mitigation: strict curation standards, professional installation process, and a quality checklist for every piece.

5. **Art doesn't sell at the price points artists expect.** Artists want £400 for a print. Cafe customers will pay £150. If this gap can't be bridged, the commission model doesn't generate meaningful revenue. Mitigation: guide artists on venue-appropriate pricing from day one. Position venue sales as volume-driven, not gallery-priced.

---

## 20.11 Most Important Assumptions to Test

In order of priority — test these before anything else:

### Assumption 1: Artists will pay a monthly fee for venue placement.
**Test by**: Collecting actual payments from 15+ artists within 60 days.
**Signal it's working**: 60%+ of applicants convert to paying members.
**Signal it's broken**: Fewer than 30% convert, or most want a free trial first.

### Assumption 2: Independent cafes will display art for free with minimal effort.
**Test by**: Pitching 20 cafes and measuring the acceptance rate.
**Signal it's working**: 50%+ say yes within one meeting.
**Signal it's broken**: Most want to charge wall rental, or say they've tried art before and it didn't work.

### Assumption 3: Artwork displayed in cafes actually sells.
**Test by**: Tracking sales across the first 10 venues over 60 days.
**Signal it's working**: At least 1 sale per venue per month average.
**Signal it's broken**: Fewer than 3 total sales across all venues in 60 days.

### Assumption 4: The concierge model is economically viable at this price point.
**Test by**: Tracking founder hours per artist per month and per venue per month.
**Signal it's working**: Under 2 hours per artist per month, under 3 hours per venue per month.
**Signal it's broken**: More than 4 hours per artist or 5 hours per venue — the unit economics are unsustainable.

### Assumption 5: Artists stay subscribed for 6+ months.
**Test by**: Monitoring monthly churn starting from month 3.
**Signal it's working**: Monthly churn below 8%.
**Signal it's broken**: Monthly churn above 15%.
