import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ArrowRight } from "./icons";

export type ButtonVariant = "primary" | "on-dark" | "outline" | "quiet" | "quiet-on-dark";

const base =
  "group inline-flex min-h-tap items-center justify-center gap-3 rounded-none text-[0.9375rem] font-medium transition-colors duration-300 disabled:cursor-not-allowed";

export const buttonVariants: Record<ButtonVariant, string> = {
  /** Green on light: the one primary action on a screen. */
  primary: "bg-green-ink px-6 text-white hover:bg-green-ink-hover",
  /** Cream on navy. */
  "on-dark": "bg-off-white px-6 text-navy hover:bg-white",
  outline: "border border-navy px-6 text-navy hover:bg-navy hover:text-off-white",
  /** Quiet secondary link: underline on hover only, no box. */
  quiet: "px-0 text-navy underline-offset-[6px] hover:underline",
  "quiet-on-dark": "px-0 text-on-dark underline-offset-[6px] hover:underline",
};

function Arrow() {
  return (
    <ArrowRight
      size={18}
      className="transition-transform duration-300 ease-calm group-hover:translate-x-1 motion-reduce:transition-none"
    />
  );
}

export function ButtonLink({
  variant = "primary",
  arrow = true,
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; arrow?: boolean; children: ReactNode }) {
  return (
    <Link className={cn(base, buttonVariants[variant], className)} {...props}>
      <span>{children}</span>
      {arrow && <Arrow />}
    </Link>
  );
}

export function Button({
  variant = "primary",
  arrow = false,
  className,
  children,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; arrow?: boolean }) {
  return (
    <button className={cn(base, buttonVariants[variant], className)} {...props}>
      <span>{children}</span>
      {arrow && <Arrow />}
    </button>
  );
}
