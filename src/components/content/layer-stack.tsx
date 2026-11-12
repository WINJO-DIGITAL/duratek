import { cn } from "@/lib/cn";

/**
 * The floor in section, told as a short looping film: the layers drop into
 * place from the core upwards, each with its name, then lift away and the
 * loop starts again. Under reduced motion the still poster shows instead.
 * The list beside it carries the same five layers in words, so the film is
 * decorative to screen readers.
 */
const STACK = [
  { name: "Protective top finish", measure: "Scratch Shield", text: "A surface finish that helps resist scuffs and scratches." },
  { name: "Wear layer", measure: "0.55 mm", text: "A clear layer over the pattern. It protects the design from wear." },
  { name: "Decorative layer", text: "The printed oak pattern you see, and walk on." },
  { name: "SPC rigid core", measure: "Waterproof", text: "Rigid and stable, so the floor stays flat. The core is waterproof." },
  { name: "Integrated underlay", text: "Comfort underfoot, and less noise." },
] as const;

export function LayerStack() {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
      <div className="relative mx-auto w-full max-w-[26rem] overflow-hidden rounded-card bg-navy/60 lg:max-w-[30rem]" aria-hidden="true">
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
        <ol className="mt-4">
          {STACK.map((layer, i) => {
            const last = i === STACK.length - 1;
            return (
              <li key={layer.name} className={cn("reveal border-t border-white/15 py-5 sm:py-6", last && "border-b")}>
                <h3 className="font-display text-[1.25rem] font-normal leading-tight tracking-[-0.02em] text-on-dark sm:text-[1.5rem]">
                  {layer.name}
                </h3>
                {"measure" in layer && <p className="data mt-1 text-[0.8125rem] text-green-on-navy">{layer.measure}</p>}
                <p className="mt-2 max-w-[44ch] text-[0.9375rem] leading-relaxed text-on-dark/85">{layer.text}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
