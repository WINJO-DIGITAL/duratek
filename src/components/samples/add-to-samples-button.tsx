"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { useSamples } from "@/lib/samples/use-samples";
import type { SampleItem } from "@/lib/samples/selection";

/**
 * "Add to samples". Adds calmly with a spoken and visible confirmation; when
 * the tray is full it explains the limit instead of failing silently.
 */
export function AddToSamplesButton({
  finish,
  size = "default",
  className,
}: {
  finish: SampleItem;
  size?: "default" | "compact";
  className?: string;
}) {
  const { has, add, remove, count, limit, isFull } = useSamples();
  const [message, setMessage] = useState("");
  const added = has(finish.id);
  const blocked = !added && isFull;

  function onClick() {
    if (added) {
      remove(finish.id);
      setMessage(`${finish.name} removed. ${count - 1} of ${limit} samples chosen.`);
      return;
    }
    const result = add(finish);
    if (result === "added") setMessage(`${finish.name} added. ${count + 1} of ${limit} samples chosen.`);
    if (result === "full") setMessage(`You can order up to ${limit} free samples. Remove one to add ${finish.name}.`);
  }

  const compact = size === "compact";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={added}
        aria-disabled={blocked || undefined}
        className={cn(
          "group inline-flex min-h-tap items-center justify-center gap-2 rounded-none font-medium transition-colors duration-300",
          compact ? "px-0 text-[0.875rem]" : "px-6 text-[0.9375rem]",
          added && !compact && "border border-green-ink bg-white text-green-ink hover:bg-sage",
          added && compact && "text-green-ink",
          !added && !blocked && !compact && "bg-green-ink text-white hover:bg-green-ink-hover",
          !added && !blocked && compact && "text-navy hover:text-green-ink",
          blocked && (compact ? "text-ink-muted" : "border border-stone bg-transparent text-ink-muted"),
        )}
      >
        {added ? (
          <>
            <Check size={18} />
            <span>
              In your samples
              <span className="sr-only">, select to remove</span>
            </span>
          </>
        ) : blocked ? (
          <span>{`Sample limit reached (${limit})`}</span>
        ) : (
          <>
            <span aria-hidden="true" className="text-lg leading-none">+</span>
            <span>Add to samples</span>
          </>
        )}
      </button>
      {/* Visible on the full-size button; announced for both. */}
      <p aria-live="polite" className={cn("text-[0.8125rem] text-ink-muted", compact && "sr-only")}>
        {message}
        {!compact && message && count > 0 && (
          <>
            {" "}
            <Link href="/samples" className="text-navy underline underline-offset-4">
              View samples
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
