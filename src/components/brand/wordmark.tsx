import { cn } from "@/lib/cn";

/**
 * Placeholder text wordmark: lowercase "duratek", "dura" in Duratek green and
 * "tek" bold. Swap for the client's SVG logo when supplied.
 */
export function Wordmark({ tone = "light", className }: { tone?: "light" | "dark"; className?: string }) {
  return (
    <span className={cn("font-sans text-[1.5rem] leading-none tracking-[-0.03em]", className)}>
      <span className={tone === "dark" ? "text-green-light" : "text-green"}>dura</span>
      <span className={cn("font-bold", tone === "dark" ? "text-white" : "text-navy")}>tek</span>
    </span>
  );
}
