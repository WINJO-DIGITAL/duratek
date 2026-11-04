import { ViewTransition, type ReactNode } from "react";

/**
 * Wraps a page's content so navigating between sections fades the old page
 * out quickly and lifts the new one in gently (see .page-exit/.page-enter in
 * globals.css). Must be used in each page, not the layout: layouts persist
 * across navigations, so enter/exit never fire there.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="page-enter" exit="page-exit" default="none">
      {children}
    </ViewTransition>
  );
}
