import { colourFamilyLabel } from "@/lib/config";
import { formatPence } from "@/lib/money";
import { FORMAT_LABELS, plankFormat } from "./format";
import { specRows } from "./mappers";
import type { Finish } from "./types";

export interface CompareRow {
  label: string;
  /** One value per finish, in column order; "" where a finish has none. */
  values: string[];
  same: boolean;
  /** Measurements are set in the data face. */
  measured: boolean;
}

const MEASURED = new Set(["Plank size", "Thickness", "Wear layer", "Pack coverage", "RRP per m²"]);

/**
 * Rows for a side-by-side comparison, split into what differs and what every
 * finish shares. Only facts already in the catalogue appear.
 */
export function compareRows(finishes: Finish[]): { different: CompareRow[]; shared: CompareRow[] } {
  const perFinish = finishes.map((f) => {
    const format = plankFormat(f.specs);
    const rows = new Map<string, string>([["Colour", colourFamilyLabel(f.colourFamily)]]);
    if (f.rrpPence !== undefined) rows.set("RRP per m²", formatPence(f.rrpPence));
    if (format) rows.set("Plank format", FORMAT_LABELS[format]);
    for (const r of specRows(f.specs)) if (r.label !== "Format") rows.set(r.label, r.value);
    return rows;
  });
  const labels: string[] = [];
  for (const rows of perFinish) for (const l of rows.keys()) if (!labels.includes(l)) labels.push(l);

  const all = labels.map((label) => {
    const values = perFinish.map((rows) => rows.get(label) ?? "");
    return { label, values, same: values.every((v) => v === values[0]), measured: MEASURED.has(label) };
  });
  // With one finish there is nothing to contrast: everything is "shared".
  if (finishes.length < 2) return { different: [], shared: all };
  return { different: all.filter((r) => !r.same), shared: all.filter((r) => r.same) };
}
