"use server";

import { randomUUID } from "node:crypto";
import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TAGS } from "@/lib/catalogue";
import { requireAdmin } from "@/lib/auth/admin";
import type { AdminFormState } from "@/lib/admin/form-state";
import { IMAGE_MAX_BYTES, IMAGE_TYPES, mergeSpecs, parseFinish, parseVariant, variantFromFinish } from "@/lib/admin/forms";
import { isUuid } from "@/lib/ids";
import { userSupabase } from "@/lib/supabase/server";
import { echo } from "@/lib/trade/quote-forms";

export async function saveFinish(_prev: AdminFormState, form: FormData): Promise<AdminFormState> {
  await requireAdmin("manage_products", "/admin/finishes");
  const id = String(form.get("id") ?? "");
  const parsed = parseFinish(form);
  if (!parsed.ok) return { status: "error", errors: parsed.errors, message: "Please check the highlighted fields.", values: echo(form) };
  const f = parsed.data;
  const db = await userSupabase();

  let stored: Record<string, unknown> = {};
  if (isUuid(id)) {
    const { data } = await db.from("finishes").select("specs").eq("id", id).maybeSingle();
    if (!data) return { status: "error", errors: {}, message: "That finish wasn’t found." };
    stored = (data.specs as Record<string, unknown>) ?? {};
  }
  const row = {
    name: f.name,
    slug: f.slug,
    style: f.style,
    colour_family: f.colour_family,
    description: f.description,
    sort_order: f.sort_order,
    published: f.published,
    specs: mergeSpecs(stored, f) as never,
  };

  let finishId = id;
  if (isUuid(id)) {
    const { error } = await db.from("finishes").update(row).eq("id", id);
    if (error) return slugOrFail(error.code, form);
  } else {
    const { data, error } = await db.from("finishes").insert(row).select("id").single();
    if (error || !data) return slugOrFail(error?.code, form);
    finishId = data.id;
  }

  // Measurements belong to the default variant (the database copies them into specs for display).
  const variant = variantFromFinish(f);
  const { data: existing } = await db.from("product_variants").select("id").eq("finish_id", finishId).eq("is_default", true).maybeSingle();
  const { error: vError } = existing
    ? await db.from("product_variants").update(variant).eq("id", existing.id)
    : await db.from("product_variants").insert({ ...variant, finish_id: finishId, unit_of_sale: "pack", is_default: true });
  if (vError) {
    if (vError.code === "23505") return { status: "error", errors: { sku: "Another product already uses this stock code." }, values: echo(form) };
    if (vError.code === "23514") return { status: "error", errors: { pack_coverage_m2: "Flooring sold in packs needs its pack coverage." }, values: echo(form) };
    return { status: "error", errors: {}, message: "The finish was saved but its measurements weren’t. Please try again.", values: echo(form) };
  }

  updateTag(TAGS.finishes);
  if (!isUuid(id)) redirect(`/admin/finishes/${finishId}?notice=created`);
  refresh();
  return { status: "saved", message: "Saved. Public pages update within a few seconds." };
}

function slugOrFail(code: string | undefined, form: FormData): AdminFormState {
  if (code === "23505") return { status: "error", errors: { slug: "Another finish already uses this web address." }, values: echo(form) };
  return { status: "error", errors: {}, message: "Couldn’t save. Please try again.", values: echo(form) };
}

const back = (finishId: string, notice: string) => redirect(`/admin/finishes/${finishId}?notice=${notice}#images`);

/** Uploads a photograph to the public finish-images bucket and records it. */
export async function addImage(form: FormData) {
  await requireAdmin("manage_products", "/admin/finishes");
  const finishId = String(form.get("finish_id") ?? "");
  if (!isUuid(finishId)) redirect("/admin/finishes");
  const file = form.get("file");
  const kind = String(form.get("kind") ?? "");
  const alt = String(form.get("alt") ?? "").trim().slice(0, 300);
  const width = Number(form.get("width")) || null;
  const height = Number(form.get("height")) || null;
  if (!(file instanceof File) || file.size === 0) back(finishId, "image-missing");
  const f = file as File;
  const ext = IMAGE_TYPES[f.type];
  if (!ext) back(finishId, "image-type");
  if (f.size > IMAGE_MAX_BYTES) back(finishId, "image-size");
  if (!["swatch", "room", "closeup"].includes(kind)) back(finishId, "image-kind");
  if (!alt) back(finishId, "image-alt");

  const db = await userSupabase();
  const path = `${finishId}/${randomUUID()}.${ext}`;
  const { error: upErr } = await db.storage.from("finish-images").upload(path, f, { contentType: f.type, upsert: false });
  if (upErr) back(finishId, "image-failed");
  const { count } = await db.from("finish_images").select("id", { count: "exact", head: true }).eq("finish_id", finishId);
  const { error } = await db.from("finish_images").insert({
    finish_id: finishId,
    url: path,
    kind: kind as "swatch" | "room" | "closeup",
    alt,
    width: width && width > 0 && width < 20000 ? Math.round(width) : null,
    height: height && height > 0 && height < 20000 ? Math.round(height) : null,
    sort_order: (count ?? 0) + 1,
  });
  if (error) {
    await db.storage.from("finish-images").remove([path]);
    back(finishId, "image-failed");
  }
  updateTag(TAGS.finishes);
  back(finishId, "image-added");
}

