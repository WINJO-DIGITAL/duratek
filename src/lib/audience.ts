"use client";

import { useSyncExternalStore } from "react";
import { createBrowserStore } from "@/lib/browser-store";

/** "What describes you best?" Persists for the browser session. Never a gate. */
export type Audience = "homeowner" | "trade" | null;

const store = createBrowserStore<Audience>({
  key: "duratek.audience",
  storage: "session",
  initial: null,
  parse: (raw) => (raw === "homeowner" || raw === "trade" ? raw : null),
});

export function useAudience(): [Audience, (a: Audience) => void] {
  const audience = useSyncExternalStore(store.subscribe, store.get, () => store.serverSnapshot);
  return [audience, store.set];
}
