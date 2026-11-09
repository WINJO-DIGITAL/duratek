import { NextResponse } from "next/server";
import { getAccount } from "@/lib/auth/session";
import { toCustomerQuote } from "@/lib/trade/customer-quote";
import { pdfResponse } from "@/lib/trade/pdf-response";
import { getFullPreferences } from "@/lib/trade/preferences";
import { getQuote } from "@/lib/trade/quotes";

/** The trader's own quote as a PDF for their customer (sell prices only), at any stage. */
export async function GET(_req: Request, ctx: RouteContext<"/trade/account/quotes/[id]/pdf">) {
  const account = await getAccount();
  if (!account || account.status !== "approved") return new NextResponse("Not found", { status: 404 });
  const { id } = await ctx.params;
  const [quote, prefs] = await Promise.all([getQuote(id), getFullPreferences()]); // RLS: own quotes only
  if (!quote) return new NextResponse("Not found", { status: 404 });
  return pdfResponse(
    toCustomerQuote(quote, {
      companyName: prefs.display_name || account.companyName || "Your fitter",
      contactName: account.contactName,
      phone: prefs.contact_phone,
      email: prefs.contact_email,
      website: prefs.website,
      address: prefs.address,
      logoPath: prefs.logo_path,
      brandColour: prefs.brand_colour,
      footer: prefs.quote_footer,
    }),
  );
}
