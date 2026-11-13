"use client";

import { useActionState } from "react";
import { submitEnquiry } from "@/app/contact/actions";
import { Button } from "@/components/ui/button";
import { Field, TextAreaField } from "@/components/ui/field";
import type { EnquiryState } from "@/lib/enquiries/enquiry";

export function EnquiryForm({
  stockist,
  finish,
}: {
  /** A live stockist this enquiry is for. */
  stockist?: { id: string; name: string };
  finish?: { id: string; name: string };
}) {
  const [state, action, pending] = useActionState(submitEnquiry, { status: "idle" } as EnquiryState);
  if (state.status === "sent") {
    return (
      <div role="status" className="card p-6 sm:p-8">
        <h2 className="text-display-sm text-navy">Thank You. We&rsquo;ve Got Your Message.</h2>
        <p className="mt-3 max-w-[60ch] text-navy/75">
          {state.stockistName
            ? state.forwarded
              ? `We've passed it to ${state.stockistName}, and they'll reply to ${state.email}.`
              : `We've received it and will pass it on to ${state.stockistName}. A reply will come to ${state.email}.`
            : `We'll reply to ${state.email}.`}
        </p>
        <p className="mt-3 max-w-[60ch] text-[0.9375rem] text-ink-muted">
          If email is set up we&rsquo;ll also send you a copy. Nothing here confirms that any product is in stock.
        </p>
      </div>
    );
  }
  const e = state.status === "error" ? state.errors : {};
  const v = (k: string) => (state.status === "error" ? (state.values[k] ?? "") : "");
  return (
    <form action={action} className="card space-y-5 p-6 sm:p-8" noValidate>
      {stockist && <input type="hidden" name="stockist_id" value={stockist.id} />}
      {finish && <input type="hidden" name="finish_id" value={finish.id} />}
      {stockist && <p className="text-navy">Your message is for <strong className="font-medium">{stockist.name}</strong>.</p>}
      {finish && <p className="text-navy">About <strong className="font-medium">{finish.name}</strong>.</p>}
      <Field name="name" label="Your name" autoComplete="name" required defaultValue={v("name")} error={e.name} maxLength={200} />
      <Field name="email" label="Email" type="email" autoComplete="email" inputMode="email" required defaultValue={v("email")} error={e.email} maxLength={254} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="phone" label="Phone" hint="Optional" type="tel" autoComplete="tel" defaultValue={v("phone")} error={e.phone} maxLength={30} />
        <Field name="postcode" label="Your postcode" hint="Optional" autoComplete="postal-code" defaultValue={v("postcode")} error={e.postcode} maxLength={10} className="uppercase" />
      </div>
      <TextAreaField name="message" label="Your message" required rows={5} maxLength={2000} defaultValue={v("message")} error={e.message} />

      {/* Honeypot: hidden from people and assistive tech; bots fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="company_website">Company website</label>
        <input id="company_website" name="company_website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <label className="flex min-h-tap cursor-pointer items-start gap-3 py-1 text-[0.9375rem] text-navy">
        <input type="checkbox" name="wants_contact" defaultChecked={state.status !== "error" || v("wants_contact") === "on"} className="mt-1 size-5 accent-green-ink" />
        <span>Please contact me about this.</span>
      </label>
      {stockist && (
        <div>
          <label className="flex min-h-tap cursor-pointer items-start gap-3 py-1 text-[0.9375rem] text-navy">
            <input type="checkbox" name="share_with_stockist" defaultChecked={v("share_with_stockist") === "on"} aria-describedby={e.share_with_stockist ? "share-error" : undefined} className="mt-1 size-5 accent-green-ink" />
            <span>
              I agree that Duratek may pass my name, email, phone number and message to {stockist.name} so they can reply to me.
            </span>
          </label>
          {e.share_with_stockist && (
            <p id="share-error" className="mt-1 text-[0.875rem] text-error">
              {e.share_with_stockist}
            </p>
          )}
        </div>
      )}
      <p className="text-[0.8125rem] text-ink-muted">
        We use your details only to reply to this message. See our <a href="/privacy" className="underline underline-offset-4">privacy notice</a>.
      </p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button type="submit" disabled={pending} arrow>
          {pending ? "Sending" : "Send message"}
        </Button>
        <p aria-live="polite" className="text-[0.9375rem] text-error">
          {state.status === "error" && state.message}
        </p>
      </div>
    </form>
  );
}
