"use client";

import { useState } from "react";
import { Bookmark } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { SavedItem } from "@/lib/saved/saved";
import { useSaved } from "@/lib/saved/use-saved";

/**
 * Save a finish to come back to (and compare). "overlay" is an icon button
 * for the corner of a photo; "text" is a quiet labelled button.
 */
export function SaveButton({
  finish,
  variant = "text",
  className,
}: {
  finish: SavedItem;
  variant?: "overlay" | "text";
  className?: string;
}) {
  const { has, toggle } = useSaved();
  const saved = has(finish.id);
  const [message, setMessage] = useState("");

  return (
    <>
      <button
        type="button"
        aria-pressed={saved}
        onClick={() => {
          toggle(finish);
          setMessage(saved ? `${finish.name} removed from saved finishes.` : `${finish.name} saved.`);
        }}
        className={cn(
          "inline-flex min-h-tap items-center justify-center gap-2 transition-colors duration-300",
          variant === "overlay"
            ? "size-tap bg-off-white/90 text-navy backdrop-blur-sm hover:bg-white"
            : "text-[0.9375rem] text-navy hover:text-green-ink",
          saved && "text-green-ink",
          className,
        )}
      >
        <Bookmark size={18} filled={saved} />
        {variant === "overlay" ? (
          <span className="sr-only">Save {finish.name}</span>
        ) : (
          <span>
            {saved ? "Saved" : "Save"}
            <span className="sr-only"> {finish.name}</span>
          </span>
        )}
      </button>
      <span aria-live="polite" className="sr-only">
        {message}
      </span>
    </>
  );
}
