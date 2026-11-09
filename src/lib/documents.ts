export type DocumentType = "tech_sheet" | "warranty" | "certificate" | "fitting_guide" | "brochure" | "marketing_photo" | "brand_asset";

export const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: "brochure", label: "Brochure" },
  { value: "tech_sheet", label: "Technical sheet" },
  { value: "fitting_guide", label: "Installation guide" },
  { value: "warranty", label: "Warranty" },
  { value: "certificate", label: "Test certificate" },
  { value: "marketing_photo", label: "Marketing photography" },
  { value: "brand_asset", label: "Brand asset" },
];

export const documentTypeLabel = (t: DocumentType) => DOCUMENT_TYPES.find((d) => d.value === t)?.label ?? t;

/** Files the owner can upload. Kept under the hosting platform's 4.5 MB request limit. */
export const DOCUMENT_MAX_BYTES = 4 * 1024 * 1024;
export type FileMime = "application/pdf" | "image/png" | "image/jpeg" | "image/webp" | "application/zip";
export const DOCUMENT_MIME: Record<FileMime, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/zip": "zip",
};

/** What each kind of document may be. SVG is never accepted: it can carry scripts. */
export const ALLOWED_MIME: Record<DocumentType, readonly FileMime[]> = {
  brochure: ["application/pdf"],
  tech_sheet: ["application/pdf"],
  fitting_guide: ["application/pdf"],
  warranty: ["application/pdf"],
  certificate: ["application/pdf"],
  marketing_photo: ["image/png", "image/jpeg", "image/webp"],
  brand_asset: ["application/pdf", "image/png", "image/jpeg", "image/webp", "application/zip"],
};

/** The real type of a file from its first bytes, not from its name or the type the browser claimed. */
export function sniffMime(head: Uint8Array): FileMime | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...head.slice(from, to));
  if (ascii(0, 5) === "%PDF-") return "application/pdf";
  if (head[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png";
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "image/jpeg";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04) return "application/zip";
  return null;
}

/** A safe storage path: type folder, a random id, a cleaned file name. */
export function documentPath(type: DocumentType, fileName: string, id: string, ext = "pdf"): string {
  const base =
    fileName
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "document";
  return `${type}/${id}-${base}.${ext}`;
}
