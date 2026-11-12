import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

/**
 * The floor in section, told as a short looping film: the layers drop into
 * place from the core upwards, each with its name, then lift away and the
 * loop starts again. Under reduced motion the still poster shows instead.
 * The list beside it carries the same five layers in words, each with a small
 * swatch painted like its layer in the film, joined by one green line, so the
 * film is decorative to screen readers.
 */
const STACK: {
  name: string;
  measure?: string;
  /** The one measurement a customer will remember: set larger. */
  key?: boolean;
  text: string;
  swatch: CSSProperties;
}[] = [
  {
    name: "Protective top finish",
    measure: "Scratch Shield",
    text: "Helps take the everyday scuffs and scratches.",
    swatch: { background: "linear-gradient(135deg, rgb(190 208 220 / 0.95), rgb(52 78 104 / 0.95))" },
  },
  {
    name: "Wear layer",
    measure: "0.55 mm",
    key: true,
    text: "A clear layer over the pattern, so the design stays protected.",
    swatch: { background: "linear-gradient(135deg, rgb(205 220 232), rgb(120 146 168))" },
  },
  {
    name: "Decorative layer",
    text: "The printed oak pattern you see, and walk on.",
    swatch: { background: "linear-gradient(160deg, #cfd3d6 0 52%, #5f6469 52% 100%)" },
  },
  {
    name: "SPC rigid core",
    measure: "Waterproof",
    text: "Rigid and stable, so the floor stays flat.",
    swatch: {
      backgroundColor: "#adbdcb",
      backgroundImage: "radial-gradient(rgb(255 255 255 / 0.85) 1.6px, transparent 2px)",
      backgroundSize: "6px 6px",
    },
  },
  {
    name: "Integrated underlay",
    text: "Comfort underfoot, and a quieter floor.",
    swatch: {
      backgroundColor: "#4f6d88",
      backgroundImage: "repeating-linear-gradient(45deg, rgb(255 255 255 / 0.22) 0 1.5px, transparent 1.5px 5px)",
    },
  },
];

export function LayerStack() {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
      <div className="relative mx-auto w-full max-w-[26rem] overflow-hidden rounded-card bg-navy lg:max-w-[30rem]" aria-hidden="true">
        <video
          className="block h-auto w-full motion-reduce:hidden"
          src="/brand/layers-assemble.mp4"
          poster="/brand/layers-poster.jpg"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
        >
          <source src="/brand/layers-assemble.webm" type="video/webm" />
        </video>
        {/* eslint-disable-next-line @next/next/no-img-element -- a static poster for reduced motion; sized by its own file */}
        <img
          src="/brand/layers-poster.jpg"
          alt=""
          className="hidden h-auto w-full motion-reduce:block"
          loading="lazy"
          decoding="async"
        />
      </div>

      <div>
        <p className="data text-[0.8125rem] text-on-dark/70">Top to bottom, not to scale</p>
        <ol className="relative mt-5">
          {/* The green line that joins the five layers, behind the swatches. */}
          <span aria-hidden="true" className="absolute bottom-6 left-[0.875rem] top-6 w-px bg-green-on-navy/40" />
          {STACK.map((layer) => (
            <li key={layer.name} className="reveal relative grid grid-cols-[1.75rem_1fr] gap-x-4 py-4 sm:gap-x-5 sm:py-5">
              <span
                aria-hidden="true"
                className="relative z-10 mt-1 size-7 rounded-full ring-2 ring-navy ring-offset-0 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.45)]"
                style={layer.swatch}
              />
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-display text-[1.25rem] font-normal leading-tight tracking-[-0.02em] text-on-dark sm:text-[1.5rem]">
                    {layer.name}
                  </h3>
                  {layer.measure && (
                    <p
                      className={cn(
                        "data shrink-0 text-right text-green-on-navy",
                        layer.key ? "text-[1.25rem] sm:text-[1.5rem]" : "text-[0.8125rem]",
                      )}
                    >
                      {layer.measure}
                    </p>
                  )}
                </div>
                <p className="mt-1.5 max-w-[44ch] text-[0.9375rem] leading-relaxed text-on-dark/85">{layer.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
