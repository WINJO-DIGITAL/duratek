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

export function WarrantyBadges({ className }: { className?: string }) {
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
