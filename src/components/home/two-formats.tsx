import Link from "next/link";
import { PlankScale, type ScalePlank } from "@/components/finish/plank-scale";
import { SectionIntro } from "@/components/content/section-intro";
import { ArrowRight } from "@/components/ui/icons";
import type { PlankFormat } from "@/lib/catalogue/format";

export interface FormatSummary {
  plank: ScalePlank;
  format: PlankFormat;
  thickness_mm?: number;
  count: number;
}

/** The two plank formats, drawn to one scale, each a doorway to its finishes. */
export function TwoFormats({ formats }: { formats: FormatSummary[] }) {
  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-14">
      <div className="lg:col-span-4">
        <SectionIntro eyebrow="Two formats" title="Two plank sizes, drawn to scale.">
          <p>
            The extra-long plank is longer and wider, so a large room reads with fewer joins. Both share the same wear
            layer, core and click system.
          </p>
        </SectionIntro>
        <ul className="mt-8 border-t border-line">
          {formats.map((f) => (
            <li key={f.format} className="border-b border-line">
              <Link
                href={`/range?format=${f.format}`}
                className="group flex min-h-tap items-center justify-between gap-4 py-3 text-navy"
              >
                <span>
                  {f.plank.label}
                  <span className="data ml-3 text-[0.8125rem] text-ink-muted">
                    {f.thickness_mm ? `${f.thickness_mm} mm thick` : null}
                  </span>
                </span>
                <span className="flex items-center gap-2 text-[0.9375rem] group-hover:underline group-hover:underline-offset-4">
                  {f.count} {f.count === 1 ? "finish" : "finishes"} <ArrowRight size={16} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <PlankScale planks={formats.map((f) => f.plank)} className="self-center lg:col-span-8" />
    </div>
  );
}
