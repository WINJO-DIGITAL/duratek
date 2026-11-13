"use client";

import { useState } from "react";
import { SampleTrayLink } from "@/components/samples/sample-tray-link";
import { Check } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { useSamples } from "@/lib/samples/use-samples";
import type { SampleItem } from "@/lib/samples/selection";
import { openSampleTray } from "@/lib/samples/tray";

/**
 * "Add to samples". Adds calmly with a spoken and visible confirmation; when
 * the tray is full it explains the limit instead of failing silently.
 */
export function AddToSamplesButton({
  finish,
  size = "default",
  quietMessage = false,
  short = false,
  className,
}: {
  finish: SampleItem;
  size?: "default" | "compact";
  /** Announce the confirmation to screen readers only (where there is no room to show it). */
  quietMessage?: boolean;
  /** Short visible labels for narrow columns; the full wording stays for screen readers. */
  short?: boolean;
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
    if (result === "full") {
      // Explain the limit, and offer the swap in the tray where possible.
      setMessage(`You can order up to ${limit} free samples. Remove one to add ${finish.name}.`);
      openSampleTray({ swapIn: finish });
    }
  }

  const compact = size === "compact";
  const hideMessage = compact || quietMessage;

  if (finish.unavailable && !added) {
    return (
      <p className={cn("inline-flex min-h-tap items-center text-ink-muted", compact ? "text-[0.875rem]" : "px-2 text-[0.9375rem]", className)}>
        Samples out of stock just now
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={blocked ? undefined : added}
        aria-haspopup={blocked ? "dialog" : undefined}
        className={cn(
          "group inline-flex min-h-tap items-center justify-center gap-2 rounded-control font-medium transition-colors duration-300",
          compact ? "justify-start px-0 text-left text-[0.875rem]" : "px-6 text-[0.9375rem]",
          added && !compact && "border border-green-ink bg-white text-green-ink hover:bg-off-white",
          added && compact && "text-green-ink",
          !added && !blocked && !compact && "bg-green-ink text-white hover:bg-green-ink-hover",
          !added && !blocked && compact && "text-navy hover:text-green-ink",
          blocked && (compact ? "text-ink-muted hover:text-navy" : "border border-navy/30 bg-off-white/95 text-navy hover:border-navy hover:bg-white"),
        )}
      >
        {added ? (
          <>
            <Check size={18} />
            <span>
              {short ? (
                <>
                  In samples<span className="sr-only">: {finish.name}</span>
                </>
              ) : (
                "In your samples"
              )}
              <span className="sr-only">, select to remove</span>
            </span>
          </>
        ) : blocked ? (
          <span>
            {short ? "Swap" : "Swap into samples"}
            <span className="sr-only">
              {short ? ` ${finish.name} into samples` : ""}. You have chosen {limit}, the most per request.
            </span>
          </span>
        ) : (
          <>
            <span aria-hidden="true" className="text-lg leading-none">+</span>
            {short ? (
              <span>
                Sample<span className="sr-only">: add {finish.name} to samples</span>
              </span>
            ) : (
              <span>Add to samples</span>
            )}
          </>
        )}
      </button>
      {/* Visible on the full-size button; announced for both. */}
      <p aria-live="polite" className={cn("text-[0.8125rem] text-ink-muted", hideMessage && "sr-only")}>
        {message}
        {!hideMessage && message && count > 0 && (
          <>
            {" "}
            <SampleTrayLink className="text-navy underline underline-offset-4">
              View samples
            </SampleTrayLink>
          </>
        )}
      </p>
    </div>
  );
}
