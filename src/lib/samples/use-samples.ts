"use client";

import { useCallback, useSyncExternalStore } from "react";
import { createBrowserStore } from "@/lib/browser-store";
import { SAMPLE_LIMIT } from "@/lib/config";
import { addSample, parseSelection, removeSample, type SampleItem } from "./selection";

const store = createBrowserStore<SampleItem[]>({
  key: "duratek.samples.v1",
  storage: "local",
  initial: [],
  parse: (raw) => parseSelection(raw, SAMPLE_LIMIT),
});

/** The sample selection, shared across every tray, badge and button. */
export function useSamples() {
  const items = useSyncExternalStore(store.subscribe, store.get, () => store.serverSnapshot);

  const add = useCallback((item: SampleItem) => {
    const { next, result } = addSample(store.get(), item, SAMPLE_LIMIT);
    if (next !== store.get()) store.set(next);
    return result;
  }, []);

  const remove = useCallback((id: string) => store.set(removeSample(store.get(), id)), []);
  const clear = useCallback(() => store.set([]), []);

  return {
    items,
    count: items.length,
    limit: SAMPLE_LIMIT,
    isFull: items.length >= SAMPLE_LIMIT,
    has: (id: string) => items.some((s) => s.id === id),
    add,
    remove,
    clear,
  };
}
