"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Input } from "@/components/ui";
import { resetPasswordAction } from "@/lib/auth/reset-actions";

export function ResetForm({ token }: { token: string }) {
  const t = useTranslations("auth");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError(t("resetMismatch"));
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await resetPasswordAction(token, password);
      if (r.ok) setDone(true);
      else setError(r.error === "weak" ? t("pwHint") : t("resetInvalid"));
    });
  }

  if (done) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-xl font-bold tracking-tight text-ink">{t("resetTitle")}</h1>
        <p className="rounded-sm border border-ok-soft bg-ok-soft px-3 py-2.5 text-sm text-ok">
          ✓ {t("resetDone")}
        </p>
        <Link
          href="/login"
          className="rounded-sm bg-brand px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-brand-deep"
        >
          {t("backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink">{t("resetTitle")}</h1>
        <p className="mt-1 text-sm text-sub">{t("resetSubtitle")}</p>
      </div>
      <label className="flex flex-col gap-1 text-sm font-medium text-ink">
        {t("newPassword")}
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
        <span className="font-mono text-xs font-normal text-mut">{t("pwHint")}</span>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-ink">
        {t("confirmPassword")}
        <Input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
      </label>
      {error && (
        <p className="text-sm text-warn" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" fullWidth disabled={pending}>
        {pending ? t("sending") : t("resetCta")}
      </Button>
    </form>
  );
}
