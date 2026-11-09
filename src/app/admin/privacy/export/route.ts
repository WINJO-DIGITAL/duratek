import { NextResponse, type NextRequest } from "next/server";
import { allows } from "@/lib/auth/permissions";
import { getAccount } from "@/lib/auth/session";
import { exportFilename } from "@/lib/privacy";
import { userSupabase } from "@/lib/supabase/server";

/** Everything held against an email address, as a JSON download. Personal data: never cached. */
export async function GET(request: NextRequest) {
  const account = await getAccount();
  if (!allows(account, "manage_settings")) return new NextResponse("Not found", { status: 404 });
  const email = (request.nextUrl.searchParams.get("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return new NextResponse("Enter an email address", { status: 400 });
  const db = await userSupabase();
  const { data, error } = await db.rpc("export_person_data", { p_email: email });
  if (error || !data) return new NextResponse("Couldn't export", { status: 500 });
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${exportFilename(email)}"`,
      "cache-control": "private, no-store",
    },
  });
}
