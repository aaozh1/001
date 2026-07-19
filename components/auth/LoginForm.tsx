"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      redirect: false,
    });
    setLoading(false);
    if (!res || res.error) {
      setError(t("errorInvalid"));
      return;
    }
    router.push(callbackUrl || "/home");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        {t("email")}
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-lg border border-sand bg-white px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {t("password")}
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-lg border border-sand bg-white px-3 py-2"
        />
      </label>
      {error && <p className="text-sm text-earth">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-brand px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        {t("loginButton")}
      </button>
    </form>
  );
}
