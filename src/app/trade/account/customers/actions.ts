"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireApprovedTrade } from "@/lib/auth/trade";
import { isUuid } from "@/lib/ids";
import { userSupabase } from "@/lib/supabase/server";
import { parseCustomer } from "@/lib/trade/portal-forms";
import { echo } from "@/lib/trade/quote-forms";
import type { QuoteFormState } from "../quotes/actions";

const MAX_CUSTOMERS = 5000;

export async function saveCustomer(_prev: QuoteFormState, form: FormData): Promise<QuoteFormState> {
  const { account } = await requireApprovedTrade("/trade/account/customers");
  const id = String(form.get("id") ?? "");
  const parsed = parseCustomer(form);
  if (!parsed.ok) return { status: "error", errors: parsed.errors, message: "Please check the highlighted fields.", values: echo(form) };
  const db = await userSupabase();
  if (isUuid(id)) {
    const { data, error } = await db.from("customers").update(parsed.data).eq("id", id).select("id");
    if (error || !data?.length) return { status: "error", errors: {}, message: "Couldn’t save. Please try again.", values: echo(form) };
    refresh();
    return { status: "saved", message: "Saved." };
  }
  const { count } = await db.from("customers").select("id", { count: "exact", head: true });
  if ((count ?? 0) >= MAX_CUSTOMERS) return { status: "error", errors: {}, message: "You have a lot of customers. Please contact us.", values: echo(form) };
  const { data, error } = await db.from("customers").insert({ profile_id: account.userId, ...parsed.data }).select("id").single();
  if (error || !data) return { status: "error", errors: {}, message: "Couldn’t save. Please try again.", values: echo(form) };
  const next = String(form.get("next") ?? "");
  redirect(next === "project" ? `/trade/account/projects?customer=${data.id}` : `/trade/account/customers/${data.id}?notice=created`);
}

export async function deleteCustomer(form: FormData) {
  await requireApprovedTrade("/trade/account/customers");
  const id = String(form.get("id") ?? "");
  if (!isUuid(id) || form.get("confirm") !== "yes") redirect(`/trade/account/customers/${isUuid(id) ? id : ""}?notice=confirm`);
  const db = await userSupabase();
  await db.from("customers").delete().eq("id", id);
  redirect("/trade/account/customers?notice=deleted");
}
