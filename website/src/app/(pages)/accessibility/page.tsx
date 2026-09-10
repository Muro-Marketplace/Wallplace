import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Accessibility",
  description:
    "How accessible Wallplace is, what we know is not good enough yet, and how to tell us when something does not work for you.",
};

// UK compliance audit, 10 September 2026, finding A11Y-2.
//
// The Public Sector Bodies (Websites and Mobile Applications) Accessibility
// Regulations 2018 do not apply to Wallplace: they bind public sector bodies.
// What does apply is the Equality Act 2010, s.29 (not discriminating in the
// provision of a service) and s.20 (the anticipatory duty to make reasonable
// adjustments, which means anticipating disabled users rather than waiting for
// a complaint).
//
// So this page is not a statutory accessibility statement. It is the cheapest
// available evidence that the duty was considered, and it is honest about what
// is not done, because a statement that claims full conformance and is wrong is
// worse than no statement at all.

export default function AccessibilityPage() {
  return (
    <div className="bg-background">
      <section className="py-20 lg:py-24">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="max-w-3xl">
            <h1 className="text-4xl lg:text-5xl mb-4">Accessibility</h1>
            <p className="text-muted leading-relaxed mb-16">Last updated: September 2026</p>

            <div className="space-y-10">
              <div>
                <h2 className="text-2xl mb-4">What we aim for</h2>
                <div className="space-y-3 text-muted leading-relaxed">
                  <p>
                    We build Wallplace to meet the Web Content Accessibility Guidelines 2.2 at level
                    AA. That is the benchmark we test against and the one we treat as the standard,
                    whether or not a particular page has been checked yet.
                  </p>
                  <p>
                    We are not claiming full conformance. Below is what we have actually tested and
                    what we know is still short.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-2xl mb-4">What is in place</h2>
                <ul className="space-y-2">
                  {[
                    "Every image carries a text alternative. Artwork uses the work's title and, where the artist has written one, its description.",
                    "The whole site works from the keyboard, and focus is visible as you move through it.",
                    "Buttons and links are at least 44 pixels tall, so they are usable on a phone and by anyone with limited fine motor control.",
                    "Text reflows down to a narrow screen and up to 200% zoom without losing content.",
                    "Forms have real labels, and errors say what went wrong and how to fix it rather than only marking a field red.",
                    "Colour is never the only way something is communicated.",
                    "Animation respects your operating system's reduced-motion setting.",
                    "Automated checks for critical and serious issues run on every change, using axe-core.",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-muted">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h2 className="text-2xl mb-4">What we know is not good enough yet</h2>
                <div className="space-y-4">
                  <div className="bg-surface border border-border rounded-sm p-5">
                    <h3 className="text-base font-medium mb-2">
                      The signed-in portals are less well tested than the public pages
                    </h3>
                    <p className="text-sm text-muted leading-relaxed">
                      Our automated checks cover the public pages. The artist, venue and customer
                      portals are checked by hand rather than on every change. That is the wrong way
                      round, given they are where people spend their time, and it is what we are
                      fixing next.
                    </p>
                  </div>
                  <div className="bg-surface border border-border rounded-sm p-5">
                    <h3 className="text-base font-medium mb-2">
                      Artwork descriptions are shorter than they should be
                    </h3>
                    <p className="text-sm text-muted leading-relaxed">
                      On an art marketplace the image is the product, so a title is a thin
                      substitute for it. We are moving to a written description of every work, and
                      in the meantime a screen reader gets the title, the medium, the dimensions and
                      whatever the artist wrote about the piece.
                    </p>
                  </div>
                  <div className="bg-surface border border-border rounded-sm p-5">
                    <h3 className="text-base font-medium mb-2">
                      The wall visualiser is visual by nature
                    </h3>
                    <p className="text-sm text-muted leading-relaxed">
                      Arranging artwork on a wall by dragging it is not something we can make work
                      well without sight. Every artwork it uses is available on its own listing
                      page, which is fully accessible, and we will lay out a wall for you if you ask.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-2xl mb-4">If something does not work for you</h2>
                <div className="space-y-3 text-muted leading-relaxed">
                  <p>
                    Email{" "}
                    <a href="mailto:hello@wallplace.co.uk" className="text-accent hover:underline">
                      hello@wallplace.co.uk
                    </a>{" "}
                    and tell us what you were trying to do and what happened. You do not need to
                    know the technical name for the problem.
                  </p>
                  <p>
                    We will reply within 5 business days. If we cannot fix it quickly we will tell
                    you when we can, and we will do the thing you were trying to do for you in the
                    meantime.
                  </p>
                  <p>
                    If you are not satisfied with our response you can raise it under our{" "}
                    <Link href="/complaints" className="text-accent hover:underline">
                      Complaints Policy
                    </Link>
                    , and you have rights under the Equality Act 2010 which nothing on this page
                    affects.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-2xl mb-4">How this page is kept honest</h2>
                <p className="text-muted leading-relaxed">
                  We review it whenever we ship something that changes how the site is navigated,
                  and at least once a year. If you find something on this page that is no longer
                  true, in either direction, please tell us.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
