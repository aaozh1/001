import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default async function RegisterPage() {
  const t = await getTranslations("auth");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-earth">{t("registerTitle")}</h1>
      <RegisterForm />
      <p className="text-center text-sm text-ink/70">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-medium text-brand">
          {t("goLogin")}
        </Link>
      </p>
    </div>
  );
}
