import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Card, buttonClasses } from "@/components/ui";

export default async function SellerDashboard() {
  const session = await auth();
  const t = await getTranslations("seller");
  const name = session?.user?.name ?? session?.user?.email ?? "";

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight text-ink">
        {t("welcome", { name })}
      </h1>
      <p className="mt-2 text-sub">{t("dashboardIntro")}</p>

      <Card className="mt-6 gap-3 p-6">
        <h2 className="font-semibold text-ink">{t("inbox")}</h2>
        <Link href="/seller/rfq" className={buttonClasses({ size: "sm" })}>
          {t("goInbox")}
        </Link>
      </Card>
    </div>
  );
}
