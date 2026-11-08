"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { DOCUMENT_MAX_BYTES, DOCUMENT_TYPES, documentPath, type DocumentType } from "@/lib/documents";
import { isUuid } from "@/lib/ids";
import { userSupabase } from "@/lib/supabase/server";

const back = (notice: string) => redirect(`/admin/documents?notice=${notice}`);

/** Uploads a PDF to the private documents bucket. Downloads go through short-lived signed links. */
export async function uploadDocument(form: FormData) {
  await requireAdmin("/admin/documents");
  const file = form.get("file");
  const title = String(form.get("title") ?? "").trim().slice(0, 200);
  const type = String(form.get("type") ?? "") as DocumentType;
  const finishId = String(form.get("finish_id") ?? "");
  const tradeOnly = form.get("trade_only") === "on";

  if (!(file instanceof File) || file.size === 0) back("missing");
  const f = file as File;
  if (!title) back("title");
  if (!DOCUMENT_TYPES.some((d) => d.value === type)) back("type");
  if (f.size > DOCUMENT_MAX_BYTES) back("size");
  // Check the file really is a PDF, not just named like one.
  const head = new Uint8Array(await f.slice(0, 5).arrayBuffer());
  if (f.type !== "application/pdf" || String.fromCharCode(...head) !== "%PDF-") back("pdf");

  const db = await userSupabase();
  const path = documentPath(type, f.name, randomUUID());
  const { error: upErr } = await db.storage.from("documents").upload(path, f, { contentType: "application/pdf", upsert: false });
  if (upErr) back("failed");
  const { error } = await db.from("documents").insert({
    title,
    type,
    storage_path: path,
    trade_only: tradeOnly,
    finish_id: isUuid(finishId) ? finishId : null,
  });
  if (error) {
    await db.storage.from("documents").remove([path]);
    back("failed");
  }
  back("added");
}

export async function updateDocument(form: FormData) {
  await requireAdmin("/admin/documents");
  const id = String(form.get("id") ?? "");
  if (!isUuid(id)) back("failed");
  const db = await userSupabase();
  if (form.get("intent") === "delete") {
    if (form.get("confirm") !== "yes") back("confirm");
    const { data } = await db.from("documents").select("storage_path").eq("id", id).maybeSingle();
    await db.from("documents").delete().eq("id", id);
    if (data) await db.storage.from("documents").remove([data.storage_path]);
    back("deleted");
  }
  await db.from("documents").update({ trade_only: form.get("trade_only") === "on" }).eq("id", id);
  back("saved");
}
