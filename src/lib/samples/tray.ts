"use client";

import type { SampleItem } from "./selection";

/**
 * Opens the sample tray from anywhere: header, bottom bar, sample buttons.
 * A finish passed as `swapIn` is added as soon as a place frees up, so a
 * full tray never just refuses.
 */
const EVENT = "duratek:open-sample-tray";

export interface OpenTrayDetail {
  swapIn?: SampleItem;
}

let mounted = false;

export function setTrayMounted(value: boolean) {
  mounted = value;
}

/** True when the tray could open; callers fall back to the /samples page otherwise. */
export function openSampleTray(detail: OpenTrayDetail = {}): boolean {
  if (!mounted || typeof window === "undefined") return false;
  window.dispatchEvent(new CustomEvent<OpenTrayDetail>(EVENT, { detail }));
  return true;
}

export function onOpenSampleTray(handler: (detail: OpenTrayDetail) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<OpenTrayDetail>).detail ?? {});
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
