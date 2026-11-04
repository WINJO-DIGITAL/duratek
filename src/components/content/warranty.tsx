import { cn } from "@/lib/cn";
import { WARRANTY_DISCLAIMER } from "@/lib/config";

/** Must appear wherever warranty is mentioned. */
export function WarrantyDisclaimer({ tone = "light", className }: { tone?: "light" | "dark"; className?: string }) {
  return (
    <p
      className={cn(
        "max-w-3xl text-[0.8125rem] leading-relaxed",
        tone === "dark" ? "text-on-dark-muted" : "text-ink-muted",
        className,
      )}
    >
      {WARRANTY_DISCLAIMER}
    </p>
  );
}

/*
 * Badge placeholders: typographic seals until the client supplies the Scratch
 * Shield and warranty artwork. Replace the internals with the real files.
 */
function Seal({
  top,
  big,
  bottom,
  tone,
  className,
}: {
  top: string;
  big: string;
  bottom: string;
  tone: "light" | "dark";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex aspect-square w-36 flex-col items-center justify-center border p-3 text-center sm:w-40",
        tone === "dark" ? "border-on-dark/40 text-on-dark" : "border-navy/30 text-navy",
        className,
      )}
    >
      <span className={cn("eyebrow text-[0.625rem]", tone === "dark" && "text-green-on-navy")}>{top}</span>
      <span className="mt-2 font-display text-[1.75rem] leading-none">{big}</span>
      <span className="mt-2 text-[0.6875rem] font-medium uppercase tracking-[0.14em]">{bottom}</span>
    </div>
  );
}

export function WarrantyBadges({ tone = "light", className }: { tone?: "light" | "dark"; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-4", className)}>
      <Seal tone={tone} top="Residential" big="Lifetime" bottom="Warranty" />
      <Seal tone={tone} top="Commercial" big="10 year" bottom="Warranty" />
    </div>
  );
}

export function ScratchShieldBadge({ tone = "light", className }: { tone?: "light" | "dark"; className?: string }) {
  return <Seal tone={tone} top="Duratek" big="Scratch Shield" bottom="Surface protection" className={className} />;
}
