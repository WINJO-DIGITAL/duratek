"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { ArrowRight, Close } from "@/components/ui/icons";
import type { CatalogueEntry } from "@/lib/catalogue/nav";
import { useSamples } from "@/lib/samples/use-samples";
import type { SampleItem } from "@/lib/samples/selection";
import { onOpenSampleTray, setTrayMounted } from "@/lib/samples/tray";

/**
 * The sample tray: a side drawer on desktop, a sheet from the bottom on
 * phones. Every "samples" entry point opens it. It is the same selection as
 * the /samples page, where the request form lives.
 */
export function SampleTray({ catalogue }: { catalogue: CatalogueEntry[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const { items, count, limit, isFull, remove, add } = useSamples();
  const [swapIn, setSwapIn] = useState<SampleItem | null>(null);
  const [message, setMessage] = useState("");
  const byId = new Map(catalogue.map((c) => [c.id, c]));

  useEffect(() => {
    setTrayMounted(true);
    const off = onOpenSampleTray((detail) => {
      setSwapIn(detail.swapIn ?? null);
      setMessage("");
      if (!dialog.current?.open) dialog.current?.showModal();
    });
    return () => {
      setTrayMounted(false);
      off();
    };
  }, []);

  // Navigating away (a link inside the tray, or back) closes it at once.
  useEffect(() => {
    if (dialog.current?.open) dialog.current.close();
  }, [pathname]);

  function close() {
    const d = dialog.current;
    if (!d?.open) return;
    d.setAttribute("data-closing", "");
    const done = () => {
      d.removeAttribute("data-closing");
      d.close();
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) done();
    else setTimeout(done, 220);
  }

  function onRemove(item: SampleItem) {
    remove(item.id);
    if (swapIn && !items.some((i) => i.id === swapIn.id)) {
      add(swapIn);
      setMessage(`${item.name} removed and ${swapIn.name} added. ${count} of ${limit} samples chosen.`);
      setSwapIn(null);
    } else {
      setMessage(`${item.name} removed. ${count - 1} of ${limit} samples chosen.`);
    }
  }

  const compareHref = count >= 2 ? `/compare?f=${items.map((i) => i.slug).join(",")}` : null;

  return (
    <dialog
      ref={dialog}
      aria-labelledby="tray-title"
      onClick={(e) => {
        // Backdrop click closes; so does following any link inside the tray.
        if (e.target === e.currentTarget) close();
        else if ((e.target as HTMLElement).closest("a[href]")) dialog.current?.close();
      }}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      className="sample-tray fixed inset-x-0 bottom-0 top-auto m-0 max-h-[88dvh] w-full max-w-none overflow-hidden rounded-t-card bg-off-white p-0 text-navy shadow-[0_-20px_60px_-30px_rgb(24_54_76/0.5)] lg:inset-y-0 lg:left-auto lg:right-0 lg:h-dvh lg:max-h-none lg:w-[28rem] lg:rounded-none lg:rounded-l-card"
    >
      <div className="flex max-h-[88dvh] flex-col pb-[env(safe-area-inset-bottom)] lg:h-full lg:max-h-none">
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 pb-4 pt-5 sm:px-8 lg:pt-8">
          <div>
            <h2 id="tray-title" className="text-display-sm text-navy">
              Your Samples
            </h2>
            <p className="mt-1 text-[0.9375rem] text-ink-muted">
              <span className="tabular-nums text-navy">
                {count} of {limit}
              </span>{" "}
              free samples chosen
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="-mr-3 -mt-1 flex size-tap shrink-0 items-center justify-center text-navy hover:text-green-ink"
          >
            <Close size={20} />
            <span className="sr-only">Close samples</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-8">
          {swapIn && isFull && (
            <p className="mt-5 notice px-4 py-3 text-[0.9375rem] text-navy">
              You can order up to {limit} free samples. Remove one below and {swapIn.name} takes its place.
            </p>
          )}
          <p aria-live="polite" className="sr-only">
            {message}
          </p>

          <ul className="divide-y divide-line">
            {Array.from({ length: limit }, (_, i) => {
              const item = items[i];
              const entry = item && byId.get(item.id);
              return (
                <li key={item?.id ?? `empty-${i}`} className="flex min-h-24 items-center gap-4 py-4">
                  {item ? (
                    <>
                      <Link href={`/range/${item.slug}`} className="relative size-16 shrink-0 overflow-hidden rounded-control bg-line">
                        {entry?.swatch && (
                          <Image src={entry.swatch.src} alt="" fill sizes="64px" quality={70} className="object-cover" />
                        )}
                        <span className="sr-only">{item.name}</span>
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/range/${item.slug}`}
                          className="font-display text-[1.125rem] leading-tight text-navy hover:text-green-ink"
                        >
                          {item.name}
                        </Link>
                        {entry && <p className="mt-0.5 text-[0.8125rem] text-ink-muted">{entry.detail}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemove(item)}
                        className="-mr-3 flex min-h-tap shrink-0 items-center px-3 text-[0.875rem] text-ink-muted underline-offset-4 hover:text-navy hover:underline"
                      >
                        {swapIn && isFull ? "Swap" : "Remove"}
                        <span className="sr-only"> {item.name}</span>
                      </button>
                    </>
                  ) : (
                    <Link href="/range" className="group flex flex-1 items-center gap-4 text-ink-muted hover:text-navy">
                      <span
                        aria-hidden="true"
                        className="flex size-16 shrink-0 items-center justify-center rounded-control border border-dashed border-oak/40 text-xl font-light transition-colors group-hover:border-navy/50"
                      >
                        +
                      </span>
                      <span className="text-[0.9375rem]">{i === 0 ? "Choose a finish from the range" : "Add another finish"}</span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <footer className="space-y-3 border-t border-line px-5 py-5 sm:px-8 lg:pb-8">
          {count > 0 ? (
            <ButtonLink href="/samples#details-heading" className="w-full">
              {count === 1 ? "Request my free sample" : `Request my ${count} free samples`}
            </ButtonLink>
          ) : (
            <ButtonLink href="/range" className="w-full">
              Browse the Range
            </ButtonLink>
          )}
          <div className="flex flex-wrap items-center justify-between gap-x-6">
            {compareHref ? (
              <Link
                href={compareHref}
                className="inline-flex min-h-tap items-center gap-2 text-[0.9375rem] text-navy underline-offset-4 hover:underline"
              >
                Compare these <ArrowRight size={16} />
              </Link>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={close}
              className="min-h-tap text-[0.9375rem] text-ink-muted underline-offset-4 hover:text-navy hover:underline"
            >
              Keep browsing
            </button>
          </div>
        </footer>
      </div>
    </dialog>
  );
}
