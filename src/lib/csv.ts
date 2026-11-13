/**
 * CSV for spreadsheets. Every field is quoted, and a field that a spreadsheet
 * would run as a formula (starting = + - @, tab or carriage return) is
 * prefixed with an apostrophe, so customer input can't become a formula.
 */
export function csvField(value: unknown): string {
  let s = value == null ? "" : Array.isArray(value) ? value.join("; ") : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((r) => r.map(csvField).join(",")).join("\r\n") + "\r\n";
}
