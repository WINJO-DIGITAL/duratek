import { NextResponse } from "next/server";
import { getFinishes } from "@/lib/catalogue";
import { allows } from "@/lib/auth/permissions";
import { getAccount } from "@/lib/auth/session";
import { toCsv } from "@/lib/csv";
import { userSupabase } from "@/lib/supabase/server";

/** Sample requests as CSV, for the owner only. Personal data: never cached. */
export async function GET() {
  const account = await getAccount();
  if (!allows(account, "manage_samples")) return new NextResponse("Not found", { status: 404 });
  const db = await userSupabase();
  const [{ data, error }, finishes] = await Promise.all([
    db.from("sample_requests").select("*").order("created_at", { ascending: false }).limit(10000),
    getFinishes(),
  ]);
  if (error) return new NextResponse("Couldn't export", { status: 500 });
  const name = new Map(finishes.map((f) => [f.id, f.name]));
  const csv = toCsv(
    ["Received", "Status", "Sent", "Name", "Email", "Phone", "Address line 1", "Address line 2", "Town", "Postcode", "Samples", "Marketing opt-in", "Carrier", "Tracking", "Dispatch note"],
    (data ?? []).map((r) => [
      r.created_at,
      r.status,
      r.sent_at ?? "",
      r.name,
      r.email,
      r.phone ?? "",
      r.address_line1,
      r.address_line2 ?? "",
      r.town,
      r.postcode,
      r.finish_ids.map((id) => name.get(id) ?? id),
      r.marketing_opt_in ? "yes" : "no",
      r.carrier ?? "",
      r.tracking_ref ?? "",
      r.dispatch_note ?? "",
    ]),
  );
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="duratek-sample-requests-${date}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
