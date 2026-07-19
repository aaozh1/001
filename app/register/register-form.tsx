"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { register, type AuthFormState } from "@/lib/auth/actions";
import { WORKSPACES, type Workspace } from "@/lib/permissions";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/ui/cn";

const initialState: AuthFormState = {};

export function RegisterForm() {
  const t = useTranslations();
  const [role, setRole] = useState<Workspace>("designer");
  const [state, formAction, pending] = useActionState(register, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          {t("auth.registerTitle")}
        </h1>
        <p className="mt-1 text-sm text-sub">{t("auth.registerSubtitle")}</p>
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
                className={cn(
                  "rounded-sm border p-3 text-left transition-colors",
                  selected
                    ? "border-brand bg-brand-soft"
                    : "border-line-2 bg-canvas hover:border-brand/50",
                )}
              >
                <span className="block text-sm font-semibold text-ink">
                  {t(`roles.${w}`)}
                </span>
                <span className="mt-0.5 block text-xs text-sub">
                  {t(`auth.${w}Hint`)}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1 text-sm font-medium text-ink">
        {t("common.name")}
        <Input type="text" name="name" required autoComplete="name" />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-ink">
        {t("auth.orgName")}
        <Input
          type="text"
          name="orgName"
          required
          placeholder={t("auth.orgNamePlaceholder")}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-ink">
        {t("common.email")}
        <Input type="email" name="email" required autoComplete="email" />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-ink">
        {t("common.password")}
        <Input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-brand">
          {t(`auth.${state.error}`)}
        </p>
      )}

      <Button type="submit" fullWidth disabled={pending}>
        {pending ? t("common.loading") : t("auth.submitRegister")}
      </Button>

      <p className="text-center text-sm text-sub">
        {t("auth.haveAccount")}{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          {t("common.login")}
        </Link>
      </p>
    </form>
  );
}
