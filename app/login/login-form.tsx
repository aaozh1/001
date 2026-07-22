"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { login, type AuthFormState } from "@/lib/auth/actions";
import { Button, Input } from "@/components/ui";

const initialState: AuthFormState = {};

export function LoginForm() {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(login, initialState);
  // Carry the deep link the user was heading to through the form so login
  // lands them there, not on the generic dashboard.
  const callbackUrl = useSearchParams().get("callbackUrl") ?? "";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          {t("auth.loginTitle")}
        </h1>
        <p className="mt-1 text-sm text-sub">{t("auth.loginSubtitle")}</p>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium text-ink">
        {t("common.email")}
        <Input type="email" name="email" required autoComplete="email" />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-ink">
        <span className="flex items-baseline justify-between">
          {t("common.password")}
          <Link href="/forgot" className="text-xs font-normal text-brand hover:underline">
            {t("auth.forgot")}
          </Link>
        </span>
        <Input
          type="password"
          name="password"
          required
          autoComplete="current-password"
        />
      </label>

      {state.error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-sm border border-error-soft bg-error-soft px-3 py-2.5 text-sm text-error"
        >
          <span className="font-mono font-bold">!</span>
          {t(`auth.${state.error}`)}
        </p>
      )}

      <Button type="submit" fullWidth disabled={pending}>
        {pending ? t("common.loading") : t("auth.submitLogin")}
      </Button>

      <p className="text-center text-sm text-sub">
        {t("auth.noAccount")}{" "}
        <Link href="/register" className="font-medium text-brand hover:underline">
          {t("common.register")}
        </Link>
      </p>
    </form>
  );
}
