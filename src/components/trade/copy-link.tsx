"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/** A share link with a one-tap copy. */
export function CopyLink({ url, label = "Customer link" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex max-w-2xl flex-wrap items-center gap-3">
      <label className="sr-only" htmlFor={`copy-${url}`}>
        {label}
      </label>
      <input
        id={`copy-${url}`}
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="data min-h-tap min-w-0 flex-1 rounded-control border border-navy/25 bg-white px-3 text-[0.875rem] text-navy"
      />
      <Button
        type="button"
        variant="outline"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            /* the field stays selectable */
          }
        }}
      >
        {copied ? "Copied" : "Copy link"}
      </Button>
    </div>
  );
}
