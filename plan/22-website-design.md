# Section 22: Wallspace Website Design

---

# 1. Website Strategy and Role of the Site

## What the Website Is Trying to Do at Launch

The Wallspace website is a conversion tool, not a product. At launch, the website exists to do three things:

1. **Convert artists into membership applicants.** The primary revenue-generating action. Every artist who lands on the site should understand the value, feel the selectivity, and submit an application.
2. **Convert venue owners into enquiries.** The primary supply-of-wallspace action. Every venue owner who lands on the site should feel this is free, easy, and professional, and submit an enquiry form.
3. **Establish credibility.** For both audiences, the site must communicate that Wallspace is real, curated, trustworthy, and professionally run -- not a side project or an Etsy clone.

The website is not the product. The product is the concierge service: curation, matching, installation, rotation, and sales. The website is the front door to that service.

## Primary Business Goals of the Website

| Goal | Metric |
|---|---|
| Generate artist applications | 50+ applications in first 8 weeks |
| Generate venue enquiries | 20+ enquiries in first 8 weeks |
| Communicate the value proposition clearly to both sides | Bounce rate below 60% on key pages |
| Establish brand credibility | Qualitative: artists and venues reference the site as "professional" in conversations |
| Support the QR-to-purchase flow for venue customers | Functioning purchase flow from day one |

## Conversion Goals by Audience

| Audience | Primary Conversion | Secondary Conversion |
|---|---|---|
| Artists | Submit application | Follow on Instagram, share with another artist |
| Venues | Submit venue enquiry | Forward site to business partner |
| Customers (via QR in venue) | Complete purchase | Browse artist profile, discover other work |
| Larger commercial buyers | Submit enquiry | Bookmark for later |

## Role of the Site in a Concierge-First Launch

The website is the professional facade. Behind it, the founder runs everything manually.

**What happens on-site:**
- Artists read the value proposition and submit applications (Typeform)
- Venues read the offer and submit enquiries (Typeform)
- Customers land on artwork purchase pages via QR codes (Stripe Payment Links)
- Artist profiles display portfolios and commercial availability
- Browse/gallery pages show the calibre of artists on the roster

**What happens manually behind the scenes:**
- Application review and scoring
- Venue site visits and relationship building
- Curation and matching (artist to venue)
- Installation scheduling and logistics
- Sales processing and artist payouts
- Rotation management
- All communication (email, WhatsApp)

## What the Website Should NOT Try to Do at Launch

- **No self-serve artist dashboard.** Artists do not log in, manage profiles, or track stats on-site. The founder handles this.
- **No self-serve venue portal.** Venues do not browse, select, or manage artwork online. The founder curates and presents options.
- **No e-commerce catalogue.** No shopping cart, no browsing-to-buy flow. Customer purchases happen via individual Stripe Payment Links accessed through QR codes in venues.
- **No automated matching or recommendation engine.** Human curation only.
- **No community features.** No forums, no messaging, no social features.
- **No blog at launch.** Content marketing can wait. Direct outreach converts faster.

---

# 2. Core Website Audiences

## Audience 1: Artists / Photographers Considering Membership

**What they want:**
- A real commercial channel for their work -- not another listing site
- Physical presence in venues where people actually see and buy art
- Professional handling of logistics, installation, and sales
- Fair commission (much lower than galleries)
- Proof this is not a scam or a waste of money

**What they fear:**
- Paying for exposure that leads nowhere
- Their work being displayed poorly or in bad venues
- Being one of thousands with no real visibility
- That this is just another "platform" that takes money and delivers nothing
- That the quality bar is low and their work will be alongside amateur content

**What questions they need answered:**
- What exactly do I get for my membership fee?
- Where will my work be displayed?
- How does the selection process work?
- What commission do you take?
- Will my work actually sell?
- Can I see who else is on the platform?
- What happens if I want to cancel?
- Is this exclusive -- can I still sell elsewhere?

**What Wallspace wants them to do:**
- Submit an application

**What messaging and proof they need before converting:**
- See examples of the types of venues (photos of real spaces)
- See the calibre of other artists on the roster
- Understand the full process from application to wall
- See specific numbers: commission rates, membership cost, placement timeline
- Trust signals: originality requirement, curation standards, no AI work
- Social proof: artist testimonials, venue photos, placement stats (when available)

## Audience 2: Venues Considering Displaying Artwork

**What they want:**
- Better-looking walls without spending money or effort
- Something that makes their space feel more interesting and distinctive
- Minimal hassle -- they are busy running a hospitality business
- Assurance that the art will suit their space and not be weird or polarising

**What they fear:**
- Hidden costs or commitments
- Art that clashes with their interior or puts off customers
- Operational burden -- having to deal with artists, sales, installation
- Damage to their walls
- Being locked into something

**What questions they need answered:**
- Is it really free?
- Who chooses the art?
- Do I get to approve what goes on my walls?
- Who handles installation and removal?
- What if something gets damaged?
- Is there a contract?
- What do my staff need to do?
- How do sales work?

**What Wallspace wants them to do:**
- Submit a venue enquiry

**What messaging and proof they need before converting:**
- Clear, repeated statement that this is free -- no cost, no contract, no catch
- Photos of art installed in similar venues
- Explanation of how little effort is required (15 minutes of their time total)
- Insurance and damage coverage explained
- Assurance they approve everything before installation
- Names of other venues already participating (when available)

## Audience 3: Customers Who Discover Artwork in a Venue

**What they want:**
- To learn more about the piece they just saw
- To find out the price
- To buy it easily
- To learn about the artist

**What they fear:**
- That buying art is complicated or pretentious
- That the price will be shocking
- That the checkout process is sketchy

**What questions they need answered:**
- How much is this?
- Who made it?
- How do I buy it?
- How will I receive it?

**What Wallspace wants them to do:**
- Complete a purchase via Stripe

**What messaging and proof they need:**
- Clear pricing
- Simple checkout (Stripe -- trusted payment processor)
- Artist info and story (brief, not overwhelming)
- Fulfilment details (delivery timeline, packaging)

## Audience 4: Larger Commercial Buyers / Hospitality Groups / Office Groups

**What they want:**
- A professional art sourcing and placement service
- Scale -- multiple locations, ongoing management
- Brand-appropriate curation

**What they fear:**
- That this is too small or informal for their needs
- Inconsistent quality across locations

**What questions they need answered:**
- Can you serve multiple locations?
- Do you offer bespoke curation?
- What is the pricing for managed programmes?

**What Wallspace wants them to do:**
- Submit a general enquiry (these are handled as warm leads for future white-glove service)

**What messaging and proof they need:**
- Evidence of venue installations
- Professional presentation
- A clear path to get in touch

## Audience 5: Potential Partners (Print labs, framers, other creatives)

Not a priority audience for the website. Handle via Contact page and direct outreach. No dedicated page needed at launch.

---

# 3. Information Architecture / Sitemap

## Recommended Launch Sitemap

The site should have exactly 10 public pages plus 2 dynamic template pages. This is lean, focused, and buildable in 4-6 weeks on Webflow.

```
Home
├── For Venues
├── For Artists
│   └── Apply (Typeform embed or link)
├── Artists (Browse gallery)
│   └── [Artist Profile] (CMS template)
├── How It Works
├── About
├── FAQs
├── Contact
├── [Artwork Purchase Page] (Stripe Payment Link landing -- per artwork)
└── Terms & Privacy
```

### Page-by-Page Justification

| Page | Purpose | Target Audience | Primary CTA | Secondary CTA | Essential for v1? |
|---|---|---|---|---|---|
| **Home** | Communicate what Wallspace is; route visitors to the right path | Everyone (split messaging) | "Apply as an Artist" / "Get Art for Your Venue" | Browse Artists | Yes |
| **For Venues** | Convert venue owners into enquiries | Venue owners/managers | "Request Artwork for Your Space" (form) | Read FAQs | Yes |
| **For Artists** | Convert artists into applicants; explain membership and value | Artists/photographers | "Apply to Join" | View pricing details (anchor) | Yes |
| **Apply** | Artist application form | Artists who are ready to apply | Complete application (Typeform) | -- | Yes |
| **Artists (Browse)** | Showcase roster quality; let venues and buyers explore | Venues, buyers, artists (social proof) | "Enquire About This Artist" | Apply to Join | Yes |
| **Artist Profile** | Display individual artist portfolio and commercial info | Venues, buyers | "Enquire About This Artist" / "Buy" (if applicable) | Browse other artists | Yes (CMS template) |
| **How It Works** | Explain the process for both sides clearly | Both audiences | Route to For Artists or For Venues | -- | Yes |
| **About** | Build trust; tell the Wallspace story | All | Apply / Enquire | Follow on Instagram | Yes |
| **FAQs** | Answer objections and reduce friction | All | Apply / Enquire | -- | Yes |
| **Contact** | General enquiries, commercial interest, partnerships | All | Submit form | -- | Yes |
| **Artwork Purchase** | QR-driven purchase landing for venue customers | Customers in venues | Complete purchase | Browse artist profile | Yes (Stripe-powered) |
| **Terms & Privacy** | Legal compliance | -- | -- | -- | Yes (minimal) |

### Pages NOT Included at Launch (and Why)

| Page | Why Not Yet |
|---|---|
| **Separate Pricing Page** | Pricing is included on the For Artists page. A separate page adds a click and can feel transactional. Merge pricing into the artist proposition. |
| **Blog** | No time to maintain. Direct outreach and Instagram are the content channels at launch. |
| **Case Studies** | No case studies exist yet. Use a "Featured Venues" section on the homepage once pilot venues are live. Upgrade to a case studies page at Month 3-6. |
| **Venue Directory** | Venues are not the product to browse. Artists and their work are. A venue directory may confuse the value proposition. |
| **Customer Account / Wishlist** | Unnecessary complexity. Customers buy via QR in the moment. |
| **Separate Artist Membership / Pricing Page** | Pricing is presented within the For Artists page to keep the narrative intact. Separating it creates a "pricing page" that feels SaaS-y and undermines the premium positioning. |

---

# 4. Homepage Design

## Homepage Objective

Convert first-time visitors into either an artist application or a venue enquiry, depending on who they are. The homepage must communicate what Wallspace is in under 5 seconds, build trust in under 30 seconds, and route visitors to the right conversion path in under 60 seconds.

## Who It Is Primarily For

The homepage serves both artists and venues. However, in the first 3 months, artists are the primary revenue driver (they pay), so the homepage should lean slightly toward the artist proposition while making the venue path equally clear and accessible.

## Section-by-Section Structure

### Above the Fold

**Section 1: Hero**

