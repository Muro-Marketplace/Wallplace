import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Acceptable Use and Content Standards",
  description:
    "What you may and may not post on Wallplace, how to report content, and what we do about it.",
};

// UK compliance audit, 10 September 2026, findings OSA-2 and DOC-1.
//
// Online Safety Act 2023 s.10 requires a regulated user-to-user service to
// have terms that specify how individuals are protected from illegal content,
// written clearly and accessibly, and to apply them consistently. Terms s.10
// listed prohibited conduct and stopped there: it said what a user must not
// do, and nothing about what we do when they do it.
//
// This page is that half. It is one page rather than the three or four a
// checklist would suggest (acceptable use, community guidelines, content
// standards, moderation policy), because a user with a problem should find one
// place that answers it.

const PROHIBITED = [
  {
    heading: "Illegal content",
    body: "Anything that is a criminal offence to share. That includes child sexual abuse material, terrorist content, threats to kill or cause serious harm, content that incites hatred or violence against a group, intimate images shared without the subject's consent, content encouraging serious self-harm or suicide, and the sale of goods it is unlawful to sell.",
  },
  {
    heading: "Work that is not yours",
    body: "Artwork you did not create, or that you do not hold the rights to sell. This includes copies, close derivatives of someone else's protected work, and images taken from another artist's listing or website.",
  },
  {
    heading: "AI-generated artwork",
    body: "Work produced in whole or in part by generative tools, even where it was later worked on by hand. This is a platform rule rather than a legal one, and it is the promise the whole marketplace is built on.",
  },
  {
    heading: "Fraud and misrepresentation",
    body: "Fake listings, artwork that is not as described, invented provenance, pretending to be another artist or venue, or any attempt to take payment for something you cannot supply.",
  },
  {
    heading: "Abuse of other users",
    body: "Harassment, threats, sustained unwanted contact, or abusive language in messages, profiles, blog posts or artwork descriptions.",
  },
  {
    heading: "Explicit or shocking material",
    body: "Pornographic content, and gratuitous depictions of violence or cruelty. Nudity in a genuine fine-art context is allowed; the test is whether the work is art or whether the platform is being used to distribute explicit material.",
  },
  {
    heading: "Misuse of the platform",
    body: "Scraping, automated collection of listings or contact details, attempts to interfere with the service, spam, and using messaging to move a transaction off the platform in breach of the Terms.",
  },
];

const ENFORCEMENT = [
  {
    step: "We look at it",
    body: "Every report reaches a person. Reports in an illegal-content category are marked and looked at ahead of the queue.",
  },
  {
    step: "We act on what we find",
    body: "Depending on what it is: we remove or restrict the content, warn the account, suspend it, or close it permanently. Where content is clearly or credibly illegal we remove it first and investigate afterwards.",
  },
  {
    step: "We tell the people involved",
    body: "The person who posted it is told what was removed and why, and how to challenge it. The person who reported it is told the outcome.",
  },
  {
    step: "We escalate where we must",
    body: "Some categories are reported to the relevant authority as well as actioned here. We will not tell an account holder that a report has been made where doing so would prejudice an investigation.",
  },
  {
    step: "We keep a record",
    body: "Every report, what we decided and why, and what we did, kept for at least six years.",
  },
];

