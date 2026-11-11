import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageTransition } from "@/components/layout/page-transition";
import { Button } from "@/components/ui/button";
import { Field, SelectField } from "@/components/ui/field";
import { ArrowLeft } from "@/components/ui/icons";
import { requireAdmin } from "@/lib/auth/admin";
import { PRICE_UNITS } from "@/lib/admin/prices";
import { isUuid } from "@/lib/ids";
import { formatPence } from "@/lib/money";
import { userSupabase } from "@/lib/supabase/server";
import { addItem, deleteItem, updateList } from "../../actions";

export const metadata: Metadata = { title: "Price list", robots: { index: false } };

export default function PriceListPage({ params, searchParams }: PageProps<"/admin/prices/lists/[id]">) {
  return (
    <PageTransition>
      <Suspense fallback={<div aria-busy="true" className="container-page h-96 animate-pulse py-16" />}>
        <Content params={params} searchParams={searchParams} />
      </Suspense>
    </PageTransition>
  );
}

const NOTICE: Record<string, string> = {
  created: "List created. Add its prices below, then switch it on.",
  saved: "Saved.",
  "item-added": "Price added.",
  "item-removed": "Price removed.",
  invalid: "Give the list a name and valid dates.",
  dates: "The end date must be after the start date.",
  variant: "Choose a product.",
  amount: "Enter a price, like 29.99.",
  unit: "Choose what the price is per.",
  min: "The quantity it applies from must be more than 0.",
  duplicate: "There’s already a price for that product, quantity and start date in this list.",
  "unit-mismatch": "That unit doesn’t fit the product: flooring sold in packs can be priced per m² or per pack.",
  failed: "Couldn’t save that. Please try again.",
};

const UNIT_SHORT = { m2: "per m²", pack: "per pack", item: "each", linear_metre: "per metre" } as const;
const day = (iso: string | null) => (iso ? new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date(iso)) : "");
const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });

async function Content({ params, searchParams }: { params: PageProps<"/admin/prices/lists/[id]">["params"]; searchParams: PageProps<"/admin/prices/lists/[id]">["searchParams"] }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  await requireAdmin("manage_pricing", `/admin/prices/lists/${id}`);
  if (!isUuid(id)) notFound();
  const db = await userSupabase();
  const [{ data: list }, { data: items }, { data: variants }] = await Promise.all([
    db.from("price_lists").select("*").eq("id", id).maybeSingle(),
    db.from("price_list_items").select("id, variant_id, amount_pence, price_unit, min_quantity, valid_from, valid_to").eq("price_list_id", id).order("valid_from", { nullsFirst: true }),
    db.from("product_variants").select("id, sku, name, unit_of_sale, finishes (name)").order("sku"),
  ]);
  if (!list) notFound();
  const notice = NOTICE[String(sp.notice ?? "")];
  const variantName = new Map((variants ?? []).map((v) => [v.id, `${v.finishes?.name ?? v.sku} · ${v.sku}`]));
  const now = new Date();
  const sorted = [...(items ?? [])].sort((a, b) => (variantName.get(a.variant_id) ?? "").localeCompare(variantName.get(b.variant_id) ?? "") || Number(a.min_quantity) - Number(b.min_quantity));
  const vat = list.prices_include_vat ? "inc VAT" : "ex VAT";

  return (
    <AdminShell
      current="/admin/prices"
      title={list.name}
      intro={
        <p>
          {list.kind === "promotion"
            ? `A promotion for ${list.audience === "public" || list.audience === "all" ? "everyone" : list.audience === "trade" ? "approved trade accounts" : "stockists"}. It applies only where it is lower than the price they would otherwise pay.`
            : list.kind === "rrp"
              ? "The public recommended retail price."
              : list.kind === "account"
                ? "Prices negotiated for one account."
                : list.kind === "stockist"
                  ? "Prices for stockist accounts."
                  : "A trade price list."}{" "}
          Prices here are {vat}.
        </p>
      }
    >
      <Link href="/admin/prices" className="nav-link -mt-4 mb-6 gap-2">
        <ArrowLeft size={16} /> All prices
      </Link>
      {notice && <p role="status" className="notice mb-6 max-w-xl px-4 py-3 text-[0.9375rem] text-navy">{notice}</p>}

      <form action={updateList} className="card grid gap-5 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
        <input type="hidden" name="id" value={list.id} />
        <Field id="l-name" name="name" label="Name" defaultValue={list.name} required maxLength={120} />
        <Field id="l-from" name="valid_from" label="Starts" hint="Optional" type="date" defaultValue={day(list.valid_from)} />
        <Field id="l-to" name="valid_to" label="Ends (not included)" hint="Optional" type="date" defaultValue={day(list.valid_to)} />
        <div className="flex flex-col justify-end gap-2">
          <label className="flex min-h-tap items-center gap-3 text-[0.9375rem] text-navy">
            <input type="checkbox" name="active" defaultChecked={list.active} className="size-5 accent-green-ink" disabled={list.kind === "rrp"} />
            On
          </label>
          {list.kind === "rrp" && <input type="hidden" name="active" value="on" />}
          <label className="flex min-h-tap items-center gap-3 text-[0.9375rem] text-navy">
            <input type="checkbox" name="prices_include_vat" defaultChecked={list.prices_include_vat} className="size-5 accent-green-ink" />
            Prices include VAT
          </label>
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <Button type="submit" variant="outline">Save List</Button>
        </div>
      </form>

      <section aria-labelledby="items-heading" className="mt-stack">
        <h2 id="items-heading" className="text-display-sm text-navy">Prices</h2>
        {sorted.length === 0 ? (
          <p className="mt-4 text-ink-muted">No prices yet.</p>
        ) : (
          <div className="card relative mt-6 overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-line text-[0.8125rem] text-ink-muted">
                  <th scope="col" className="px-5 py-3 font-medium">Product</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Price ({vat})</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">From quantity</th>
                  <th scope="col" className="px-3 py-3 font-medium">When</th>
                  <th scope="col" className="px-3 py-3"><span className="sr-only">Remove</span></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((i) => {
                  const live = (!i.valid_from || new Date(i.valid_from) <= now) && (!i.valid_to || new Date(i.valid_to) > now);
                  return (
                    <tr key={i.id} className="border-b border-line last:border-b-0">
                      <th scope="row" className="px-5 py-2 text-[0.9375rem] font-normal text-navy">{variantName.get(i.variant_id) ?? "Removed product"}</th>
                      <td className="data px-3 py-2 text-right text-[0.9375rem] text-navy">{formatPence(i.amount_pence)} <span className="text-ink-muted">{UNIT_SHORT[i.price_unit]}</span></td>
                      <td className="data px-3 py-2 text-right text-[0.9375rem] text-navy">{Number(i.min_quantity)}{i.price_unit === "m2" ? " m²" : ""}</td>
                      <td className="px-3 py-2 text-[0.875rem] text-navy">
                        {!i.valid_from && !i.valid_to ? "Always" : [i.valid_from ? `from ${dateFmt.format(new Date(i.valid_from))}` : "", i.valid_to ? `until ${dateFmt.format(new Date(i.valid_to))}` : ""].filter(Boolean).join(" ")}
                        {!live && <span className="ml-2 text-ink-muted">(not in force)</span>}
                      </td>
                      <td className="px-3 py-1 text-right">
                        <form action={deleteItem}>
                          <input type="hidden" name="list_id" value={list.id} />
                          <input type="hidden" name="id" value={i.id} />
                          <button type="submit" className="min-h-tap text-[0.875rem] text-ink-muted underline underline-offset-4 hover:text-error">Remove</button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="add-heading" className="card mt-stack p-5 sm:p-6">
        <h2 id="add-heading" className="text-display-sm text-navy">Add a Price</h2>
        <p className="mt-2 max-w-[60ch] text-[0.9375rem] text-ink-muted">
          For a volume break, enter the quantity it starts at (in m² for a per-m² price). For a future price, set when it starts: the current price carries on until then.
        </p>
        <form action={addItem} className="mt-6 space-y-5">
          <input type="hidden" name="list_id" value={list.id} />
          <SelectField id="i-variant" name="variant_id" label="Product" defaultValue="" required options={[{ value: "", label: "Choose a Product" }, ...(variants ?? []).map((v) => ({ value: v.id, label: variantName.get(v.id) ?? v.sku }))]} />
          <div className="grid gap-5 sm:grid-cols-3">
            <Field id="i-amount" name="amount" label="Price" hint={vat} inputMode="decimal" required placeholder="£" />
            <SelectField id="i-unit" name="price_unit" label="Per" defaultValue="m2" options={PRICE_UNITS} />
            <Field id="i-min" name="min_quantity" label="From quantity" inputMode="decimal" defaultValue="1" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="i-from" name="valid_from" label="Starts" hint="Optional" type="date" />
            <Field id="i-to" name="valid_to" label="Ends (not included)" hint="Optional" type="date" />
          </div>
          <Button type="submit">Add Price</Button>
        </form>
      </section>
    </AdminShell>
  );
}
