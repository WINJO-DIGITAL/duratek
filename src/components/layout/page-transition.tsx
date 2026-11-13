import { ViewTransition, type ReactNode } from "react";

/**
 * Wraps a page's content so navigating between sections fades the old page
 * out quickly and lifts the new one in gently (see .page-exit/.page-enter in
 * globals.css). Must be used in each page, not the layout: layouts persist
 * across navigations, so enter/exit never fire there.
 *
 * The wrapper is opaque and at least a screen tall, so the incoming page's
 * snapshot is a solid sheet: the outgoing page (a dark full-bleed hero, say)
 * never shows through the gaps in the new one while it fades in.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="page-enter" exit="page-exit" default="none">
      <div className="min-h-[calc(100svh-var(--spacing-header))] bg-off-white">{children}</div>
    </ViewTransition>
  );
}
