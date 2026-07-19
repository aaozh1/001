"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { register, type AuthFormState } from "@/lib/auth/actions";
import { WORKSPACES, type Workspace } from "@/lib/permissions";

const initialState: AuthFormState = {};

export function RegisterForm() {
  const t = useTranslations();
  const [role, setRole] = useState<Workspace>("designer");
  const [state, formAction, pending] = useActionState(register, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-earth">
          {t("auth.registerTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("auth.registerSubtitle")}</p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-ink">
          {t("auth.chooseRole")}
        </legend>
        <input type="hidden" name="role" value={role} />
        <div className="grid grid-cols-2 gap-2">
          {WORKSPACES.map((w) => {
            const selected = role === w;
            return (
              <button
                key={w}
                type="button"
                onClick={() => setRole(w)}
                aria-pressed={selected}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  selected
                    ? "border-brand bg-brand/5"
                    : "border-sand bg-canvas hover:border-brand/50"
                }`}
              >
                <span className="block text-sm font-semibold text-ink">
                  {t(`roles.${w}`)}
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  {t(`auth.${w}Hint`)}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1 text-sm font-medium text-ink">
        {t("common.name")}
        <input
          type="text"
          name="name"
          required
          autoComplete="name"
          className="rounded-lg border border-sand bg-canvas px-3 py-2 font-normal outline-none focus:border-brand"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-ink">
        {t("auth.orgName")}
        <input
          type="text"
          name="orgName"
          required
          placeholder={t("auth.orgNamePlaceholder")}
          className="rounded-lg border border-sand bg-canvas px-3 py-2 font-normal outline-none focus:border-brand"
        />
      </label>

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
          minLength={8}
          autoComplete="new-password"
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
        {pending ? t("common.loading") : t("auth.submitRegister")}
      </button>

      <p className="text-center text-sm text-muted">
        {t("auth.haveAccount")}{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          {t("common.login")}
        </Link>
      </p>
    </form>
  );
}
