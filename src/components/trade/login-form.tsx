"use client";

import { useActionState } from "react";
import Link from "next/link";
import { logIn, resendConfirmation } from "@/app/trade/login/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { LoginState } from "@/lib/auth/login";

function Unconfirmed({ email, resent }: { email: string; resent?: boolean }) {
  const [state, action, pending] = useActionState(resendConfirmation, { status: "unconfirmed", email, resent } as LoginState);
  const done = state.status === "unconfirmed" && state.resent;
  return (
    <form action={action} className="notice max-w-md space-y-3 px-4 py-3 text-[0.9375rem] text-navy" role="alert">
      <p className="font-medium">Please confirm your email address first.</p>
      <p className="text-ink-muted">We sent a link to {email} when you applied. Open it, then log in.</p>
      <input type="hidden" name="email" value={email} />
      {done ? (
        <p>We’ve sent the link again. Check your inbox and spam folder.</p>
      ) : (
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Sending" : "Send the link again"}
        </Button>
      )}
    </form>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(logIn, { status: "idle" } as LoginState);
  if (state.status === "unconfirmed") return <Unconfirmed email={state.email} resent={state.resent} />;
  return (
    <form action={action} noValidate className="max-w-md space-y-6">
      {state.status === "error" && (
        <p role="alert" className="notice border-error/50 px-4 py-3 text-[0.9375rem] text-navy">
          {state.message}
        </p>
      )}
      <input type="hidden" name="next" value={next} />
      <Field
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        defaultValue={state.status === "error" ? state.email : undefined}
        required
      />
      <Field name="password" label="Password" type="password" autoComplete="current-password" required />
      {/* Honeypot: hidden from people and assistive tech; bots fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="login_company_website">Company website</label>
        <input id="login_company_website" name="company_website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button type="submit" size="lg" disabled={pending} arrow={!pending} className="w-full sm:w-auto">
          {pending ? "Logging in" : "Log in"}
        </Button>
        <Link href="/trade/forgot-password" className="min-h-tap py-3 text-[0.9375rem] text-navy underline underline-offset-4 hover:text-green-ink">
          Forgotten your password?
        </Link>
      </div>
    </form>
  );
}