- **Headline:** "Real art. Real walls."
- **Subheadline:** "Wallspace places curated photography and artwork into London's independent cafes, restaurants, and bars. We handle everything. Venues pay nothing. Artists get a real commercial channel."
- **Background:** Full-width photograph of a beautifully installed artwork in a real venue setting (cafe or restaurant interior, warm lighting, artwork prominently visible, customers in soft focus). This image must feel aspirational but authentic -- not a stock photo.
- **Two CTAs side by side:**
  - "I'm an Artist" (routes to For Artists page)
  - "I'm a Venue" (routes to For Venues page)
- **Trust line below CTAs:** "Every artist reviewed. Every placement curated. No AI-generated work."

### Below the Fold

**Section 2: How It Works (Split)**

Two-column layout. Left column for artists, right column for venues. Each side has 3 steps.

**For Artists:**
1. Apply -- Submit your portfolio for review
2. Get Placed -- We match your work to venues across London
3. Get Seen and Sold -- Your work on real walls, with real sales infrastructure

**For Venues:**
1. Tell Us About Your Space -- Quick form, 2 minutes
2. We Curate and Install -- Artwork selected and installed for free
3. Your Walls Look Better -- Fresh art, rotated regularly, zero effort

**CTA at bottom of each column:**
- Artists: "Apply to Join"
- Venues: "Request Artwork"

**Section 3: Featured Artists**

- Heading: "Selected Artists"
- 6-8 artist cards in a grid. Each card shows: one hero image from their portfolio, artist name, medium (e.g., "Street Photography"), location (e.g., "Hackney, London")
- Cards link to individual artist profile pages
- Visual purpose: demonstrate the calibre of work. This section is proof that Wallspace is curated and the quality is real.
- CTA: "Browse All Artists"

**Section 4: Venue Showcase**

- Heading: "Art Where You Least Expect It"
- 3-4 large, atmospheric photographs of artwork installed in real venue settings. Each captioned with venue type and neighbourhood: "A cafe in Peckham", "A wine bar in Bermondsey", etc.
- These images do double duty: they show artists where their work could be, and they show venues what their space could look like.
- CTA for venues: "Get This for Your Space -- Free"
- CTA for artists: "Get Your Work on These Walls"

**Section 5: Value Proposition Blocks**

Three blocks, each with an icon or small illustration:

1. **Curated, Not Crowded** -- "Every artist is reviewed. Every placement is matched. This is not a marketplace where anyone can list anything."
2. **Handled End-to-End** -- "We curate, deliver, install, rotate, and sell. Artists create. Venues enjoy. Wallspace does the rest."
3. **Fair for Everyone** -- "Artists keep 80% of every sale. Venues pay nothing. Everyone gets better walls."

**Section 6: Social Proof / Trust**

- At launch (before testimonials exist): "Launching with [X] curated artists across [X] venues in East and South London." Use real numbers once available.
- After first month: replace with 1-2 short quotes from founding artists and a venue owner.
- Trust badges or signals: "All original work. No AI-generated art. Every artist personally reviewed."
- Instagram feed embed showing recent posts (venue installations, artist features).

**Section 7: Final CTA Block**

- Heading: "Ready?"
- Two paths again:
  - "Apply as an Artist" -- short line: "Membership from £9.99/month. Limited founding spots available."
  - "Get Art for Your Venue" -- short line: "Completely free. No contracts. We handle everything."

**Section 8: Footer**

- Links: For Artists, For Venues, Browse Artists, How It Works, About, FAQs, Contact, Terms, Privacy
- Social links: Instagram (primary), email
- Small Wallspace logo
- "London's curated art placement service"

## CTA Strategy

- The homepage has two parallel conversion paths that never conflict
- Artist CTAs use "Apply" language (selective, professional)
- Venue CTAs use "Request" or "Get" language (easy, free)
- CTAs appear at minimum 3 times on the page: hero, mid-page, and final block
- No generic "Learn More" buttons. Every CTA is specific.

## Trust Signal Strategy

- Photography of real installations in real venues (the single most important trust asset)
- Named, browsable artist profiles (proves the roster is real)
- Specific numbers (not vague claims): commission rates, number of artists, number of venues
- "No AI-generated work" stated explicitly
- "Every artist reviewed" stated explicitly
- Quality of site design itself is a trust signal -- the site must look as good as the art

---

# 5. For Venues Page

## Page Goal

Convert venue owners and managers into enquiry submissions. This page must make Wallspace feel irresistible, risk-free, and effortless.

## Audience

Independent cafe, restaurant, and bar owners/managers in London. Decision-makers who are time-poor, budget-conscious, and aesthetically aware.

## Section-by-Section Structure

**Section 1: Hero**

- Headline: "Your walls deserve better."
- Subheadline: "Wallspace puts curated artwork on your walls for free. We select it, deliver it, install it, and rotate it. You enjoy a better-looking space. Your customers enjoy better art. It costs you nothing."
- CTA: "Request Artwork for Your Space"
- Background: Split image or before/after -- bare cafe wall vs. same wall with beautifully hung artwork.

**Section 2: What You Get**

6 clear benefit blocks:

1. **Professionally curated artwork** -- Hand-selected to suit your space, your interior, your clientele.
2. **Free installation** -- We deliver and hang everything. You unlock the door.
3. **Regular rotation** -- Fresh work every quarter. Your space always feels alive.
4. **Sales handled** -- Customers scan a QR code to buy. You do nothing.
5. **Revenue share** -- You earn 10% of any sale made from your wall. Passive income.
6. **Zero commitment** -- No contract. No fees. Two weeks notice to stop. No questions.

**Section 3: How It Works (Venue Journey)**

4 steps with simple icons:

1. **Tell us about your space** -- Fill out a 2-minute form. We will be in touch within 24 hours.
2. **We visit and plan** -- A 15-minute site visit. We photograph your walls and understand your aesthetic.
3. **You approve the selection** -- We send you a curated shortlist. You pick what goes up.
4. **We install and manage** -- Artwork delivered, installed, labelled, and maintained. You are done.

- "Total time commitment: about 30 minutes."
- CTA: "Get Started -- It's Free"

**Section 4: Venue Photos**

- 3-4 large photos of artwork in venue settings (real installations preferred; styled mockups acceptable at launch)
- Captions: venue type + neighbourhood
- Purpose: venue owners need to visualise this in their space

**Section 5: Addressing Objections**

Presented as a clean Q&A block:

- **"Is it really free?"** -- Yes. We are funded by artist memberships. Venues are our distribution channel, not our customers. The service is free now and designed to stay free.
- **"What if I don't like the art?"** -- You approve everything before it goes up. If something is not working, we swap it within a week.
- **"Will it damage my walls?"** -- We use the least invasive methods: picture rails, adhesive hooks, or existing fixtures. Any marks are repaired on removal.
- **"What do my staff need to do?"** -- Nothing beyond pointing customers to the QR card if asked. We provide a one-page brief. Most staff enjoy talking about the art.
- **"What if something gets damaged?"** -- All artwork is covered by Wallspace. You are not liable for accidental damage.
- **"Is there a contract?"** -- No. A simple participation agreement. Either side can end it with two weeks notice.

**Section 6: Revenue Share Explanation**

Simple, visual explanation:
- A customer sees a piece they like in your venue
- They scan the QR code and buy it through Wallspace
- You earn 10% of the sale price -- deposited monthly
- "Your walls are already earning nothing. This is free money."

**Section 7: Who We Work With**

- "We work with independent cafes, restaurants, wine bars, and brunch spots across East and South London."
- List of target neighbourhoods: Peckham, Bermondsey, Hackney, Shoreditch, Brixton, Dalston, Deptford, Camberwell.
- "If you run an independent venue with walls that could look better, we want to hear from you."

**Section 8: Final CTA**

- Headline: "Get curated art for your venue. Free."
- CTA button: "Request Artwork"
- Trust line: "No cost. No contract. No hassle. We handle everything."

## Key Objections This Page Must Address

1. "Is it really free?" -- answered explicitly
2. "Will I like the art?" -- approval process explained
3. "Will it damage my walls?" -- installation methods explained
4. "I'm too busy for this" -- time commitment quantified (30 minutes total)
5. "What's the catch?" -- funding model explained transparently

## CTA Strategy

- Primary CTA appears 3 times: hero, after How It Works, final block
- All CTAs link to the venue enquiry form (Typeform)
- Language: "Request Artwork for Your Space" (not "Sign Up" or "Register")

## Trust Signals

- Photos of real installations (or high-quality mockups)
- Specific neighbourhood names (proves local knowledge)
- Transparency about the business model (artists pay, not you)
- Insurance and damage coverage stated clearly
- "No contract" repeated

---

# 6. For Artists Page

## Page Goal

Convert professional photographers and artists into membership applicants. This page must position Wallspace as a curated commercial placement channel -- selective, professional, and commercially real. It must not feel like paying for a listing.

## Audience

Emerging and mid-career photographers and visual artists in London. Typically 1,000-10,000 Instagram followers. Already selling occasionally but lacking consistent retail presence. Sceptical of "platforms" that promise exposure.

## Section-by-Section Structure

**Section 1: Hero**

- Headline: "Your work belongs on walls, not in feeds."
- Subheadline: "Wallspace places curated photography and artwork into independent venues across London. Real walls. Real footfall. Real sales potential. We handle curation, installation, rotation, and sales. You handle creating the work."
- CTA: "Apply to Join"
- Background: Photograph of an artist's work beautifully hung in a venue, with the venue environment visible -- customers nearby, warm lighting.

**Section 2: What You Get**

**Structured as a clear value stack:**

1. **Guaranteed venue placement** -- Your work displayed in curated independent venues within 30 days of onboarding.
2. **Professional installation** -- We deliver, hang, label, and photograph your work in situ.
3. **Sales infrastructure** -- QR codes, online listings, and payment processing. We handle the transaction.
4. **Regular rotation** -- Fresh venues, fresh audiences. Your work moves through the network.
5. **You keep 80%** -- When your work sells, you receive 80% of the sale price. We take 20%. No gallery taking half.
6. **Real commercial channel** -- This is not a portfolio site. This is physical placement in high-footfall spaces where people discover and buy art.

**Section 3: How It Works (Artist Journey)**

5 steps:

1. **Apply** -- Submit your portfolio. We review every application personally.
2. **Get Accepted** -- We are selective. Not every applicant is accepted. Quality is how we maintain venue trust.
3. **Choose Your Membership** -- Select the tier that fits your practice. From £9.99/month.
4. **Get Placed** -- We match your work to venues that suit your style. You approve the placement.
5. **Get Seen and Sold** -- Your work is on the wall. Customers see it, scan the QR code, and buy.

CTA: "Apply Now"

**Section 4: Membership Tiers**

Presented as a comparison table directly on this page (no separate pricing page):

