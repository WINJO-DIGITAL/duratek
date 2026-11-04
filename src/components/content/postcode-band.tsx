import Link from "next/link";
import { PostcodeSearch } from "@/components/where-to-buy/postcode-search";

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
      <PostcodeSearch id="postcode-band" className="lg:justify-self-end" />
    </div>
  );
}
