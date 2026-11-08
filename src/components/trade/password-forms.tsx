"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/app/trade/forgot-password/actions";
import { setNewPassword } from "@/app/trade/reset-password/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { SimpleFormState } from "@/lib/auth/password";
import { PASSWORD_MIN } from "@/lib/trade/application";

const idle: SimpleFormState = { status: "idle" };

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, idle);
  if (state.status === "done") {
    return (
      <p role="status" className="notice max-w-md px-4 py-3 text-[0.9375rem] text-navy">
        {state.message}
      </p>
    );
  }
  return (
    <form action={action} noValidate className="max-w-md space-y-6">
      {state.status === "error" && (
        <p role="alert" className="notice px-4 py-3 text-[0.9375rem] text-navy">
          {state.message}
        </p>
      )}
      <Field name="email" label="Email" type="email" autoComplete="email" inputMode="email" required error={state.status === "error" ? state.errors?.email : undefined} />
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="forgot_company_website">Company website</label>
        <input id="forgot_company_website" name="company_website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <Button type="submit" size="lg" disabled={pending} arrow={!pending}>
        {pending ? "Sending" : "Send me a link"}
      </Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(setNewPassword, idle);
  const e = state.status === "error" ? (state.errors ?? {}) : {};
  return (
    <form action={action} noValidate className="max-w-md space-y-6">
      {state.status === "error" && (
        <p role="alert" className="notice px-4 py-3 text-[0.9375rem] text-navy">
          {state.message}
        </p>
      )}
      <Field name="password" label="New password" hint={`At least ${PASSWORD_MIN} characters`} type="password" autoComplete="new-password" required error={e.password} />
      <Field name="confirm" label="Type it again" type="password" autoComplete="new-password" required error={e.confirm} />
      <Button type="submit" size="lg" disabled={pending} arrow={!pending}>
        {pending ? "Saving" : "Save new password"}
      </Button>
    </form>
  );
}
