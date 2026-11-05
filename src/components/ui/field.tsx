import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** A labelled text input in the site's soft style, with its error tied to it. */
export function Field({
  name,
  label,
  hint,
  error,
  className,
  ...input
}: {
  name: string;
  label: string;
  hint?: string;
  error?: string;
} & Omit<ComponentProps<"input">, "name">) {
  const id = `field-${name}`;
  const described = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="flex items-baseline justify-between gap-3 text-[0.9375rem] font-medium text-navy">
        {label}
        {hint && (
          <span id={`${id}-hint`} className="text-[0.8125rem] font-normal text-ink-muted">
            {hint}
          </span>
        )}
      </label>
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={described}
        className={cn(
          "mt-2 min-h-14 w-full rounded-control border bg-white px-4 text-base text-navy transition-colors focus:border-navy",
          error ? "border-error" : "border-navy/25",
          className,
        )}
        {...input}
      />
      {error && (
        <p id={`${id}-error`} className="mt-2 text-[0.875rem] text-error">
          {error}
        </p>
      )}
    </div>
  );
}
