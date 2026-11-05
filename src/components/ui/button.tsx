import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ArrowRight } from "./icons";

export type ButtonVariant = "primary" | "on-dark" | "outline" | "quiet" | "quiet-on-dark";

export type ButtonSize = "md" | "lg";

const base =
  "group inline-flex items-center justify-center gap-3 rounded-control font-medium transition-colors duration-300 disabled:cursor-not-allowed";

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
  cn(base, sizes[size], isQuiet(variant) ? "px-0" : padding[size], buttonVariants[variant]);

export const buttonVariants: Record<ButtonVariant, string> = {
  /** Green on light: the one primary action on a screen. */
  primary: "bg-green-ink text-white hover:bg-green-ink-hover",
  /** Cream on navy. */
  "on-dark": "bg-off-white text-navy hover:bg-white",
  outline: "border border-navy/70 text-navy hover:border-navy hover:bg-navy hover:text-off-white",
  /** Quiet secondary link: underline on hover only, no box. */
  quiet: "text-navy underline-offset-[6px] hover:underline",
  "quiet-on-dark": "text-on-dark underline-offset-[6px] hover:underline",
};

export function Arrow() {
  return (
    <ArrowRight
      size={18}
      className="transition-transform duration-300 ease-calm group-hover:translate-x-1 motion-reduce:transition-none"
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
