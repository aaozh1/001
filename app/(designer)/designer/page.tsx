import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Card, StatusChip, buttonClasses } from "@/components/ui";
import { SPEC_STATUSES } from "@/lib/spec/status";

export default async function DesignerDashboard() {
  const session = await auth();
  const t = await getTranslations("designer");
  const name = session?.user?.name ?? session?.user?.email ?? "";

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight text-ink">
        {t("welcome", { name })}
      </h1>
      <p className="mt-2 text-sub">{t("dashboardIntro")}</p>

      <Card className="mt-6 gap-3 p-6">
        <h2 className="font-semibold text-ink">{t("myWork")}</h2>
        <div className="flex flex-wrap gap-2">
          {SPEC_STATUSES.map((s) => (
            <StatusChip key={s} status={s} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/designer/projects" className={buttonClasses({ size: "sm" })}>
            {t("goProjects")}
          </Link>
          <Link
            href="/designer/catalog"
            className={buttonClasses({ size: "sm", variant: "ghost" })}
          >
            {t("goCatalog")}
          </Link>
        </div>
      </Card>
    </div>
  );
}
