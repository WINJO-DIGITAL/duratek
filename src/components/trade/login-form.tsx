"use client";

import { useActionState } from "react";
import { logIn } from "@/app/trade/login/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { LoginState } from "@/lib/auth/login";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(logIn, { status: "idle" } as LoginState);
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
      <Button type="submit" size="lg" disabled={pending} arrow={!pending} className="w-full sm:w-auto">
        {pending ? "Logging in" : "Log in"}
      </Button>
    </form>
  );
}
