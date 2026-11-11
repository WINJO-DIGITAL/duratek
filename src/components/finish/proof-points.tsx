/**
 * Three facts a homeowner checks before asking for samples, set as a short
 * list beside the price. Only facts from the product sheet; the warranty is
 * left out here because it is shown, with its disclaimer, further down.
 */
const POINTS = [
  "0.55 mm wear layer",
  "Scratch Shield surface, scratch-resistant",
  "Waterproof rigid SPC core",
] as const;

export function ProofPoints() {
  return (
    <ul className="mt-6 grid gap-2.5 border-t border-line pt-5 text-[0.9375rem] text-navy" aria-label="Key facts">
      {POINTS.map((point) => (
        <li key={point} className="flex items-center gap-3">
          <span aria-hidden="true" className="size-2 shrink-0 bg-green-ink" />
          {point}
        </li>
      ))}
    </ul>
  );
}
