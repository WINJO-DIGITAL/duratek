import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { PricesForm, type BaseColumn, type BaseRow } from "@/components/admin/prices-form";
import { PageTransition } from "@/components/layout/page-transition";
import { Button } from "@/components/ui/button";
import { Field, SelectField } from "@/components/ui/field";
import { requireAdmin } from "@/lib/auth/admin";
import { userSupabase } from "@/lib/supabase/server";
import { addTier, createList } from "./actions";

export const metadata: Metadata = { title: "Prices", robots: { index: false } };

export default function AdminPricesPage({ searchParams }: PageProps<"/admin/prices">) {
  return (
    <PageTransition>
      <Suspense fallback={<div aria-busy="true" className="container-page h-96 animate-pulse py-16" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </PageTransition>
  );
}

const NOTICE: Record<string, string> = {
  "tier-added": "Price tier added, with its own price list. Set its prices below.",
  "tier-exists": "That tier name is already in use.",
  "tier-empty": "Give the tier a name.",
  "list-invalid": "Give the list a name, a type and valid dates.",
  "list-audience": "Choose who a promotion is for.",
  "list-dates": "The end date must be after the start date.",
  "list-failed": "Couldn’t create the list. Please try again.",
};

const KIND_LABEL = { rrp: "RRP", trade: "Trade", stockist: "Stockist", account: "Account", promotion: "Promotion" } as const;
const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });

