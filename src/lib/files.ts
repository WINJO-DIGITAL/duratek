/**
 * What an uploaded image really is, from its bytes, never from its name or the
 * type the browser claimed. SVG and HTML are never accepted: they can carry
 * scripts. A file must also be nothing but the image: content appended after
 * the end of a PNG or JPEG (a "polyglot", an image that is also a page) is refused.
 */
export type ImageMime = "image/png" | "image/jpeg" | "image/webp" | "image/avif";

export const IMAGE_EXTENSION: Record<ImageMime, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/avif": "avif" };

const ascii = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...b.slice(from, to));
const u32 = (b: Uint8Array, at: number) => ((b[at] << 24) | (b[at + 1] << 16) | (b[at + 2] << 8) | b[at + 3]) >>> 0;

export function sniffImage(b: Uint8Array): ImageMime | null {
  if (b.length >= 8 && b[0] === 0x89 && ascii(b, 1, 4) === "PNG" && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 12 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP") return "image/webp";
  if (b.length >= 12 && ascii(b, 4, 8) === "ftyp" && /^(avif|avis)$/.test(ascii(b, 8, 12))) return "image/avif";
  return null;
}

/** True when the file is exactly one well-formed image of that type, with nothing before or after it. */
export function isWholeImage(b: Uint8Array, mime: ImageMime): boolean {
  switch (mime) {
    case "image/png": {
      // Walk the chunks: IHDR first, IEND last, and the file ends exactly there.
      let at = 8;
      let first = true;
      while (at + 12 <= b.length) {
        const len = u32(b, at);
        const type = ascii(b, at + 4, at + 8);
        if (first && type !== "IHDR") return false;
        first = false;
        const next = at + 12 + len;
        if (next > b.length) return false;
        if (type === "IEND") return next === b.length;
        at = next;
      }
      return false;
    }
    case "image/jpeg":
      return b.length > 4 && b[b.length - 2] === 0xff && b[b.length - 1] === 0xd9;
    case "image/webp":
      return u32(new Uint8Array([b[7], b[6], b[5], b[4]]), 0) + 8 === b.length;
    case "image/avif": {
      // ISO base media boxes, back to back, filling the file.
      let at = 0;
      while (at + 8 <= b.length) {
        const size = u32(b, at);
        if (size < 8) return false;
        at += size;
      }
      return at === b.length;
    }
  }
}