| | Core | Premium |
|---|---|---|
| **Monthly price** | **£9.99/mo** | **£29.99/mo** |
| **Annual price** | £99/yr (save 17%) | £299/yr (save 17%) |
| Venue placements | 1 venue at a time | Up to 3 venues |
| Works per venue | Up to 3 | Up to 5 |
| Portfolio on Wallspace | Standard listing | Featured profile |
| Placement matching | Standard curation | Priority curation |
| Rotation frequency | Quarterly | Bi-monthly |
| Commission on sales | 20% | 18% |
| Professional photography | -- | 1 session per quarter |
| Social media feature | Included in venue posts | Dedicated artist feature monthly |
| Analytics | Basic (placements, enquiries) | Full (views, enquiries, sales data) |

**Founding Artist Offer** (displayed as a banner above the comparison table):

"Founding Artist spots are limited to the first 50 artists. Founding Artists receive Premium-tier features at the Core price -- locked for life. Once they are gone, they are gone."

CTA: "Apply for a Founding Spot"

**Section 5: How Curation Works**

This section addresses the fear that Wallspace is a low-quality dump-and-list platform.

- "We review every application. Roughly half are accepted."
- "We are looking for: technical quality, a coherent body of work, commercial viability, and professional presentation."
- "We do not accept AI-generated work. Every piece on Wallspace is original, by a real artist."
- "Being selective is how we maintain the quality that venues trust. If your work is strong enough, you are in."

**Section 6: How This Is Different**

A comparison table or visual that positions Wallspace against alternatives:

| | Galleries | Online Marketplaces | Instagram | **Wallspace** |
|---|---|---|---|---|
| Commission | 50% | 30-40% | N/A | **20%** |
| Physical display | Yes (if accepted) | No | No | **Yes -- guaranteed** |
| Who handles logistics | You | You | You | **We do** |
| Cost | Gallery hire (hundreds/week) | Listing fees | Ad spend | **From £9.99/mo** |
| Audience | Gallery visitors | Online browsers | Followers | **Venue customers daily** |
| Curation | Highly selective | Open access | Algorithm | **Reviewed and matched** |

**Section 7: Trust and Social Proof**

- At launch: "Launching with [X] curated artists across [X] venues in East and South London."
- After Month 1: Artist testimonials, photos of installed work, first sale stories.
- "Every artist on Wallspace has been personally reviewed. No AI work. No bulk uploads. No noise."

**Section 8: FAQs (Artist-Specific)**

Top questions to surface:

1. **Will my work actually sell?** -- We do not guarantee sales. We guarantee placement in venues with real footfall and a working sales infrastructure. That is more commercial exposure than most channels offer at any price.
2. **Why should I pay for this?** -- You are paying for a managed placement service: curation, venue matching, installation, rotation, and sales handling. This costs less per month than a single Instagram promotion or a day at an art fair.
3. **Can I still sell through other channels?** -- Yes. Membership is non-exclusive. The only requirement is price parity and that work on display in a Wallspace venue is purchasable through Wallspace.
4. **What if I am not accepted?** -- We provide brief feedback and you can reapply after 3 months.
5. **What sizes and formats work best?** -- Medium format (A3 to A1) works best in venue settings. We advise during onboarding.
6. **How does payment work when something sells?** -- You receive 80% (Core) or 82% (Premium) of the sale price via bank transfer within 14 days.
7. **What happens if I cancel?** -- Monthly: 30 days notice. Your work is returned at the next rotation. No penalty.

**Section 9: Final CTA**

- Headline: "Your studio is not a showroom. London's venues are."
- Subheadline: "Apply to Wallspace. If your work is strong enough, we will get it on a wall."
- CTA: "Apply to Join"
- Below: "Founding Artist spots limited to 50. Membership from £9.99/month."

## How to Frame Paid Membership So It Feels Premium and Commercially Justified

- Never call it a "subscription" or "plan." Call it a "membership."
- Frame the cost against alternatives: "Less than a day at an art fair. Less than a week of gallery hire. Less than a month of Instagram ads."
- Emphasise what the fee funds: "Your membership funds curation, logistics, installation, rotation, and sales infrastructure. Without it, there is no service."
- Anchor to the commercial return: "One sale pays for months of membership."

## How to Communicate Curation Without Sounding Exclusionary

- State the acceptance rate matter-of-factly: "We accept roughly half of applicants."
- State the criteria clearly: "We look for technical quality, a coherent body of work, and commercial viability."
- Offer feedback on rejection: "If you are not accepted, we will tell you why."
- Avoid elitist language: never "exclusive," never "prestigious," never "invitation-only." Use "reviewed," "selected," "curated."

## How to Reduce Fear This Is Paying for Exposure

- Never use the word "exposure." Use "placement," "commercial channel," "sales infrastructure."
- Quantify the value: "Your work in front of [X] people per week in venues where they linger and buy."
- Compare to alternatives with specific costs: "Gallery hire: £200-£1,000/week. Art fair table: £300-£500/day. Wallspace: £9.99/month."
- Show the sales path: application > acceptance > placement > QR code > sale > payout. Make the commercial mechanism tangible.

---

# 7. Artist Pricing / Membership Page

## Should There Be a Separate Pricing Page?

No. Pricing should be integrated into the For Artists page as a section. A separate pricing page creates a SaaS-product feel that undermines the premium positioning. The pricing is part of the story, not a separate decision point.

## How Pricing Should Be Framed

- **As an investment in a commercial channel**, not a subscription to a service
- **Against the cost of alternatives**: gallery hire, art fairs, Instagram ads
- **With the ROI path visible**: one sale covers months of membership
- **With the founding offer creating urgency**: limited spots, locked pricing

## Pricing Visibility

Pricing should be fully public. There is no benefit to hiding it. Hidden pricing creates suspicion ("how much will they try to charge me?") and friction ("I have to apply before I even know the cost?"). Artists who visit the site should know exactly what they are signing up for.

## Pricing Presentation

### Recommended Structure (embedded in For Artists page):

**1. Founding Artist Banner (top)**
- "Founding Artist Programme -- Limited to 50 spots"
- "Get Premium features at the Core price. £9.99/month, locked for life."
- "Founding Artist" badge shown
- CTA: "Apply for a Founding Spot"

**2. Tier Comparison Table**

| Feature | Core (£9.99/mo) | Premium (£29.99/mo) |
|---|---|---|
| Venue placements | 1 venue | Up to 3 venues |
| Works per venue | Up to 3 | Up to 5 |
| Rotation frequency | Quarterly | Bi-monthly |
| Profile type | Standard | Featured |
| Curation priority | Standard | Priority |
| Commission rate | 20% | 18% |
| Photography | -- | Quarterly session |
| Social media | Venue posts | Dedicated monthly feature |
| Analytics | Basic | Full |
| Annual option | £99/yr | £299/yr |

**3. Value Anchoring Block**

"What £9.99 a month gets you vs. the alternatives:"
- Gallery hire: £200-£1,000/week
- Art fair table: £300-£500/day
- Instagram promotion: £50-£200/month with no physical presence
- Wallspace Core: £9.99/month with guaranteed venue placement and sales infrastructure

**4. Objection-Handling Below Pricing**

- "Am I paying for exposure?" -- No. You are paying for a managed service: curation, matching, installation, rotation, QR codes, online listings, and sales processing.
- "What if I don't sell anything?" -- Your membership fee covers placement and service costs, not a guarantee of sales. But your work will be in front of real people every day -- that is more than most channels deliver.
- "Can I try before I pay?" -- We do not offer free trials. We offer a guarantee: if we do not place your work within 30 days, you get a full refund for your first month.

---

# 8. Artist Application Flow

## Application Page Structure

The application is hosted on Typeform and linked from the For Artists page. The CTA "Apply to Join" opens the application flow.

**Pre-application context (on the For Artists page, above the CTA):**
- "Applications are reviewed within 5 business days."
- "We accept roughly half of applicants."
- "You can apply without committing to payment. If accepted, your spot is held for 14 days."

## Application Form (Multi-Step Typeform)

### Step 1: About You
- Full name (required)
- Email address (required)
- Phone number (required)
- Location -- borough or area (required)
- Website URL (optional)
- Instagram handle (required)

### Step 2: Your Work
- Primary medium: Photography / Illustration / Painting / Printmaking / Mixed Media / Other (required)
- Style description: "Describe your work and practice in 2-3 sentences" (required, 50-300 words)
- Portfolio upload: 10-20 images of representative work, minimum 3000px on longest edge (required). Or: link to online portfolio (accepted as alternative).

### Step 3: Commercial Details
- Price range for available works: Under £100 / £100-250 / £250-500 / £500-1,000 / £1,000+ (required)
- Are your works available as prints or editions? Yes / No / Some (required)
- Can you provide framed work? Yes / No / Can arrange (required)
- Availability for placement: Immediate / Within 1 month / Within 3 months (required)

### Step 4: Logistics
- Can you deliver within London? Yes / No / Need assistance (required)
- Preferred delivery radius: Local borough / Inner London / Greater London (required)
- Can you help with installation if needed? Yes / No (optional)

### Step 5: Final
- How did you hear about Wallspace? (required, dropdown + other)
- Which membership tier interests you? Founding (£9.99/mo -- limited spots) / Core (£9.99/mo) / Premium (£29.99/mo) / Not sure yet (required)
- Anything else you would like us to know? (optional, free text)

### Post-Submission: Confirmation Page

- Heading: "Application Received"
- Message: "Thank you for applying to Wallspace. We review every application personally and will be in touch within 5 business days. In the meantime, follow us on Instagram for updates."
- Link to Instagram
- "Have questions? Email us at hello@wallspace.co"

## Approval Flow

**Review process (internal):**
1. Application lands in Airtable via Zapier (status: Applied)
2. Founder reviews portfolio against scoring rubric (technical quality 30%, commercial viability 25%, coherent style 20%, professional presentation 15%, venue fit 10%)
3. Decision: Accept / Waitlist / Decline
4. All applicants responded to within 5 business days

**Acceptance flow:**
1. Acceptance email sent -- warm, personal, makes the artist feel selected
2. Email includes: welcome message, link to membership payment (Stripe), what happens next
3. Artist selects tier and completes payment
4. Founder schedules 15-minute onboarding call
5. Artist profile is created in Webflow CMS and Airtable

**Acceptance email structure:**
- Subject: "Welcome to Wallspace"
- Body: Personal note referencing specific works from their portfolio. Confirmation of acceptance. Link to payment. Explanation of next steps (payment > onboarding call > portfolio preparation > placement).

**Rejection flow:**
1. Polite decline email with brief, specific feedback
2. "We are not able to offer you a place at this time" -- not "you were rejected"
3. One specific reason or area for improvement
4. Invitation to reapply after 3 months
5. Tone: respectful, constructive, not discouraging

