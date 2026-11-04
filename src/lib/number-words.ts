const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];

/** "Eleven" for small counts (as set in headings), digits above twelve. */
export function countWord(n: number): string {
  return WORDS[n] ?? String(n);
}
