"use client";

import { useActionState } from "react";
import { saveRetailer, saveStockist } from "@/app/admin/stockists/actions";
import { Button } from "@/components/ui/button";
import { Field, SelectField, TextAreaField } from "@/components/ui/field";
import { IDLE, type AdminFormState } from "@/lib/admin/form-state";

const keep = (state: AdminFormState) => (k: string, fallback: string | null | undefined) =>
  state.status === "error" && state.values?.[k] !== undefined ? state.values[k] : (fallback ?? "");

function Status({ state }: { state: AdminFormState }) {
  return (
    <p aria-live="polite" className="text-[0.9375rem] text-navy">
      {state.status === "saved" && state.message}
      {state.status === "error" && state.message && <span className="text-error">{state.message}</span>}
    </p>
  );
}

export interface StockistValues {
  id?: string;
  name?: string;
  type?: string;
  address?: string;
  postcode?: string;
  phone?: string | null;
  website?: string | null;
  email?: string | null;
  opening_hours?: string | null;
  description?: string | null;
  published?: boolean;
  verified_at?: string | null;
  private?: {
    lead_email?: string | null;
    admin_note?: string | null;
    verification_note?: string | null;
    price_list_id?: string | null;
    terms_note?: string | null;
    payment_terms?: string | null;
    terms_valid_from?: string | null;
    terms_valid_to?: string | null;
  };
  finishIds?: string[];
}

