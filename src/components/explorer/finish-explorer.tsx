"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AddToSamplesButton } from "@/components/samples/add-to-samples-button";
import { ArrowLeft, ArrowRight } from "@/components/ui/icons";
import { matches, type FilterableFinish, type RangeFilters } from "@/lib/catalogue/filter";
import type { FormatOption } from "@/lib/catalogue/format";
import type { CatalogueImage } from "@/lib/catalogue/types";
import { cn } from "@/lib/cn";
import { colourFamilyLabel } from "@/lib/config";
import { gesture, keepPosition, step, type ExplorerView } from "@/lib/explorer/explorer";

export interface ExplorerFinish extends FilterableFinish {
  slug: string;
  /** "Natural oak · Standard plank" */
  detail: string;
  measures: string;
  sampleAvailable?: boolean;
  grain?: CatalogueImage;
  room?: CatalogueImage;
  swatch?: CatalogueImage;
}

/** Cross-fade between photographs: slow and deliberate. */
const FADE_MS = 900;

/**
 * The finish explorer: every finish, full screen. Swipe, use the arrows or
 * the arrow keys to move between finishes; tap the photograph (or the
 * Room / Grain switch) to change view; filter by colour and format; add a
 * sample without leaving. The finish, view and filters live in the URL, so
 * any view can be linked to.
 */
