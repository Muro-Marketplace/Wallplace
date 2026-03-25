"use client";

import ArtistPortalLayout from "@/components/ArtistPortalLayout";
import Button from "@/components/Button";

const billingHistory = [
  {
    date: "1 Mar 2026",
    description: "Premium membership — March 2026",
    amount: "£29.99",
    status: "Paid",
  },
  {
    date: "1 Feb 2026",
    description: "Premium membership — February 2026",
    amount: "£29.99",
    status: "Paid",
  },
  {
    date: "1 Jan 2026",
    description: "Premium membership — January 2026",
    amount: "£29.99",
    status: "Paid",
  },
];

export default function BillingPage() {
  return (
    <ArtistPortalLayout activePath="/artist-portal/billing">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl">Billing</h1>
      </div>

      {/* Current plan */}
      <div className="bg-surface border border-border rounded-sm p-6 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-medium">Premium</h2>
              <span className="text-xs font-medium bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
            <p className="text-sm text-muted">£29.99/month · 5% platform fee on sales</p>
          </div>
          <div className="flex gap-2">
            <Button href="#" variant="secondary" size="sm">
              Change Plan
            </Button>
            <Button href="#" variant="ghost" size="sm">
              Cancel
            </Button>
          </div>
        </div>

        {/* Trial banner */}
        <div className="bg-accent/8 border border-accent/20 rounded-sm px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-accent flex-shrink-0">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.25" />
              <path d="M7 4v3.5L9 9" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
            </svg>
            <p className="text-sm text-accent font-medium">Free trial active</p>
          </div>
          <p className="text-sm text-accent">24 days remaining — trial ends 18 Apr 2026</p>
        </div>

        {/* Plan features */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Artworks listed", value: "Unlimited" },
            { label: "Active placements", value: "Unlimited" },
            { label: "Platform fee", value: "5%" },
            { label: "Analytics", value: "Full access" },
          ].map((f) => (
            <div key={f.label} className="border border-border rounded-sm p-3">
              <p className="text-xs text-muted mb-0.5">{f.label}</p>
              <p className="text-sm font-medium text-foreground">{f.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Payment method */}
      <div className="bg-surface border border-border rounded-sm p-6 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-medium">Payment Method</h2>
          <button className="text-xs text-accent hover:underline underline-offset-4">Update</button>
        </div>
        <div className="flex items-center gap-4 p-4 border border-border rounded-sm bg-background">
          {/* Visa icon */}
          <div className="w-10 h-7 bg-blue-700 rounded-sm flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold tracking-tight">VISA</span>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Visa ending in 4242</p>
            <p className="text-xs text-muted">Expires 09/28</p>
          </div>
          <span className="ml-auto text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
            Default
          </span>
        </div>
      </div>

      {/* Earnings & Payouts */}
      <div className="bg-surface border border-border rounded-sm p-6 mb-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-medium">Earnings & Payouts</h2>
          <button className="text-xs text-accent hover:underline underline-offset-4">View all</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border border-border rounded-sm p-4">
            <p className="text-xs text-muted mb-1">Pending payout</p>
            <p className="text-xl font-medium">£420.00</p>
            <p className="text-xs text-muted mt-1">From 3 sales</p>
          </div>
          <div className="border border-border rounded-sm p-4">
            <p className="text-xs text-muted mb-1">Next payout date</p>
            <p className="text-xl font-medium">1 Apr 2026</p>
            <p className="text-xs text-muted mt-1">Monthly schedule</p>
          </div>
          <div className="border border-border rounded-sm p-4">
            <p className="text-xs text-muted mb-1">Total paid out</p>
            <p className="text-xl font-medium">£2,420</p>
            <p className="text-xs text-muted mt-1">All time</p>
          </div>
        </div>
      </div>

      {/* Billing history */}
      <div className="bg-surface border border-border rounded-sm">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-medium">Billing History</h2>
          <button className="text-xs text-accent hover:underline underline-offset-4">Download all</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="text-left text-xs text-muted font-medium px-6 py-3">Date</th>
                <th className="text-left text-xs text-muted font-medium px-4 py-3">Description</th>
                <th className="text-right text-xs text-muted font-medium px-4 py-3">Amount</th>
                <th className="text-left text-xs text-muted font-medium px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {billingHistory.map((row) => (
                <tr key={row.date} className="hover:bg-background/60 transition-colors">
                  <td className="px-6 py-4 text-muted whitespace-nowrap">{row.date}</td>
                  <td className="px-4 py-4 text-foreground">{row.description}</td>
                  <td className="px-4 py-4 text-right font-medium text-foreground">{row.amount}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ArtistPortalLayout>
  );
}