**Rejection email structure:**
- Subject: "Your Wallspace Application"
- Body: Thanks for applying. We reviewed your portfolio carefully. At this time, we are not able to offer a place because [specific reason: e.g., "the portfolio would benefit from a more cohesive body of work" or "the technical quality of the images does not yet meet our display standards"]. We encourage you to reapply in 3 months. Here is what we would look for: [one actionable suggestion].

## Artist Onboarding Journey After Approval

1. **Day 0:** Acceptance email + payment link
2. **Day 1-3:** Artist completes payment via Stripe
3. **Day 3-7:** Onboarding call with founder (15 min) -- discuss their work, venue preferences, logistics, sizing, pricing strategy
4. **Day 7-14:** Artist selects 5-10 works for initial placement, provides high-res files and metadata. Founder reviews and confirms.
5. **Day 14-21:** Wallspace matches artist to venue. Artist notified with venue details and placement preview.
6. **Day 21-30:** Work produced/framed if needed. Installation scheduled and completed.
7. **Day 30:** Work is live on a wall. Artist receives installation photos.

---

# 9. Artist Profile Page Design

## Strategic Principle

Artist profiles are commercial availability profiles, not portfolio vanity pages. Every element serves one of two purposes: (1) attract interest from venues and buyers, or (2) enable Wallspace to match the artist to placements efficiently.

The public profile should feel like a premium gallery page. The commercial and logistics data lives behind the scenes.

## Page Structure (Wireframe in Words)

**Header Block:**
- Artist display name (large, prominent)
- Profile photo (square, professional)
- Short bio (max 300 characters, third person)
- Location (borough level: "Hackney, London")
- Primary medium and style tags (e.g., "Street Photography -- Urban, Monochrome, Documentary")
- Instagram link (icon)
- Website link (icon)
- "Founding Artist" badge if applicable

**Portfolio Gallery:**
- Masonry or grid layout, 6-40 images
- Clean, image-forward design -- minimal chrome, maximum artwork
- Each image clickable to a lightbox or detail view showing:
  - Title
  - Medium
  - Dimensions
  - Edition info (if applicable)
  - Price indicator (band: e.g., "£100-250")
  - "Currently available" indicator
- Gallery should load fast and look sharp. Images are the product.

**Commercial Summary Strip:**
- Displayed below the gallery as a clean, scannable bar:
  - Offers: Prints / Originals / Framed / Unframed (as tags)
  - Available sizes: Small / Medium / Large / Extra Large (as tags)
  - Open to commissions: Yes/No
- This strip is factual, not promotional. It lets a venue or buyer quickly assess fit.

**Extended Bio (Expandable):**
- "Read more" link opens the extended bio (up to 1,500 characters)
- Artist statement, background, exhibitions, press

**Currently Placed In (Optional, Future):**
- "Currently showing at: [Venue Name], [Neighbourhood]"
- Only display if venue is comfortable being named. Adds credibility.

**CTA Block:**
- For venues: "Interested in this artist's work for your space? Get in touch." (links to venue enquiry form, pre-filled with artist name)
- For buyers: "Want to buy a piece? Scan the QR code in-venue, or contact us to enquire." (links to Contact or email)
- For artists viewing other profiles (social proof): "Want to join Wallspace? Apply here."

## What Is Shown Publicly

| Field | Public? |
|---|---|
| Display name | Yes |
| Profile photo | Yes |
| Short bio | Yes |
| Extended bio | Yes (behind "Read more") |
| Portfolio gallery | Yes |
| Per-image: title, medium, dimensions, edition, price band, availability | Yes |
| Primary medium, secondary medium | Yes |
| Style tags | Yes |
| Colour palette tendency | Yes |
| Best suited venue types | Yes |
| Offers originals/prints, framed/unframed | Yes |
| Available sizes | Yes |
| Location (borough level) | Yes |
| Open to commissions | Yes |
| Instagram, website | Yes |

## What Is NOT Shown Publicly

| Field | Why Hidden |
|---|---|
| Revenue-share preferences | Commercial negotiation detail; handled by Wallspace |
| Exact pricing (only bands shown) | Protects pricing flexibility; exact prices shown on purchase pages |
| Delivery radius, lead times | Operational detail; Wallspace manages logistics |
| Framing capabilities | Internal matching data |
| Inventory counts | Internal |
| Membership tier | Internal |
| Reliability rating | Internal |
| All ops notes | Internal |

## Recommended Profile Modules / Components

1. **Identity header** (name, photo, bio, badges, location, links)
2. **Portfolio grid** (masonry or uniform grid, lightbox detail)
3. **Commercial summary strip** (prints/originals/sizes/commissions)
4. **Extended bio** (collapsible)
5. **Current placement** (optional, venue name + neighbourhood)
6. **Enquiry CTA block** (for venues and buyers)

## Schema of Profile Fields (Webflow CMS)

| CMS Field | Field Type | Notes |
|---|---|---|
| display_name | Plain text | Max 60 chars |
| slug | Auto-generated | URL: /artists/[slug] |
| profile_photo | Image | Square, min 400x400 |
| short_bio | Plain text | Max 300 chars |
| extended_bio | Rich text | Max 1500 chars |
| primary_medium | Option (dropdown) | Controlled list |
| secondary_medium | Option (dropdown) | Controlled list |
| style_tags | Multi-reference | Link to Style Tags collection |
| colour_palette | Multi-reference | Link to Colour Palette collection |
| venue_suitability | Multi-reference | Link to Venue Types collection |
| location | Plain text | Borough level |
| instagram_url | Link | Full URL |
| website_url | Link | Full URL |
| offers_originals | Switch (boolean) | |
| offers_prints | Switch (boolean) | |
| offers_framed | Switch (boolean) | |
| offers_unframed | Switch (boolean) | |
| available_sizes | Multi-reference | Small/Medium/Large/XL collection |
| open_to_commissions | Switch (boolean) | |
| is_founding_artist | Switch (boolean) | Controls badge display |
| featured | Switch (boolean) | Controls homepage feature |
| portfolio_images | Multi-image or linked collection | See below |

**Portfolio Images Sub-Collection:**

| Field | Type |
|---|---|
| image | Image (high-res) |
| title | Plain text |
| medium | Option |
| dimensions_h | Number |
| dimensions_w | Number |
| dimension_unit | Option (cm/inches) |
| edition_info | Plain text |
| price_band | Option (Under £100 / £100-250 / £250-500 / £500-1,000 / £1,000+) |
| year_created | Number |
| currently_available | Switch |
| artist | Reference (to Artists) |

## Design Guidance: Balancing Art and Logistics

- **Art first.** The portfolio gallery should dominate the page. Large images, clean backgrounds, generous whitespace. The artwork is the product and the primary trust signal.
- **Logistics subtle.** The commercial summary strip should be clean and factual -- small text, tag-style display, no heavy formatting. It answers practical questions without making the page feel like a specification sheet.
- **Bio accessible.** Keep the short bio visible. Hide the extended bio behind a click. Most visitors want to see the work first and read the story second.
- **Profile photo human.** Even though the art is the product, a real photo of the artist builds trust and connection. It should be visible but not dominant.
- **White space.** Use generous spacing between sections. The page should feel gallery-like, not cramped.

---

# 10. Venue Enquiry / Request Curation Flow

## Should Venues Browse Extensively or Request Curation?

At launch, **venues should primarily request curation, not browse.** The concierge model means Wallspace curates and presents options. Allowing venues to browse extensively before submitting an enquiry creates two problems: (1) decision paralysis, and (2) venues forming opinions before Wallspace can curate for their specific space.

Venues can browse the Artists page to see the quality of the roster, but the conversion path should lead to an enquiry form, not a self-serve selection tool.

## Primary Conversion Path

Venue lands on For Venues page > reads value proposition > clicks "Request Artwork for Your Space" > completes short form > receives auto-confirmation > Wallspace follows up within 24 hours.

## Venue Enquiry Form Fields (Typeform)

### Step 1: Your Venue
- Venue name (required)
- Your name and role (required)
- Email address (required)
- Phone number (required)
- Venue address (required)

### Step 2: Your Space
- Venue type: Cafe / Restaurant / Bar / Wine bar / Co-working space / Salon / Other (required)
- Approximate wall space: 1-2 walls / 3-4 walls / 5+ walls (required)
- Are you currently displaying any artwork? Yes / No (required)
- Instagram handle (optional -- lets Wallspace preview the venue aesthetic)

### Step 3: Your Preferences
- What kind of work would suit your space? Photography / Painting / Prints / Illustration / Open to anything / Not sure (required)
- Any style preferences? Modern / Abstract / Landscape / Urban / Botanical / Bold and colourful / Calm and minimal / No preference (optional, multi-select)
- Anything we should know about your space or preferences? (optional, free text)

### Step 4: Final
- How did you hear about Wallspace? (required, dropdown + other)

**Total fields: 11-14. Completion time: 2-3 minutes.**

## Post-Submission

### Thank-You Page

- Heading: "We will be in touch within 24 hours."
- Message: "Thank you for your interest in Wallspace. We have received your enquiry and a member of our team will contact you to arrange a brief site visit. In the meantime, browse our artist roster to get a sense of the work we place."
- CTA: "Browse Artists"
- Link to Instagram

### Auto-Response Email

- Subject: "Your Wallspace Enquiry"
- Body: "Thanks for getting in touch about Wallspace for [Venue Name]. We will follow up within 24 hours to arrange a quick site visit. In the meantime, here is a brief overview of how the service works: [2-3 bullet points]. If you have any questions, reply to this email or call us on [phone number]."

### Internal Next-Step Workflow

1. Enquiry lands in Airtable via Zapier (status: New Enquiry)
2. Founder reviews within 4 hours during business hours
3. Founder responds within 24 hours -- phone call or email
4. Site visit scheduled within 5 business days
5. After site visit: venue moves to "Curation" stage in Airtable
6. Founder curates shortlist of 3-5 artists/works
7. Shortlist sent to venue for approval (email with images)
8. Upon approval: installation scheduled

---

# 11. Customer Purchase Flow

## Ideal Entry Point

**QR code on a small printed card next to each artwork in the venue.**

Card design (business card size):
- Wallspace logo (small, top)
- Artwork title
- Artist name
- Price (e.g., "£180")
- QR code (prominent, centre)
- "Scan to buy or learn more"
- wallspace.co (small, bottom)

The QR code links to a Stripe Payment Link page for that specific artwork.

## What the Landing Page Should Contain

When the customer scans the QR code, they land on a page showing:

1. **Artwork image** (high quality, the same piece they are looking at)
2. **Title and artist name**
3. **Price** (clear, prominent)
4. **Brief artist bio** (2-3 sentences, with link to full artist profile)
5. **Medium, dimensions, edition info**
6. **"Buy This Artwork" button** (Stripe checkout)
7. **Fulfilment info:** "Collect from the venue, or we can arrange delivery within London (£[X] delivery fee)."
8. **"Browse more by [Artist Name]"** link to their profile

