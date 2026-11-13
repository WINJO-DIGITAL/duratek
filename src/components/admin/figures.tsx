import type { ReactNode } from "react";

/** A labelled figure with a quiet note under it. */
export function Figure({ label, value, note }: { label: string; value: number | string; note: ReactNode }) {
  return (
    <div className="border-t border-line pt-4">
      <dt className="text-[0.875rem] text-ink-muted">{label}</dt>
      <dd className="data mt-2 text-[2rem] font-light leading-none text-navy">{value}</dd>
      <dd className="mt-2 text-[0.8125rem] text-ink-muted">{note}</dd>
    </div>
  );
}

/** A ranked list with proportional bars. */
export function Ranking({ id, title, rows, empty }: { id: string; title: string; empty: string; rows: { label: string; value: number; share: number; text: string }[] }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-display-sm text-navy">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-ink-muted">{empty}</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.slice(0, 11).map((r) => (
            <li key={r.label}>
              <div className="flex items-baseline justify-between gap-4 text-[0.9375rem]">
                <span className="text-navy">{r.label}</span>
                <span className="data text-[0.875rem] text-ink-muted">{r.text}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-line">
                <div className="h-full rounded-full bg-navy" style={{ width: `${Math.max(2, r.share * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
