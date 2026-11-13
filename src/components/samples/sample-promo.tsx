import Image from "next/image";
import type { CatalogueImage } from "@/lib/catalogue/types";
import { cn } from "@/lib/cn";
import { OrderSamplesButton } from "./order-samples-button";

/**
 * The free-sample offer as a quiet panel: three real swatches, one line, and
 * the action that opens the sample tray.
 */
export function SamplePromo({ swatches, className }: { swatches: CatalogueImage[]; className?: string }) {
  const three = swatches.slice(0, 3);
  return (
    <aside
      aria-label="Free samples"
      className={cn(
        "flex flex-col gap-6 rounded-card bg-cream px-5 py-6 sm:flex-row sm:items-center sm:gap-8 sm:px-8 lg:px-10",
        className,
      )}
    >
      {three.length > 0 && (
        <div aria-hidden="true" className="flex shrink-0 pl-2">
          {three.map((s, i) => (
            <span
              key={s.src}
              className="relative -ml-3 block size-16 overflow-hidden rounded-[0.875rem] border-2 border-cream bg-line shadow-card first:ml-0 sm:size-20"
              style={{ rotate: `${(i - 1) * 6}deg` }}
            >
              <Image src={s.src} alt="" fill sizes="80px" quality={70} className="object-cover" />
            </span>
          ))}
        </div>
      )}
      <div className="flex-1">
        <p className="font-display text-display-sm text-navy">Not sure yet? Order three free samples.</p>
        <p className="mt-1 text-[0.9375rem] text-ink-muted">Posted to you, so you can see each finish in your own light.</p>
      </div>
      <OrderSamplesButton className="shrink-0 self-start sm:self-center" />
    </aside>
  );
}
