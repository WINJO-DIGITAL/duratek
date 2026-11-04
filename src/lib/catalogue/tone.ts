import "server-only";

/**
 * Lightness of a finish (0 dark .. 1 light), measured from its swatch's blur
 * placeholder: a tiny embedded image, so no download is needed. Used to
 * order the range light to dark. Returns undefined if it cannot be measured.
 */
export async function measureTone(dataUrl: string | undefined): Promise<number | undefined> {
  if (!dataUrl?.startsWith("data:image/")) return undefined;
  try {
    const { default: sharp } = await import("sharp");
    const buf = Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
    const { data } = await sharp(buf).removeAlpha().resize(8, 8, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
    let sum = 0;
    for (let i = 0; i < data.length; i += 3) sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    return Math.round((sum / (data.length / 3) / 255) * 1000) / 1000;
  } catch {
    return undefined;
  }
}
