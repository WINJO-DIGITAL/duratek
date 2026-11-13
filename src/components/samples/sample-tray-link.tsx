"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";
import { openSampleTray } from "@/lib/samples/tray";

/**
 * A link to /samples that opens the sample tray instead, so every "samples"
 * entry point leads to the same place. Without script, with a modifier key,
 * or on the samples page itself, it is an ordinary link.
 */
export function SampleTrayLink({ onClick, ...props }: Omit<ComponentProps<typeof Link>, "href">) {
  const pathname = usePathname();
  return (
    <Link
      href="/samples"
      aria-haspopup="dialog"
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        if (pathname === "/samples") return;
        if (openSampleTray()) e.preventDefault();
      }}
      {...props}
    />
  );
}
