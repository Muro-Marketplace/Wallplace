import { Metadata } from "next";
import Button from "@/components/Button";
import Accordion from "@/components/Accordion";

export const metadata: Metadata = {
  title: "For Venues — Muro",
  description:
    "Discover original artwork for your space. Browse curated artist portfolios, filter by style and location, and enquire directly. Free for independent venues.",
};

const freeBenefits = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="22" height="18" rx="2" />
        <path d="M3 17l6-6 4 4 4-6 8 8" />
      </svg>
    ),
    title: "Browse artist portfolios",
    description:
      "Explore curated photography and original artwork from independent artists.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <path d="M16.5 16.5L22 22" />
      </svg>
    ),
    title: "Filter by location, style & theme",
    description:
      "Find work that suits your interior and clientele. Filter by medium, style, theme, size, and commercial availability.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20l4-4 4 4 4-4 4 4" />
        <rect x="3" y="4" width="22" height="16" rx="2" />
      </svg>
    ),
    title: "Post your space",
    description:
      "Create a venue profile to attract artist interest. Let artists come to you.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H9l-4 4V7a2 2 0 012-2h12a2 2 0 012 2z" />
      </svg>
    ),
    title: "Enquire directly",
    description:
      "Submit enquiries to artists whose work interests you. Arrange everything directly.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="8" height="8" rx="1" />
        <path d="M16 6h8M16 10h8M4 18h20M4 22h14" />
      </svg>
    ),
    title: "Sales handled by QR",
    description:
      "Customers scan a QR card to buy. Revenue share between you and the artist is optional and arranged directly.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12l3 3 7-7" />
        <circle cx="14" cy="14" r="11" />
      </svg>
    ),
    title: "Free, always",
    description:
      "Browsing and enquiring is free for venues. Funded by artist memberships.",
  },
];

const premiumBenefits = [
  "Professional curation for your space",
  "AI-powered search and recommendations",
  "AI visualiser — see artwork on your wall before committing",
  "Curated shortlists tailored to your venue",
  "Optional installation packages (paid add-on)",
  "Priority access to new artists",
  "Premium support",
];

const steps = [
  {
    number: "01",
    title: "Create your profile",
    description: "Tell us about your space in 2 minutes. Style, size, vibe, and what you're looking for.",
  },
  {
    number: "02",
    title: "Browse portfolios",
    description: "Filter by location, style, theme, and commercial availability. Discover work that fits.",
  },
  {
    number: "03",
    title: "Enquire directly",
    description: "Send an enquiry to artists whose work interests you. No middleman.",
  },
  {
    number: "04",
    title: "Arrange with the artist",
    description: "Agree terms, arrange delivery or collection, and get the work on your walls.",
  },
];

const venues = [
  {
    caption: "Independent café, Peckham",
    gradient: "from-amber-200/60 via-orange-100/40 to-stone-200/60",
  },
  {
    caption: "Wine bar, Bermondsey",
    gradient: "from-rose-200/50 via-amber-100/40 to-stone-200/60",
  },
  {
    caption: "Brunch spot, Hackney",
    gradient: "from-teal-100/40 via-amber-100/40 to-stone-200/60",
  },
];

const faqItems = [
  {
    question: "Is it really free?",
    answer:
      "Yes. Browsing portfolios, filtering artists, posting your space, and submitting enquiries are all free. Muro is funded by artist memberships.",
  },
  {
    question: "Do you handle installation?",
    answer:
      "Installation is not included as standard — it's an optional paid add-on available through our Premium tier (coming soon). For free tier users, delivery and installation are arranged directly between you and the artist.",
  },
  {
    question: "What if I don't like the art?",
    answer:
      "You choose the work you enquire about. You're never sent artwork you haven't selected. If something isn't working after placement, you speak directly with the artist.",
  },
  {
    question: "Will it damage my walls?",
    answer:
      "That's between you and the artist. We recommend discussing hanging methods before agreeing to a placement. Many artists use non-invasive fixings.",
  },
  {
    question: "What do my staff need to do?",
    answer:
      "Point to the QR card if a customer asks. The artist provides this. Sales are handled automatically through Muro's payment infrastructure.",
  },
  {
    question: "How does revenue share work?",
    answer:
      "Revenue share is an optional arrangement between you and the artist. A common split is 10% to the venue on any sale made from your space. You agree this directly when arranging placement.",
  },
  {
    question: "Is there a contract?",
    answer:
      "No. Just a simple agreement between you and the artist. Two weeks' notice to end at any time.",
  },
];

const neighbourhoods = [
  "Peckham",
  "Bermondsey",
  "Hackney",
  "Shoreditch",
  "Brixton",
  "Dalston",
  "Deptford",
  "Camberwell",
];

