import type { Metadata } from "next";
import Link from "next/link";
import { legalEntityName } from "@/lib/company";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What personal data Wallplace holds, why, for how long, who we share it with, and the rights you have over it.",
};

// UK compliance audit, 10 September 2026, finding DP-2.
//
// The previous version was last updated in March 2026 and described a
// different product: an application-and-enquiry site. It did not mention
// messaging, artwork uploads, Stripe, Stripe Connect, payouts, venue
// photographs, QR scan tracking, IP hashing, postcode lookup, referrals,
// moderation records or admin audit logs. It named no processor, had no
// international transfers section at all while the serverless functions run in
// the United States, gave one blanket retention period, and told the reader
// that technical data "is collected via cookies", which the Cookie Policy
// correctly denies.
//
// This rewrite is built from the data map in the audit rather than from the
// old text. The tables below are the honest answer to "what do you actually
// hold", and each row names the lawful basis for that purpose rather than
// listing four bases at the end and leaving the reader to guess.

const DATA_CATEGORIES = [
  {
    what: "Account details",
    detail: "Your email address, your password (stored only as a hash, never in a readable form), your display name and which kind of account you hold.",
    why: "To create and run your account and to sign you in.",
    basis: "Contract",
  },
  {
    what: "Artist profile",
    detail: "Your name or trading name, biography, discipline and style, links to your website and social accounts, your postcode and the approximate coordinates derived from it, your profile and banner images, and whether you are applying as an individual or a business.",
    why: "To publish your public profile, to let venues and buyers find you, and to show distance in local search.",
    basis: "Contract",
  },
  {
    what: "Venue profile",
    detail: "Your venue name, address, postcode, contact name, phone number and email, photographs of your space, and what kind of work you are looking for.",
    why: "To match you with artists and to arrange the practical side of a placement.",
    basis: "Contract",
  },
  {
    what: "Artwork and uploads",
    detail: "Images of artwork, titles, descriptions, dimensions, prices, and photographs of work hanging in a venue.",
    why: "To list work on the marketplace, to show it to venues and buyers, and to promote the platform.",
    basis: "Contract, and the licence in the Artist Agreement",
  },
  {
    what: "Messages",
    detail: "The content of messages you send to other users through the platform, and any files you attach to them.",
    why: "To deliver them, to let both parties refer back to what was agreed, and to investigate a report or a dispute.",
    basis: "Contract",
  },
  {
    what: "Orders and delivery",
    detail: "What you bought, what you paid, your name, delivery address and email, and the tracking information the artist supplies.",
    why: "To process the order, get the artwork to you, handle returns and refunds, and meet our tax and accounting obligations.",
    basis: "Contract, and legal obligation for the accounting record",
  },
  {
    what: "Payment details",
    detail: "None. Card numbers never reach Wallplace. Payment is handled on Stripe's own hosted checkout, and what comes back to us is the amount, the outcome and an identifier.",
    why: "So that we never hold your card details in the first place.",
    basis: "Not applicable",
  },
  {
    what: "Analytics",
    detail: "Page views and QR label scans, recorded server side. Each event carries a visitor identifier that is a SHA-256 hash of your IP address and browser user-agent combined with the current date, so it changes every day and cannot be linked back to you afterwards. No cookie, no identifier stored on your device, no third-party analytics service.",
    why: "To tell artists and venues how their work is performing, and to understand which parts of the site are used.",
    basis: "Legitimate interests: giving artists honest performance figures, which cannot be done without counting",
  },
  {
    what: "Contract acceptance record",
    detail: "Which version of which agreement you accepted, when, your email address, your IP address and your browser user-agent.",
    why: "So that a contract you entered into can be evidenced later.",
    basis: "Legitimate interests: being able to show what was agreed",
  },
  {
    what: "Email records",
    detail: "Which emails we sent you, when, whether they were delivered, and whether you unsubscribed or reported one as spam.",
    why: "To avoid sending you the same thing twice, to stop sending to an address that has bounced or complained, and to honour an unsubscribe.",
    basis: "Legitimate interests, and legal obligation under PECR to honour an opt-out",
  },
  {
    what: "Marketing preferences",
    detail: "Whether you asked for tips, recommendations, the newsletter or offers.",
    why: "So we only send what you asked for.",
    basis: "Consent",
  },
  {
    what: "Reports, disputes and moderation records",
    detail: "What was reported, by whom, about what, what we decided and why.",
    why: "To keep the platform safe, to handle disputes, and to keep the records the Online Safety Act expects us to keep.",
    basis: "Legitimate interests, and legal obligation",
  },
  {
    what: "Support messages",
    detail: "What you write to us and the email address you write from.",
    why: "To answer you.",
    basis: "Legitimate interests",
  },
] as const;

