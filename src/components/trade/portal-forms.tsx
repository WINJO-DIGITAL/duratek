"use client";

import { useActionState } from "react";
import { saveCustomer } from "@/app/trade/account/customers/actions";
import { saveProject, saveRoom } from "@/app/trade/account/projects/actions";
import type { QuoteFormState } from "@/app/trade/account/quotes/actions";
import { Button } from "@/components/ui/button";
import { Field, SelectField, TextAreaField } from "@/components/ui/field";

const idle: QuoteFormState = { status: "idle" };
const keep = (state: QuoteFormState) => (name: string, fallback?: string | number | null) =>
  state.status === "error" && state.values?.[name] !== undefined ? state.values[name] : fallback == null ? "" : String(fallback);

function Status({ state }: { state: QuoteFormState }) {
  return (
    <p aria-live="polite" className="text-[0.9375rem] text-navy">
      {state.status === "saved" && state.message}
      {state.status === "error" && state.message && <span className="text-error">{state.message}</span>}
    </p>
  );
}

export interface CustomerValues {
  id?: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  address?: string;
  postcode?: string | null;
  notes?: string;
}

export function CustomerForm({ values, next, idPrefix = "c" }: { values: CustomerValues; next?: "project"; idPrefix?: string }) {
  const [state, action, pending] = useActionState(saveCustomer, idle);
  const e = state.status === "error" ? state.errors : {};
  const v = keep(state);
  const id = (n: string) => `${idPrefix}-${n}`;
  return (
    <form action={action} className="space-y-5">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      {next && <input type="hidden" name="next" value={next} />}
      <Field id={id("name")} name="name" label="Name" defaultValue={v("name", values.name)} error={e.name} required maxLength={200} autoComplete="off" />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={id("email")} name="email" label="Email" hint="Optional" type="email" defaultValue={v("email", values.email)} error={e.email} autoComplete="off" />
        <Field id={id("phone")} name="phone" label="Phone" hint="Optional" type="tel" defaultValue={v("phone", values.phone)} error={e.phone} autoComplete="off" />
      </div>
      <div className="grid gap-5 sm:grid-cols-[1fr_10rem]">
        <Field id={id("address")} name="address" label="Address" hint="Optional" defaultValue={v("address", values.address)} error={e.address} autoComplete="off" />
        <Field id={id("postcode")} name="postcode" label="Postcode" hint="Optional" defaultValue={v("postcode", values.postcode)} error={e.postcode} className="uppercase" autoComplete="off" />
      </div>
      <TextAreaField id={id("notes")} name="notes" label="Notes" hint="Only you see these" rows={2} maxLength={2000} defaultValue={v("notes", values.notes)} error={e.notes} />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving" : values.id ? "Save customer" : "Add customer"}</Button>
        <Status state={state} />
      </div>
    </form>
  );
}

export interface ProjectValues {
  id?: string;
  name?: string;
  customerId?: string | null;
  sitePostcode?: string | null;
  notes?: string;
}

export function ProjectForm({ values, customers }: { values: ProjectValues; customers: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(saveProject, idle);
  const e = state.status === "error" ? state.errors : {};
  const v = keep(state);
  return (
    <form action={action} className="space-y-5">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <Field id="p-name" name="name" label="Project name" defaultValue={v("name", values.name)} error={e.name} required maxLength={120} placeholder="Smith kitchen and hall" autoComplete="off" />
      <div className="grid gap-5 sm:grid-cols-[1fr_10rem]">
        <SelectField
          id="p-customer"
          name="customer_id"
          label="Customer"
          defaultValue={v("customer_id", values.customerId)}
          error={e.customer_id}
          options={[{ value: "", label: customers.length ? "Choose a customer" : "No customers yet" }, ...customers.map((c) => ({ value: c.id, label: c.name }))]}
        />
        <Field id="p-postcode" name="site_postcode" label="Site postcode" hint="Optional" defaultValue={v("site_postcode", values.sitePostcode)} error={e.site_postcode} className="uppercase" autoComplete="off" />
      </div>
      <TextAreaField id="p-notes" name="notes" label="Notes" hint="Only you see these" rows={2} maxLength={4000} defaultValue={v("notes", values.notes)} error={e.notes} />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button type="submit" disabled={pending} arrow={!values.id}>{pending ? "Saving" : values.id ? "Save project" : "Create project"}</Button>
        <Status state={state} />
      </div>
    </form>
  );
}

export interface RoomValues {
  id?: string;
  name?: string;
  lengthM?: number | null;
  widthM?: number | null;
  wastagePct?: number;
  finishId?: string | null;
}

/** A room: name, length and width (metres, or cm/mm), wastage and finish. */
export function RoomForm({
  projectId,
  values,
  finishes,
  defaultWastage,
}: {
  projectId: string;
  values: RoomValues;
  finishes: { id: string; label: string }[];
  defaultWastage: number;
}) {
  const [state, action, pending] = useActionState(saveRoom, idle);
  const e = state.status === "error" ? state.errors : {};
  const v = keep(state);
  const p = values.id ? `r-${values.id.slice(0, 8)}` : "r-new";
  return (
    <form action={action} className="space-y-4" key={!values.id && state.status === "saved" ? state.message : "form"}>
      <input type="hidden" name="project_id" value={projectId} />
      {values.id && <input type="hidden" name="room_id" value={values.id} />}
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
        <Field id={`${p}-name`} name="room_name" label="Room" defaultValue={v("room_name", values.name)} error={e.room_name} required maxLength={120} placeholder="Kitchen" autoComplete="off" />
        <SelectField
          id={`${p}-finish`}
          name="finish_id"
          label="Finish"
          defaultValue={v("finish_id", values.finishId)}
          error={e.finish_id}
          options={[{ value: "", label: "Choose Later" }, ...finishes.map((f) => ({ value: f.id, label: f.label }))]}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field id={`${p}-length`} name="length_m" label="Length" hint="m" inputMode="decimal" defaultValue={v("length_m", values.lengthM)} error={e.length_m} autoComplete="off" />
        <Field id={`${p}-width`} name="width_m" label="Width" hint="m" inputMode="decimal" defaultValue={v("width_m", values.widthM)} error={e.width_m} autoComplete="off" />
        <Field id={`${p}-wastage`} name="wastage_pct" label="Wastage" hint="%" inputMode="decimal" defaultValue={v("wastage_pct", values.wastagePct ?? defaultWastage)} error={e.wastage_pct} autoComplete="off" />
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button type="submit" variant={values.id ? "outline" : "primary"} disabled={pending}>{pending ? "Saving" : values.id ? "Save room" : "Add room"}</Button>
        <Status state={state} />
      </div>
    </form>
  );
}
