import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { canManageProjects } from "@/lib/permissions";
import { getDesignerContext } from "@/lib/projects/service";
import { ImportWizard } from "./_components/import-wizard";

export default async function ImportPage() {
  const session = await auth();
  const ctx = session?.user?.id ? await getDesignerContext(session.user.id) : null;
  // Importing creates projects — managers only.
  if (!ctx || !canManageProjects(ctx.role)) redirect("/designer/projects");
  const t = await getTranslations("import");

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/designer/projects" className="text-sm text-sub hover:text-ink">
        {t("back")}
      </Link>
      <header className="mb-5 mt-2">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{t("title")}</h1>
        <p className="mt-1 text-sub">{t("subtitle")}</p>
      </header>
      <ImportWizard />
    </div>
  );
}
