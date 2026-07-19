import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";

export default async function SellerDashboard() {
  const session = await auth();
  const t = await getTranslations("seller");
  const name = session?.user?.name ?? session?.user?.email ?? "";

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight text-earth">
        {t("welcome", { name })}
      </h1>
      <p className="mt-2 text-muted">{t("dashboardIntro")}</p>

      <div className="mt-6 rounded-card border border-sand bg-surface p-6 shadow-soft">
        <h2 className="font-semibold text-ink">{t("inbox")}</h2>
        <p className="mt-1 text-sm text-muted">Phase 2 →</p>
      </div>
    </div>
  );
}
