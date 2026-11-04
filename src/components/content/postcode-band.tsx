import Link from "next/link";
import { PostcodeSearch } from "@/components/where-to-buy/postcode-search";
import type { OnlineRetailer } from "@/lib/catalogue/types";

/**
 * Postcode search that hands off to /where-to-buy, plus the online
 * retailers when given. Works without JavaScript.
 */
export function PostcodeBand({ retailers }: { retailers?: OnlineRetailer[] }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-end">
      <div>
        <p className="eyebrow">Where to buy</p>
        <h2 className="mt-4 text-display-md text-navy">See it, then buy it near you.</h2>
        {retailers?.length ? (
          <p className="mt-4 max-w-md text-ink-muted">
            Search for a stockist near you, or buy online from{" "}
            {retailers.map((r, i) => (
              <span key={r.id}>
                {i > 0 && (i === retailers.length - 1 ? " or " : ", ")}
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener"
                  className="text-navy underline underline-offset-4 hover:text-green-ink"
                >
                  {r.name}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </span>
            ))}
            .
          </p>
        ) : (
          <p className="mt-4 max-w-md text-ink-muted">
            Search for local stockists, or{" "}
            <Link href="/where-to-buy#online" className="text-navy underline underline-offset-4 hover:text-green-ink">
              buy Duratek online
            </Link>
            .
          </p>
        )}
      </div>
      <PostcodeSearch id="postcode-band" className="lg:justify-self-end" />
    </div>
  );
}
