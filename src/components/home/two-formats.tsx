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
        <SectionIntro rule title="Two plank sizes, drawn to scale.">
          <p>
            The extra-long plank is longer and wider, so a large room reads with fewer joins. Both share the same wear
            layer, core and click system.
          </p>
        </SectionIntro>
        <ul className="mt-10 border-t border-line">
          {formats.map((f) => (
            <li key={f.format} className="border-b border-line">
              <Link
                href={`/range?format=${f.format}`}
                className="group grid min-h-tap grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-0.5 py-4 text-navy"
              >
                <span className="font-display text-[1rem] font-medium tracking-[-0.005em]">{f.plank.label}</span>
                <span className="row-span-2 flex items-center gap-2 self-center text-[0.875rem] font-medium">
                  {f.count} {f.count === 1 ? "finish" : "finishes"}
                  <ArrowRight
                    size={16}
                    className="transition-transform duration-200 ease-out group-hover:translate-x-[3px] motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                  />
                </span>
                <span className="data text-[0.75rem] text-ink-muted">
                  {[f.plank.width_mm && `${f.plank.width_mm} × ${f.plank.length_mm} mm`, f.thickness_mm && `${f.thickness_mm} mm thick`]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="card self-center p-5 sm:p-10 lg:col-span-8">
        <PlankScale planks={formats.map((f) => f.plank)} />
      </div>
    </div>
  );
}
