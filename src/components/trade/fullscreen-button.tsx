"use client";

import { useSyncExternalStore } from "react";

const subscribe = (notify: () => void) => {
  document.addEventListener("fullscreenchange", notify);
  return () => document.removeEventListener("fullscreenchange", notify);
};
const supported = () => document.fullscreenEnabled === true;
const isFull = () => document.fullscreenElement !== null;

/**
 * Shows the page full screen, for handing a tablet to a customer. Only offered
 * where the browser can do it (most iPhones cannot); nothing renders otherwise.
 */
export function FullscreenButton() {
  const canFull = useSyncExternalStore(subscribe, supported, () => false);
  const full = useSyncExternalStore(subscribe, isFull, () => false);
  if (!canFull) return null;
  return (
    <button
      type="button"
      onClick={() => {
        const run = full ? document.exitFullscreen() : document.documentElement.requestFullscreen();
        run.catch(() => {});
      }}
      className="inline-flex min-h-tap items-center px-1 text-[0.9375rem] text-navy underline underline-offset-4 hover:text-green-ink"
    >
      {full ? "Exit Full Screen" : "Full Screen"}
    </button>
  );
}
