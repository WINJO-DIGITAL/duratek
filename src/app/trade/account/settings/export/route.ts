import { NextResponse } from "next/server";
import { getAccount } from "@/lib/auth/session";
import { exportFilename } from "@/lib/privacy";
import { userSupabase } from "@/lib/supabase/server";

/**
 * A signed-in trader's own information as a JSON download (UK GDPR access and
 * portability). Read as the user, so row level security returns only their own
 * rows. Personal data: never cached.
 */
export async function GET() {
  const account = await getAccount();
  if (!account || (account.role !== "trade" && account.role !== "stockist")) return new NextResponse("Not found", { status: 404 });
  const db = await userSupabase();
  const [profile, business, application, preferences, customers, projects, rooms, quotes, lines, shortlists, saved] = await Promise.all([
    db.from("profiles").select("company_name, contact_name, phone, trade_type, status, role, created_at").eq("id", account.userId).maybeSingle(),
    db.from("businesses").select("*"),
    db.from("trade_applications").select("*"),
    db.from("trade_preferences").select("*"),
    db.from("customers").select("*"),
    db.from("projects").select("*"),
    db.from("project_items").select("*"),
    db.from("quotes").select("*"),
    db.from("quote_lines").select("*"),
    db.from("shortlists").select("*"),
    db.from("saved_products").select("*"),
  ]);
  const out = {
    exported_at: new Date().toISOString(),
    email: account.email,
    profile: profile.data,
    businesses: business.data ?? [],
    applications: application.data ?? [],
    preferences: preferences.data ?? [],
    customers: customers.data ?? [],
    projects: projects.data ?? [],
    project_rooms: rooms.data ?? [],
    quotes: quotes.data ?? [],
    quote_lines: lines.data ?? [],
    shortlists: shortlists.data ?? [],
    saved_products: saved.data ?? [],
  };
  return new NextResponse(JSON.stringify(out, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${exportFilename(account.email)}"`,
      "cache-control": "private, no-store",
    },
  });
}
