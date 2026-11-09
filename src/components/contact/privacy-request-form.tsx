"use client";

import { useActionState } from "react";
import { submitPrivacyRequest } from "@/app/privacy/request/actions";
import { Button } from "@/components/ui/button";
import { Field, SelectField, TextAreaField } from "@/components/ui/field";
import { PRIVACY_KINDS, type PrivacyRequestState } from "@/lib/privacy";

export function PrivacyRequestForm() {
  const [state, action, pending] = useActionState(submitPrivacyRequest, { status: "idle" } as PrivacyRequestState);
  if (state.status === "sent") {
    return (
      <div role="status" className="card p-6 sm:p-8">
        <h2 className="text-display-sm text-navy">We&rsquo;ve got your request.</h2>
        <p className="mt-3 max-w-[60ch] text-navy/75">
          We&rsquo;ll check that it&rsquo;s you, then reply to {state.email} within one month. We won&rsquo;t share or delete anything until we have.
        </p>
      </div>
    );
  }
  const e = state.status === "error" ? state.errors : {};
  const v = (k: string) => (state.status === "error" ? (state.values[k] ?? "") : "");
  return (
    <form action={action} className="card space-y-5 p-6 sm:p-8" noValidate>
      <Field name="email" label="Your email address" type="email" autoComplete="email" required defaultValue={v("email")} error={e.email} maxLength={254} hint="The address we hold your details under" />
      <SelectField name="kind" label="What would you like?" defaultValue={v("kind") || "access"} error={e.kind} options={PRIVACY_KINDS} />
      <TextAreaField name="details" label="Anything else we should know" hint="Optional" rows={4} maxLength={2000} defaultValue={v("details")} error={e.details} />
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="company_website">Company website</label>
        <input id="company_website" name="company_website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button type="submit" disabled={pending} arrow>{pending ? "Sending" : "Send request"}</Button>
        <p aria-live="polite" className="text-[0.9375rem] text-error">{state.status === "error" && state.message}</p>
      </div>
    </form>
  );
}