async function Content({ searchParams }: { searchParams: PageProps<"/admin/prices">["searchParams"] }) {
  await requireAdmin("manage_pricing", "/admin/prices");
  const notice = NOTICE[String((await searchParams).notice ?? "")];
  const db = await userSupabase();
  const [variants, lists, items] = await Promise.all([
    db.from("product_variants").select("id, sku, is_default, finishes (name, sort_order)").eq("is_default", true),
    db.from("price_lists").select("id, code, name, kind, tier_id, profile_id, audience, prices_include_vat, is_default, active, valid_from, valid_to").order("kind").order("name"),
    db.from("price_list_items").select("price_list_id, variant_id, amount_pence, price_unit, min_quantity, valid_from, valid_to"),
  ]);
  const allLists = lists.data ?? [];
  const allItems = items.data ?? [];

  // Grid columns: RRP, standard trade, then each tier.
  const columns: BaseColumn[] = allLists
    .filter((l) => l.kind === "rrp" || (l.kind === "trade" && (l.is_default || l.tier_id)))
    .sort((a, b) => (a.kind === "rrp" ? -1 : b.kind === "rrp" ? 1 : a.is_default ? -1 : b.is_default ? 1 : a.name.localeCompare(b.name)))
    .map((l) => ({ listId: l.id, label: l.kind === "rrp" ? "RRP" : l.name, vat: l.prices_include_vat ? "inc VAT" : "ex VAT" }));
  const base = allItems.filter((i) => i.price_unit === "m2" && Number(i.min_quantity) === 1 && !i.valid_from && !i.valid_to);
  const rows: BaseRow[] = (variants.data ?? [])
    .map((v) => ({
      variantId: v.id,
      sku: v.sku,
      name: v.finishes?.name ?? v.sku,
      sort: v.finishes?.sort_order ?? 0,
      prices: Object.fromEntries(base.filter((i) => i.variant_id === v.id).map((i) => [i.price_list_id, i.amount_pence])),
    }))
    .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
  const advanced = (listId: string) => allItems.filter((i) => i.price_list_id === listId && !(i.price_unit === "m2" && Number(i.min_quantity) === 1 && !i.valid_from && !i.valid_to)).length;
  const now = new Date();
  const state = (l: (typeof allLists)[number]) =>
    !l.active ? "Off" : l.valid_from && new Date(l.valid_from) > now ? `Starts ${dateFmt.format(new Date(l.valid_from))}` : l.valid_to && new Date(l.valid_to) <= now ? "Ended" : l.valid_to ? `Until ${dateFmt.format(new Date(l.valid_to))}` : "On";

  return (
    <AdminShell
      current="/admin/prices"
      title="Prices"
      intro={
        <p>
          The RRP is public and includes VAT. Trade prices exclude VAT and show only to approved accounts: their own account price first, then a
          stockist list (stockists), their tier, then standard trade. A promotion applies when it is lower. Every change is in the audit log.
        </p>
      }
    >
      {notice && <p role="status" className="notice mb-6 max-w-xl px-4 py-3 text-[0.9375rem] text-navy">{notice}</p>}

      <section aria-labelledby="base-heading">
        <h2 id="base-heading" className="text-display-sm text-navy">Base prices, per m²</h2>
        <p className="mt-2 max-w-[60ch] text-[0.9375rem] text-ink-muted">
          Today’s price from 1 m². Volume breaks, future prices and per-pack or per-item prices live in each list below. Leave a field blank for no price.
        </p>
        <div className="mt-6">
          <PricesForm rows={rows} columns={columns} />
        </div>
      </section>

      <section aria-labelledby="lists-heading" className="mt-stack">
        <h2 id="lists-heading" className="text-display-sm text-navy">Price lists</h2>
        <div className="card relative mt-6 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-line text-[0.8125rem] text-ink-muted">
                <th scope="col" className="px-5 py-3 font-medium">List</th>
                <th scope="col" className="px-3 py-3 font-medium">Type</th>
                <th scope="col" className="px-3 py-3 font-medium">VAT</th>
                <th scope="col" className="px-3 py-3 font-medium">Status</th>
                <th scope="col" className="px-5 py-3 text-right font-medium">Prices</th>
              </tr>
            </thead>
            <tbody>
              {allLists.map((l) => (
                <tr key={l.id} className="border-b border-line last:border-b-0">
                  <th scope="row" className="px-5 py-2 font-normal">
                    <Link href={`/admin/prices/lists/${l.id}`} className="text-[0.9375rem] text-navy underline decoration-green underline-offset-4">
                      {l.name}
                    </Link>
                  </th>
                  <td className="px-3 py-2 text-[0.875rem] text-navy">
                    {KIND_LABEL[l.kind]}
                    {l.kind === "promotion" && l.audience ? ` · ${l.audience}` : ""}
                    {l.is_default ? " · standard" : ""}
                  </td>
                  <td className="px-3 py-2 text-[0.875rem] text-ink-muted">{l.prices_include_vat ? "inc" : "ex"}</td>
                  <td className="px-3 py-2 text-[0.875rem] text-navy">{state(l)}</td>
                  <td className="data px-5 py-2 text-right text-[0.875rem] text-navy">
                    {allItems.filter((i) => i.price_list_id === l.id).length}
                    {advanced(l.id) > 0 && <span className="text-ink-muted"> ({advanced(l.id)} advanced)</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-stack grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="new-list-heading" className="card p-5 sm:p-6">
          <h2 id="new-list-heading" className="text-display-sm text-navy">New list or promotion</h2>
          <form action={createList} className="mt-6 space-y-5">
            <Field id="list-name" name="name" label="Name" required maxLength={120} placeholder="Spring offer" />
            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField
                id="list-kind"
                name="kind"
                label="Type"
                defaultValue="promotion"
                options={[
                  { value: "promotion", label: "Promotion" },
                  { value: "stockist", label: "Stockist prices" },
                  { value: "trade", label: "Extra trade list" },
                ]}
              />
              <SelectField
                id="list-audience"
                name="audience"
                label="Promotion for"
                defaultValue="public"
                options={[
                  { value: "public", label: "Everyone (inc VAT)" },
                  { value: "trade", label: "Trade accounts (ex VAT)" },
                  { value: "stockist", label: "Stockists (ex VAT)" },
                ]}
              />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="list-from" name="valid_from" label="Starts" hint="Optional" type="date" />
              <Field id="list-to" name="valid_to" label="Ends (not included)" hint="Optional" type="date" />
            </div>
            <Button type="submit" variant="outline">Create</Button>
          </form>
        </section>
        <section aria-labelledby="tier-heading" className="card p-5 sm:p-6">
          <h2 id="tier-heading" className="text-display-sm text-navy">New price tier</h2>
          <p className="mt-2 text-[0.9375rem] text-ink-muted">A tier is a trade price list for a group of accounts, like “Fitters”. Assign accounts under Trade accounts.</p>
          <form action={addTier} className="mt-6 flex flex-wrap items-end gap-3">
            <div className="min-w-56 flex-1">
              <Field id="tier-name" name="name" label="Tier name" required maxLength={80} />
            </div>
            <Button type="submit" variant="outline">Add tier</Button>
          </form>
        </section>
      </div>
    </AdminShell>
  );
}