export default function VenuesPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-24 lg:py-32">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl tracking-tight">
              Discover art for your space.
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-muted leading-relaxed max-w-xl">
              Browse portfolios from our curated independent artists.
              Filter by style, theme, and location. Enquire directly.
              No curation fee. No middleman. Free to use.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Button href="/browse" size="lg">
                Browse Portfolios
              </Button>
              <Button href="/get-art" size="lg" variant="secondary">
                Post Your Space
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Free Tier — What You Get */}
      <section className="py-20 lg:py-24">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="mb-10">
            <span className="text-xs font-medium text-accent uppercase tracking-wider">Free tier</span>
            <h2 className="text-3xl md:text-4xl mt-2">What you get for free</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {freeBenefits.map((benefit) => (
              <div
                key={benefit.title}
                className="bg-surface border border-border rounded-sm p-7 hover:shadow-sm transition-shadow duration-300"
              >
                <div className="text-accent mb-4">{benefit.icon}</div>
                <h3 className="text-lg mb-2">{benefit.title}</h3>
                <p className="text-muted text-sm leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 lg:py-24 bg-surface border-y border-border">
        <div className="max-w-[1200px] mx-auto px-6">
          <h2 className="text-3xl md:text-4xl mb-14">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
            {steps.map((step) => (
              <div key={step.number}>
                <span className="text-accent text-sm font-medium tracking-wider">
                  {step.number}
                </span>
                <h3 className="text-xl mt-2 mb-3">{step.title}</h3>
                <p className="text-muted text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-14 flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <p className="text-muted text-sm italic">
              Total time to get started: under 5 minutes.
            </p>
            <Button href="/browse" size="lg">
              Browse Portfolios
            </Button>
          </div>
        </div>
      </section>

      {/* Venue Photos */}
      <section className="py-20 lg:py-24">
        <div className="max-w-[1200px] mx-auto px-6">
          <h2 className="text-3xl md:text-4xl mb-14">Where art goes up</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {venues.map((venue) => (
              <div key={venue.caption} className="group">
                <div
                  className={`aspect-[4/3] rounded-sm bg-gradient-to-br ${venue.gradient} flex items-end p-6`}
                >
                  <div className="w-full">
                    <div className="w-16 h-20 bg-white/60 rounded-sm mb-3 border border-white/40" />
                    <div className="w-24 h-16 bg-white/50 rounded-sm border border-white/30 ml-auto -mt-12" />
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted">{venue.caption}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Premium Tier */}
      <section className="py-20 lg:py-24 bg-surface border-y border-border">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="max-w-2xl">
            <span className="text-xs font-medium text-accent uppercase tracking-wider">Coming soon</span>
            <h2 className="text-3xl md:text-4xl mt-2 mb-4">Premium for venues</h2>
            <p className="text-muted leading-relaxed mb-8">
              For venues that want a more hands-on curation experience. Premium adds AI-powered tools,
              a dedicated curator, and optional installation support.
            </p>
            <ul className="space-y-3 mb-8">
              {premiumBenefits.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-foreground/80">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-accent mt-0.5 shrink-0"
                  >
                    <path d="M3 8.5l3.5 3.5L13 4" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <Button href="/contact" size="md" variant="secondary">
              Contact Us to Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Revenue Share */}
      <section className="py-20 lg:py-24">
        <div className="max-w-[1200px] mx-auto px-6">
          <h2 className="text-3xl md:text-4xl mb-10">
            Optional: earn from your walls
          </h2>
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3 text-sm md:text-base mb-8">
              <span className="bg-surface border border-border rounded-sm px-4 py-2">
                Customer sees art
              </span>
              <span className="text-muted">&rarr;</span>
              <span className="bg-surface border border-border rounded-sm px-4 py-2">
                Scans QR
              </span>
              <span className="text-muted">&rarr;</span>
              <span className="bg-surface border border-border rounded-sm px-4 py-2">
                Buys through Muro
              </span>
              <span className="text-muted">&rarr;</span>
              <span className="bg-accent/10 border border-accent/30 text-accent rounded-sm px-4 py-2 font-medium">
                You share in the sale
              </span>
            </div>
            <p className="text-muted leading-relaxed">
              Revenue share is optional and agreed directly between you and the artist when arranging
              a placement. A common arrangement is 10% to the venue on any sale made from your space.
              Your walls are already earning nothing &mdash; this is a way to change that.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 lg:py-24 bg-surface border-y border-border">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl mb-10 text-center">
              Common questions
            </h2>
            <Accordion items={faqItems} />
          </div>
        </div>
      </section>

      {/* Who We Work With */}
      <section className="py-20 lg:py-24">
        <div className="max-w-[1200px] mx-auto px-6">
          <h2 className="text-3xl md:text-4xl mb-6">Who we work with</h2>
          <p className="text-muted leading-relaxed max-w-xl mb-8">
            Independent cafés, restaurants, wine bars, hotels, offices, and salons — and growing.
          </p>
          <div className="flex flex-wrap gap-2">
            {neighbourhoods.map((hood) => (
              <span
                key={hood}
                className="bg-background border border-border rounded-full px-4 py-1.5 text-sm text-foreground/80"
              >
                {hood}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 lg:py-32 border-t border-border">
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl mb-6">
            Discover art for your space. Free.
          </h2>
          <p className="text-muted max-w-lg mx-auto mb-10 leading-relaxed">
            Browse portfolios, filter by style, and enquire directly with artists.
            No curation fee. No contract.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button href="/browse" size="lg">
              Browse Portfolios
            </Button>
            <Button href="/get-art" size="lg" variant="secondary">
              Post Your Space
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
