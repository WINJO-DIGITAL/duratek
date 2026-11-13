"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { useSaved } from "@/lib/saved/use-saved";

/** Header link to saved finishes, with a count once anything is saved. */
export function SavedLink({ onDark, className }: { onDark: boolean; className?: string }) {
  const { count } = useSaved();
  const current = usePathname() === "/saved";
  return (
    <Link
      href="/saved"
      aria-current={current ? "page" : undefined}
      className={cn(
        "relative flex size-tap items-center justify-center transition-colors duration-300",
        onDark ? "text-white/90 hover:text-white" : current ? "text-green-ink" : "text-navy hover:text-green-ink",
        className,
      )}
    >
      <Bookmark size={20} filled={current} />
      <span className="sr-only">Saved finishes{count > 0 ? `, ${count}` : ""}</span>
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute right-0.5 top-1 min-w-4 rounded-full bg-navy px-1 text-center text-[0.625rem] font-semibold leading-4 text-white tabular-nums"
        >
          {count}
        </span>
      )}
    </Link>
  );
}
