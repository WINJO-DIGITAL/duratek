import { NextResponse, type NextRequest } from "next/server";
import { clientKey, createLimiter } from "@/lib/rate-limit";
import { pdfResponse } from "@/lib/trade/pdf-response";
import { getSharedQuote } from "@/lib/trade/shared-quote";

const perAddress = createLimiter({ max: 30, windowMs: 10 * 60 * 1000 });

/** The customer's copy of a sent quote as a PDF, by its link. */
export async function GET(request: NextRequest, ctx: RouteContext<"/q/[token]/pdf">) {
  if (!perAddress(clientKey(request.headers))) return new NextResponse("Too many requests", { status: 429 });
  const { token } = await ctx.params;
  const quote = await getSharedQuote(token);
  if (!quote) return new NextResponse("Not found", { status: 404 });
  return pdfResponse(quote);
}
