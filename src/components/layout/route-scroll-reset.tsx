"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * Every page starts directly under the header, so a forward navigation should
 * land at the very top. Next scrolls the changed segment into view, which on
 * some routes left the page a little way down (the top of the photograph
 * under the header). This puts it at the top before the frame is painted and
 * before the page transition captures it.
 *
 * Back and Forward are left alone, so the browser restores the reader's place,
 * and so are links to a section of a page (#hash).
 */
export function RouteScrollReset() {
  const pathname = usePathname();
  const fromHistory = useRef(false);
  const first = useRef(true);

  useEffect(() => {
    const onPop = () => (fromHistory.current = true);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (fromHistory.current) {
      fromHistory.current = false;
      return;
    }
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
