"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";

type Role = "designer" | "seller";

export function RegisterForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [role, setRole] = useState<Role>("designer");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name: name || undefined, role }),
    });

    if (!res.ok) {
      setLoading(false);
      setError(res.status === 409 ? t("errorEmailTaken") : t("errorGeneric"));
      return;
    }

    // Auto-login after successful registration.
    const login = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (!login || login.error) {
      router.push("/login");
      return;
    }
    router.push("/home");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        {t("name")}
        <input
          name="name"
          type="text"
          autoComplete="name"
          className="rounded-lg border border-sand bg-white px-3 py-2"
        />
      </label>
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
          minLength={8}
          autoComplete="new-password"
          placeholder={t("passwordHint")}
          className="rounded-lg border border-sand bg-white px-3 py-2"
        />
      </label>

      <fieldset className="flex flex-col gap-1 text-sm">
        <legend className="mb-1">{t("role")}</legend>
        <div className="flex gap-2">
          {(["designer", "seller"] as Role[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              aria-pressed={role === r}
              className={
                role === r
                  ? "flex-1 rounded-lg bg-brand px-3 py-2 font-medium text-white"
                  : "flex-1 rounded-lg border border-sand px-3 py-2 text-ink/70 hover:bg-brand/10"
              }
            >
              {r === "designer" ? t("roleDesigner") : t("roleSeller")}
            </button>
          ))}
        </div>
      </fieldset>

      {error && <p className="text-sm text-earth">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-brand px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        {t("registerButton")}
      </button>
    </form>
  );
}
