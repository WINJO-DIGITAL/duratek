"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, type ComponentProps } from "react";
import { requestSamples } from "@/app/samples/actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { Check, Close } from "@/components/ui/icons";
import type { CatalogueImage } from "@/lib/catalogue/types";
import { cn } from "@/lib/cn";
import type { SampleField, SampleRequestState } from "@/lib/samples/request";
import { useSamples } from "@/lib/samples/use-samples";

export interface SampleFinish {
  name: string;
  slug: string;
  detail: string; // e.g. "Straight plank · Natural oak"
  swatch?: CatalogueImage;
}

/**
 * The sample tray as a page, plus the request form. The tray is the same
 * selection as every "Add to samples" button (local storage). The form posts
 * to a server action that validates, rate-limits and saves the request.
 */
export function SampleRequest({ finishes, enabled }: { finishes: Record<string, SampleFinish>; enabled: boolean }) {
  const { items, limit, remove, clear } = useSamples();
  const [state, action, pending] = useActionState(requestSamples, { status: "idle" } as SampleRequestState);
  const chosen = items.filter((i) => finishes[i.id]);

  useEffect(() => {
    if (state.status === "sent") clear();
  }, [state, clear]);

  if (state.status === "sent") return <Sent state={state} />;

  return (
    <div className="grid gap-14 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
      {/* Tray */}
      <section aria-labelledby="tray-heading" className="lg:sticky lg:top-28 lg:self-start">
        <div className="flex items-baseline justify-between gap-4 border-b border-line pb-4">
          <h2 id="tray-heading" className="text-display-sm text-navy">
            Your Samples
          </h2>
          <p className="text-[0.9375rem] text-ink-muted tabular-nums" aria-live="polite">
            {chosen.length} of {limit} chosen
          </p>
        </div>
        <ul className="divide-y divide-line border-b border-line">
          {Array.from({ length: limit }, (_, i) => {
            const item = chosen[i];
            const f = item && finishes[item.id];
            return (
              <li key={item?.id ?? `empty-${i}`} className="flex min-h-28 items-center gap-5 py-4">
                {f ? (
                  <>
                    <Link href={`/range/${f.slug}`} className="relative size-20 shrink-0 overflow-hidden rounded-control bg-line">
                      {f.swatch && (
                        <Image src={f.swatch.src} alt="" fill sizes="80px" quality={70} className="object-cover" />
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link href={`/range/${f.slug}`} className="font-display text-[1.25rem] leading-tight text-navy hover:text-green-ink">
                        {f.name}
                      </Link>
                      <p className="mt-1 text-[0.875rem] text-ink-muted">{f.detail}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      className="-mr-2 flex size-tap shrink-0 items-center justify-center text-ink-muted transition-colors hover:text-navy"
                    >
                      <Close size={18} />
                      <span className="sr-only">Remove {f.name}</span>
                    </button>
                  </>
                ) : (
                  <Link
                    href="/range"
                    className="group flex flex-1 items-center gap-5 text-ink-muted transition-colors hover:text-navy"
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-20 shrink-0 items-center justify-center rounded-control border border-dashed border-oak/40 text-2xl font-light transition-colors group-hover:border-navy/50"
                    >
                      +
                    </span>
                    <span className="text-[0.9375rem]">{i === 0 ? "Choose a finish from the range" : "Add another finish"}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
        {state.status === "error" && state.errors.finish_ids && (
          <p className="mt-3 text-[0.875rem] text-error">{state.errors.finish_ids}</p>
        )}
      </section>

      {/* Form */}
      <section aria-labelledby="details-heading">
        {!enabled ? (
          <div className="notice px-5 py-5 sm:px-6">
            <h2 id="details-heading" className="font-medium text-navy">
              Online Sample Requests Open Soon.
            </h2>
            <p className="mt-2 text-[0.9375rem] text-ink-muted">
              Your choices are saved on this device, so they&rsquo;ll be here when requests open. In the meantime you
              can{" "}
              <Link href="/where-to-buy" className="text-navy underline underline-offset-4 hover:text-green-ink">
                find where to buy
              </Link>
              .
            </p>
          </div>
        ) : chosen.length === 0 ? (
          <div>
            <h2 id="details-heading" className="text-display-sm text-navy">
              Start with a Finish.
            </h2>
            <p className="mt-3 max-w-md text-ink-muted">
              Add up to {limit} finishes from the range, then come back here to tell us where to send them.
            </p>
            <ButtonLink href="/range" className="mt-6">
              Browse the Range
            </ButtonLink>
          </div>
        ) : (
          <form action={action} noValidate className="space-y-5">
            <h2 id="details-heading" className="text-display-sm text-navy">
              Where Should We Send Them?
            </h2>
            {state.status === "error" && state.message && (
              <p role="alert" className="notice border-error/50 px-4 py-3 text-[0.9375rem] text-navy">
                {state.message}
              </p>
            )}
            {chosen.map((i) => (
              <input key={i.id} type="hidden" name="finish_id" value={i.id} />
            ))}

            <Field state={state} name="name" label="Full name" autoComplete="name" required />
            <Field state={state} name="email" label="Email" type="email" autoComplete="email" inputMode="email" required />
            <Field state={state} name="phone" label="Phone" hint="Optional, in case the courier needs it" type="tel" autoComplete="tel" />
            <Field state={state} name="address_line1" label="Address line 1" autoComplete="address-line1" required />
            <Field state={state} name="address_line2" label="Address line 2" hint="Optional" autoComplete="address-line2" />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field state={state} name="town" label="Town or city" autoComplete="address-level2" required />
              <Field
                state={state}
                name="postcode"
                label="Postcode"
                autoComplete="postal-code"
                autoCapitalize="characters"
                spellCheck={false}
                className="uppercase"
                required
              />
            </div>

            {/* Honeypot: hidden from people and assistive tech; bots fill it. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
              <label htmlFor="company_website">Company website</label>
              <input id="company_website" name="company_website" type="text" tabIndex={-1} autoComplete="off" />
            </div>

            <label className="flex cursor-pointer items-start gap-3 py-2 text-[0.9375rem] text-navy">
              <input
                type="checkbox"
                name="marketing_opt_in"
                defaultChecked={state.status === "error" ? state.values.marketing_opt_in : false}
                className="mt-0.5 size-5 shrink-0 accent-green-ink"
              />
              <span>Send me occasional news from Duratek. You can unsubscribe at any time.</span>
            </label>

            <p className="text-[0.8125rem] leading-relaxed text-ink-muted">
              We&rsquo;ll use these details only to send your samples and, if you tick the box above, the occasional
              email from Duratek.
            </p>

            <Button type="submit" size="lg" disabled={pending} arrow={!pending} className="w-full sm:w-auto">
              {pending ? "Sending your request" : `Request ${chosen.length === 1 ? "my free sample" : `my ${chosen.length} free samples`}`}
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}

function Field({
  state,
  name,
  label,
  hint,
  className,
  ...input
}: {
  state: SampleRequestState;
  name: SampleField;
  label: string;
  hint?: string;
} & Omit<ComponentProps<"input">, "name">) {
  const error = state.status === "error" ? state.errors[name] : undefined;
  const value = state.status === "error" ? state.values[name] : undefined;
  const id = `field-${name}`;
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
        defaultValue={value}
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

function Sent({ state }: { state: Extract<SampleRequestState, { status: "sent" }> }) {
  return (
    <section aria-live="polite" className="max-w-2xl border-t border-line pt-10">
      <span className="flex size-12 items-center justify-center bg-green-ink text-white">
        <Check size={22} />
      </span>
      <h2 className="mt-6 text-display-md text-navy">Thank you, {state.firstName}.</h2>
      <p className="mt-4 text-lede text-ink-muted">
        We&rsquo;ve received your sample request{state.finishes.length > 0 && ":"}
      </p>
      {state.finishes.length > 0 && (
        <ul className="mt-4 space-y-2">
          {state.finishes.map((n) => (
            <li key={n} className="flex items-center gap-3 text-navy">
              <span aria-hidden="true" className="size-2 bg-green-ink" />
              {n}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-ink-muted">We&rsquo;ll email a confirmation to {state.email}.</p>
      <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
        <ButtonLink href="/where-to-buy">Find Where to Buy</ButtonLink>
        <ButtonLink href="/range" variant="quiet" arrow={false}>
          Keep Browsing
        </ButtonLink>
      </div>
    </section>
  );
}
