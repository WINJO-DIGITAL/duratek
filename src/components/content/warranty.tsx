import Image from "next/image";
import scratchShield from "../../../public/brand/scratch-shield.png";
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
 * Warranty badge placeholders: typographic seals until the client supplies
 * the warranty artwork. Replace the internals with the real files.
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
      <span className={cn("eyebrow text-[0.625rem] before:hidden", tone === "dark" && "text-green-on-navy")}>{top}</span>
      <span className="mt-2 font-display text-[1.75rem] leading-none">{big}</span>
      <span className="mt-2 text-[0.6875rem] font-medium uppercase tracking-[0.14em]">{bottom}</span>
    </div>
  );
}

export function WarrantyBadges({ tone = "light", className }: { tone?: "light" | "dark"; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-4", className)}>
      <Image
        src="/brand/warranty-residential-lifetime.png"
        alt="Residential lifetime warranty"
        width={467}
        height={467}
        sizes="(min-width: 640px) 10rem, 9rem"
        className="h-auto w-36 sm:w-40"
      />
      <Image
        src="/brand/warranty-commercial-10-year.png"
        alt="Commercial 10 year warranty"
        width={485}
        height={486}
        sizes="(min-width: 640px) 10rem, 9rem"
        className="h-auto w-36 sm:w-40"
      />
    </div>
  );
}

/**
 * The client's Scratch Shield artwork (duratek-scratch-shield.png, trimmed to
 * its transparent bounds). next/image serves it as AVIF/WebP at the size used.
 */
export function ScratchShieldBadge({ className }: { className?: string }) {
  return (
    <Image
      src={scratchShield}
      alt="Duratek Scratch Shield"
      sizes="(min-width: 640px) 10rem, 9rem"
      className={cn("h-auto w-36 sm:w-40", className)}
    />
  );
}