## How Fulfilment Works

- **Default at launch: venue collection.** Customer buys, Wallspace confirms. Customer returns to the venue to collect the piece (or takes it immediately if the venue agrees).
- **Delivery option:** Wallspace arranges courier delivery within London for an additional fee (£15-£25). This is handled manually.
- **Replacement:** When a piece sells, Wallspace installs a replacement within 1-2 weeks.

## How Commissions Work Operationally

1. Customer pays via Stripe Payment Link
2. Stripe captures full sale price
3. Founder logs sale in Airtable
4. Calculates: Artist payout (80% for Core, 82% for Premium), venue commission (10%), Wallspace retains remainder
5. Artist paid via bank transfer within 14 days
6. Venue paid monthly

## Whether Checkout Should Happen on Wallspace or Externally

**At launch: Stripe Payment Links.** These are hosted by Stripe (trusted, secure, mobile-optimised). The customer scans the QR, lands on a Stripe-hosted page, and pays. No custom checkout needed.

**Why this is the right MVP choice:**
- Zero development cost
- Stripe is a trusted payment brand
- Each artwork gets its own link (created manually, which is fine at 50-100 artworks)
- Mobile-optimised out of the box

**When to upgrade:** When artwork count exceeds 200+ and manual link creation becomes unwieldy, move to Stripe Checkout with dynamic product creation via API.

## Leanest Viable Version for MVP

1. QR code on printed card links to Stripe Payment Link
2. Payment Link shows artwork image, title, artist, price, buy button
3. Customer pays
4. Founder receives Stripe notification
5. Founder contacts artist and venue manually
6. Collection arranged or delivery booked

Total tech needed: Stripe account, QR code generator, Canva for card design, local print shop.

---

# 12. UX Flows

## Flow 1: Artist Discovers Wallspace > Applies > Gets Approved > Pays > Completes Profile

```
Instagram / referral / community post
  > Lands on wallspace.co (homepage or For Artists via link)
  > Reads value proposition and membership tiers
  > Clicks "Apply to Join"
  > Completes Typeform application (5-10 min)
  > Receives confirmation email
  > [Wait 1-5 business days]
  > Receives acceptance email with payment link
  > Completes Stripe payment (selects tier)
  > Receives welcome email with next steps
  > Onboarding call with founder (15 min)
  > Submits portfolio images and metadata for placement
  > Founder creates Webflow CMS profile
  > Profile goes live on wallspace.co
  > Artist matched to venue within 14-21 days
  > Work installed within 30 days
```

**Friction points:** Application length (mitigate: keep Typeform under 15 fields); wait time for review (mitigate: respond within 5 days, send a "we're reviewing" nudge at day 3); payment step after acceptance (mitigate: make the acceptance email warm and the payment link seamless).

**Trust needs:** See other artists on the site before applying; understand the process clearly; know the acceptance rate is real (not everyone gets in); know they can get a refund if not placed in 30 days.

## Flow 2: Venue Discovers Wallspace > Understands Value > Submits Enquiry > Gets Matched

```
Walk-in visit by founder / Instagram DM / email / word of mouth
  > Venue owner visits wallspace.co/venues
  > Reads the proposition (free, handled, no contract)
  > Clicks "Request Artwork for Your Space"
  > Completes Typeform enquiry (2-3 min)
  > Receives confirmation email
  > Founder calls or emails within 24 hours
  > Site visit arranged (15-20 min)
  > Founder photographs space and discusses preferences
  > Founder curates shortlist of 3-5 artists/works
  > Sends shortlist to venue for approval (email with images)
  > Venue approves (one message)
  > Installation scheduled and completed
  > QR cards placed, staff briefed
  > Venue is live
```

**Friction points:** Getting the venue owner to visit the website at all (mitigate: the in-person pitch is primary, the website is backup and validation); form completion (mitigate: keep form under 12 fields); response time (mitigate: 24-hour response guarantee).

**Trust needs:** Photos of art in similar venues; clear "it's free" messaging; insurance and damage coverage; no-contract assurance.

## Flow 3: Venue Browsing Artist Profiles > Requests Placement

```
Venue owner visits wallspace.co/artists
  > Browses artist grid (sees quality of roster)
  > Clicks into 2-3 artist profiles
  > Sees work they like
  > Clicks "Interested in this artist for your space?"
  > Directed to venue enquiry form (pre-populated with artist name if possible)
  > Completes form
  > Wallspace follows up with curated recommendation including that artist
```

**Friction points:** Venue owner overwhelmed by choice (mitigate: feature only 20-30 artists at launch; use clear style categories); not sure how to proceed from profile (mitigate: clear CTA on every profile page).

## Flow 4: Customer in Venue Scans QR > Views Piece > Buys

```
Customer notices artwork in venue
  > Sees printed card with title, artist, price, QR code
  > Scans QR code with phone camera
  > Lands on Stripe Payment Link page
  > Sees artwork image, title, artist name, price
  > Clicks "Buy"
  > Enters payment details
  > Payment confirmed
  > Receives email receipt
  > Wallspace contacts them about collection/delivery
  > Customer receives artwork
```

**Friction points:** QR card visibility (mitigate: well-designed, consistently placed, noticeable but not intrusive); Stripe Payment Link trust (mitigate: Stripe is widely trusted; include Wallspace branding on the page); fulfilment uncertainty (mitigate: clear fulfilment info on the payment page).

## Flow 5: Founder/Admin Managing Operations

```
Daily routine:
  > Check Airtable for new artist applications
  > Review portfolios, score, accept/reject
  > Check for new venue enquiries, respond within 24 hours
  > Check Stripe dashboard for payments (memberships, sales)
  > Update Airtable with any changes (placements, sales, statuses)

Weekly routine:
  > Schedule site visits with interested venues
  > Curate shortlists for approved venues
  > Coordinate installations and rotations
  > Send artist updates and venue check-ins
  > Process payouts for completed sales

Monthly routine:
  > Send monthly status email to all active artists
  > Review churn and follow up with at-risk artists
  > Update website (new artist profiles, featured artists)
  > Review analytics (site traffic, conversion rates, application volume)
```

---

# 13. MVP Feature Set

## Must-Have for v1

| Feature | Implementation |
|---|---|
| Public website (home, venues, artists, how it works, about, FAQs, contact) | Webflow |
| Artist browse page with grid of artist cards | Webflow CMS |
| Individual artist profile pages | Webflow CMS template |
| Artist application form | Typeform |
| Venue enquiry form | Typeform |
| Artist membership payment (recurring) | Stripe Payment Links / Checkout |
| Artwork purchase flow (QR > payment) | Stripe Payment Links |
| QR code cards for venue artworks | Canva + print shop |
| Operational database (artists, venues, artworks, placements, sales) | Airtable |
| Form-to-database automation | Zapier |
| Email communication | Gmail + Mailchimp (basic sequences) |
| Legal agreements | PDF + HelloSign |
| Terms and Privacy pages | Webflow |

## Manual / Backend Workaround in v1

| Function | Manual Approach |
|---|---|
| Application review and scoring | Founder reviews in Airtable |
| Curation and venue matching | Founder selects manually based on knowledge |
| Shortlist presentation to venues | Email with images or simple PDF |
| Installation scheduling | Google Calendar |
| Sales tracking and attribution | Manual Airtable entry when Stripe notification received |
| Commission calculation | Spreadsheet |
| Artist payouts | Manual bank transfer, monthly |
| Venue payouts | Manual bank transfer, monthly |
| Artist profile creation | Founder creates Webflow CMS entries manually |
| Monthly artist reporting | Manual email |
| Rotation scheduling | Google Calendar + Airtable reminders |

## Nice-to-Have Later (v2, Month 6-9)

| Feature | Trigger |
|---|---|
| Artist self-serve dashboard | Artists requesting access to their own data |
| Venue self-serve portal | Venues wanting to browse/request without calling |
| Automated payouts via Stripe Connect | Sales exceeding 10-15/month |
| Automated email reporting | Manual reporting taking 3+ hours/month |
| Enhanced search/filter on browse page | Roster exceeding 50 artists |
| Case studies page | 3+ successful venue stories to share |
| Blog / content section | SEO becoming relevant for growth |

## Definitely Defer (v3+)

| Feature | Why Defer |
|---|---|
| Mobile app | Web tools sufficient; app adds cost and complexity |
| Automated matching algorithm | Not enough data; founder curation is the product |
| Customer accounts / wishlists | Unnecessary friction; QR purchases are impulse |
| In-app messaging | All communication goes through founder |
| POS integration | Not enough venue volume to justify |
| Multi-city expansion tools | Focus on London first |
| Bulk order tools | Edge case; handle manually |
| Print-on-demand integration | Partner relationships not yet established |

---

# 14. Admin and Internal Tooling

## Leanest Tooling Stack for Launch

| Function | Tool | Cost |
|---|---|---|
| Master database | Airtable (Plus plan) | ~£16/mo |
| Website | Webflow (CMS plan) | ~£23/mo |
| Application and enquiry forms | Typeform (Basic) | ~£21/mo |
| Automation | Zapier (Starter) | ~£16/mo |
| Payments and billing | Stripe | Transaction fees only |
| Email sequences | Mailchimp (Free tier) | £0 |
| Contracts | HelloSign (Free tier, 3/mo) | £0 |
| Task management / docs | Notion (Free) | £0 |
| Calendar | Google Calendar | £0 |
| Communication | Gmail + WhatsApp Business | £0 |
| File storage | Google Drive | £0 |
| QR codes | Free QR generator | £0 |
| Card/label design | Canva (Free or Pro) | £0-10/mo |
| Accounting | Xero or FreeAgent | ~£25/mo |
| **Total** | | **~£100-115/mo** |

## Internal Process Requirements

### Artist Application Review
- Applications land in Airtable "Applications" table via Zapier
- Founder reviews portfolio against 5-criteria rubric
- Status updated: Applied > Under Review > Accepted / Waitlisted / Declined
- Acceptance or rejection email sent manually (templates in Gmail)

### Membership Status Tracking
- Stripe dashboard shows active subscriptions, failed payments, cancellations
- Airtable "Artists" table synced manually with Stripe status
- Zapier automation: Stripe subscription events > Airtable status updates (set up in v1)

### Artist Profile Management
- Founder creates Webflow CMS entries for accepted artists
- Portfolio images uploaded to Webflow from Google Drive
- Profile goes live after founder quality check
- Updates requested via email; founder implements in Webflow

### Venue Enquiry Management
- Enquiries land in Airtable "Venues" table via Zapier
- Pipeline: New Enquiry > Contacted > Site Visit Scheduled > Visited > Curation > Approved > Installed > Active
- Founder moves cards through pipeline manually

