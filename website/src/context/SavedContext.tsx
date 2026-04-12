"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/api-client";
import type { SavedItem } from "@/lib/types";

interface SavedContextValue {
  savedItems: SavedItem[];
  toggleSaved: (type: "work" | "collection" | "artist", id: string) => void;
  isSaved: (type: "work" | "collection" | "artist", id: string) => boolean;
  savedCount: number;
  clearSaved: () => void;
}

const STORAGE_KEY = "wallplace-saved";

const SavedContext = createContext<SavedContextValue | null>(null);

export function SavedProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const hasMounted = useRef(false);
  const hasSynced = useRef(false);

  // On mount or when user changes: load items from the right source
  useEffect(() => {
    if (user) {
      // Authenticated: fetch from DB
      authFetch("/api/saved")
        .then((r) => r.json())
        .then((data) => {
          if (data.items) {
            const dbItems: SavedItem[] = data.items.map(
              (row: { item_type: string; item_id: string; created_at: string }) => ({
                type: row.item_type as SavedItem["type"],
                id: row.item_id,
                savedAt: row.created_at,
              })
            );
            setSavedItems(dbItems);

            // Sync any localStorage items to DB, then clear localStorage
            if (!hasSynced.current) {
              hasSynced.current = true;
              const stored = localStorage.getItem(STORAGE_KEY);
              if (stored) {
                try {
                  const localItems: SavedItem[] = JSON.parse(stored);
                  const existingKeys = new Set(
                    dbItems.map((i) => `${i.type}:${i.id}`)
                  );
                  const toSync = localItems.filter(
                    (i) => !existingKeys.has(`${i.type}:${i.id}`)
                  );
                  // Fire-and-forget sync of local items to DB
                  for (const item of toSync) {
                    authFetch("/api/saved", {
                      method: "POST",
                      body: JSON.stringify({ itemType: item.type, itemId: item.id }),
                    }).catch(() => {});
                  }
                  // Merge local items into state
                  if (toSync.length > 0) {
                    setSavedItems((prev) => [
                      ...prev,
                      ...toSync.map((i) => ({
                        type: i.type,
                        id: i.id,
                        savedAt: i.savedAt,
                      })),
                    ]);
                  }
                } catch {
                  /* ignore */
                }
                localStorage.removeItem(STORAGE_KEY);
              }
            }
          }
        })
        .catch(() => {});
    } else {
      // Not authenticated: use localStorage
      hasSynced.current = false;
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          setSavedItems(JSON.parse(stored));
        } catch {
          /* ignore */
        }
      } else {
        setSavedItems([]);
      }
    }
    hasMounted.current = true;
  }, [user]);

  // Persist to localStorage only when NOT authenticated
  useEffect(() => {
    if (hasMounted.current && !user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedItems));
    }
  }, [savedItems, user]);

  const toggleSaved = useCallback(
    (type: "work" | "collection" | "artist", id: string) => {
      const exists = savedItems.find((s) => s.type === type && s.id === id);

      if (exists) {
        // Remove
        setSavedItems((prev) => prev.filter((s) => !(s.type === type && s.id === id)));
        if (user) {
          authFetch("/api/saved", {
            method: "DELETE",
            body: JSON.stringify({ itemType: type, itemId: id }),
          }).catch(() => {});
        }
      } else {
        // Add
        setSavedItems((prev) => [...prev, { type, id, savedAt: new Date().toISOString() }]);
        if (user) {
          authFetch("/api/saved", {
            method: "POST",
            body: JSON.stringify({ itemType: type, itemId: id }),
          }).catch(() => {});
        }
      }
    },
    [savedItems, user]
  );

  const isSaved = useCallback(
    (type: "work" | "collection" | "artist", id: string) => {
      return savedItems.some((s) => s.type === type && s.id === id);
    },
    [savedItems]
  );

  const clearSaved = useCallback(() => {
    setSavedItems([]);
    if (!user) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  return (
    <SavedContext.Provider
      value={{ savedItems, toggleSaved, isSaved, savedCount: savedItems.length, clearSaved }}
    >
      {children}
    </SavedContext.Provider>
  );
}

export function useSaved() {
  const ctx = useContext(SavedContext);
  if (!ctx) throw new Error("useSaved must be used within SavedProvider");
  return ctx;
}