/** Field ids must be unique on a page with many forms: prefix them. */
export function StockistForm({
  values,
  finishes,
  priceLists,
}: {
  values: StockistValues;
  finishes: { id: string; name: string }[];
  priceLists: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(saveStockist, IDLE);
  const e = state.status === "error" ? state.errors : {};
  const v = keep(state);
  const p = values.id ? `s-${values.id.slice(0, 8)}-` : "s-new-";
  const priv = values.private ?? {};
  const errored = state.status === "error" && state.values;
  const checked = (name: string, fallback: boolean) => (errored ? state.values![name] === "on" : fallback);
  const range = new Set(values.finishIds ?? []);
  return (
    <form action={action} className="space-y-6" key={!values.id && state.status === "saved" ? state.message : "form"}>
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <div className="grid gap-5 sm:grid-cols-[1fr_12rem]">
        <Field id={`${p}name`} name="name" label="Business name" defaultValue={v("name", values.name)} error={e.name} required maxLength={200} />
        <SelectField
          id={`${p}type`}
          name="type"
          label="Type"
          defaultValue={v("type", values.type ?? "showroom")}
          error={e.type}
          options={[
            { value: "showroom", label: "Showroom" },
            { value: "retailer", label: "Retailer" },
            { value: "fitter", label: "Fitter" },
          ]}
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-[1fr_10rem]">
        <Field id={`${p}address`} name="address" label="Address" defaultValue={v("address", values.address)} error={e.address} required maxLength={400} />
        <Field id={`${p}postcode`} name="postcode" label="Postcode" defaultValue={v("postcode", values.postcode)} error={e.postcode} required maxLength={10} className="uppercase" />
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field id={`${p}phone`} name="phone" label="Phone" hint="Optional" type="tel" defaultValue={v("phone", values.phone)} error={e.phone} maxLength={30} />
        <Field id={`${p}email`} name="email" label="Public email" hint="Optional, shown on the site" type="email" defaultValue={v("email", values.email)} error={e.email} maxLength={254} />
        <Field id={`${p}website`} name="website" label="Website" hint="Optional" defaultValue={v("website", values.website)} error={e.website} maxLength={500} placeholder="https://" />
      </div>
      <TextAreaField id={`${p}hours`} name="opening_hours" label="Opening information" hint="Optional, as the business gave it" rows={2} maxLength={600} defaultValue={v("opening_hours", values.opening_hours)} error={e.opening_hours} />
      <TextAreaField id={`${p}desc`} name="description" label="Short description" hint="Optional" rows={2} maxLength={600} defaultValue={v("description", values.description)} error={e.description} />

      <fieldset className="rounded-control border border-line p-4">
        <legend className="px-2 text-[0.9375rem] font-medium text-navy">Range carried</legend>
        <p className="mb-3 text-[0.8125rem] text-ink-muted">
          Finishes this business says it carries. This is not live stock: the site tells customers to contact the stockist to check availability.
        </p>
        <div className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
          {finishes.map((f) => (
            <label key={f.id} className="flex min-h-tap items-center gap-3 text-[0.9375rem] text-navy">
              <input
                type="checkbox"
                name="finish_ids"
                value={f.id}
                defaultChecked={errored ? false : range.has(f.id)}
                className="size-5 accent-green-ink"
              />
              {f.name}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="rounded-control border border-line p-4">
        <legend className="px-2 text-[0.9375rem] font-medium text-navy">Verification</legend>
        <label className="flex min-h-tap items-start gap-3 text-[0.9375rem] text-navy">
          <input type="checkbox" name="verified" defaultChecked={checked("verified", Boolean(values.verified_at))} className="mt-1 size-5 accent-green-ink" />
          <span>
            Verified: I have confirmed these details with the business
            {values.verified_at && <span className="block text-[0.8125rem] text-ink-muted">Verified {new Date(values.verified_at).toLocaleDateString("en-GB")}</span>}
          </span>
        </label>
        <div className="mt-3">
          <Field id={`${p}vnote`} name="verification_note" label="How it was verified" hint="Private, e.g. phoned the shop" defaultValue={v("verification_note", priv.verification_note)} error={e.verification_note} maxLength={1000} />
        </div>
        <label className="mt-2 flex min-h-tap items-center gap-3 text-[0.9375rem] text-navy">
          <input type="checkbox" name="published" defaultChecked={checked("published", values.published ?? false)} aria-describedby={e.published ? `${p}pub-error` : undefined} className="size-5 accent-green-ink" />
          Show on Where to buy (needs Verified)
        </label>
        {e.published && <p id={`${p}pub-error`} className="text-[0.875rem] text-error">{e.published}</p>}
      </fieldset>

      <details className="rounded-control border border-line p-4">
        <summary className="min-h-tap cursor-pointer text-[0.9375rem] font-medium text-navy">Private: leads, notes and commercial terms</summary>
        <div className="mt-4 space-y-5">
          <Field id={`${p}lead`} name="lead_email" label="Send enquiries to" hint="Private. Customers who agree have their message passed here" type="email" defaultValue={v("lead_email", priv.lead_email)} error={e.lead_email} maxLength={254} />
          <TextAreaField id={`${p}note`} name="admin_note" label="Notes" hint="Only you see these" rows={2} maxLength={2000} defaultValue={v("admin_note", priv.admin_note)} error={e.admin_note} />
          <SelectField
            id={`${p}pl`}
            name="price_list_id"
            label="Price list for this account"
            hint="Optional"
            defaultValue={v("price_list_id", priv.price_list_id)}
            error={e.price_list_id}
            options={[{ value: "", label: "None" }, ...priceLists.map((l) => ({ value: l.id, label: l.name }))]}
          />
          <TextAreaField id={`${p}terms`} name="terms_note" label="Commercial terms" hint="Trade terms, rebates, delivery" rows={3} maxLength={2000} defaultValue={v("terms_note", priv.terms_note)} error={e.terms_note} />
          <div className="grid gap-5 sm:grid-cols-3">
            <Field id={`${p}pay`} name="payment_terms" label="Payment terms" defaultValue={v("payment_terms", priv.payment_terms)} error={e.payment_terms} maxLength={300} />
            <Field id={`${p}from`} name="terms_valid_from" label="Terms from" type="date" defaultValue={v("terms_valid_from", priv.terms_valid_from)} error={e.terms_valid_from} />
            <Field id={`${p}to`} name="terms_valid_to" label="Terms until" type="date" defaultValue={v("terms_valid_to", priv.terms_valid_to)} error={e.terms_valid_to} />
          </div>
          <p className="text-[0.8125rem] text-ink-muted">
            Record the terms Duratek trades on. Do not record a price a stockist must charge customers: stockists set their own resale prices, and the RRP is only a recommendation.
          </p>
        </div>
      </details>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button type="submit" disabled={pending} variant={values.id ? "outline" : "primary"}>
          {pending ? "Saving" : values.id ? "Save" : "Add stockist"}
        </Button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function RetailerForm({ values }: { values: { id?: string; name?: string; url?: string; sort_order?: number; published?: boolean } }) {
  const [state, action, pending] = useActionState(saveRetailer, IDLE);
  const e = state.status === "error" ? state.errors : {};
  const v = keep(state);
  const p = values.id ? `r-${values.id.slice(0, 8)}-` : "r-new-";
  return (
    <form action={action} className="space-y-5" key={!values.id && state.status === "saved" ? state.message : "form"}>
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <div className="grid gap-5 sm:grid-cols-[1fr_1.5fr_6rem]">
        <Field id={`${p}name`} name="name" label="Name" defaultValue={v("name", values.name)} error={e.name} required maxLength={120} />
        <Field id={`${p}url`} name="url" label="Link to Duratek on their site" defaultValue={v("url", values.url)} error={e.url} required maxLength={500} placeholder="https://" />
        <Field id={`${p}sort`} name="sort_order" label="Order" inputMode="numeric" defaultValue={v("sort_order", String(values.sort_order ?? 0))} error={e.sort_order} />
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <label className="flex min-h-tap items-center gap-3 text-[0.9375rem] text-navy">
          <input type="checkbox" name="published" defaultChecked={values.published ?? true} className="size-5 accent-green-ink" />
          Show on Where to buy
        </label>
        <Button type="submit" disabled={pending} variant={values.id ? "outline" : "primary"}>
          {pending ? "Saving" : values.id ? "Save" : "Add retailer"}
        </Button>
        <Status state={state} />
      </div>
    </form>
  );
}
