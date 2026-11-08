import { NextResponse, type NextRequest } from "next/server";
import { isUuid } from "@/lib/ids";
import { clientKey, createLimiter } from "@/lib/rate-limit";
import { userSupabase } from "@/lib/supabase/server";

const perAddress = createLimiter({ max: 60, windowMs: 10 * 60 * 1000 });

/**
 * Document download. The row is read as the visitor (RLS: public documents
 * for everyone, trade-only ones for approved trade) and the signed URL is
 * created as the visitor too, so the storage policy decides again. The link
 * lasts 60 seconds and is never cached.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/documents/[id]">) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return new NextResponse("Not found", { status: 404 });
  if (!perAddress(clientKey(request.headers))) return new NextResponse("Too many requests", { status: 429 });

  const db = await userSupabase();
  const { data: doc } = await db.from("documents").select("storage_path, title").eq("id", id).maybeSingle();
  if (!doc) return new NextResponse("Not found", { status: 404 });

  const { data, error } = await db.storage.from("documents").createSignedUrl(doc.storage_path, 60, { download: `${doc.title}.pdf` });
  if (error || !data) return new NextResponse("Not found", { status: 404 });
  return NextResponse.redirect(data.signedUrl, { status: 303, headers: { "cache-control": "private, no-store" } });
}
