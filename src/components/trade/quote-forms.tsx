"use client";

import { useActionState } from "react";
import {
  addFlooringLine,
  addOtherLine,
  createQuote,
  updateQuote,
  type QuoteFormState,
} from "@/app/trade/account/quotes/actions";
import { Button } from "@/components/ui/button";
import { Field, SelectField, TextAreaField } from "@/components/ui/field";

const idle: QuoteFormState = { status: "idle" };

/** After an error, show what was typed; otherwise the given default. */
const keep = (state: QuoteFormState) => (name: string, fallback?: string | null) =>
  state.status === "error" && state.values?.[name] !== undefined ? state.values[name] : (fallback ?? "");

function Status({ state }: { state: QuoteFormState }) {
  return (
    <p aria-live="polite" className="text-[0.9375rem] text-navy">
      {state.status === "saved" && state.message}
      {state.status === "error" && state.message && <span className="text-error">{state.message}</span>}
    </p>
  );
}

export interface QuoteHeaderValues {
  id?: string;
  customerName?: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  siteAddress?: string;
  sitePostcode?: string | null;
  notes?: string;
  validUntil?: string | null;
  vatRateBp: number;
}

/** Customer and site details. Creates a quote, or saves an existing one. */
export function QuoteHeaderForm({ values }: { values: QuoteHeaderValues }) {
  const [state, action, pending] = useActionState(values.id ? updateQuote : createQuote, idle);
  const e = state.status === "error" ? state.errors : {};
  const v = keep(state);
  return (
    <form action={action} className="space-y-5">
      {values.id && <input type="hidden" name="quote_id" value={values.id} />}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="customer_name" label="Customer name" defaultValue={v("customer_name", values.customerName)} error={e.customer_name} required maxLength={200} autoComplete="off" />
        <Field name="customer_email" label="Customer email" hint="Optional" type="email" defaultValue={v("customer_email", values.customerEmail)} error={e.customer_email} maxLength={254} autoComplete="off" />
        <Field name="customer_phone" label="Customer phone" hint="Optional" type="tel" defaultValue={v("customer_phone", values.customerPhone)} error={e.customer_phone} maxLength={30} autoComplete="off" />
        <Field name="site_postcode" label="Site postcode" hint="Optional" defaultValue={v("site_postcode", values.sitePostcode)} error={e.site_postcode} maxLength={10} autoComplete="off" className="uppercase" />
      </div>
      <Field name="site_address" label="Site address" hint="Optional" defaultValue={v("site_address", values.siteAddress)} error={e.site_address} maxLength={400} autoComplete="off" />
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          name="vat_rate_bp"
          label="VAT"
          defaultValue={v("vat_rate_bp", String(values.vatRateBp))}
          error={e.vat_rate_bp}
          options={[
            { value: "2000", label: "Add VAT at 20%" },
            { value: "0", label: "No VAT" },
          ]}
        />
        <Field name="valid_until" label="Valid until" hint="Optional" type="date" defaultValue={v("valid_until", values.validUntil)} error={e.valid_until} />
      </div>
      <TextAreaField name="notes" label="Notes for the customer" hint="Optional" rows={3} maxLength={4000} defaultValue={v("notes", values.notes)} error={e.notes} />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button type="submit" disabled={pending} arrow={!values.id}>
          {pending ? "Saving" : values.id ? "Save details" : "Create quote"}
        </Button>
        <Status state={state} />
      </div>
    </form>
  );
}

export interface FinishOption {
  id: string;
  label: string;
}

/** Measured area in, whole packs out. Cost comes from the trader's price on the server. */
export function FlooringLineForm({
  quoteId,
  finishes,
  defaultWastage,
  sellHint,
}: {
  quoteId: string;
  finishes: FinishOption[];
  defaultWastage: number;
  sellHint: string;
}) {
  const [state, action, pending] = useActionState(addFlooringLine, idle);
  const e = state.status === "error" ? state.errors : {};
  const v = keep(state);
  return (
    <form action={action} className="space-y-5" key={state.status === "saved" ? state.message : "form"}>
      <input type="hidden" name="quote_id" value={quoteId} />
      <SelectField
        name="finish_id"
        label="Finish"
        error={e.finish_id}
        required
        defaultValue={v("finish_id")}
        options={[{ value: "", label: "Choose a finish" }, ...finishes.map((f) => ({ value: f.id, label: f.label }))]}
      />
      <div className="grid gap-5 sm:grid-cols-3">
        <Field name="area_m2" label="Floor area" hint="m²" inputMode="decimal" defaultValue={v("area_m2")} error={e.area_m2} required autoComplete="off" />
        <Field name="wastage_pct" label="Wastage" hint="%" inputMode="decimal" defaultValue={v("wastage_pct", String(defaultWastage))} error={e.wastage_pct} required autoComplete="off" />
        <Field name="sell_per_m2" label="Sell per m²" hint={sellHint} inputMode="decimal" defaultValue={v("sell_per_m2")} error={e.sell_per_m2_pence} autoComplete="off" placeholder="£" />
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Adding" : "Add flooring"}
        </Button>
        <Status state={state} />
      </div>
    </form>
  );
}

/** Accessories, labour and anything else. The cost field is left out in Customer view. */
export function OtherLineForm({ quoteId, showCost }: { quoteId: string; showCost: boolean }) {
  const [state, action, pending] = useActionState(addOtherLine, idle);
  const e = state.status === "error" ? state.errors : {};
  const v = keep(state);
  return (
    <form action={action} className="space-y-5" key={state.status === "saved" ? state.message : "form"}>
      <input type="hidden" name="quote_id" value={quoteId} />
      <div className="grid gap-5 sm:grid-cols-[12rem_1fr]">
        <SelectField
          name="kind"
          label="Type"
          error={e.kind}
          defaultValue={v("kind", "accessory")}
          options={[
            { value: "accessory", label: "Accessory" },
            { value: "labour", label: "Labour" },
            { value: "other", label: "Other" },
          ]}
        />
        <Field name="description" label="Description" defaultValue={v("description")} error={e.description} required maxLength={300} placeholder="Door bar, scotia, fitting…" autoComplete="off" />
      </div>
      <div className={showCost ? "grid gap-5 sm:grid-cols-4" : "grid gap-5 sm:grid-cols-3"}>
        <Field name="quantity" label="Quantity" inputMode="decimal" defaultValue={v("quantity", "1")} error={e.quantity} required autoComplete="off" />
        <SelectField
          name="unit"
          label="Unit"
          error={e.unit}
          defaultValue={v("unit", "item")}
          options={[
            { value: "item", label: "Item" },
            { value: "m2", label: "m²" },
            { value: "metre", label: "Metre" },
            { value: "hour", label: "Hour" },
            { value: "pack", label: "Pack" },
          ]}
        />
        {showCost && <Field name="unit_cost" label="Your cost each" hint="Optional" inputMode="decimal" defaultValue={v("unit_cost")} error={e.unit_cost_pence} autoComplete="off" placeholder="£" />}
        <Field name="unit_sell" label="Price each" hint="Before VAT" inputMode="decimal" defaultValue={v("unit_sell")} error={e.unit_sell_pence} required autoComplete="off" placeholder="£" />
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Adding" : "Add line"}
        </Button>
        <Status state={state} />
      </div>
    </form>
  );
}
