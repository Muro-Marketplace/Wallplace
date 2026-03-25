"use client";

import { useState } from "react";
import ArtistPortalLayout from "@/components/ArtistPortalLayout";

const dateRanges = ["Last 7 days", "Last 30 days", "Last 3 months", "Last 12 months", "All time"];

const topWorks = [
  { title: "Last Light on Mare Street", venue: "Ozone Coffee", views: 184, enquiries: 7, sales: 2, revenue: "£560" },
  { title: "Hackney Wick, Dawn", venue: "The Copper Kettle", views: 142, enquiries: 5, sales: 1, revenue: "£320" },
  { title: "Canal Series No. 4", venue: "Workshop Coffee", views: 98, enquiries: 3, sales: 1, revenue: "£280" },
  { title: "Bermondsey Rooftops", venue: "Redemption Roasters", views: 76, enquiries: 2, sales: 0, revenue: "—" },
  { title: "Sunday Market, E8", venue: "Climpson & Sons", views: 62, enquiries: 1, sales: 0, revenue: "—" },
];

const venuePerformance = [
  { venue: "Ozone Coffee", pieces: 3, sales: 2, revenue: "£560", status: "Active" },
  { venue: "The Copper Kettle", pieces: 2, sales: 1, revenue: "£320", status: "Active" },
  { venue: "Workshop Coffee", pieces: 1, sales: 1, revenue: "£280", status: "Completed" },
];

const placementSummary = [
  { label: "Active", count: 5, color: "bg-green-100 text-green-700" },
  { label: "Pending", count: 2, color: "bg-amber-100 text-amber-700" },
  { label: "Completed", count: 8, color: "bg-gray-100 text-gray-600" },
];

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState("Last 30 days");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <ArtistPortalLayout activePath="/artist-portal/analytics">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-2xl lg:text-3xl">Analytics</h1>
        {/* Date range selector */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 text-sm border border-border rounded-sm px-3 py-2 bg-surface hover:bg-background transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-muted">
              <rect x="1" y="2" width="12" height="11" rx="1" stroke="currentColor" strokeWidth="1.25" />
              <path d="M1 5h12M4.5 1v2M9.5 1v2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
            </svg>
            {dateRange}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-muted">
              <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 mt-1 w-44 bg-surface border border-border rounded-sm shadow-sm z-10">
              {dateRanges.map((range) => (
                <button
                  key={range}
                  onClick={() => { setDateRange(range); setDropdownOpen(false); }}
                  className={`w-full text-left text-sm px-3 py-2 hover:bg-background transition-colors first:rounded-t-sm last:rounded-b-sm ${
                    range === dateRange ? "text-accent font-medium" : "text-foreground"
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Key metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface border border-border rounded-sm p-5">
          <p className="text-sm text-muted mb-1">Monthly Earnings</p>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-medium">£1,420</p>
            <span className="mb-0.5 text-xs font-medium bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">+12%</span>
          </div>
          <p className="text-xs text-muted mt-1">vs. last month</p>
        </div>
        <div className="bg-surface border border-border rounded-sm p-5">
          <p className="text-sm text-muted mb-1">Total Earnings</p>
          <p className="text-2xl font-medium">£2,840</p>
          <p className="text-xs text-muted mt-1">All time</p>
        </div>
        <div className="bg-surface border border-border rounded-sm p-5">
          <p className="text-sm text-muted mb-1">Pieces Placed</p>
          <p className="text-2xl font-medium">8</p>
          <p className="text-xs text-muted mt-1">Across 4 venues</p>
        </div>
        <div className="bg-surface border border-border rounded-sm p-5">
          <p className="text-sm text-muted mb-1">Conversion Rate</p>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-medium">23%</p>
          </div>
          <p className="text-xs text-muted mt-1">Enquiry to placement</p>
        </div>
      </div>

      {/* Earnings chart placeholder */}
      <div className="bg-surface border border-border rounded-sm mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-medium">Earnings Over Time</h2>
          <span className="text-xs text-muted">Last 30 days</span>
        </div>
        <div className="relative h-48 bg-gradient-to-b from-accent/8 to-transparent flex items-end justify-center pb-8">
          {/* Simulated chart bars */}
          <div className="flex items-end gap-2 px-8 w-full h-full pt-6">
            {[30, 55, 40, 70, 45, 85, 60, 95, 50, 75, 65, 100, 55, 80, 45, 90, 70, 55, 85, 60, 75, 50, 95, 65, 80, 45, 70, 55, 90, 75].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm bg-accent/25"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white/80 backdrop-blur-sm border border-border rounded-sm px-4 py-2">
              <p className="text-sm text-muted">Chart coming soon</p>
            </div>
          </div>
        </div>
      </div>

      {/* Placement Status Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {placementSummary.map((item) => (
          <div key={item.label} className="bg-surface border border-border rounded-sm p-5 flex items-center gap-4">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${item.color}`}>
              {item.label}
            </span>
            <p className="text-2xl font-medium">{item.count}</p>
          </div>
        ))}
      </div>

      {/* Top Performing Works */}
      <div className="bg-surface border border-border rounded-sm mb-6">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-base font-medium">Top Performing Works</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="text-left text-xs text-muted font-medium px-6 py-3">Title</th>
                <th className="text-left text-xs text-muted font-medium px-4 py-3">Venue</th>
                <th className="text-right text-xs text-muted font-medium px-4 py-3">Views</th>
                <th className="text-right text-xs text-muted font-medium px-4 py-3">Enquiries</th>
                <th className="text-right text-xs text-muted font-medium px-4 py-3">Sales</th>
                <th className="text-right text-xs text-muted font-medium px-6 py-3">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {topWorks.map((work) => (
                <tr key={work.title} className="hover:bg-background/60 transition-colors">
                  <td className="px-6 py-3.5 font-medium text-foreground whitespace-nowrap">{work.title}</td>
                  <td className="px-4 py-3.5 text-muted whitespace-nowrap">{work.venue}</td>
                  <td className="px-4 py-3.5 text-right text-foreground">{work.views}</td>
                  <td className="px-4 py-3.5 text-right text-foreground">{work.enquiries}</td>
                  <td className="px-4 py-3.5 text-right text-foreground">{work.sales}</td>
                  <td className="px-6 py-3.5 text-right font-medium text-foreground">{work.revenue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance by Venue */}
      <div className="bg-surface border border-border rounded-sm">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-base font-medium">Performance by Venue</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="text-left text-xs text-muted font-medium px-6 py-3">Venue</th>
                <th className="text-right text-xs text-muted font-medium px-4 py-3">Pieces</th>
                <th className="text-right text-xs text-muted font-medium px-4 py-3">Sales</th>
                <th className="text-right text-xs text-muted font-medium px-4 py-3">Revenue</th>
                <th className="text-left text-xs text-muted font-medium px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {venuePerformance.map((row) => (
                <tr key={row.venue} className="hover:bg-background/60 transition-colors">
                  <td className="px-6 py-3.5 font-medium text-foreground">{row.venue}</td>
                  <td className="px-4 py-3.5 text-right text-foreground">{row.pieces}</td>
                  <td className="px-4 py-3.5 text-right text-foreground">{row.sales}</td>
                  <td className="px-4 py-3.5 text-right font-medium text-foreground">{row.revenue}</td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        row.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
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
