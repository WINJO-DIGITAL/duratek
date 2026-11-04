"use client";

import { cn } from "@/lib/cn";
import { useSamples } from "@/lib/samples/use-samples";

/** Live sample count badge; renders nothing when no samples are chosen. */
export function SampleCount({ className }: { className?: string }) {
  const { count } = useSamples();
  if (count === 0) return null;
  return (
    <span
      key={count}
      className={cn(
        "inline-flex size-5 animate-[badge-pop_420ms_var(--ease-calm)] items-center justify-center rounded-full bg-green-ink text-[0.6875rem] font-semibold text-white tabular-nums motion-reduce:animate-none",
        className,
      )}
    >
      {count}
      <span className="sr-only"> chosen</span>
    </span>
  );
}
