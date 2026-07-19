"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { login, type AuthFormState } from "@/lib/auth/actions";

const initialState: AuthFormState = {};

export function LoginForm() {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-earth">
          {t("auth.loginTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("auth.loginSubtitle")}</p>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium text-ink">
        {t("common.email")}
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="rounded-lg border border-sand bg-canvas px-3 py-2 font-normal outline-none focus:border-brand"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-ink">
        {t("common.password")}
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="rounded-lg border border-sand bg-canvas px-3 py-2 font-normal outline-none focus:border-brand"
        />
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-brand">
          {t(`auth.${state.error}`)}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand px-4 py-2 font-medium text-white hover:bg-brand-soft disabled:opacity-60"
      >
        {pending ? t("common.loading") : t("auth.submitLogin")}
      </button>

      <p className="text-center text-sm text-muted">
        {t("auth.noAccount")}{" "}
        <Link href="/register" className="font-medium text-brand hover:underline">
          {t("common.register")}
        </Link>
      </p>
    </form>
  );
}
