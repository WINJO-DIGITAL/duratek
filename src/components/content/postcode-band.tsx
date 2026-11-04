import Link from "next/link";
import { ArrowRight } from "@/components/ui/icons";

/** Postcode search that hands off to /where-to-buy. Works without JavaScript. */
export function PostcodeBand() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-end">
      <div>
        <p className="eyebrow">Where to buy</p>
        <h2 className="mt-4 text-display-md text-navy">See it, then buy it near you.</h2>
        <p className="mt-4 max-w-md text-ink-muted">
          Search for local stockists, or{" "}
          <Link href="/where-to-buy#online" className="text-navy underline underline-offset-4 hover:text-green-ink">
            buy Duratek online
          </Link>
          .
        </p>
      </div>
      <form action="/where-to-buy" method="get" role="search" className="flex w-full max-w-xl gap-0 lg:justify-self-end">
        <label htmlFor="postcode-band" className="sr-only">
          Your postcode
        </label>
        <input
          id="postcode-band"
          name="postcode"
          inputMode="text"
          autoComplete="postal-code"
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
    </div>
  );
}
