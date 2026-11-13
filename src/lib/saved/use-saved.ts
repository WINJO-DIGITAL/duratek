"use client";

import { useCallback, useSyncExternalStore } from "react";
import { createBrowserStore } from "@/lib/browser-store";
import { parseSaved, toggleSaved, type SavedItem } from "./saved";

const store = createBrowserStore<SavedItem[]>({
  key: "duratek.saved.v1",
  storage: "local",
  initial: [],
  parse: parseSaved,
});

/** Saved finishes, shared by every save button, the header and /saved. */
export function useSaved() {
  const items = useSyncExternalStore(store.subscribe, store.get, () => store.serverSnapshot);
  const toggle = useCallback((item: SavedItem) => store.set(toggleSaved(store.get(), item)), []);
  const remove = useCallback((id: string) => store.set(store.get().filter((s) => s.id !== id)), []);
  return { items, count: items.length, has: (id: string) => items.some((s) => s.id === id), toggle, remove };
}