export function FinishExplorer({
  finishes,
  formats,
  colourSwatches,
}: {
  finishes: ExplorerFinish[];
  formats: FormatOption[];
  colourSwatches: Record<string, CatalogueImage | undefined>;
}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const [filters, setFilters] = useState<RangeFilters>(() => ({
    style: params.get("style") || null,
    format: params.get("format") || null,
    colour: params.get("colour") || null,
    tone: null,
    priceMin: null,
    priceMax: null,
    q: "",
  }));
  const visible = finishes.filter((f) => matches(f, filters));
  const [slug, setSlug] = useState<string | null>(() => params.get("finish"));
  const index = keepPosition(visible, slug);
  const current = visible[index];

  const [view, setView] = useState<ExplorerView>(() => (params.get("view") === "grain" ? "grain" : "room"));
  // Finishes without a room photograph only have the grain.
  const shownView: ExplorerView = view === "room" && current?.room ? "room" : "grain";
  const layerKey = current ? `${current.slug}:${shownView}` : "";
  // The outgoing photograph stays opaque beneath the incoming one.
  const [previousKey, setPreviousKey] = useState<string | null>(null);
  const [lastKey, setLastKey] = useState(layerKey);
  if (layerKey !== lastKey) {
    setPreviousKey(lastKey);
    setLastKey(layerKey);
  }

  const press = useRef<{ x: number; y: number; id: number } | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLUListElement>(null);
  const stripPhone = useRef<HTMLUListElement>(null);

  // Keep the URL in step (replace, not push: arrowing through finishes
  // shouldn't fill the back button).
  useEffect(() => {
    if (!current) return;
    const sp = new URLSearchParams();
    sp.set("finish", current.slug);
    if (shownView === "grain") sp.set("view", "grain");
    if (filters.colour) sp.set("colour", filters.colour);
    if (filters.format) sp.set("format", filters.format);
    if (filters.style) sp.set("style", filters.style);
    window.history.replaceState(null, "", `${pathname}?${sp.toString()}`);
  }, [current, shownView, filters, pathname]);

  // Keep the current swatch in view in the strip.
  useEffect(() => {
    // Scroll the phone strip itself (not the page) so the current swatch is in view.
    const list = stripPhone.current;
    const el = list?.querySelector<HTMLElement>("[aria-current=true]");
    if (list && el) list.scrollTo({ left: el.offsetLeft - list.clientWidth / 2 + el.clientWidth / 2, behavior: smooth() });
  }, [index, visible.length]);

  const filterBar = (
    <Filters
      filters={filters}
      formats={formats}
      colours={[...new Set(finishes.map((f) => f.colourFamily))]}
      colourSwatches={colourSwatches}
      count={visible.length}
      onChange={(next) => {
        // The finish on screen is the one to keep, even if a filter had hidden an earlier pick.
        const nextFilters = { ...filters, ...next };
        const nextVisible = finishes.filter((f) => matches(f, nextFilters));
        if (nextVisible.length) setSlug(nextVisible[keepPosition(nextVisible, current?.slug ?? slug)].slug);
        setFilters(nextFilters);
      }}
    />
  );
  const frame = "flex h-[calc(100svh-var(--spacing-header)-var(--spacing-bottom-bar)-env(safe-area-inset-bottom))] flex-col bg-navy lg:h-[calc(100svh-var(--spacing-header))]";

  if (!current) {
    return (
      <section aria-label="Finish explorer" className={frame}>
        {filterBar}
        <div className="on-dark flex flex-1 flex-col items-start justify-center gap-4 container-page">
          <h1 className="text-display-md font-light text-on-dark">No Finishes Match Those Filters.</h1>
          <button
            type="button"
            onClick={() => setFilters({ style: null, format: null, colour: null, tone: null, priceMin: null, priceMax: null, q: "" })}
            className="min-h-tap text-on-dark underline underline-offset-4"
          >
            Show every finish
          </button>
        </div>
      </section>
    );
  }

  const go = (delta: number) => setSlug(visible[step(index, delta, visible.length)].slug);
  const toggleView = () => setView(shownView === "room" ? "grain" : "room");
  const layers = [previousKey, layerKey].filter((k, i, all): k is string => !!k && all.indexOf(k) === i);
  // Neighbours are loaded ahead, so the next change never waits.
  const neighbours = visible.length > 1 ? [visible[step(index, 1, visible.length)], visible[step(index, -1, visible.length)]] : [];

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Finish explorer"
      className={frame}
    >
      {filterBar}

      <div
        ref={stage}
        tabIndex={0}
        aria-label={`${current.name}, ${shownView === "room" ? "in a room" : "grain close up"}. Use the arrow keys to move between finishes, Enter to switch view.`}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(1);
          else if (e.key === "ArrowLeft") go(-1);
          else if (e.key === "Enter" || e.key === " ") toggleView();
          else return;
          e.preventDefault();
        }}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("a, button")) return;
          press.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
        }}
        onPointerUp={(e) => {
          const start = press.current;
          press.current = null;
          if (!start || start.id !== e.pointerId) return;
          const g = gesture(e.clientX - start.x, e.clientY - start.y);
          if (g === "next") go(1);
          else if (g === "previous") go(-1);
          else if (g === "tap") toggleView();
        }}
        onPointerCancel={() => (press.current = null)}
        className="relative isolate min-h-0 flex-1 cursor-pointer touch-pan-y select-none overflow-hidden outline-offset-[-4px]"
      >
        {/* Photographs: incoming fades in over the still outgoing one. */}
        {layers.map((key) => {
          const [s, v] = key.split(":");
          const f = finishes.find((x) => x.slug === s);
          const img = v === "room" ? f?.room : f?.grain;
          if (!img) return null;
          const incoming = key === layerKey;
          return (
            <div
              key={key}
              aria-hidden="true"
              className="absolute inset-0 animate-[explorer-in_var(--fade)_ease-in-out_both] motion-reduce:animate-none"
              style={{ zIndex: incoming ? 2 : 1, ["--fade" as string]: incoming ? `${FADE_MS}ms` : "0ms" }}
            >
              {v === "room" && img.width < img.height ? (
                <>
                  {/* Wide screens: a portrait photograph keeps its own shape (cropping it
                      to the screen would enlarge it until soft), over the grain. */}
                  {f?.grain && (
                    <div className="absolute inset-0 hidden lg:block">
                      <Photo image={f.grain} sizes="100vw" />
                      <div className="absolute inset-0 bg-black/30" />
                    </div>
                  )}
                  <div
                    className="absolute inset-0 lg:inset-auto lg:bottom-0 lg:right-[calc(var(--spacing-gutter)+4.5rem)] lg:top-0"
                    style={{ ["--ratio" as string]: `${img.width} / ${img.height}` }}
                  >
                    <div className="relative size-full lg:aspect-[var(--ratio)] lg:w-auto">
                      <Photo image={img} sizes="(min-width: 1024px) 40vw, 100vw" room priority={f?.slug === finishes[0]?.slug} />
                    </div>
                  </div>
                </>
              ) : (
                <Photo image={img} sizes="100vw" room={v === "room"} priority={f?.slug === finishes[0]?.slug} />
              )}
            </div>
          );
        })}
        {/* Preload the neighbours in the current view. */}
        <div aria-hidden="true" className="pointer-events-none absolute size-px overflow-hidden opacity-0">
          {neighbours.map((n) => {
            const img = shownView === "room" && n.room ? n.room : n.grain;
            return img ? <Image key={n.slug} src={img.src} alt="" width={16} height={16} sizes="100vw" quality={80} loading="eager" /> : null;
          })}
        </div>

        {/* Scrim: neutral, deepest behind the label, so the floor keeps its colour. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[3] bg-gradient-to-t from-black/75 via-black/30 via-35% to-transparent to-65% lg:from-black/70 lg:via-black/20 lg:to-55%"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-[3] h-28 bg-gradient-to-b from-black/45 to-transparent lg:hidden"
        />

        <ViewSwitch
          view={shownView}
          hasRoom={!!current.room}
          onChange={setView}
          className="absolute right-[var(--spacing-gutter)] top-4 z-[5] hidden lg:flex"
        />

        {visible.length > 1 && (
          <div className="absolute inset-x-0 top-0 z-[5] cursor-default lg:hidden">
            <Strip
              finishes={visible}
              index={index}
              onPick={setSlug}
              listRef={stripPhone}
              className="scrollbar-none flex overflow-x-auto px-[var(--spacing-gutter)] py-2"
            />
          </div>
        )}

        {visible.length > 1 && (
          <>
            <StageArrow side="left" onClick={() => go(-1)} label="Previous finish" />
            <StageArrow side="right" onClick={() => go(1)} label="Next finish" />
          </>
        )}

        <div className="on-dark absolute inset-x-0 bottom-0 z-[5] cursor-default">
          <div className="container-page grid gap-5 pb-5 sm:pb-8 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-10">
            <div aria-live="polite" key={current.slug} className="animate-[label-in_700ms_var(--ease-calm)]">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[0.8125rem] tabular-nums text-on-dark/85">
                  {index + 1} / {visible.length}
                </p>
                <ViewSwitch view={shownView} hasRoom={!!current.room} onChange={setView} className="flex lg:hidden" />
              </div>
              <h1 className="mt-1 text-display-sm font-light text-on-dark sm:text-display-md">{current.name}</h1>
              <p className="mt-1 text-[0.9375rem] text-on-dark/85">{current.detail}</p>
              {current.measures && <p className="data mt-1 text-[0.8125rem] text-on-dark/75">{current.measures}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
                <AddToSamplesButton
                  finish={{ id: current.id, slug: current.slug, name: current.name, unavailable: current.sampleAvailable === false }}
                  quietMessage
                />
                <Link
                  href={`/range/${current.slug}`}
                  className="inline-flex min-h-tap items-center gap-2 text-[0.9375rem] text-on-dark underline-offset-4 hover:underline"
                >
                  View finish <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            {visible.length > 1 && (
              <Strip
                finishes={visible}
                index={index}
                onPick={setSlug}
                listRef={strip}
                className="hidden lg:flex lg:max-w-[34rem] lg:flex-wrap lg:justify-end"
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Photo({
  image,
  sizes,
  room = false,
  priority = false,
}: {
  image: CatalogueImage;
  sizes: string;
  room?: boolean;
  priority?: boolean;
}) {
  return (
    <Image
      src={image.src}
      alt=""
      fill
      sizes={sizes}
      quality={80}
      priority={priority}
      draggable={false}
      placeholder={image.blurDataURL ? "blur" : "empty"}
      blurDataURL={image.blurDataURL}
      className={cn("object-cover", room && "object-[50%_72%]")}
    />
  );
}

const smooth = (): ScrollBehavior =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

function ViewSwitch({
  view,
  hasRoom,
  onChange,
  className,
}: {
  view: ExplorerView;
  hasRoom: boolean;
  onChange: (v: ExplorerView) => void;
  className?: string;
}) {
  return (
    <div role="group" aria-label="View" className={cn("rounded-control bg-off-white/90 p-1 backdrop-blur-sm", className)}>
      {(["room", "grain"] as const).map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={view === v}
          disabled={v === "room" && !hasRoom}
          onClick={() => onChange(v)}
          className={cn(
            "min-h-tap rounded-[0.375rem] px-4 text-[0.875rem] font-medium transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-40",
            view === v ? "bg-navy text-off-white" : "text-navy hover:text-green-ink",
          )}
        >
          {v === "room" ? "Room" : "Grain"}
        </button>
      ))}
    </div>
  );
}

function Strip({
  finishes,
  index,
  onPick,
  listRef,
  className,
}: {
  finishes: ExplorerFinish[];
  index: number;
  onPick: (slug: string) => void;
  listRef: React.Ref<HTMLUListElement>;
  className?: string;
}) {
  return (
    <ul ref={listRef} aria-label="Finishes" className={cn("gap-1", className)}>
      {finishes.map((f, i) => (
        <li key={f.slug} className="shrink-0">
          <button
            type="button"
            aria-current={i === index}
            onClick={() => onPick(f.slug)}
            className="group relative flex size-tap items-center justify-center rounded-full"
          >
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-0 rounded-full border transition-colors duration-300",
                i === index ? "border-white" : "border-transparent group-hover:border-white/40",
              )}
            />
            <span className="relative block size-8 overflow-hidden rounded-full bg-white/20">
              {f.swatch && <Image src={f.swatch.src} alt="" fill sizes="32px" quality={70} className="object-cover" />}
            </span>
            <span className="sr-only">{f.name}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function StageArrow({ side, onClick, label }: { side: "left" | "right"; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "absolute top-1/2 z-[5] hidden size-14 -translate-y-1/2 items-center justify-center rounded-control bg-off-white/85 text-navy backdrop-blur-sm transition-colors duration-300 hover:bg-white sm:flex",
        side === "left" ? "left-[var(--spacing-gutter)]" : "right-[var(--spacing-gutter)]",
      )}
    >
      {side === "left" ? <ArrowLeft size={20} /> : <ArrowRight size={20} />}
      <span className="sr-only">{label}</span>
    </button>
  );
}

function Filters({
  filters,
  formats,
  colours,
  colourSwatches,
  count,
  onChange,
}: {
  filters: RangeFilters;
  formats: FormatOption[];
  colours: string[];
  colourSwatches: Record<string, CatalogueImage | undefined>;
  count: number;
  onChange: (next: Partial<RangeFilters>) => void;
}) {
  return (
    <div className="border-b border-line bg-off-white">
      <div
        role="group"
        aria-label={`Filter finishes, ${count} shown`}
        className="container-page scrollbar-none flex items-center gap-2 overflow-x-auto py-2"
      >
        <Chip pressed={!filters.colour && !filters.format} onClick={() => onChange({ colour: null, format: null })}>
          All
        </Chip>
        <span aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-line" />
        {colours.map((c) => (
          <Chip key={c} pressed={filters.colour === c} onClick={() => onChange({ colour: filters.colour === c ? null : c })}>
            {colourSwatches[c] && (
              <span className="relative block size-5 shrink-0 overflow-hidden rounded-full shadow-[inset_0_0_0_1px_rgb(24_54_76/0.1)]">
                <Image src={colourSwatches[c]!.src} alt="" fill sizes="20px" quality={70} className="object-cover" />
              </span>
            )}
            {colourFamilyLabel(c)}
          </Chip>
        ))}
        {formats.length > 1 && (
          <>
            <span aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-line" />
            {formats.map((f) => (
              <Chip
                key={f.format}
                pressed={filters.format === f.format}
                onClick={() => onChange({ format: filters.format === f.format ? null : f.format })}
              >
                {f.label}
              </Chip>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "flex min-h-tap shrink-0 items-center gap-2 rounded-control border px-3 text-[0.875rem] transition-colors duration-300",
        pressed ? "border-navy bg-navy text-off-white" : "border-navy/20 text-navy hover:border-navy",
      )}
    >
      {children}
    </button>
  );
}
