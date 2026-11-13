import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ArrowRight } from "./icons";

export type ButtonVariant = "primary" | "on-dark" | "outline" | "quiet" | "quiet-on-dark";

export type ButtonSize = "md" | "lg";

const base =
  "group inline-flex items-center justify-center gap-3 rounded-control font-medium disabled:cursor-not-allowed";

/** Height and type size. `lg` is the hero's single primary action (54px). */
const sizes: Record<ButtonSize, string> = {
  md: "min-h-tap text-[0.9375rem]",
  lg: "min-h-cta text-base",
};

/** Boxed variants get horizontal padding by size; quiet links get none. */
const padding: Record<ButtonSize, string> = { md: "px-6", lg: "px-8" };
const isQuiet = (v: ButtonVariant) => v === "quiet" || v === "quiet-on-dark";
/** Classes for a button look on another element (e.g. a link that opens a dialog). */
export const buttonClass = (variant: ButtonVariant = "primary", size: ButtonSize = "md") => classesFor(variant, size);

const classesFor = (variant: ButtonVariant, size: ButtonSize) =>
  cn(
    base,
    isQuiet(variant) ? "min-h-tap text-base" : cn(sizes[size], padding[size], "transition-colors duration-300"),
    buttonVariants[variant],
  );

export const buttonVariants: Record<ButtonVariant, string> = {
  /** Green on light: the one primary action on a screen. */
  primary: "bg-green-ink text-white hover:bg-green-ink-hover",
  /** Cream on navy. */
  "on-dark": "bg-off-white text-navy hover:bg-white",
  outline: "border border-navy/70 text-navy hover:border-navy hover:bg-navy hover:text-off-white",
  /** Quiet link with intent: thin green underline that shifts to navy on hover; the arrow nudges. */
  quiet:
    "text-navy underline decoration-green decoration-1 underline-offset-4 transition-[text-decoration-color] duration-200 ease-out hover:decoration-navy focus-visible:decoration-navy",
  "quiet-on-dark":
    "text-on-dark underline decoration-white/40 decoration-1 underline-offset-4 transition-[text-decoration-color] duration-200 ease-out hover:decoration-white focus-visible:decoration-white",
};

export function Arrow() {
  return (
    <ArrowRight
      size={18}
      className="transition-transform duration-200 ease-out group-hover:translate-x-[3px] group-focus-visible:translate-x-[3px] motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
    />
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  arrow = true,
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize; arrow?: boolean; children: ReactNode }) {
  return (
    <Link className={cn(classesFor(variant, size), className)} {...props}>
      <span>{children}</span>
      {arrow && <Arrow />}
    </Link>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  arrow = false,
  className,
  children,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize; arrow?: boolean }) {
  return (
    <button className={cn(classesFor(variant, size), className)} {...props}>
      <span>{children}</span>
      {arrow && <Arrow />}
    </button>
  );
}