### Matching Workflow
- Founder receives venue brief (from site visit notes)
- Filters Airtable "Artists" table by medium, style, size, availability, location
- Selects 3-5 artist matches
- Creates shortlist email/PDF with images and descriptions
- Sends to venue for approval

### QR / Sales Tracking
- Each artwork gets a Stripe Payment Link
- QR code generated from link URL
- QR printed on venue card (Canva template)
- When sale occurs: Stripe notification > founder logs in Airtable Sales table
- Records: artwork, artist, venue, sale price, commission split, payout status

### Payout Tracking
- Monthly payout cycle (process on 1st of each month)
- Spreadsheet calculates: artist share (80/82%), venue share (10%), Wallspace retention
- Bank transfers initiated manually
- Payout status updated in Airtable

### Content Management
- Website content updated in Webflow
- New artist profiles added via Webflow CMS
- Featured artists rotated monthly on homepage
- Instagram managed manually (posting, stories, artist features)

### Analytics Tracking
- Google Analytics on Webflow site (pageviews, traffic sources, conversion events)
- Typeform analytics (application completion rates, drop-off points)
- Stripe dashboard (revenue, subscription metrics)
- Airtable dashboards (artist count, venue count, placement count, sales count)
- Monthly summary compiled manually

## What the Founder Dashboard Really Needs at Launch

A single Airtable base with these views:

1. **Artist Pipeline** -- Kanban: Applied > Under Review > Accepted > Onboarding > Active > Churned
2. **Venue Pipeline** -- Kanban: New > Contacted > Site Visit > Curation > Approved > Installed > Active
3. **Active Placements** -- Table: which artwork is in which venue, installed date, next rotation date
4. **Sales Log** -- Table: all sales with commission calculations and payout status
5. **Upcoming Tasks** -- Calendar view: installations, rotations, site visits, follow-ups
6. **At a Glance** -- Dashboard: total artists, total venues, total placements, monthly revenue, pending payouts

---

# 15. Website Copy Framework

## Master Brand Message

"Wallspace places curated art by real artists into independent venues across London. We handle everything -- curation, installation, rotation, and sales. Venues get better walls for free. Artists get a real commercial channel. Everyone gets better art in their everyday life."

## Homepage Message Hierarchy

1. **What we do:** We put real art on real walls.
2. **How it works:** We connect curated artists with independent venues. We handle everything.
3. **Why it matters:** Venues look better. Artists sell more. Art becomes part of everyday life.
4. **Social proof:** [X] artists. [X] venues. East and South London.
5. **Call to action:** Apply as an artist. Request art for your venue.

## Venue-Side Message Hierarchy

1. **The offer:** Free, curated art for your walls. We handle everything.
2. **How it works:** Tell us about your space. We curate, deliver, install, rotate.
3. **Risk removal:** No cost. No contract. No hassle. You approve everything.
4. **Upside:** Revenue share on sales. Better-looking space. Cultural credibility.
5. **Call to action:** Request artwork for your space.

## Artist-Side Message Hierarchy

1. **The opportunity:** Your work on real walls in real venues. Seen by real people every day.
2. **The channel:** A managed placement service, not a listing site. Curation, installation, rotation, sales -- handled.
3. **The economics:** You keep 80%. Membership from £9.99/month. Less than a day at an art fair.
4. **The quality bar:** We review every application. Not everyone gets in. That is what makes it valuable.
5. **Call to action:** Apply to join Wallspace.

## Trust Messages

- "Every artist personally reviewed. No AI-generated work."
- "Every placement hand-matched to the venue."
- "Original work by working artists."
- "Selected, not listed."
- "Human curation. Not algorithmic sorting."

## Anti-AI / Curated Quality Messages

- "No AI art. No clip-art prints. No bulk uploads. Every piece on Wallspace is original work by a real artist with a real practice."
- "We review portfolios, not algorithms. If the work is not strong enough, it does not get in."
- "In a world flooded with generated images, Wallspace is a place where real creative work is taken seriously."

## Premium but Accessible Tone Guidance

- Speak with confidence, not arrogance. "We know what we are doing" not "We are the best."
- Use specifics, not superlatives. "30 venues across East London" not "a growing network of premium spaces."
- Be honest about limitations. "We do not guarantee sales" is more trustworthy than vague promises.
- Be warm but professional. Write like a smart friend who works in the art world, not like a corporate brochure or a tech startup.

## Words and Phrases to Use

- Curated, selected, reviewed, vetted
- Placement, commercial channel
- Independent venues, neighbourhood, local
- Handled, managed, end-to-end
- Real walls, real footfall, real sales
- Professional, original, quality
- Artists and photographers (name the creators)
- Membership (not subscription)
- Apply (not sign up)

## Words and Phrases to Avoid

- Platform, marketplace, community
- Exposure (implies no commercial value)
- Empower, democratise, disrupt
- Exclusive, prestigious, luxury (too gatekept)
- Subscribe, sign up, register (too SaaS)
- Content, content creator (artists, not content creators)
- AI-powered, algorithm, automated
- Stakeholders, partners (in venue-facing copy)
- Journey (as in "creative journey")
- Network (sounds like MLM)

---

# 16. Visual and Design Direction

## What the Design Should Feel Like

Clean, restrained, confident. The design should feel like walking into a well-run independent gallery or a beautifully designed magazine. It should communicate quality through restraint -- generous whitespace, thoughtful typography, and letting the artwork do the talking.

**Reference points (conceptual, not to copy):**
- The Modern House (estate agency) -- premium service, clean design, photography-led
- Monocle Magazine -- editorial confidence, clear hierarchy, intelligent layout
- Toast (clothing) -- quiet quality, seasonal, understated
- Ace Hotel lobbies -- curated without trying too hard

## What It Should NOT Feel Like

- Etsy (cluttered, crafty, overwhelming)
- A tech startup landing page (gradient buttons, "Join 10,000+ creators" counters)
- A SaaS product (pricing tables, feature grids, comparison checkmarks)
- A luxury gallery (white-cube pretension, "price on request")
- A council art programme (worthy, bureaucratic, uninspiring)

## Typography Direction

- **Primary typeface:** A clean, modern serif for headings (e.g., Editorial New, Freight Display, or similar). Serif communicates sophistication and cultural credibility without being stuffy.
- **Secondary typeface:** A clean sans-serif for body text and UI elements (e.g., Inter, DM Sans, or similar). Readable, modern, neutral.
- **Type hierarchy:** Large, confident headings. Generous line height on body text. Clear visual distinction between heading levels.
- **Avoid:** Script fonts, display fonts, anything that competes with the artwork.

## Colour Direction

