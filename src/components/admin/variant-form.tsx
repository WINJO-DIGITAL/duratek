"use client";

import { useActionState } from "react";
import { saveVariant } from "@/app/admin/finishes/actions";
import { Button } from "@/components/ui/button";
import { Field, SelectField } from "@/components/ui/field";
import { IDLE, type AdminFormState } from "@/lib/admin/form-state";

export interface VariantValues {
  id?: string;
  sku?: string;
  name?: string;
  unit_of_sale?: string;
  pack_coverage_m2?: number | null;
  units_per_pack?: number | null;
  length_mm?: number | null;
  width_mm?: number | null;
  thickness_mm?: number | null;
  vat_rate_bp?: number;
  active?: boolean;
  is_default?: boolean;
}

const keep = (state: AdminFormState) => (k: string, fallback: string | number | null | undefined) =>
  state.status === "error" && state.values?.[k] !== undefined ? state.values[k] : fallback == null ? "" : String(fallback);

export function VariantForm({ finishId, values }: { finishId: string; values: VariantValues }) {
  const [state, action, pending] = useActionState(saveVariant, IDLE);
  const e = state.status === "error" ? state.errors : {};
  const v = keep(state);
  const p = values.id ? `v-${values.id.slice(0, 8)}-` : "v-new-";
  const isDefault = Boolean(values.is_default);
  return (
    <form action={action} className="space-y-4" key={!values.id && state.status === "saved" ? state.message : "form"}>
      <input type="hidden" name="finish_id" value={finishId} />
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_11rem]">
        <Field id={`${p}name`} name="name" label="Name" defaultValue={v("name", values.name)} error={e.name} required maxLength={120} placeholder="Standard pack" />
        <Field id={`${p}sku`} name="sku" label="Stock code" defaultValue={v("sku", values.sku)} error={e.sku} required maxLength={40} className="uppercase" />
        <SelectField
          id={`${p}unit`}
          name="unit_of_sale"
          label="Sold by"
          defaultValue={v("unit_of_sale", values.unit_of_sale ?? "pack")}
          error={e.unit_of_sale}
          options={[
            { value: "pack", label: "Pack" },
            { value: "m2", label: "Square metre" },
            { value: "item", label: "Item" },
            { value: "linear_metre", label: "Linear metre" },
          ]}
        />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        <Field id={`${p}cov`} name="pack_coverage_m2" label="Pack covers" hint="m²" inputMode="decimal" defaultValue={v("pack_coverage_m2", values.pack_coverage_m2)} error={e.pack_coverage_m2} />
        <Field id={`${p}units`} name="units_per_pack" label="Pieces per pack" inputMode="numeric" defaultValue={v("units_per_pack", values.units_per_pack)} error={e.units_per_pack} />
        <Field id={`${p}len`} name="length_mm" label="Length" hint="mm" inputMode="numeric" defaultValue={v("length_mm", values.length_mm)} error={e.length_mm} />
        <Field id={`${p}wid`} name="width_mm" label="Width" hint="mm" inputMode="numeric" defaultValue={v("width_mm", values.width_mm)} error={e.width_mm} />
        <Field id={`${p}thk`} name="thickness_mm" label="Thickness" hint="mm" inputMode="decimal" defaultValue={v("thickness_mm", values.thickness_mm)} error={e.thickness_mm} />
        <Field id={`${p}vat`} name="vat_percent" label="VAT" hint="%" inputMode="decimal" defaultValue={v("vat_percent", values.vat_rate_bp === undefined ? 20 : values.vat_rate_bp / 100)} error={e.vat_percent} />
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <label className="flex min-h-tap items-center gap-3 text-[0.9375rem] text-navy">
          <input type="checkbox" name="active" defaultChecked={values.active ?? true} className="size-5 accent-green-ink" />
          On sale
        </label>
        <Button type="submit" disabled={pending} variant={values.id ? "outline" : "primary"}>
          {pending ? "Saving" : values.id ? "Save variant" : "Add variant"}
        </Button>
        <p aria-live="polite" className="text-[0.9375rem] text-navy">
          {state.status === "saved" && state.message}
          {state.status === "error" && state.message && <span className="text-error">{state.message}</span>}
        </p>
      </div>
      {isDefault && <p className="text-[0.8125rem] text-ink-muted">This is the default variant: the plank sizes and pack coverage in the finish form above are copied here.</p>}
    </form>
  );
}