export async function updateImage(form: FormData) {
  await requireAdmin("manage_products", "/admin/finishes");
  const finishId = String(form.get("finish_id") ?? "");
  const id = String(form.get("id") ?? "");
  if (!isUuid(finishId) || !isUuid(id)) redirect("/admin/finishes");
  const db = await userSupabase();

  if (form.get("intent") === "delete") {
    const { data } = await db.from("finish_images").select("url").eq("id", id).maybeSingle();
    await db.from("finish_images").delete().eq("id", id);
    // Only files we stored are removed; demo photography lives on another site.
    if (data && !/^https?:\/\//.test(data.url)) await db.storage.from("finish-images").remove([data.url]);
    updateTag(TAGS.finishes);
    back(finishId, "image-removed");
  }

  const alt = String(form.get("alt") ?? "").trim().slice(0, 300);
  const kind = String(form.get("kind") ?? "");
  const sort = Number(form.get("sort_order"));
  if (!alt || !["swatch", "room", "closeup"].includes(kind)) back(finishId, "image-alt");
  await db
    .from("finish_images")
    .update({ alt, kind: kind as "swatch" | "room" | "closeup", sort_order: Number.isInteger(sort) && sort >= 0 && sort < 1000 ? sort : 0 })
    .eq("id", id);
  updateTag(TAGS.finishes);
  back(finishId, "image-saved");
}

// ---------------------------------------------------------------------------
// Archive and variants
// ---------------------------------------------------------------------------

/** Archive hides a finish everywhere and keeps it for history; restoring leaves it hidden until published. */
export async function setArchived(form: FormData) {
  await requireAdmin("manage_products", "/admin/finishes");
  const id = String(form.get("id") ?? "");
  if (!isUuid(id)) redirect("/admin/finishes");
  const archive = form.get("archive") === "yes";
  const db = await userSupabase();
  const { error } = await db.from("finishes").update({ archived_at: archive ? new Date().toISOString() : null, ...(archive ? { published: false } : {}) }).eq("id", id);
  updateTag(TAGS.finishes);
  redirect(error ? `/admin/finishes/${id}?notice=archive-failed` : archive ? "/admin/finishes?notice=archived" : `/admin/finishes/${id}?notice=restored`);
}

/** Add or edit a variant. The default variant's measurements are edited with the finish itself. */
export async function saveVariant(_prev: AdminFormState, form: FormData): Promise<AdminFormState> {
  await requireAdmin("manage_products", "/admin/finishes");
  const finishId = String(form.get("finish_id") ?? "");
  const id = String(form.get("id") ?? "");
  if (!isUuid(finishId)) return { status: "error", errors: {}, message: "That finish wasn’t found." };
  const parsed = parseVariant(form);
  if (!parsed.ok) return { status: "error", errors: parsed.errors, message: "Please check the highlighted fields.", values: echo(form) };
  const v = parsed.data;
  const row = {
    sku: v.sku,
    name: v.name,
    unit_of_sale: v.unit_of_sale,
    pack_coverage_m2: v.pack_coverage_m2,
    units_per_pack: v.units_per_pack === null ? null : Math.round(v.units_per_pack),
    length_mm: v.length_mm === null ? null : Math.round(v.length_mm),
    width_mm: v.width_mm === null ? null : Math.round(v.width_mm),
    thickness_mm: v.thickness_mm,
    vat_rate_bp: Math.round(v.vat_percent * 100),
    active: v.active,
  };
  const db = await userSupabase();
  const { error } = isUuid(id)
    ? await db.from("product_variants").update(row).eq("id", id).eq("finish_id", finishId)
    : await db.from("product_variants").insert({ ...row, finish_id: finishId, is_default: false });
  if (error) {
    if (error.code === "23505") return { status: "error", errors: { sku: "Another product already uses this stock code, or this name." }, values: echo(form) };
    if (error.code === "23514") return { status: "error", errors: { pack_coverage_m2: "A pack needs the area it covers." }, values: echo(form) };
    return { status: "error", errors: {}, message: "Couldn’t save. Please try again.", values: echo(form) };
  }
  updateTag(TAGS.finishes);
  refresh();
  return { status: "saved", message: `Saved ${v.name}.` };
}