- **Primary palette:** Off-white / warm white background (#FAFAF8 or similar), near-black text (#1A1A1A), one accent colour used sparingly.
- **Accent:** A muted, warm tone -- not a bright startup colour. Consider: warm terracotta, deep sage, muted navy, or warm charcoal. One accent only.
- **Rationale:** The artwork is the colour. The website should be a neutral, premium frame that makes the art pop. Bright brand colours compete with the artwork.
- **Avoid:** Pure white (harsh), pure black (stark), bright primaries (compete with art), gradients (tech startup signalling).

## Spacing / Layout Direction

- **Generous whitespace.** Let elements breathe. Do not pack content.
- **Max content width:** 1200px. Content should feel centered and composed, not stretched.
- **Section spacing:** Large gaps between major sections (80-120px). This gives the page a gallery-like rhythm.
- **Grid system:** 12-column grid for layout flexibility. Artist grid: 3 or 4 columns on desktop, 2 on tablet, 1 on mobile.
- **Mobile-first:** Most artist and venue traffic will come from Instagram links (mobile). Design for mobile first.

## Imagery Direction

- **Hero images:** Always show artwork in situ -- on a wall in a real venue, with the venue environment visible. Never show artwork as a flat file on a white background for hero sections.
- **Artist profiles:** High-quality portfolio images are the focus. Displayed clean and large.
- **Venue photos:** Warm, atmospheric, real. Not sterile or overly styled. Should feel like a place you would actually go.
- **No stock photography.** Every image on the site should be either real artwork, real venue photos, or real installation shots.
- **Photography style:** Natural light preferred. Warm tones. Slightly editorial. Not over-processed.

## How to Make Artwork the Hero Without Making the Site Feel Messy

- Use a consistent image aspect ratio in grids (4:5 or 3:4 works well for art)
- Uniform card sizes in the browse grid (no chaotic masonry at launch)
- Clean borders or subtle shadows to frame each image
- Generous padding around images
- Never overlay text on artwork images
- Let images load at high quality -- the art is the product

## How Trust and Professionalism Show Through Design

- Consistent branding across every touchpoint (site, cards, emails, QR labels)
- No design shortcuts (broken layouts, inconsistent spacing, low-res images)
- Fast page load times (image optimisation matters)
- Mobile experience is polished, not an afterthought
- Forms are clean and short (Typeform handles this well)
- Professional email design (Mailchimp templates aligned with site branding)

---

# 17. Trust and Conversion System

## Trust Signals for Venues

| Signal | Where It Appears |
|---|---|
| "Free. No cost. No contract." | Hero, value blocks, FAQ, final CTA |
| "You approve everything before installation" | How It Works, FAQ |
| "Artwork is insured during display" | FAQ, value blocks |
| Photos of art in similar venues | Venue page, homepage |
| Specific neighbourhoods named | Venue page, homepage |
| "One point of contact" | Value blocks |
| "Two weeks notice to stop. No penalty." | FAQ, value blocks |
| Founding venue testimonials (when available) | Venue page |

## Trust Signals for Artists

| Signal | Where It Appears |
|---|---|
| Browse existing artist roster | Artists page (proves quality bar) |
| "We review every application" | For Artists, homepage, about |
| "Not everyone is accepted" | For Artists, application page |
| "No AI-generated work" | For Artists, homepage, about |
| Commission rates stated clearly | For Artists (pricing section) |
| "30-day placement guarantee or refund" | For Artists (pricing section) |
| Named venues with photos | Homepage, For Artists |
| Artist testimonials (when available) | For Artists |
| "You keep 80% of every sale" | For Artists, pricing |

## Trust Signals for Buyers

| Signal | Where It Appears |
|---|---|
| Stripe-powered checkout (trusted brand) | Purchase page |
| Clear pricing (no hidden fees) | QR card, purchase page |
| Named artist with bio | Purchase page, artist profile |
| "Original work by a real artist" | Purchase page |
| Clear fulfilment information | Purchase page |

## How to Handle Lack of Early Case Studies

Before real case studies exist:

1. **Use venue photos.** Even before placements, photograph target venues (with permission) and show mockups of what art would look like on their walls.
2. **Use artist work.** The artists themselves are proof of quality. Feature their portfolios prominently.
3. **Use founder credibility.** The About page should establish the founder's knowledge and commitment.
4. **Use process as proof.** Describing the curation process (review, selection, matching) signals professionalism even without results to show.
5. **Use specifics.** "Launching with 30 curated artists across 10 venues in East and South London" is more convincing than "a growing community of artists."

After Month 1-2, replace placeholder proof with:
- Photos of actual installations
- Short quotes from artists and venue owners
- "First sale" stories
- Instagram content of real placements

## What Proof to Use Initially

| Proof Type | Implementation |
|---|---|
| Artist roster quality | Live artist profiles on the site |
| Venue installation photos | Mockups initially, real photos ASAP |
| Process description | "How It Works" sections on both audience pages |
| Numbers | Real counts: "30 artists," "10 venues," specific neighbourhoods |
| Founder story | About page with genuine narrative |
| Curation standards | "Not everyone is accepted" + criteria described |

## FAQs to Surface Prominently

The FAQ page should exist, but the most critical FAQs should also appear on the relevant audience pages:

**On For Venues:** Is it really free? What if I don't like the art? Is there a contract? What about damage?

**On For Artists:** Will my work sell? Why should I pay? What commission do you take? What if I'm not accepted?

**On Homepage:** What is Wallspace? How does it work? Is it really free for venues?

## Friction Reducers Around Key CTAs

| CTA | Friction Reducer |
|---|---|
| "Apply to Join" (artist) | "Applications reviewed within 5 business days" |
| "Apply to Join" (artist) | "Apply without commitment -- payment is only after acceptance" |
| "Request Artwork" (venue) | "2-minute form. We respond within 24 hours." |
| "Request Artwork" (venue) | "No cost. No contract. No commitment." |
| "Buy" (customer) | "Secure checkout via Stripe" |
| "Buy" (customer) | "Collect from the venue or delivered to your door" |

---

# 18. SEO and Discoverability Strategy

## Does SEO Matter in v1?

**Minimally.** In the first 6 months, growth is driven by direct outreach (founder walking into venues, DM-ing artists on Instagram) and word of mouth. SEO will not generate meaningful traffic before the site has content, backlinks, and domain authority.

However, basic SEO hygiene costs nothing and pays dividends later.

## What to Do Now (v1 SEO Hygiene)

1. **Clean URL structure:** wallspace.co/artists, wallspace.co/venues, wallspace.co/artists/[name]
2. **Title tags and meta descriptions** for every page (Webflow makes this easy)
3. **Alt text on all images** (artwork titles, artist names)
4. **Heading hierarchy** (H1 > H2 > H3, one H1 per page)
5. **Mobile performance** (fast loading, responsive design)
6. **Google Search Console** connected
7. **Google Analytics** tracking key events (application starts, form completions, page views)
8. **Sitemap submitted** to Google

## What Pages Should Target What Terms

| Page | Target Terms (Long Tail) |
|---|---|
| Homepage | art placement service London, curated art for venues |
| For Venues | free art for cafes London, artwork for restaurants, art display service |
| For Artists | sell art in cafes London, art placement for photographers, venue art membership |
| Artist profiles | [artist name] + photography/art |
| Browse Artists | London photographers, art for hospitality spaces |
| How It Works | how to display art in a cafe, art rental for venues |

## Location Pages or Segment Pages

**Not at launch.** Location-specific pages (e.g., "Art for cafes in Peckham") are valuable for SEO but require content and placements in those areas. Create them at Month 6+ when real case studies exist for specific neighbourhoods.

## Blog / Content Strategy

**Not at launch.** A blog requires consistent content creation that competes with operational priorities. Consider starting at Month 4-6 with:
- Artist spotlights (profiles repurposed as blog posts)
- Venue case studies
- "Art in [Neighbourhood]" guides
- Photography tips / art buying guides

## What Should Be Indexed

- All public pages (homepage, for venues, for artists, artist profiles, browse, about, how it works, FAQs, contact)
- Artist profile pages (these become SEO assets over time)

## What Should NOT Be Indexed

- Stripe Payment Link pages (hosted by Stripe, not on wallspace.co)
- Terms and Privacy (index but deprioritise with meta robots)
- Typeform application pages (hosted by Typeform)
- Internal admin tools

## Schema / Structured Data

- **LocalBusiness** schema on homepage (Wallspace as a London-based service)
- **Person** or **Organization** schema for artist profiles
- **FAQPage** schema on FAQ page (helps Google surface FAQ rich snippets)
- **BreadcrumbList** for navigation

---

# 19. Build Recommendation

## Options Evaluated

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Webflow** | Professional design, CMS for artist profiles, fast to build, SEO-friendly, no code, integrates with forms and analytics | Monthly cost, CMS has limits at scale, some Webflow-specific learning curve | **Recommended** |
| **Framer** | Beautiful design, fast, modern | Weaker CMS, less mature for multi-page sites, fewer integrations | Not recommended for this scope |
| **Shopify** | E-commerce built in | Wrong model -- Wallspace is not a shop, Shopify themes feel e-commerce | Not recommended |
| **Custom app (Next.js)** | Full control, scales well | 3-6 months to build, costs £20k+, premature for validation phase | Defer to v2/v3 |
| **Squarespace** | Easy, affordable | Limited CMS flexibility, harder to customise, feels template-y | Second choice behind Webflow |
| **Carrd** | Cheapest, fastest | Single-page only, no CMS, no dynamic content | Too limited |

## Recommended Launch Stack

| Layer | Tool | Monthly Cost |
|---|---|---|
| Website (public pages + CMS) | **Webflow** (CMS plan) | ~£23/mo |
| Artist application form | **Typeform** (Basic) | ~£21/mo |
| Venue enquiry form | **Typeform** (included) | Included |
| Automation (form > database) | **Zapier** (Starter) | ~£16/mo |
| Operational database | **Airtable** (Plus) | ~£16/mo |
| Payments (memberships + sales) | **Stripe** | Transaction fees |
| Email sequences | **Mailchimp** (Free) | £0 |
| Contracts | **HelloSign** (Free/Essentials) | £0-12/mo |
| Domain | **wallspace.co** | ~£10/yr |
| Analytics | **Google Analytics** (Free) | £0 |
| **Total** | | **~£80-100/mo** |

## Why Webflow

1. **CMS is perfect for artist profiles.** Each artist is a CMS item with structured fields. Add a new artist, fill in the fields, and their profile page is live.
2. **Design flexibility.** Webflow allows custom, pixel-perfect design without code. The site can look premium and unique, not template-generic.
3. **Integrations.** Webflow integrates with Zapier, Mailchimp, Google Analytics, and can embed Typeform forms.
4. **SEO-friendly.** Clean code, fast performance, proper meta tag control, sitemap generation.
5. **Speed.** A competent Webflow builder can deliver the full v1 site in 3-4 weeks.

## Tradeoffs

- **CMS scaling.** Webflow CMS starts to strain above 10,000 items. This is not a concern for v1 (30-50 artists) but matters at scale. Custom platform replaces Webflow CMS at that point.
- **No backend logic.** Webflow cannot run server-side logic (automated payouts, matching algorithms). This is fine for v1 (manual operations) but means a custom backend is needed for v2+.
- **Cost.** Webflow is more expensive than Carrd or a basic Squarespace site. The investment is justified by the CMS and design flexibility.

## What the First Build Should Include (v1)

- 10 pages as specified in the sitemap
- Webflow CMS for artist profiles (30-50 initial entries)
- Typeform embedded for applications and enquiries
- Zapier connections: Typeform > Airtable
- Stripe Payment Links for memberships (2 tiers + Founding)
- Stripe Payment Links for artwork purchases (created per artwork)
- Google Analytics event tracking
- Mobile-responsive design
- Total build time: 4-6 weeks

## What Phase 2 Should Include (Month 6-9)

- Artist self-serve dashboard (Softr or custom, layered on Airtable)
- Venue self-serve portal
- Automated Stripe Connect payouts
- Enhanced artist browse with search/filter
- Case studies page
- Email automation (welcome sequences, monthly reports)
- Blog / content section (if SEO becomes a growth channel)

---

# 20. Page-by-Page Deliverables

## Home

| Element | Detail |
|---|---|
| **Objective** | Route visitors to the right conversion path; communicate what Wallspace is in 5 seconds |
| **Audience** | Both artists and venues (split messaging) |
| **Key messages** | Real art, real walls. Managed service. Free for venues. Curated for quality. |
| **Sections** | Hero > How It Works (split) > Featured Artists > Venue Showcase > Value Proposition Blocks > Social Proof > Final CTA > Footer |
| **Primary CTA** | "I'm an Artist" / "I'm a Venue" (hero); "Apply to Join" / "Request Artwork" (final block) |
| **Secondary CTA** | "Browse Artists" |
| **Proof elements** | Featured artist grid, venue installation photos, trust line (reviewed, curated, no AI), specific numbers |
| **Design notes** | Full-width hero image of art in venue. Clean split layout for two audiences. Generous whitespace. Artwork images are the visual anchors. |
| **Content notes** | Keep copy short and specific. No corporate jargon. Every word earns its place. |
| **Build complexity** | Medium -- multiple sections, CMS integration for featured artists |

## For Venues

| Element | Detail |
|---|---|
| **Objective** | Convert venue owners into enquiry submissions |
| **Audience** | Independent cafe, restaurant, bar owners/managers |
| **Key messages** | Free. Handled. No contract. Revenue share. Better-looking space. |
| **Sections** | Hero > What You Get (6 blocks) > How It Works (4 steps) > Venue Photos > Objection Q&A > Revenue Share Explainer > Who We Work With > Final CTA |
| **Primary CTA** | "Request Artwork for Your Space" (3x on page) |
| **Secondary CTA** | "Browse Artists" |
| **Proof elements** | Venue installation photos, specific neighbourhoods, insurance/damage coverage, "no contract" repeated |
| **Design notes** | Warm, inviting imagery. Simple iconography for the 6 benefit blocks. Clean Q&A layout for objections. |
| **Content notes** | Repeat "free" and "no contract" multiple times without being obnoxious. Address objections directly. |
| **Build complexity** | Low-medium -- static content, embedded Typeform |

## For Artists

| Element | Detail |
|---|---|
| **Objective** | Convert artists into applicants; explain membership and value |
| **Audience** | Emerging photographers and artists in London |
| **Key messages** | Real walls, not feeds. Managed commercial channel. Curated and selective. Fair commission. From £9.99/mo. |
| **Sections** | Hero > What You Get (6 blocks) > How It Works (5 steps) > Membership Tiers (comparison table) > How Curation Works > How This Is Different (comparison) > Trust/Social Proof > FAQs > Final CTA |
| **Primary CTA** | "Apply to Join" (3-4x on page) |
| **Secondary CTA** | "Browse Artists" (to see who else is on the roster) |
| **Proof elements** | Artist roster quality (link to browse), curation criteria, commission rates, 30-day placement guarantee, comparison vs. alternatives |
| **Design notes** | Photography of art in venues. Pricing table should be clean and readable, not SaaS-y. Comparison table should be simple. |
| **Content notes** | Never say "exposure." Frame membership as commercial investment. Be honest about what is and is not guaranteed. |
| **Build complexity** | Medium -- pricing table, comparison table, multiple content sections |

## Artists (Browse)

| Element | Detail |
|---|---|
| **Objective** | Showcase roster quality; enable browsing for venues and buyers |
| **Audience** | Venues, buyers, prospective artists (social proof) |
| **Key messages** | This is the calibre of work on Wallspace. |
| **Sections** | Page heading > Filter (by medium, style -- optional v1) > Artist card grid (CMS-driven) |
| **Primary CTA** | Click through to artist profile |
| **Secondary CTA** | "Apply to Join" (for artists viewing) / "Request Artwork" (for venues) |
| **Proof elements** | The roster itself is the proof. Quality of images in the grid. |
| **Design notes** | Clean grid. Consistent card sizes. Image-forward. Minimal text on cards (name, medium, location). |
| **Content notes** | Minimal -- the images speak. |
| **Build complexity** | Medium -- CMS-driven grid, responsive layout |

## Artist Profile (CMS Template)

| Element | Detail |
|---|---|
| **Objective** | Display artist portfolio and commercial availability; enable venue/buyer enquiries |
| **Audience** | Venues, buyers |
| **Key messages** | This artist's work. Available for placement and purchase. |
| **Sections** | Identity header > Portfolio gallery > Commercial summary strip > Extended bio > Current placement (future) > CTA block |
| **Primary CTA** | "Enquire About This Artist" (for venues) |
| **Secondary CTA** | "Browse More Artists" |
| **Proof elements** | Portfolio quality, professional bio, "Founding Artist" badge |
| **Design notes** | Gallery-like layout. Images large and prominent. Minimal UI around artwork. Generous whitespace. |
| **Content notes** | Short bio visible. Extended bio behind click. Commercial info clean and factual, not promotional. |
| **Build complexity** | Medium-high -- CMS template with multiple dynamic fields, image gallery, responsive design |

## How It Works

| Element | Detail |
|---|---|
| **Objective** | Explain the Wallspace process clearly for both audiences |
| **Audience** | Both artists and venues |
| **Key messages** | Simple process. We handle everything. |
| **Sections** | Introduction > Artist Journey (5 steps) > Venue Journey (4 steps) > Final CTA split |
| **Primary CTA** | "Apply to Join" (artists) / "Request Artwork" (venues) |
| **Secondary CTA** | Link to For Artists / For Venues for more detail |
| **Proof elements** | Process itself signals professionalism |
| **Design notes** | Step-by-step with icons or numbered blocks. Clean, scannable. |
| **Content notes** | Keep each step to 1-2 sentences. |
| **Build complexity** | Low -- static content page |

## About

| Element | Detail |
|---|---|
| **Objective** | Build trust and emotional connection; tell the Wallspace story |
| **Audience** | All visitors who want to know more |
| **Key messages** | Why Wallspace exists. Who is behind it. What we believe about art in everyday spaces. |
| **Sections** | Wallspace story > Founder bio > How curation works > What we believe (values, no AI, quality) > CTA |
| **Primary CTA** | "Apply to Join" / "Request Artwork" |
| **Secondary CTA** | Follow on Instagram |
| **Proof elements** | Founder photo and bio, curation philosophy, quality standards |
| **Design notes** | Personal, warm. Founder photo should feel genuine. |
| **Content notes** | Authentic founder voice. Not corporate. Not self-congratulatory. |
| **Build complexity** | Low -- static content page |

## FAQs

| Element | Detail |
|---|---|
| **Objective** | Answer common questions; reduce friction for both audiences |
| **Audience** | All |
| **Key messages** | We have anticipated your questions and concerns. |
| **Sections** | General FAQs > Artist FAQs > Venue FAQs > Buyer FAQs |
| **Primary CTA** | "Apply to Join" / "Request Artwork" / "Contact Us" |
| **Secondary CTA** | -- |
| **Proof elements** | Transparency itself is the proof |
| **Design notes** | Accordion/expandable format. Clean, scannable. Anchor links from other pages. |
| **Content notes** | Direct answers. No hedging. Use the FAQ responses from the strategy docs. |
| **Build complexity** | Low -- accordion component, static content |

## Contact

| Element | Detail |
|---|---|
| **Objective** | Catch-all for general enquiries, commercial interest, partnerships |
| **Audience** | All |
| **Key messages** | We are real people. Get in touch. |
| **Sections** | Brief intro > Contact form > Email address > Instagram link > Location (London) |
| **Primary CTA** | Submit form |
| **Secondary CTA** | -- |
| **Proof elements** | Physical location (London), response time ("We respond within 24 hours") |
| **Design notes** | Simple. Short form: name, email, type of enquiry (dropdown: artist, venue, buyer, commercial, other), message. |
| **Content notes** | Minimal. |
| **Build complexity** | Low |

## Terms & Privacy

| Element | Detail |
|---|---|
| **Objective** | Legal compliance |
| **Audience** | Anyone who needs it |
| **Key messages** | Standard legal terms |
| **Sections** | Terms of Service > Privacy Policy |
| **Primary CTA** | -- |
| **Design notes** | Clean, readable text. No design effort beyond basic styling. |
| **Build complexity** | Low -- text page |

---

# 21. Final Website Output

## Recommended Website Strategy

The Wallspace website is a conversion-focused front door to a concierge service. It exists to generate artist applications and venue enquiries, not to be a self-serve marketplace. The website communicates quality, selectivity, and professionalism. Behind it, the founder runs every operation manually. The site should be buildable in 4-6 weeks on Webflow and cost under £100/month to run.

## Final Launch Sitemap

```
wallspace.co
├── / (Homepage)
├── /venues (For Venues)
├── /artists (For Artists -- includes pricing)
├── /apply (Artist Application -- Typeform)
├── /browse (Browse Artists -- CMS grid)
│   └── /browse/[artist-slug] (Artist Profile -- CMS template)
├── /how-it-works
├── /about
├── /faqs
├── /contact
└── /terms (Terms & Privacy)
```

10 static/templated pages. 1 CMS collection (Artists). Total: lean, focused, buildable.

## Homepage Structure

Hero (headline + dual CTA) > How It Works (split: artists / venues) > Featured Artists (CMS grid) > Venue Showcase (installation photos) > Value Proposition Blocks (3 blocks) > Social Proof > Final CTA (dual) > Footer

## Venues Page Structure

Hero (free art, zero effort) > What You Get (6 blocks) > How It Works (4 steps) > Venue Photos > Objection Q&A (6 questions) > Revenue Share Explainer > Who We Work With > Final CTA

## Artists Page Structure

Hero (real walls, not feeds) > What You Get (6 blocks) > How It Works (5 steps) > Membership Tiers (comparison table with Founding banner) > How Curation Works > How This Is Different (comparison table) > Trust/Social Proof > FAQs (8 questions) > Final CTA

## Pricing Structure

Integrated into the For Artists page (no separate page). Two tiers: Core (£9.99/mo) and Premium (£29.99/mo). Founding Artist banner for first 50 at Core price with Premium features. Value anchored against gallery hire, art fairs, and Instagram spend.

## Artist Application Flow

Typeform, 5 steps, 15-18 fields. Confirmation page + auto-email. Reviewed within 5 business days. Acceptance email with Stripe payment link. Rejection email with specific feedback. Onboarding call within 7 days of payment. Profile live within 14 days. Work on a wall within 30 days.

## Artist Profile Page Structure

Identity header (name, photo, bio, badges, links) > Portfolio gallery (6-40 images, lightbox detail) > Commercial summary strip (formats, sizes, commissions) > Extended bio (collapsible) > CTA block (enquire for venues, buy for customers)

## Venue Enquiry Flow

Typeform, 4 steps, 11-14 fields. Confirmation page + auto-email. Founder responds within 24 hours. Site visit within 5 business days. Curation shortlist within 2 weeks. Installation within 3-4 weeks.

## Customer Purchase Flow

QR code on venue card > Stripe Payment Link > artwork image, price, artist info, buy button > Stripe checkout > receipt > manual fulfilment coordination. MVP: zero custom code.

## MVP Website Feature Set

**Must-have:** Public website (10 pages), Webflow CMS artist profiles, Typeform applications + enquiries, Stripe payments (memberships + sales), Airtable database, Zapier automation, QR cards.

**Manual in v1:** Application review, curation, installation scheduling, payouts, reporting.

**Defer:** Artist dashboard, venue portal, automated payouts, matching algorithm, blog, mobile app.

## Recommended Tech Stack

Webflow + Typeform + Airtable + Zapier + Stripe + Mailchimp + Google Analytics. Total: ~£80-100/month. Build time: 4-6 weeks.

## Messaging Framework

**Master message:** "Real art. Real walls. Professionally managed."

**Artist message:** "Your work on real walls. Seen by real people. A managed commercial channel from £9.99/month."

**Venue message:** "Curated art for your walls. Free. We handle everything."

**Trust message:** "Every artist reviewed. Every placement curated. No AI-generated work."

## Visual Direction

Clean, restrained, premium. Off-white backgrounds, near-black text, one muted accent colour. Modern serif headings, clean sans-serif body. Generous whitespace. Artwork images are the hero. No stock photography. Gallery-like layouts. Mobile-first.

## Trust and Conversion Framework

**For venues:** Free + no contract + insurance + approval process + venue photos.
**For artists:** Curation standards + roster quality + commission transparency + 30-day guarantee + comparison vs. alternatives.
**For buyers:** Stripe trust + clear pricing + artist story + fulfilment info.
**Pre-case-study period:** Artist roster quality, process descriptions, specific numbers, founder credibility, venue mockups.

## Build Roadmap

**Weeks 1-2:** Design system, homepage, For Venues, For Artists pages in Webflow. Set up Airtable, Typeform, Zapier, Stripe.

**Weeks 3-4:** Artist CMS collection and profile template. Browse page. How It Works, About, FAQs, Contact pages. Mobile responsive pass.

**Weeks 5-6:** Content population (first 10-20 artist profiles). Typeform > Airtable automation live. Stripe Payment Links for membership tiers created. QR card template designed. Testing, QA, launch.

**Month 2-3:** Real installation photos replace mockups. First testimonials added. Featured artist rotation on homepage.

**Month 4-6:** Case studies page added. Enhanced browse filters. Email automation sequences. Blog consideration.

**Month 6-9:** Artist dashboard (Softr or custom). Stripe Connect for automated payouts. Venue self-serve portal. Custom platform evaluation begins.