const PROCESSORS = [
  {
    name: "Supabase",
    role: "Database, sign-in and file storage",
    where: "Ireland (EU), with support access from the United States",
  },
  {
    name: "Vercel",
    role: "Hosting, and the servers that run the site's code",
    where: "United States",
  },
  {
    name: "Stripe",
    role: "Payments, subscriptions and artist payouts",
    where: "Ireland and the United States",
  },
  {
    name: "Resend",
    role: "Sending email",
    where: "United States",
  },
  {
    name: "postcodes.io",
    role: "Turning a postcode into approximate coordinates",
    where: "United Kingdom",
  },
] as const;

const RETENTION = [
  { what: "Your account and profile", how: "While your account is open, then removed when you close it" },
  { what: "Artwork images and other uploads", how: "While listed, then removed when you close your account" },
  { what: "Messages", how: "While your account is open" },
  { what: "Orders, refunds and payout records", how: "7 years, for tax and accounting. Your name, address and email inside them are removed if you close your account" },
  { what: "Analytics events", how: "24 months" },
  { what: "Email send records", how: "24 months" },
  { what: "Abandoned checkouts", how: "1 month after they expire" },
  { what: "Artist applications and venue registrations that went nowhere", how: "12 months" },
  { what: "Waitlist signups", how: "18 months" },
  { what: "Support messages and enquiries", how: "24 months" },
  { what: "Contract acceptance records", how: "7 years. The IP address and user-agent are cleared at that point and the acceptance itself is kept" },
  { what: "Reports, moderation decisions and admin actions", how: "At least 6 years" },
] as const;

const RIGHTS = [
  { right: "Access", desc: "Ask for a copy of what we hold. There is a button in your account settings that produces it immediately." },
  { right: "Rectification", desc: "Correct anything inaccurate. Most of it you can edit yourself." },
  { right: "Erasure", desc: "Ask us to delete your data. There is a button for this too, and it clears your uploads as well as your records." },
  { right: "Restriction", desc: "Ask us to stop using your data while a question about it is resolved." },
  { right: "Portability", desc: "Receive the data you gave us in a machine-readable format. The export button produces JSON." },
  { right: "Objection", desc: "Object to anything we do on the basis of legitimate interests, including our analytics." },
  { right: "Withdraw consent", desc: "Turn off marketing at any time, in your account settings or from the link in any marketing email." },
] as const;

