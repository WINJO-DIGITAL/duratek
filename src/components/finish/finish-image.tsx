import Image from "next/image";
import type { CatalogueImage } from "@/lib/catalogue/types";
import { cn } from "@/lib/cn";

/**
 * next/image for catalogue photography, filling its (sized) parent. The parent
 * must set an aspect ratio or height so there is no layout shift.
 */
export function FinishImage({
  image,
  sizes,
  priority = false,
  className,
  quality = 70,
}: {
  image: CatalogueImage;
  sizes: string;
  priority?: boolean;
  className?: string;
  quality?: 70 | 80;
}) {
  return (
    <Image
      src={image.src}
      alt={image.alt}
      fill
      sizes={sizes}
      quality={quality}
      priority={priority}
      placeholder={image.blurDataURL ? "blur" : "empty"}
      blurDataURL={image.blurDataURL}
      className={cn("object-cover", className)}
    />
  );
}
