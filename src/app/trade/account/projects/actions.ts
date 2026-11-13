"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getFinishes } from "@/lib/catalogue";
import { requireApprovedTrade } from "@/lib/auth/trade";
import { isUuid } from "@/lib/ids";
import { roomArea } from "@/lib/pricing";
import { userSupabase } from "@/lib/supabase/server";
import { priceFlooring } from "@/lib/trade/flooring-server";
import { parseProject, parseRoom } from "@/lib/trade/portal-forms";
import { getPreferences } from "@/lib/trade/preferences";
import { echo } from "@/lib/trade/quote-forms";
import { getCustomer, getProject } from "@/lib/trade/portal";
import type { QuoteFormState } from "../quotes/actions";

const err = (message: string, form: FormData, errors: Record<string, string> = {}): QuoteFormState => ({ status: "error", errors, message, values: echo(form) });

export async function saveProject(_prev: QuoteFormState, form: FormData): Promise<QuoteFormState> {
  const { account } = await requireApprovedTrade("/trade/account/projects");
  const id = String(form.get("id") ?? "");
  const parsed = parseProject(form);
  if (!parsed.ok) return err("Please check the highlighted fields.", form, parsed.errors);
  const customer = parsed.data.customer_id ? await getCustomer(parsed.data.customer_id) : null;
  if (parsed.data.customer_id && !customer) return err("Choose one of your customers.", form, { customer_id: "Choose one of your customers." });
  const row = { ...parsed.data, customer_name: customer?.name ?? null, site_postcode: parsed.data.site_postcode ?? customer?.postcode ?? null };
  const db = await userSupabase();
  if (isUuid(id)) {
    const { data, error } = await db.from("projects").update(row).eq("id", id).select("id");
    if (error || !data?.length) return err("Couldn’t save. Please try again.", form);
    refresh();
    return { status: "saved", message: "Saved." };
  }
  const { data, error } = await db.from("projects").insert({ profile_id: account.userId, ...row }).select("id").single();
  if (error || !data) return err("Couldn’t create the project. Please try again.", form);
  redirect(`/trade/account/projects/${data.id}?notice=created`);
}

export async function saveRoom(_prev: QuoteFormState, form: FormData): Promise<QuoteFormState> {
  await requireApprovedTrade("/trade/account/projects");
  const projectId = String(form.get("project_id") ?? "");
  const roomId = String(form.get("room_id") ?? "");
  if (!isUuid(projectId)) return err("That project wasn’t found.", form);
  const parsed = parseRoom(form);
  if (!parsed.ok) return err("Please check the highlighted fields.", form, parsed.errors);
  const r = parsed.data;
  const row = {
    room_name: r.room_name,
    length_m: r.length_m,
    width_m: r.width_m,
    area_m2: roomArea({ lengthM: r.length_m!, widthM: r.width_m! }),
    wastage_pct: r.wastage_pct,
    finish_id: r.finish_id,
  };
  const db = await userSupabase();
  const { data: count } = await db.from("project_items").select("sort_order").eq("project_id", projectId).order("sort_order", { ascending: false }).limit(1);
  const { error } = isUuid(roomId)
    ? await db.from("project_items").update(row).eq("id", roomId).eq("project_id", projectId)
    : await db.from("project_items").insert({ ...row, project_id: projectId, sort_order: (count?.[0]?.sort_order ?? 0) + 1 });
  if (error) return err("Couldn’t save the room. Please try again.", form);
  await db.from("projects").update({ updated_at: new Date().toISOString() }).eq("id", projectId);
  refresh();
  return { status: "saved", message: `${r.room_name}: ${row.area_m2} m² saved.` };
}

export async function deleteRoom(form: FormData) {
  await requireApprovedTrade("/trade/account/projects");
  const projectId = String(form.get("project_id") ?? "");
  const roomId = String(form.get("room_id") ?? "");
  if (isUuid(projectId) && isUuid(roomId)) {
    const db = await userSupabase();
    await db.from("project_items").delete().eq("id", roomId).eq("project_id", projectId);
  }
  redirect(`/trade/account/projects/${projectId}`);
}

export async function archiveProject(form: FormData) {
  await requireApprovedTrade("/trade/account/projects");
  const id = String(form.get("id") ?? "");
  if (!isUuid(id) || form.get("confirm") !== "yes") redirect(`/trade/account/projects/${isUuid(id) ? id : ""}?notice=confirm`);
  const db = await userSupabase();
  await db.from("projects").update({ archived: true }).eq("id", id);
  redirect("/trade/account/projects?notice=archived");
}

/**
 * A quote from a project: the customer's details, a flooring line per room
 * (packs from the measured area and wastage, priced on the server), and a
 * labour line per room at the trader's default rate if they have one.
 */
export async function quoteFromProject(form: FormData) {
  const { account } = await requireApprovedTrade("/trade/account/projects");
  const id = String(form.get("id") ?? "");
  const project = await getProject(id);
  if (!project) redirect("/trade/account/projects");
  const back = (n: string): never => redirect(`/trade/account/projects/${project.id}?notice=${n}`);
  const rooms = project.rooms.filter((r) => r.finishId && r.areaM2);
  if (rooms.length === 0) back("no-rooms");

  const [finishes, prefs, customer] = await Promise.all([getFinishes(), getPreferences(), project.customerId ? getCustomer(project.customerId) : Promise.resolve(null)]);
  const lines: Record<string, unknown>[] = [];
  let order = 0;
  for (const room of rooms) {
    const finish = finishes.find((f) => f.id === room.finishId);
    if (!finish) continue;
    const built = await priceFlooring({ finish, areaM2: room.areaM2!, wastagePct: room.wastagePct, sellPerM2Pence: null, defaultMarkupBp: prefs.default_markup_bp });
    if (!built.ok) return back(built.error === "no-price" ? "no-price" : "no-coverage");
    lines.push({ ...built.row, finish_id: finish.id, room_name: room.name, sort_order: ++order });
    if (prefs.labour_per_m2_pence) {
      lines.push({ kind: "labour", description: `Fitting, ${room.name}`, quantity: room.areaM2, unit: "m2", unit_cost_pence: 0, unit_sell_pence: prefs.labour_per_m2_pence, room_name: room.name, sort_order: ++order });
    }
  }

  const db = await userSupabase();
  const { data: quote, error } = await db
    .from("quotes")
    .insert({
      profile_id: account.userId,
      project_id: project.id,
      customer_id: customer?.id ?? null,
      customer_name: customer?.name ?? project.customerName ?? project.name,
      customer_email: customer?.email ?? null,
      customer_phone: customer?.phone ?? null,
      site_address: customer?.address ?? "",
      site_postcode: project.sitePostcode ?? customer?.postcode ?? null,
      vat_rate_bp: prefs.vat_registered ? 2000 : 0,
    })
    .select("id")
    .single();
  if (error || !quote) back("quote-failed");
  const { error: lineError } = await db.from("quote_lines").insert(lines.map((l) => ({ ...l, quote_id: quote!.id })) as never);
  if (lineError) {
    await db.from("quotes").delete().eq("id", quote!.id);
    back("quote-failed");
  }
  redirect(`/trade/account/quotes/${quote!.id}?notice=from-project`);
}
