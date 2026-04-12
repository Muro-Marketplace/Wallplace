"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import CustomerPortalLayout from "@/components/CustomerPortalLayout";
import { authFetch } from "@/lib/api-client";

type ItemType = "work" | "artist" | "collection";

interface SavedItemRow {
  id: string;
  user_id: string;
  item_type: ItemType;
  item_id: string;
  created_at: string;
}

const tabs: { label: string; type: ItemType }[] = [
  { label: "Works", type: "work" },
  { label: "Artists", type: "artist" },
  { label: "Collections", type: "collection" },
];

function linkForItem(type: ItemType, itemId: string): string {
  switch (type) {
    case "work":
      // item_id format: artist-slug/work-title or just artist-slug
      return `/browse/${itemId}`;
    case "artist":
      return `/browse/${itemId}`;
    case "collection":
      return `/browse#collections`;
  }
}

export default function CustomerSavedPage() {
  const [items, setItems] = useState<SavedItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ItemType>("work");
  const [removing, setRemoving] = useState<string | null>(null);

  const fetchItems = useCallback(() => {
    authFetch("/api/saved")
      .then((r) => r.json())
      .then((data) => {
        if (data.items) setItems(data.items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  async function handleRemove(item: SavedItemRow) {
    setRemoving(item.id);
    try {
      await authFetch("/api/saved", {
        method: "DELETE",
        body: JSON.stringify({ itemType: item.item_type, itemId: item.item_id }),
      });
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch {
      /* ignore */
    } finally {
      setRemoving(null);
    }
  }

  const filtered = items.filter((i) => i.item_type === activeTab);

  return (
    <CustomerPortalLayout>
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl">Saved</h1>
        <p className="text-sm text-muted mt-1">Your saved works, artists, and collections</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.type}
            onClick={() => setActiveTab(tab.type)}
            className={`px-4 py-2 text-sm transition-colors -mb-px ${
              activeTab === tab.type
                ? "text-accent border-b-2 border-accent font-medium"
                : "text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <p className="text-muted text-sm py-12 text-center">Loading saved items...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-surface border border-border rounded-sm px-6 py-12 text-center">
          <p className="text-muted text-sm mb-2">
            No saved {activeTab === "work" ? "works" : activeTab === "artist" ? "artists" : "collections"} yet.
          </p>
          <Link href="/browse" className="text-sm text-accent hover:text-accent-hover transition-colors">
            Browse the marketplace to start saving
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-surface border border-border rounded-sm p-4 sm:p-5 flex items-center justify-between gap-4"
            >
              <div>
                <Link
                  href={linkForItem(item.item_type, item.item_id)}
                  className="text-sm font-medium text-foreground hover:text-accent transition-colors"
                >
                  {item.item_id}
                </Link>
                <p className="text-xs text-muted mt-0.5">
                  Saved{" "}
                  {new Date(item.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <button
                onClick={() => handleRemove(item)}
                disabled={removing === item.id}
                className="text-xs text-muted hover:text-red-600 transition-colors disabled:opacity-50"
              >
                {removing === item.id ? "Removing..." : "Remove"}
              </button>
            </div>
          ))}
        </div>
      )}
    </CustomerPortalLayout>
  );
}
