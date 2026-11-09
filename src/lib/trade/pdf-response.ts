import "server-only";
import type { CustomerQuote } from "./customer-quote";
import { logoBytes } from "./preferences";
import { quotePdf } from "./quote-pdf";

/** A quotation PDF as a download. Built from the customer copy only; never cached. */
export async function pdfResponse(copy: CustomerQuote): Promise<Response> {
  const bytes = await quotePdf(copy, await logoBytes(copy.trader.logo_path));
  const name = `${copy.reference} ${copy.customer_name}`.replace(/[^A-Za-z0-9 -]+/g, "").trim().replace(/\s+/g, "-").slice(0, 80) || copy.reference;
  return new Response(new Uint8Array(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${name}.pdf"`,
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex",
    },
  });
}
