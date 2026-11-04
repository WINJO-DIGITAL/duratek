"use client";

import { Arrow, buttonClass, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { SampleTrayLink } from "./sample-tray-link";

/** "Order free samples" as a button that opens the sample tray. */
export function OrderSamplesButton({
  variant = "primary",
  size = "md",
  arrow = true,
  className,
  children = "Order free samples",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  arrow?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <SampleTrayLink className={cn(buttonClass(variant, size), className)}>
      <span>{children}</span>
      {arrow && <Arrow />}
    </SampleTrayLink>
  );
}
