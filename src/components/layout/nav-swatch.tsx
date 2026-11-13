import Image from "next/image";
import Link from "next/link";
import type { NavFinish } from "@/lib/catalogue/nav";
import { cn } from "@/lib/cn";

/** Finish swatch tile used in the header menus. */
export function NavSwatch({
  finish,
  onNavigate,
  eager = false,
  className,
  style,
  sizes = "160px",
}: {
  finish: NavFinish;
  onNavigate?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  /** Load with the page (low priority) so the photo is ready when the menu opens. */
  eager?: boolean;
  className?: string;
  style?: React.CSSProperties;
  sizes?: string;
}) {
  return (
    <Link href={`/range/${finish.slug}`} onClick={onNavigate} className={cn("group block", className)} style={style}>
      <span className="relative block aspect-square overflow-hidden rounded-control bg-line">
        {finish.image && (
          <Image
            src={finish.image.src}
            alt=""
            fill
            sizes={sizes}
            quality={70}
            loading={eager ? "eager" : undefined}
            fetchPriority={eager ? "low" : undefined}
            placeholder={finish.image.blurDataURL ? "blur" : "empty"}
            blurDataURL={finish.image.blurDataURL}
            className="object-cover transition-transform duration-[900ms] ease-calm group-hover:scale-[1.06] motion-reduce:transition-none"
          />
        )}
      </span>
      <span className="mt-2 flex items-center justify-between gap-2 text-[0.8125rem] text-navy">
        <span className="transition-colors duration-300 group-hover:text-green-ink">{finish.name}</span>
      </span>
    </Link>
  );
}
