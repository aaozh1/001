import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { googleEnabled, signIn } from "@/auth";
import { AuthShell } from "../_components/auth-shell";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const t = await getTranslations("auth");
  return (
    <AuthShell variant="split">
      {/* Suspense: LoginForm reads useSearchParams (callbackUrl deep link). */}
      <Suspense>
        <LoginForm />
      </Suspense>

      {/* 2A: OR divider + Google — real OAuth when configured, honest
          "not set up yet" state otherwise (never a fake working button). */}
      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="font-mono text-[13.125px] uppercase tracking-[.1em] text-mut">
          {t("or")}
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>
      {googleEnabled ? (
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/designer" });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-sm border border-line-3 bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-brand"
          >
            {t("googleCta")}
          </button>
        </form>
      ) : (
        <button
          type="button"
          disabled
          title={t("googleUnavailable")}
          className="w-full cursor-not-allowed rounded-sm border border-line bg-canvas px-4 py-2.5 text-sm font-semibold text-mut"
        >
          {t("googleCta")} · {t("soon")}
        </button>
      )}
    </AuthShell>
  );
}
