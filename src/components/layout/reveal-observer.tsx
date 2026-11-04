"use client";

import { useEffect } from "react";

const SELECTOR = ".reveal, .reveal-img";
const STAGGER = 90; // ms between elements that come into view together
const MAX_STAGGER_STEPS = 5;
const EASE = "cubic-bezier(0.22, 0.61, 0.36, 1)"; // --ease-calm

/* Text: fades in from a soft blur and rises into place. */
const TEXT: Keyframe[] = [
  { opacity: 0, translate: "0 24px", filter: "blur(8px)" },
  { opacity: 1, translate: "0 0", filter: "blur(0px)" },
];
/* Photographs: the frame unmasks, the image inside settles from a slight zoom. */
const FRAME: Keyframe[] = [
  { clipPath: "inset(10% 4% 0 4%)", opacity: 0.4 },
  { clipPath: "inset(0% 0% 0% 0%)", opacity: 1 },
];
const IMAGE: Keyframe[] = [{ scale: "1.08" }, { scale: "1" }];

/** Paused at the first frame, so an element waits hidden until revealed. */
function hold(el: Element, frames: Keyframe[]) {
  const a = el.animate(frames, { duration: 1, fill: "both" });
  a.pause();
  return a;
}

/**
 * Scroll reveals, played once per element as it comes into view: text fades
 * in from a soft blur and rises into place; photographs unmask and settle
 * from a slight zoom. Elements arriving together follow one another.
 *
 * Driven entirely by the Web Animations API: no classes or attributes are
 * changed, so it cannot disturb React hydration, and it works in every
 * browser (the CSS scroll-timeline version it replaces did nothing in iOS
 * Safari). Only elements below the fold, and not off to the side in a swipe
 * row, are hidden, so anything already on screen never flickers. With
 * reduced motion nothing is hidden. New content (route changes) is picked
 * up by a MutationObserver.
 */
export function RevealObserver() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window) || typeof Element.prototype.animate !== "function") return;

    const seen = new WeakSet<Element>();
    const held = new Map<Element, Animation[]>();

    const release = (el: Element) => {
      held.get(el)?.forEach((a) => a.cancel());
      held.delete(el);
    };

    const play = (el: HTMLElement, delay: number) => {
      // Created in the same task as the held frames are cancelled: no flash.
      release(el);
      const opts = (duration: number): KeyframeAnimationOptions => ({ duration, delay, easing: EASE, fill: "backwards" });
      if (el.classList.contains("reveal-img")) {
        el.animate(FRAME, opts(1200));
        el.querySelectorAll("img").forEach((img) => img.animate(IMAGE, opts(1600)));
      } else {
        el.animate(TEXT, opts(1000));
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        const showing = entries
          .filter((e) => e.isIntersecting || e.boundingClientRect.bottom < 0)
          .sort(
            (a, b) =>
              a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left,
          );
        let step = 0;
        for (const entry of showing) {
          const el = entry.target as HTMLElement;
          io.unobserve(el);
          if (!entry.isIntersecting) {
            release(el); // scrolled past without being seen (a jump): just show it
            continue;
          }
          play(el, Math.min(step++, MAX_STAGGER_STEPS) * STAGGER);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );

    const prepare = (root: ParentNode) => {
      const found: HTMLElement[] = [];
      if (root instanceof HTMLElement && root.matches(SELECTOR)) found.push(root);
      root.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => found.push(el));
      for (const el of found) {
        if (seen.has(el)) continue;
        seen.add(el);
        const r = el.getBoundingClientRect();
        // Only hide what is below the fold and horizontally on screen.
        if (r.top < window.innerHeight || r.left >= window.innerWidth || r.right <= 0) continue;
        held.set(
          el,
          el.classList.contains("reveal-img")
            ? [hold(el, FRAME), ...Array.from(el.querySelectorAll("img"), (img) => hold(img, IMAGE))]
            : [hold(el, TEXT)],
        );
        io.observe(el);
      }
    };

    prepare(document);
    const mo = new MutationObserver((records) => {
      for (const r of records) r.addedNodes.forEach((n) => n.nodeType === 1 && prepare(n as Element));
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      held.forEach((anims) => anims.forEach((a) => a.cancel()));
      held.clear();
    };
  }, []);

  return null;
}
