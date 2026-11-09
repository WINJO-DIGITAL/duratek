"use client";

import { useActionState } from "react";
import { saveBranding, savePreferences, type SettingsState } from "@/app/trade/account/settings/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { penceToInput } from "@/lib/money";
import type { Branding, Preferences } from "@/lib/trade/quote-forms";

export function SettingsForm({ prefs }: { prefs: Preferences }) {
  const [state, action, pending] = useActionState(savePreferences, { status: "idle" } as SettingsState);
  const errors = state.status === "error" ? state.errors : {};
  const v = (k: string, fallback: string) => (state.status === "error" && state.values?.[k] !== undefined ? state.values[k] : fallback);
  return (
    <form action={action} className="card max-w-2xl space-y-6 p-5 sm:p-8">
      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          name="default_markup"
          label="Default markup"
          hint="% on your cost"
          inputMode="decimal"
          defaultValue={v("default_markup", String(prefs.default_markup_bp / 100))}
          error={errors.default_markup}
          required
        />
        <Field
          name="default_wastage"
          label="Default wastage"
          hint="% extra flooring"
          inputMode="decimal"
          defaultValue={v("default_wastage", String(prefs.default_wastage_pct))}
          error={errors.default_wastage}
          required
        />
        <Field
          name="labour_per_m2"
          label="Labour rate"
          hint="£ per m², ex VAT"
          inputMode="decimal"
          defaultValue={v("labour_per_m2", penceToInput(prefs.labour_per_m2_pence))}
          error={errors.labour_per_m2}
          placeholder="Optional"
        />
      </div>
      <label className="flex min-h-tap items-center gap-3 text-[0.9375rem] text-navy">
        <input type="checkbox" name="vat_registered" defaultChecked={state.status === "error" && state.values ? state.values.vat_registered === "on" : prefs.vat_registered} className="size-5 accent-green-ink" />
        I’m VAT registered (new quotes add VAT at 20%)
      </label>
      <div>
        <label htmlFor="quote_footer" className="text-[0.9375rem] font-medium text-navy">
          Quote footer
        </label>
        <p className="mt-1 text-[0.8125rem] text-ink-muted">Printed on every quote: payment terms, guarantee, bank details.</p>
        <textarea
          id="quote_footer"
          name="quote_footer"
          rows={4}
          maxLength={2000}
          defaultValue={v("quote_footer", prefs.quote_footer)}
          aria-invalid={errors.quote_footer ? true : undefined}
          className="mt-2 w-full rounded-control border border-navy/25 bg-white px-4 py-3 text-base text-navy focus:border-navy"
        />
        {errors.quote_footer && <p className="mt-2 text-[0.875rem] text-error">{errors.quote_footer}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : "Save settings"}
        </Button>
        <p aria-live="polite" className="text-[0.9375rem] text-navy">
          {state.status === "saved" && "Saved."}
          {state.status === "error" && state.message && <span className="text-error">{state.message}</span>}
        </p>
      </div>
    </form>
  );
}

/** Branding for the trader's quotes: name, contact details, website, address and colour. */
export function BrandingForm({ branding }: { branding: Branding }) {
  const [state, action, pending] = useActionState(saveBranding, { status: "idle" } as SettingsState);
  const errors = state.status === "error" ? state.errors : {};
  const v = (k: keyof Branding) => (state.status === "error" && state.values?.[k] !== undefined ? state.values[k] : (branding[k] ?? ""));
  return (
    <form action={action} className="space-y-5">
      <Field name="display_name" label="Business name on quotes" hint="Blank: your company name" defaultValue={v("display_name")} error={errors.display_name} maxLength={120} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="contact_email" label="Email" type="email" defaultValue={v("contact_email")} error={errors.contact_email} />
        <Field name="contact_phone" label="Phone" type="tel" defaultValue={v("contact_phone")} error={errors.contact_phone} />
      </div>
      <div className="grid gap-5 sm:grid-cols-[1fr_10rem]">
        <Field name="website" label="Website" hint="Optional" defaultValue={v("website")} error={errors.website} placeholder="yourbusiness.co.uk" />
        <div>
          <label htmlFor="field-brand_colour" className="text-[0.9375rem] font-medium text-navy">Brand colour</label>
          <input
            id="field-brand_colour"
            name="brand_colour"
            type="color"
            defaultValue={v("brand_colour") || "#18364c"}
            className="mt-2 block h-14 w-full cursor-pointer rounded-control border border-navy/25 bg-white p-1"
          />
          {errors.brand_colour && <p className="mt-2 text-[0.875rem] text-error">{errors.brand_colour}</p>}
        </div>
      </div>
      <Field name="address" label="Business address" hint="Optional" defaultValue={v("address")} error={errors.address} maxLength={400} />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving" : "Save branding"}</Button>
        <p aria-live="polite" className="text-[0.9375rem] text-navy">
          {state.status === "saved" && "Saved. New quotes and PDFs use it straight away."}
          {state.status === "error" && state.message && <span className="text-error">{state.message}</span>}
        </p>
      </div>
    </form>
  );
}
