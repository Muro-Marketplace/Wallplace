import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Returns and Refunds",
  description:
    "Wallplace Returns & Refunds Policy. Your rights, how to return artwork, and how refunds are processed.",
};

export default function ReturnsPage() {
  return (
    <div className="bg-background">
      <section className="py-20 lg:py-24">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="max-w-3xl">
            <h1 className="text-4xl lg:text-5xl mb-4">Returns &amp; Refunds</h1>
            <p className="text-muted leading-relaxed mb-16">Last updated: September 2026</p>

            <div className="space-y-10">
              <div>
                <h2 className="text-2xl mb-4">Your Right to Cancel</h2>
                <div className="space-y-3 text-muted leading-relaxed">
                  <p>Under the Consumer Contracts Regulations 2013, you can cancel your order for any reason from the moment you place it until 14 days after you receive the artwork. This is your statutory cooling-off period, and you do not have to give a reason.</p>
                  <p>To cancel, contact the artist through the platform or email <a href="mailto:hello@wallplace.co.uk" className="text-accent hover:underline">hello@wallplace.co.uk</a> with your order number. Any clear statement that you are cancelling is enough.</p>
                  <p><strong className="text-foreground">Exceptions:</strong> Bespoke or personalised artwork (e.g. commissions made to your specification) is exempt from the 14-day cooling-off period.</p>
                </div>
              </div>

              <div>
                <h2 className="text-2xl mb-4">How to Return</h2>
                <div className="text-muted leading-relaxed">
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Tell the artist or Wallplace you are cancelling, at any point up to 14 days after you receive the artwork</li>
                    <li>Send the artwork back within 14 days of telling us, in its original condition and packaging, at your own cost (unless it is faulty or was not as described, in which case we cover the return)</li>
                    <li>The artist refunds you within 14 days of either receiving the artwork back or you showing you have sent it, whichever happens first</li>
                    <li>The refund includes what you paid for standard outbound delivery. If you chose a faster or more expensive delivery option, the refund covers the standard rate rather than the upgrade</li>
                  </ul>
                </div>
              </div>

              <div>
                <h2 className="text-2xl mb-4">Faulty or Misdescribed Goods</h2>
                <p className="text-muted leading-relaxed">Under the Consumer Rights Act 2015, you have additional rights if your artwork is faulty or not as described. You may be entitled to a repair, replacement, or refund. Contact <a href="mailto:hello@wallplace.co.uk" className="text-accent hover:underline">hello@wallplace.co.uk</a> or use the Request Refund option in your account dashboard.</p>
              </div>

              <div>
                <h2 className="text-2xl mb-4">Requesting a Refund</h2>
                <div className="space-y-3 text-muted leading-relaxed">
                  <p>You can request a refund directly from your account:</p>
                  <ol className="list-decimal pl-6 space-y-2">
                    <li>Go to My Orders in your customer portal</li>
                    <li>Select the order</li>
                    <li>Click &ldquo;Request Refund&rdquo;</li>
                    <li>Choose full or partial refund and describe the reason</li>
                    <li>The artist will review and respond to your request</li>
                  </ol>
                </div>
              </div>

              <div>
                <h2 className="text-2xl mb-4">Refund Timeframes</h2>
                <div className="text-muted leading-relaxed">
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Refund requests are typically reviewed within 5 business days</li>
                    <li>Approved refunds are processed via Stripe and appear on your statement within 5 to 10 business days</li>
                    <li>If a refund request is rejected, you will receive a reason and can escalate via our <a href="/complaints" className="text-accent hover:underline">dispute resolution process</a></li>
                  </ul>
                </div>
              </div>

              <div>
                <h2 className="text-2xl mb-4">Damaged in Transit</h2>
                <p className="text-muted leading-relaxed">If your artwork arrives damaged, photograph the packaging and the damage before you unpack any further, and tell the artist and Wallplace as soon as you can. Getting in touch within 48 hours helps a great deal, because the courier&rsquo;s own claim windows are short, but it is not a deadline on your rights: risk stays with the seller until the artwork reaches you, and your Consumer Rights Act 2015 rights are not affected by how quickly you report it.</p>
              </div>

              <div>
                <h2 className="text-2xl mb-4">If We Cannot Resolve Your Complaint</h2>
                <p className="text-muted leading-relaxed">
                  If we cannot resolve your complaint directly, you may refer it to an accredited alternative dispute resolution (ADR) provider, such as the Centre for Effective Dispute Resolution (<a href="https://www.cedr.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">cedr.com</a>). Wallplace is not a member of any ADR scheme, so a provider may charge a fee or decline the case. ADR for consumer contract disputes is governed by Part 4 Chapter 4 of the Digital Markets, Competition and Consumers Act 2024, which replaced the 2015 Regulations from 6 April 2026. You keep all your statutory rights and can take legal action through the courts of England and Wales instead.
                </p>
                <p className="text-muted leading-relaxed mt-3">
                  Our full formal process is set out in our <a href="/complaints" className="text-accent hover:underline">Complaints Policy</a>.
                </p>
              </div>

              <div>
                <h2 className="text-2xl mb-4">Contact</h2>
                <p className="text-muted leading-relaxed">
                  For any returns or refund queries: <a href="mailto:hello@wallplace.co.uk" className="text-accent hover:underline">hello@wallplace.co.uk</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
