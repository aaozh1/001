import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const t = await getTranslations("auth");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-earth">{t("loginTitle")}</h1>
      <LoginForm callbackUrl={callbackUrl} />
      <p className="text-center text-sm text-ink/70">
        {t("noAccount")}{" "}
        <Link href="/register" className="font-medium text-brand">
          {t("goRegister")}
        </Link>
      </p>
    </div>
  );
}
