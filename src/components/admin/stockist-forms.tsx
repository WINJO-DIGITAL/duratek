"use client";

import { useActionState } from "react";
import { saveRetailer, saveStockist } from "@/app/admin/stockists/actions";
import { Button } from "@/components/ui/button";
import { Field, SelectField } from "@/components/ui/field";
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
  published?: boolean;
}

/** Field ids must be unique on a page with many forms: prefix them. */
export function StockistForm({ values }: { values: StockistValues }) {
  const [state, action, pending] = useActionState(saveStockist, IDLE);
  const e = state.status === "error" ? state.errors : {};
  const v = keep(state);
  const p = values.id ? `s-${values.id.slice(0, 8)}-` : "s-new-";
  return (
    <form action={action} className="space-y-5" key={!values.id && state.status === "saved" ? state.message : "form"}>
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
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={`${p}phone`} name="phone" label="Phone" hint="Optional" type="tel" defaultValue={v("phone", values.phone)} error={e.phone} maxLength={30} />
        <Field id={`${p}website`} name="website" label="Website" hint="Optional" defaultValue={v("website", values.website)} error={e.website} maxLength={500} placeholder="https://" />
      </div>
      <label className="flex min-h-tap items-center gap-3 text-[0.9375rem] text-navy">
        <input
          type="checkbox"
          name="published"
          defaultChecked={state.status === "error" && state.values ? state.values.published === "on" : (values.published ?? false)}
          className="size-5 accent-green-ink"
        />
        Show on Where to buy
      </label>
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
