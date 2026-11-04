import { cn } from "@/lib/cn";

const SPECS = [
  { value: "0.55mm", label: "Protective wear layer" },
  { value: "Scratch Shield", label: "Surface protection" },
  { value: "Waterproof", label: "Rigid SPC core" },
  { value: "Unilin", label: "Precision click system" },
] as const;

export function SpecStrip({ className }: { className?: string }) {
  return (
    <dl className={cn("grid grid-cols-2 lg:grid-cols-4", className)}>
      {SPECS.map((s, i) => (
        <div
          key={s.value}
          className={cn(
            "flex flex-col-reverse gap-1 border-line py-6 pr-4 lg:py-8",
            i % 2 === 1 && "border-l pl-4 lg:pl-8",
            i >= 2 && "border-t lg:border-t-0",
            i === 2 && "lg:border-l lg:pl-8",
          )}
        >
          <dt className="text-[0.875rem] text-ink-muted">{s.label}</dt>
          <dd className="font-display text-display-sm text-navy">{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}
