"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Input } from "@/components/ui";
import { requestResetAction } from "@/lib/auth/reset-actions";

// ขอลิงก์ตั้งรหัสผ่านใหม่ — ตอบเหมือนกันเสมอไม่ว่าอีเมลจะมีบัญชีหรือไม่
// (anti-enumeration)
export function ForgotForm() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await requestResetAction(email);
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-xl font-bold tracking-tight text-ink">{t("forgotTitle")}</h1>
        <p className="rounded-sm border border-ok-soft bg-ok-soft px-3 py-2.5 text-sm text-ok">
          ✓ {t("forgotSent")}
        </p>
        <p className="font-mono text-[11px] text-mut">{t("forgotMailNote")}</p>
        <Link href="/login" className="text-sm font-medium text-brand hover:underline">
          ← {t("backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink">{t("forgotTitle")}</h1>
        <p className="mt-1 text-sm text-sub">{t("forgotSubtitle")}</p>
      </div>
      <label className="flex flex-col gap-1 text-sm font-medium text-ink">
        {t("emailLabel")}
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </label>
      <Button type="submit" fullWidth disabled={pending || !email.trim()}>
        {pending ? t("sending") : t("forgotCta")}
      </Button>
      <Link href="/login" className="text-center text-sm text-sub hover:text-ink">
        ← {t("backToLogin")}
      </Link>
    </form>
  );
}
