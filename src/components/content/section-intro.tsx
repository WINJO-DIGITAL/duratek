import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

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
    <div className={cn("max-w-prose", className)}>
      {eyebrow && <p className={cn("eyebrow", tone === "dark" && "text-green-on-navy")}>{eyebrow}</p>}
      <H className={cn(sizeClass, eyebrow && "mt-4", tone === "dark" ? "text-on-dark" : "text-navy")}>{title}</H>
      {children && (
        <div className={cn("mt-5 space-y-4 text-lede", tone === "dark" ? "text-on-dark-muted" : "text-ink-muted")}>
          {children}
        </div>
      )}
    </div>
  );
}