export default function AcceptableUsePage() {
  return (
    <div className="bg-background">
      <section className="py-20 lg:py-24">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="max-w-3xl">
            <h1 className="text-4xl lg:text-5xl mb-4">Acceptable Use and Content Standards</h1>
            <p className="text-muted leading-relaxed mb-16">Last updated: September 2026</p>

            <div className="space-y-10">
              <div>
                <h2 className="text-2xl mb-4">What this covers</h2>
                <div className="space-y-3 text-muted leading-relaxed">
                  <p>
                    Wallplace hosts artwork, profiles, blog posts and private messages written by
                    the people who use it. This page sets out what may and may not be posted, how
                    to tell us about something, and what we do about it.
                  </p>
                  <p>
                    It forms part of our{" "}
                    <Link href="/terms" className="text-accent hover:underline">
                      Terms of Service
                    </Link>{" "}
                    and applies to everyone: artists, venues, buyers and visitors.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-2xl mb-4">What you must not post</h2>
                <div className="space-y-4">
                  {PROHIBITED.map(({ heading, body }) => (
                    <div key={heading} className="bg-surface border border-border rounded-sm p-5">
                      <h3 className="text-base font-medium mb-2">{heading}</h3>
                      <p className="text-sm text-muted leading-relaxed">{body}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-2xl mb-4">How to report something</h2>
                <div className="space-y-3 text-muted leading-relaxed">
                  <p>
                    <strong className="text-foreground">If you have an account:</strong> use the
                    Report link on any artwork, artist profile, venue profile or collection, or the
                    Report option inside a conversation. Pick the category that fits. You do not
                    have to explain it well; tell us what you saw.
                  </p>
                  <p>
                    <strong className="text-foreground">If you do not have an account,</strong> or
                    you are not the person the content is about, email{" "}
                    <a href="mailto:report@wallplace.co.uk" className="text-accent hover:underline">
                      report@wallplace.co.uk
                    </a>{" "}
                    with a link to the content and what is wrong with it. You do not need to be a
                    Wallplace user to report something to us.
                  </p>
                  <p>
                    <strong className="text-foreground">Copyright</strong> has its own process, with
                    its own evidence requirements and a route to challenge a removal. See our{" "}
                    <Link href="/ip-policy" className="text-accent hover:underline">
                      Intellectual Property and Takedown Policy
                    </Link>
                    .
                  </p>
                  <p>
                    <strong className="text-foreground">If someone is in immediate danger,</strong>{" "}
                    contact the police on 999. Tell us as well, but tell them first.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-2xl mb-4">What happens next</h2>
                <div className="space-y-4">
                  {ENFORCEMENT.map(({ step, body }) => (
                    <div key={step}>
                      <h3 className="text-base font-medium text-foreground mb-1">{step}</h3>
                      <p className="text-sm text-muted leading-relaxed">{body}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-2xl mb-4">How long we take</h2>
                <div className="space-y-3 text-muted leading-relaxed">
                  <p>
                    We acknowledge every report within 2 business days, and reports in an
                    illegal-content category on the same working day.
                  </p>
                  <p>
                    Where content is clearly or credibly illegal we remove or restrict it as soon as
                    we have looked at it, and investigate afterwards. Everything else we aim to
                    resolve within 10 business days, and we will tell you if it is going to take
                    longer.
                  </p>
                  <p>
                    We are a small team. These are the times we actually work to, not times chosen
                    to look good.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-2xl mb-4">If you think we got it wrong</h2>
                <div className="space-y-3 text-muted leading-relaxed">
                  <p>
                    If your content was removed or your account was restricted and you believe that
                    was a mistake, reply to the message we sent you, or email{" "}
                    <a href="mailto:complaints@wallplace.co.uk" className="text-accent hover:underline">
                      complaints@wallplace.co.uk
                    </a>
                    . Tell us what was removed and why you think the decision was wrong.
                  </p>
                  <p>
                    A different person reviews the appeal from the one who made the original
                    decision, wherever that is possible. If we were wrong we restore the content and
                    say so.
                  </p>
                  <p>
                    You can also complain about how we handled a report you made, including if we
                    did nothing. The full process, and the routes available to you if you are still
                    not satisfied, are in our{" "}
                    <Link href="/complaints" className="text-accent hover:underline">
                      Complaints Policy
                    </Link>
                    .
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-2xl mb-4">Repeat breaches</h2>
                <p className="text-muted leading-relaxed">
                  Copyright infringement is handled under the three-strike policy in our{" "}
                  <Link href="/ip-policy" className="text-accent hover:underline">
                    Intellectual Property and Takedown Policy
                  </Link>
                  . For everything else on this page: a first breach is usually a warning and a
                  removal, a second is a suspension, and a third is permanent closure. We will go
                  straight to closure for anything involving a child, a credible threat, or content
                  it is a criminal offence to share.
                </p>
              </div>

              <div>
                <h2 className="text-2xl mb-4">Age</h2>
                <p className="text-muted leading-relaxed">
                  Wallplace is for adults. You must be 18 or over to hold an account, and you
                  confirm that when you sign up. If we find an account belongs to someone under 18
                  we close it and delete the data held under it.
                </p>
              </div>

              <div>
                <h2 className="text-2xl mb-4">Contact</h2>
                <p className="text-muted leading-relaxed">
                  Reports:{" "}
                  <a href="mailto:report@wallplace.co.uk" className="text-accent hover:underline">
                    report@wallplace.co.uk
                  </a>
                  <br />
                  Complaints and appeals:{" "}
                  <a href="mailto:complaints@wallplace.co.uk" className="text-accent hover:underline">
                    complaints@wallplace.co.uk
                  </a>
                  <br />
                  Copyright:{" "}
                  <a href="mailto:legal@wallplace.co.uk" className="text-accent hover:underline">
                    legal@wallplace.co.uk
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
