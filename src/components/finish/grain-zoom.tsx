"use client";

import Image from "next/image";
import { useRef, useState, type PointerEvent } from "react";
import type { CatalogueImage } from "@/lib/catalogue/types";
import { cn } from "@/lib/cn";
import { doubleSizes } from "@/lib/image-sizes";

const SCALE = 2;

interface Origin {
  x: number;
  y: number;
}

const CENTRE: Origin = { x: 50, y: 50 };

/**
 * The plank close up. With a mouse, hovering magnifies the grain under the
 * pointer; with a finger or the keyboard, a tap (Enter) toggles the zoom and
 * dragging pans. The input type is recorded when the press starts, because
 * Safari does not reliably report it on the click itself.
 */
export function GrainZoom({
  image,
  name,
  sizes,
  priority = false,
  className,
}: {
  image: CatalogueImage;
  name: string;
  /** Sizes at display width; the image is requested at twice that so the zoom stays sharp. */
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const frame = useRef<HTMLButtonElement>(null);
  const pointer = useRef<string>("mouse");
  // Where a press started, so the end of a pan is not taken as a tap.
  const pressAt = useRef<{ x: number; y: number } | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState<Origin>(CENTRE);

  function originFrom(e: PointerEvent<HTMLElement>): Origin {
    const r = frame.current!.getBoundingClientRect();
    const clamp = (v: number) => Math.min(100, Math.max(0, v));
    return { x: clamp(((e.clientX - r.left) / r.width) * 100), y: clamp(((e.clientY - r.top) / r.height) * 100) };
  }

  const isMouse = (e: PointerEvent<HTMLElement>) => e.pointerType === "mouse";

  return (
    <button
      ref={frame}
      type="button"
      aria-pressed={zoomed}
      aria-label={zoomed ? `Zoom out of the ${name} grain` : `Look closer at the ${name} grain`}
      onPointerDown={(e) => {
        pointer.current = e.pointerType;
        pressAt.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerEnter={(e) => {
        if (!isMouse(e)) return;
        setOrigin(originFrom(e));
        setZoomed(true);
      }}
      onPointerMove={(e) => {
        // Mouse: follow the pointer. Touch: pan while zoomed and pressed.
        if (isMouse(e) ? zoomed : zoomed && e.pressure > 0) setOrigin(originFrom(e));
      }}
      onPointerLeave={(e) => {
        if (isMouse(e)) setZoomed(false);
      }}
      onClick={(e) => {
        // Mouse users zoom by hovering; a click there does nothing more.
        const fromPointer = e.detail > 0;
        if (fromPointer && pointer.current === "mouse") return;
        const start = pressAt.current;
        pressAt.current = null;
        if (fromPointer && start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) return;
        if (zoomed) return setZoomed(false);
        setOrigin(fromPointer ? originFrom(e as unknown as PointerEvent<HTMLElement>) : CENTRE);
        setZoomed(true);
      }}
      className={cn(
        "group relative block w-full cursor-zoom-in overflow-hidden bg-line",
        zoomed && "cursor-zoom-out touch-none",
        className,
      )}
    >
      <Image
        src={image.src}
        alt={image.alt}
        fill
        priority={priority}
        quality={80}
        sizes={doubleSizes(sizes)}
        placeholder={image.blurDataURL ? "blur" : "empty"}
        blurDataURL={image.blurDataURL}
        draggable={false}
        style={{ transformOrigin: `${origin.x}% ${origin.y}%`, transform: zoomed ? `scale(${SCALE})` : undefined }}
        className="select-none object-cover transition-transform duration-700 ease-calm motion-reduce:transition-none"
      />
      <span
        aria-hidden="true"
        className={cn(
          "absolute bottom-3 left-3 bg-off-white/90 px-2.5 py-1 text-[0.75rem] text-navy backdrop-blur-sm transition-opacity duration-500 ease-calm",
          zoomed && "opacity-0",
        )}
      >
        {/* The visible words are part of the button's spoken name ("Look closer at the … grain"). */}
        Look closer
      </span>
    </button>
  );
}
