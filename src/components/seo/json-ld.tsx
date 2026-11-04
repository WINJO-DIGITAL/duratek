/**
 * Structured data for search engines. Only facts held in the catalogue are
 * included: no prices, ratings or reviews (none exist, and none are invented).
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Escape "<" so the JSON can never close the script element.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
