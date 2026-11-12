import Image from "next/image";
import type { CSSProperties } from "react";
import { ScratchShieldBadge } from "@/components/content/warranty";
import type { CatalogueImage } from "@/lib/catalogue/types";
import { cn } from "@/lib/cn";

/**
 * The floor in section, top to bottom: each layer is a flat band on the left,
 * joined to the next so the column reads as one cross-section, with its job
 * in plain words beside it. Static, so it works without JavaScript and under
 * reduced motion. Bands are not drawn to scale; the wear layer carries its
 * real measurement.
 */
const STACK = [
  { name: "Protective top finish", measure: "Scratch Shield", text: "A surface finish that helps resist scuffs and scratches." },
  { name: "Wear layer", measure: "0.55 mm", text: "A clear layer over the pattern. It protects the design from wear." },
  { name: "Decorative layer", text: "The printed oak pattern you see, and walk on." },
  { name: "SPC rigid core", measure: "Waterproof", text: "Rigid and stable, so the floor stays flat. The core is waterproof." },
  { name: "Integrated underlay", text: "Comfort underfoot, and less noise." },
] as const;

/** How each band looks, on navy: glass for the clear layers, the real oak for the pattern, a stone-grain core, a woven underlay. */
const BANDS: CSSProperties[] = [
  {
    background: "linear-gradient(135deg, rgb(255 255 255 / 0.55), rgb(255 255 255 / 0.12) 55%, rgb(255 255 255 / 0.4))",
    border: "1px solid rgb(255 255 255 / 0.85)",
  },
  {
    background: "linear-gradient(135deg, rgb(214 228 236 / 0.6), rgb(247 246 242 / 0.35))",
    border: "1px solid rgb(255 255 255 / 0.6)",
  },
  {},
  {
    backgroundColor: "#a9b3ba",
    backgroundImage:
      "radial-gradient(rgb(255 255 255 / 0.25) 1px, transparent 1.5px), radial-gradient(rgb(0 0 0 / 0.12) 1px, transparent 1.5px)",
    backgroundSize: "7px 7px, 11px 11px",
    backgroundPosition: "0 0, 3px 4px",
  },
  {
    backgroundColor: "#4e6577",
    backgroundImage: "repeating-linear-gradient(45deg, rgb(255 255 255 / 0.05) 0 2px, transparent 2px 6px)",
  },
];

export function LayerStack({ woodImage }: { woodImage?: CatalogueImage }) {
  return (
    <div>
      <p className="data text-[0.8125rem] text-on-dark/70">Top to bottom, not to scale</p>
      <ol className="mt-4">
        {STACK.map((layer, i) => {
          const last = i === STACK.length - 1;
          return (
            <li
              key={layer.name}
              className="reveal grid grid-cols-[6rem_1fr] gap-5 sm:grid-cols-[9rem_1fr] sm:gap-8 lg:grid-cols-[16rem_1fr] lg:gap-12"
            >
              <div
                aria-hidden="true"
                className={cn("relative min-h-[5.5rem] overflow-hidden", i === 0 && "rounded-t-[10px]", last && "rounded-b-[10px]")}
                style={BANDS[i]}
              >
                {i === 2 &&
                  (woodImage ? (
                    <Image src={woodImage.src} alt="" fill sizes="(min-width: 1024px) 256px, 144px" quality={70} className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-navy/30" />
                  ))}
                {/* The one measured layer: a dimension mark and its size. */}
                {i === 1 && (
                  <>
                    <span aria-hidden="true" className="absolute inset-y-3 left-3 w-2 border-y border-l border-navy/60" />
                    <span className="data absolute right-3 top-1/2 -translate-y-1/2 text-[0.75rem] text-navy sm:text-[0.8125rem]">
                      0.55 mm
                    </span>
                  </>
                )}
              </div>
              <div className={cn("flex items-start justify-between gap-6 border-t border-white/15 py-5 sm:py-6", last && "border-b")}>
                <div className="min-w-0">
                  <h3 className="font-display text-[1.25rem] font-normal leading-tight tracking-[-0.02em] text-on-dark sm:text-[1.5rem]">
                    {layer.name}
                  </h3>
                  {"measure" in layer && (
                    <p className="data mt-1 text-[0.8125rem] text-green-on-navy">{layer.measure}</p>
                  )}
                  <p className="mt-2 max-w-[44ch] text-[0.9375rem] leading-relaxed text-on-dark/85">{layer.text}</p>
                </div>
                {i === 0 && <ScratchShieldBadge className="hidden w-16! shrink-0 sm:block lg:w-20!" />}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
