import { ArrowRight } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * Postcode search: a plain GET form to /where-to-buy, so it works without
 * JavaScript and the results page is shareable.
 */
export function PostcodeSearch({
  id,
  defaultValue,
  className,
}: {
  id: string;
  defaultValue?: string;
  className?: string;
}) {
  return (
    <form action="/where-to-buy" method="get" role="search" className={cn("flex w-full max-w-xl", className)}>
      <label htmlFor={id} className="sr-only">
        Your postcode
      </label>
      <input
        id={id}
        name="postcode"
        defaultValue={defaultValue}
        inputMode="text"
        autoComplete="postal-code"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={10}
        placeholder="Enter your postcode"
        className="min-h-14 w-full min-w-0 border border-r-0 border-navy/30 bg-white px-5 text-base uppercase text-navy placeholder:normal-case placeholder:text-ink-muted"
      />
      <button
        type="submit"
        className="group inline-flex min-h-14 shrink-0 items-center gap-3 bg-green-ink px-5 font-medium text-white transition-colors hover:bg-green-ink-hover sm:px-6"
      >
        <span>Search</span>
        <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
      </button>
    </form>
  );
}
