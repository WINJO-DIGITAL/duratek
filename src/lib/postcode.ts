/**
 * UK postcodes. The pattern matches the database check on
 * sample_requests.postcode, so anything accepted here will save.
 */
const UK_POSTCODE = /^([A-Z]{1,2}[0-9][A-Z0-9]?) ?([0-9][A-Z]{2})$/;

/** Uppercased, single-spaced canonical form ("sw1a1aa" -> "SW1A 1AA"), or null if not a UK postcode. */
export function normalisePostcode(input: string): string | null {
  const compact = input.toUpperCase().replace(/\s+/g, "");
  const m = UK_POSTCODE.exec(compact);
  return m ? `${m[1]} ${m[2]}` : null;
}
