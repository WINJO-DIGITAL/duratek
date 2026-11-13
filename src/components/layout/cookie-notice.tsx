"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { createBrowserStore } from "@/lib/browser-store";

/**
 * The cookie notice: one compact line, dismissed once and remembered on this
 * device. It only describes the storage the site uses (samples, saved finishes,
 * trade sign-in), none of which needs consent under PECR, so it is a notice
 * with a single action rather than a consent choice. It sits above the phone
 * bottom bar and never covers the page's primary action for long.
 */
const noticeStore = createBrowserStore<"open" | "closed">({
  key: "duratek-cookie-notice",
  storage: "local",
  initial: "open",
  parse: (raw) => (raw === "closed" ? "closed" : "open"),
});

export function CookieNotice() {
  const state = useSyncExternalStore(noticeStore.subscribe, noticeStore.get, () => noticeStore.serverSnapshot);
  if (state !== "open") return null;

  return (
    <section
      aria-label="Cookies"
      className="on-dark fixed inset-x-2 bottom-[calc(var(--spacing-bottom-bar)+env(safe-area-inset-bottom)+0.5rem)] z-50 mx-auto flex max-w-3xl flex-wrap items-center gap-x-4 gap-y-2 rounded-card bg-navy px-4 py-3 text-[0.875rem] text-on-dark shadow-card lg:bottom-5 lg:inset-x-[var(--spacing-gutter)] lg:max-w-none"
    >
      <p className="min-w-0 flex-1">
        We only use the storage this site needs: your samples, saved finishes and trade sign-in. No advertising or
        analytics cookies. <Link href="/cookies" className="underline underline-offset-4 hover:text-white">Cookies</Link>
      </p>
      <Button
        variant="on-dark"
        size="md"
        className="min-h-tap"
        onClick={() => noticeStore.set("closed")}
      >
        Got it
      </Button>
    </section>
  );
}
