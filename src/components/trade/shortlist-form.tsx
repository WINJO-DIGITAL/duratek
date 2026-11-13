"use client";

import Image from "next/image";
import { useActionState } from "react";
import { createShortlist, type ShortlistState } from "@/app/trade/account/shortlists/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

export interface ShortlistOption {
  id: string;
  name: string;
  detail: string;
  swatch?: string;
}

export function ShortlistForm({ options }: { options: ShortlistOption[] }) {
  const [state, action, pending] = useActionState(createShortlist, { status: "idle" } as ShortlistState);
  const e = state.status === "error" ? state.errors : {};
  const kept = state.status === "error" ? state : undefined;
  return (
    <form action={action} className="space-y-6" key={state.status === "saved" ? state.message : "form"}>
      <Field name="name" label="Name" hint="Only you see this" maxLength={120} required error={e.name} defaultValue={kept?.name ?? ""} placeholder="Smith kitchen" autoComplete="off" />
      <fieldset aria-describedby={e.finish_ids ? "finish-ids-error" : undefined}>
        <legend className="text-[0.9375rem] font-medium text-navy">Finishes</legend>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {options.map((o) => (
            <li key={o.id}>
              <label className="flex min-h-tap cursor-pointer items-center gap-3 rounded-control border border-navy/15 bg-white px-3 py-2 has-[:checked]:border-green-ink">
                <input type="checkbox" name="finish_id" value={o.id} defaultChecked={kept?.finishIds?.includes(o.id) ?? false} className="size-5 shrink-0 accent-green-ink" />
                <span className="relative size-9 shrink-0 overflow-hidden rounded-control bg-line">
                  {o.swatch && <Image src={o.swatch} alt="" fill sizes="36px" quality={70} className="object-cover" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[0.9375rem] text-navy">{o.name}</span>
                  <span className="data block text-[0.75rem] text-ink-muted">{o.detail}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        {e.finish_ids && (
          <p id="finish-ids-error" className="mt-2 text-[0.875rem] text-error">
            {e.finish_ids}
          </p>
        )}
      </fieldset>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : "Save shortlist"}
        </Button>
        <p aria-live="polite" className="text-[0.9375rem] text-navy">
          {state.status === "saved" && state.message}
          {state.status === "error" && state.message && <span className="text-error">{state.message}</span>}
        </p>
      </div>
    </form>
  );
}
