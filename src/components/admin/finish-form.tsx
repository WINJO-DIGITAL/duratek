"use client";

import { useActionState } from "react";
import { saveFinish } from "@/app/admin/finishes/actions";
import { Button } from "@/components/ui/button";
import { Field, SelectField, TextAreaField } from "@/components/ui/field";
import { IDLE } from "@/lib/admin/form-state";
import { slugify } from "@/lib/admin/forms";

export interface FinishValues {
  id?: string;
  name: string;
  slug: string;
  style: string;
  colour_family: string;
  description: string;
  sort_order: number;
  published: boolean;
  /** Stock code of the default variant. */
  sku?: string;
  specs: Record<string, unknown>;
}

const specText = (v: unknown) => (v === undefined || v === null ? "" : String(v));

export function FinishForm({ values }: { values: FinishValues }) {
  const [state, action, pending] = useActionState(saveFinish, IDLE);
  const e = state.status === "error" ? state.errors : {};
  const v = (k: string, fallback: string) => (state.status === "error" && state.values?.[k] !== undefined ? state.values[k] : fallback);
  const s = values.specs;
  return (
    <form action={action} className="space-y-6">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          name="name"
          label="Name"
          defaultValue={v("name", values.name)}
          error={e.name}
          required
          maxLength={120}
          onBlur={(ev) => {
            const slug = ev.currentTarget.form?.elements.namedItem("slug") as HTMLInputElement | null;
            if (slug && !slug.value) slug.value = slugify(ev.currentTarget.value);
          }}
        />
        <Field name="slug" label="Web address" hint="/range/…" defaultValue={v("slug", values.slug)} error={e.slug} required maxLength={80} />
      </div>
      <div className="grid gap-5 sm:grid-cols-4">
        <SelectField
          name="style"
          label="Style"
          defaultValue={v("style", values.style)}
          error={e.style}
          options={[
            { value: "plank", label: "Straight Plank" },
            { value: "herringbone", label: "Herringbone" },
          ]}
        />
        <Field name="colour_family" label="Colour family" hint="natural, warm, grey…" defaultValue={v("colour_family", values.colour_family)} error={e.colour_family} required />
        <Field name="sku" label="Stock code" hint="Blank: from the address" defaultValue={v("sku", values.sku ?? "")} error={e.sku} maxLength={40} className="uppercase" />
        <Field name="sort_order" label="Order" inputMode="numeric" defaultValue={v("sort_order", String(values.sort_order))} error={e.sort_order} />
      </div>
      <TextAreaField name="description" label="Description" rows={4} maxLength={4000} defaultValue={v("description", values.description)} error={e.description} />

      <fieldset>
        <legend className="text-[0.9375rem] font-medium text-navy">Specification</legend>
        <p className="mt-1 text-[0.8125rem] text-ink-muted">
          Only confirmed figures. Pack coverage drives every pack calculation and quote. Prices, including the RRP, are set under Prices.
        </p>
        <div className="mt-4 grid gap-5 sm:grid-cols-3 lg:grid-cols-5">
          <Field name="pack_coverage_m2" label="Pack coverage" hint="m²" inputMode="decimal" defaultValue={v("pack_coverage_m2", specText(s.pack_coverage_m2))} error={e.pack_coverage_m2} />
          <Field name="plank_length_mm" label="Length" hint="mm" inputMode="decimal" defaultValue={v("plank_length_mm", specText(s.plank_length_mm))} error={e.plank_length_mm} />
          <Field name="plank_width_mm" label="Width" hint="mm" inputMode="decimal" defaultValue={v("plank_width_mm", specText(s.plank_width_mm))} error={e.plank_width_mm} />
          <Field name="thickness_mm" label="Thickness" hint="mm" inputMode="decimal" defaultValue={v("thickness_mm", specText(s.thickness_mm))} error={e.thickness_mm} />
          <Field name="wear_layer_mm" label="Wear layer" hint="mm" inputMode="decimal" defaultValue={v("wear_layer_mm", specText(s.wear_layer_mm))} error={e.wear_layer_mm} />
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field name="format" label="Format" hint="e.g. Straight plank" defaultValue={v("format", specText(s.format))} error={e.format} maxLength={80} />
          <Field name="edge" label="Edge" hint="e.g. Micro bevel" defaultValue={v("edge", specText(s.edge))} error={e.edge} maxLength={80} />
        </div>
      </fieldset>

      <label className="flex min-h-tap items-center gap-3 text-[0.9375rem] text-navy">
        <input type="checkbox" name="published" defaultChecked={state.status === "error" && state.values ? state.values.published === "on" : values.published} className="size-5 accent-green-ink" />
        Published (shown on the site)
      </label>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : values.id ? "Save finish" : "Create finish"}
        </Button>
        <p aria-live="polite" className="text-[0.9375rem] text-navy">
          {state.status === "saved" && state.message}
          {state.status === "error" && state.message && <span className="text-error">{state.message}</span>}
        </p>
      </div>
    </form>
  );
}
