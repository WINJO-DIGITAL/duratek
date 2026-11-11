"use client";

import { useActionState, type ComponentProps } from "react";
import { applyForTrade } from "@/app/trade/apply/actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { Check } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import {
  PASSWORD_MIN,
  TRADE_TYPES,
  type TradeApplicationState,
  type TradeField,
} from "@/lib/trade/application";

/** The trade application. Validated, rate-limited and saved on the server. */
export function TradeApplicationForm() {
  const [state, action, pending] = useActionState(applyForTrade, { status: "idle" } as TradeApplicationState);

  if (state.status === "sent") {
    return (
      <section aria-live="polite" className="max-w-xl border-t border-line pt-10">
        <span className="flex size-12 items-center justify-center bg-green-ink text-white">
          <Check size={22} />
        </span>
        <h2 className="mt-6 text-display-md text-navy">Thank you, {state.firstName}.</h2>
        <p className="mt-4 text-lede text-ink-muted">
          We&rsquo;ve received your application. Please confirm your email address with the link we&rsquo;ve sent to{" "}
          {state.email}. We then check every application by hand and email you when your account is approved.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
          <ButtonLink href="/range">Browse the Range</ButtonLink>
        </div>
      </section>
    );
  }

  const error = (name: TradeField) => (state.status === "error" ? state.errors[name] : undefined);
  const value = (name: Exclude<TradeField, "password">) => (state.status === "error" ? state.values[name] : undefined);

  return (
    <form action={action} noValidate className="max-w-xl space-y-6">
      {state.status === "error" && state.message && (
        <p role="alert" className="notice border-error/50 px-4 py-3 text-[0.9375rem] text-navy">
          {state.message}
        </p>
      )}

      <fieldset>
        <legend className="text-[0.9375rem] font-medium text-navy">What best describes you?</legend>
        <div
          className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"
          aria-describedby={error("trade_type") ? "trade_type-error" : undefined}
        >
          {TRADE_TYPES.map((t) => (
            <label key={t.value} className="relative cursor-pointer">
              <input
                type="radio"
                name="trade_type"
                value={t.value}
                defaultChecked={value("trade_type") === t.value}
                required
                className="peer absolute inset-0 opacity-0"
              />
              <span className="flex min-h-14 items-center justify-center rounded-control border border-navy/25 bg-white px-3 text-[0.9375rem] text-navy transition-colors peer-checked:border-navy peer-checked:bg-navy peer-checked:text-off-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus">
                {t.label}
              </span>
            </label>
          ))}
        </div>
        {error("trade_type") && (
          <p id="trade_type-error" className="mt-2 text-[0.875rem] text-error">
            {error("trade_type")}
          </p>
        )}
      </fieldset>

      <Field error={error("company_name")} defaultValue={value("company_name")} name="company_name" label="Company name" autoComplete="organization" required />
      <Field error={error("contact_name")} defaultValue={value("contact_name")} name="contact_name" label="Your name" autoComplete="name" required />
      <Field error={error("email")} defaultValue={value("email")} name="email" label="Work email" type="email" autoComplete="email" inputMode="email" required />
      <Field error={error("phone")} defaultValue={value("phone")} name="phone" label="Phone" type="tel" autoComplete="tel" required />

      <fieldset className="space-y-6 border-t border-line pt-6">
        <legend className="sr-only">Business details</legend>
        <p className="text-[0.9375rem] font-medium text-navy">Your business</p>
        <Field error={error("address_line1")} defaultValue={value("address_line1")} name="address_line1" label="Address" autoComplete="address-line1" required />
        <Field error={error("address_line2")} defaultValue={value("address_line2")} name="address_line2" label="Address line 2" hint="Optional" autoComplete="address-line2" />
        <div className="grid gap-6 sm:grid-cols-2">
          <Field error={error("town")} defaultValue={value("town")} name="town" label="Town or city" autoComplete="address-level2" required />
          <Field error={error("postcode")} defaultValue={value("postcode")} name="postcode" label="Postcode" autoComplete="postal-code" required className="uppercase" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field error={error("company_number")} defaultValue={value("company_number")} name="company_number" label="Company number" hint="If registered" autoComplete="off" />
          <Field error={error("vat_number")} defaultValue={value("vat_number")} name="vat_number" label="VAT number" hint="If registered" autoComplete="off" />
        </div>
        <Field error={error("website")} defaultValue={value("website")} name="website" label="Website" hint="Optional" type="url" inputMode="url" autoComplete="url" />
        <div>
          <label htmlFor="trade-additional_info" className="flex items-baseline justify-between gap-3 text-[0.9375rem] font-medium text-navy">
            Anything else we should know?
            <span className="text-[0.8125rem] font-normal text-ink-muted">Optional</span>
          </label>
          <textarea
            id="trade-additional_info"
            name="additional_info"
            rows={3}
            maxLength={2000}
            defaultValue={value("additional_info")}
            placeholder="The work you do, areas you cover, typical volumes"
            className="mt-2 w-full rounded-control border border-navy/25 bg-white px-4 py-3 text-base text-navy focus:border-navy"
          />
          {error("additional_info") && <p className="mt-2 text-[0.875rem] text-error">{error("additional_info")}</p>}
        </div>
      </fieldset>
      <Field
        error={error("password")}
        name="password"
        label="Choose a password"
        hint={`At least ${PASSWORD_MIN} characters`}
        type="password"
        autoComplete="new-password"
        minLength={PASSWORD_MIN}
        required
      />

      {/* Honeypot: hidden from people and assistive tech; bots fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="trade_company_website">Company website</label>
        <input id="trade_company_website" name="company_website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <p className="text-[0.8125rem] leading-relaxed text-ink-muted">
        We use these details only to check and run your trade account. Your password is used to log in once your
        account is approved.
      </p>

      <Button type="submit" size="lg" disabled={pending} arrow={!pending} className="w-full sm:w-auto">
        {pending ? "Sending your application" : "Apply for a trade account"}
      </Button>
    </form>
  );
}

function Field({
  name,
  label,
  hint,
  error,
  className,
  ...input
}: {
  name: TradeField;
  label: string;
  hint?: string;
  error?: string;
} & Omit<ComponentProps<"input">, "name">) {
  const id = `trade-${name}`;
  const described = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="flex items-baseline justify-between gap-3 text-[0.9375rem] font-medium text-navy">
        {label}
        {hint && (
          <span id={`${id}-hint`} className="text-[0.8125rem] font-normal text-ink-muted">
            {hint}
          </span>
        )}
      </label>
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={described}
        className={cn(
          "mt-2 min-h-14 w-full rounded-control border bg-white px-4 text-base text-navy transition-colors focus:border-navy",
          error ? "border-error" : "border-navy/25",
          className,
        )}
        {...input}
      />
      {error && (
        <p id={`${id}-error`} className="mt-2 text-[0.875rem] text-error">
          {error}
        </p>
      )}
    </div>
  );
}
