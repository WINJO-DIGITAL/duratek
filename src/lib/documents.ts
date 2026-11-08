export type DocumentType = "tech_sheet" | "warranty" | "certificate" | "fitting_guide" | "brochure";

export const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: "brochure", label: "Brochure" },
  { value: "tech_sheet", label: "Technical sheet" },
  { value: "fitting_guide", label: "Fitting guide" },
  { value: "warranty", label: "Warranty" },
  { value: "certificate", label: "Test certificate" },
];

export const documentTypeLabel = (t: DocumentType) => DOCUMENT_TYPES.find((d) => d.value === t)?.label ?? t;

/** Files the owner can upload. Kept under the hosting platform's 4.5 MB request limit. */
export const DOCUMENT_MAX_BYTES = 4 * 1024 * 1024;
export const DOCUMENT_MIME: Record<string, string> = { "application/pdf": "pdf" };

/** A safe storage path: type folder, a random id, a cleaned file name. */
export function documentPath(type: DocumentType, fileName: string, id: string): string {
  const base =
    fileName
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "document";
  return `${type}/${id}-${base}.pdf`;
}
