import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { isResetTokenValid } from "@/lib/auth/reset-service";
import { AuthShell } from "../../_components/auth-shell";
import { ResetForm } from "./reset-form";

type Props = { params: Promise<{ token: string }> };

export default async function ResetPage({ params }: Props) {
  const { token } = await params;
  const valid = await isResetTokenValid(token);
  const t = await getTranslations("auth");

  return (
    <AuthShell>
      {valid ? (
        <ResetForm token={token} />
      ) : (
        <div className="flex flex-col gap-3">
          <h1 className="text-xl font-bold tracking-tight text-ink">{t("resetTitle")}</h1>
          <p className="rounded-sm border border-error-soft bg-error-soft px-3 py-2.5 text-sm text-error">
            ! {t("resetInvalid")}
          </p>
          <Link href="/forgot" className="text-sm font-medium text-brand hover:underline">
            {t("resetRequestAgain")} →
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
