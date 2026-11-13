const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen", "Twenty"];

/** "Eleven" for small counts (as set in headings), digits above twenty. */
export function countWord(n: number): string {
  return WORDS[n] ?? String(n);
}