export default function PrivacyPage() {
  return (
    <div className="bg-background">
      <section className="py-20 lg:py-24">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="max-w-3xl">
            <h1 className="text-4xl lg:text-5xl mb-4">Privacy Policy</h1>
            <p className="text-muted leading-relaxed mb-16">Last updated: September 2026</p>

            <div className="space-y-10">
              <div>
                <h2 className="text-2xl mb-4">1. Who we are</h2>
                <div className="space-y-3 text-muted leading-relaxed">
                  <p>
                    {legalEntityName()} (&ldquo;Wallplace&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;)
                    runs wallplace.co.uk, a marketplace connecting artists with commercial venues and
                    with buyers. We are the data controller for the personal information described
                    here.
                  </p>
                  <p>
                    Reach us at{" "}
                    <a href="mailto:privacy@wallplace.co.uk" className="text-accent hover:underline">
                      privacy@wallplace.co.uk
                    </a>
                    . We do not have a Data Protection Officer, and are not required to appoint one.
                  </p>
                  <p>
                    Two things this policy does not cover. When you buy artwork, the seller is the
                    artist, and what they do with your delivery address once we pass it to them is
                    their responsibility as a controller in their own right. And when you follow a
                    link from Wallplace to an artist&rsquo;s own website or social account, you are on
                    their site under their policy.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-2xl mb-4">2. What we hold, why, and on what basis</h2>
                <p className="text-muted leading-relaxed mb-6">
                  This is the whole list. If something is not here, we do not hold it.
                </p>
                <div className="space-y-4">
                  {DATA_CATEGORIES.map(({ what, detail, why, basis }) => (
                    <div key={what} className="bg-surface border border-border rounded-sm p-5">
                      <h3 className="text-base font-medium mb-2">{what}</h3>
                      <p className="text-sm text-muted leading-relaxed">{detail}</p>
                      <p className="text-sm text-muted leading-relaxed mt-2">
                        <span className="text-foreground">Why:</span> {why}
                      </p>
                      <p className="text-xs text-muted mt-2">
                        <span className="uppercase tracking-wider">Lawful basis:</span> {basis}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-muted leading-relaxed mt-6">
                  We do not knowingly collect special category data, which means data about health,
                  race, religion, politics, sex life, sexual orientation, trade union membership,
                  genetics or biometrics. We do not ask for any of it, and we use no facial
                  recognition or other biometric identification anywhere on the platform.
                </p>
              </div>

              <div>
                <h2 className="text-2xl mb-4">3. What we do not do</h2>
                <ul className="space-y-2">
                  {[
                    "We do not sell your personal information, and never have.",
                    "We do not use advertising cookies, tracking pixels or third-party analytics. There is no Meta Pixel, no Google Analytics, no Google Ads tag, no TikTok pixel, no Hotjar, no Clarity, no PostHog and no Sentry on this site.",
                    "We do not build a profile of you for advertising or share your data with advertisers.",
                    "We do not use AI anywhere in the product. Nothing you write, upload or send is passed to a model, and nothing is used to train one.",
                    "We do not make any decision about you by purely automated means that has a legal or similarly significant effect. Artist applications are reviewed by a person.",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-muted">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h2 className="text-2xl mb-4">4. Who else sees it</h2>
                <div className="space-y-3 text-muted leading-relaxed">
                  <p>
                    <strong className="text-foreground">Other users, by design.</strong> An artist
                    profile and its artwork are public. A venue&rsquo;s identity and contact details are
                    shown only to users who are entitled to see them, and are hidden from anonymous
                    visitors. When you message someone, they see your message and your display name.
                    When you buy, the artist gets your name, delivery address and email, because they
                    are the one posting the artwork to you.
                  </p>
                  <p>
                    <strong className="text-foreground">Service providers.</strong> These are the
                    only companies that process personal data on our behalf, each under a data
                    processing agreement:
                  </p>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm border border-border rounded-sm overflow-hidden">
                    <thead>
                      <tr className="bg-surface border-b border-border">
                        <th className="text-left py-3 px-4 text-xs font-medium text-muted uppercase tracking-wider">Who</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-muted uppercase tracking-wider">What they do</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-muted uppercase tracking-wider">Where</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PROCESSORS.map((p, i) => (
                        <tr key={p.name} className={`border-b border-border/60 ${i % 2 === 0 ? "bg-background" : "bg-surface"}`}>
                          <td className="py-3 px-4 text-foreground text-xs font-medium">{p.name}</td>
                          <td className="py-3 px-4 text-muted text-xs">{p.role}</td>
                          <td className="py-3 px-4 text-muted text-xs">{p.where}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3 text-muted leading-relaxed mt-4">
                  <p>
                    <strong className="text-foreground">Everyone else, only when we have to.</strong>{" "}
                    Our accountant and, if we ever need one, our solicitor. The police or a regulator
                    where the law requires it or where someone is at risk. And a buyer of the
                    business, if Wallplace is ever sold, in which case we would tell you first.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-2xl mb-4">5. Sending data outside the UK</h2>
                <div className="space-y-3 text-muted leading-relaxed">
                  <p>
                    Some of our providers are outside the United Kingdom, so some of your data is
                    processed abroad. We are telling you this plainly rather than burying it, because
                    it is a real thing that happens to your data.
                  </p>
                  <p>
                    <strong className="text-foreground">Ireland and the EEA.</strong> Our database and
                    file storage sit in Ireland. The UK government recognises the EEA as providing an
                    adequate level of protection, so no additional safeguard is needed for those
                    transfers.
                  </p>
                  <p>
                    <strong className="text-foreground">The United States.</strong> The servers that
                    run the site&rsquo;s code, and the service that sends our email, are based in the
                    United States. Those transfers are covered by the UK International Data Transfer
                    Addendum to the European Commission&rsquo;s standard contractual clauses, which is
                    the mechanism UK law provides for exactly this. We have assessed the risk of each
                    transfer and keep that assessment under review.
                  </p>
                  <p>
                    If you want to see the safeguards for a particular transfer, email{" "}
                    <a href="mailto:privacy@wallplace.co.uk" className="text-accent hover:underline">
                      privacy@wallplace.co.uk
                    </a>{" "}
                    and we will send them to you.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-2xl mb-4">6. How long we keep it</h2>
                <p className="text-muted leading-relaxed mb-4">
                  These periods are enforced by a job that runs every night, not by anyone
                  remembering. The full schedule, including the reasoning behind each period, is
                  published in our repository.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm border border-border rounded-sm overflow-hidden">
                    <thead>
                      <tr className="bg-surface border-b border-border">
                        <th className="text-left py-3 px-4 text-xs font-medium text-muted uppercase tracking-wider">What</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-muted uppercase tracking-wider">How long</th>
                      </tr>
                    </thead>
                    <tbody>
                      {RETENTION.map((r, i) => (
                        <tr key={r.what} className={`border-b border-border/60 ${i % 2 === 0 ? "bg-background" : "bg-surface"}`}>
                          <td className="py-3 px-4 text-foreground text-xs">{r.what}</td>
                          <td className="py-3 px-4 text-muted text-xs">{r.how}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-muted leading-relaxed mt-4">
                  Two things survive an account deletion, and it is worth saying why. Financial
                  records are kept because we are required to keep them, with your name, address and
                  email removed from them. And if you ever reported an email of ours as spam, we keep
                  the record of that address having opted out, because deleting it would let a new
                  signup start mailing you again.
                </p>
              </div>

              <div>
                <h2 className="text-2xl mb-4">7. Keeping it safe</h2>
                <div className="space-y-3 text-muted leading-relaxed">
                  <p>
                    Everything travels over an encrypted connection, and the database and file
                    storage are encrypted at rest. Passwords are stored only as a hash, so nobody at
                    Wallplace can see yours.
                  </p>
                  <p>
                    Access to data is restricted at the database level, row by row, so one user
                    cannot read another&rsquo;s records even if something goes wrong in the application.
                    Files you send inside a private conversation, and photographs of a venue&rsquo;s
                    interior, are held in private storage and served through short-lived links that
                    are issued only to someone entitled to see them.
                  </p>
                  <p>
                    No system is perfectly secure and we are not going to claim otherwise. If there
                    is ever a breach affecting your data we will tell the ICO within 72 hours where
                    the law requires it, and we will tell you directly where there is a high risk to
                    you.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-2xl mb-4">8. Cookies and browser storage</h2>
                <p className="text-muted leading-relaxed">
                  Wallplace sets no cookies at all. It uses a small amount of your browser&rsquo;s local
                  storage to keep you signed in and to hold your basket, and nothing else. Our
                  analytics run on the server and place nothing on your device. The full list of what
                  is stored is in our{" "}
                  <Link href="/cookies" className="text-accent hover:underline">
                    Cookie Policy
                  </Link>
                  .
                </p>
              </div>

              <div>
                <h2 className="text-2xl mb-4">9. Marketing</h2>
                <div className="space-y-3 text-muted leading-relaxed">
                  <p>
                    Marketing email is off unless you turn it on. There is an unticked box at signup
                    and a set of switches in your account settings, and you can change your mind at
                    any time from there or from the unsubscribe link in any marketing email.
                  </p>
                  <p>
                    Some email is not marketing and keeps coming: your order confirmations, delivery
                    updates, payout notices, password resets, security notices, and messages about a
                    placement or an offer you are part of. Those are how the service works, and there
                    is no way to run your account without them. If you want them to stop, close your
                    account.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-2xl mb-4">10. Your rights</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {RIGHTS.map(({ right, desc }) => (
                    <div key={right} className="bg-surface border border-border rounded-sm p-4">
                      <p className="text-sm font-medium text-foreground mb-1">{right}</p>
                      <p className="text-xs text-muted leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-3 text-muted leading-relaxed mt-4">
                  <p>
                    Most of these you can exercise yourself from your account settings, immediately
                    and without asking us. For anything else, email{" "}
                    <a href="mailto:privacy@wallplace.co.uk" className="text-accent hover:underline">
                      privacy@wallplace.co.uk
                    </a>
                    . We respond within one month. If a request is complicated we may take up to two
                    months longer, and if so we will tell you inside the first month and say why.
                    None of this costs you anything.
                  </p>
                  <p>
                    <strong className="text-foreground">If you are unhappy with us.</strong> Tell us
                    first, at the address above, and we will acknowledge it within 30 days and deal
                    with it. You also have the right to complain to the Information
                    Commissioner&rsquo;s Office at{" "}
                    <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                      ico.org.uk
                    </a>{" "}
                    or on 0303 123 1113, and you do not have to come to us first to do that.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-2xl mb-4">11. Children</h2>
                <p className="text-muted leading-relaxed">
                  Wallplace is for adults. You must be 18 or over to hold an account and you confirm
                  that when you sign up. We have assessed whether the service is likely to be
                  accessed by children and concluded that it is not, and we keep that assessment
                  under review. If we find an account belongs to someone under 18 we close it and
                  delete the data held under it.
                </p>
              </div>

              <div>
                <h2 className="text-2xl mb-4">12. Changes to this policy</h2>
                <p className="text-muted leading-relaxed">
                  When we change something that matters we will email you if we hold your address,
                  and post a notice on the site. The date at the top says when it was last revised.
                  We will not make a change that reduces your rights without telling you first.
                </p>
              </div>

              <div>
                <h2 className="text-2xl mb-4">13. Contact</h2>
                <div className="mt-4 bg-surface border border-border rounded-sm p-6">
                  <p className="text-sm text-foreground font-medium">{legalEntityName()}</p>
                  <p className="text-sm text-muted mt-1">London, United Kingdom</p>
                  <a
                    href="mailto:privacy@wallplace.co.uk"
                    className="text-sm text-accent hover:underline mt-1 block"
                  >
                    privacy@wallplace.co.uk
                  </a>
                  <p className="text-xs text-muted mt-3">
                    If you need a postal address for a formal request, email us and we will provide
                    it.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
