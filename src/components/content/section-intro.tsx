import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The section stack every section shares: label, heading, description.
 * The heading anchors the section; label and description stay subordinate.
 * Spacing comes from the stack tokens (--spacing-label, --spacing-lede);
 * the gap to the content below is --spacing-stack (mt-stack) at the call site.
 */
export function SectionIntro({
  eyebrow,
  title,
  children,
  tone = "light",
  as: H = "h2",
  size = "md",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  children?: ReactNode;
  tone?: "light" | "dark";
  as?: "h1" | "h2";
  size?: "xl" | "lg" | "md";
  className?: string;
}) {
  const sizeClass = { xl: "text-display-xl", lg: "text-display-lg", md: "text-display-md" }[size];
  return (
    <div className={cn("reveal max-w-prose", className)}>
      {eyebrow && <p className={cn("eyebrow", tone === "dark" && "text-green-on-navy")}>{eyebrow}</p>}
      <H className={cn(sizeClass, eyebrow && "mt-label", tone === "dark" ? "text-on-dark" : "text-navy")}>{title}</H>
      {children && (
        <div
          className={cn(
            "mt-lede max-w-[60ch] space-y-3 text-support",
            // Softer than the heading, still AA: muted navy on light, off-white at 85% on navy.
            tone === "dark" ? "text-on-dark/85" : "text-navy/75",
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
