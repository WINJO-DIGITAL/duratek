"use client";

import { useEffect } from "react";

/**
 * Counts a finish page view for the owner's reports: a daily total per
 * finish, nothing about the visitor. No cookie or storage is used, and it is
 * skipped when the browser sends Do Not Track or Global Privacy Control.
 */
export function ViewBeacon({ slug }: { slug: string }) {
  useEffect(() => {
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (nav.doNotTrack === "1" || nav.globalPrivacyControl) return;
    try {
      navigator.sendBeacon("/api/view", new Blob([JSON.stringify({ slug })], { type: "application/json" }));
    } catch {
      // Reporting is best effort.
    }
  }, [slug]);
  return null;
}
