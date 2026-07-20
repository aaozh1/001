import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { buttonClasses } from "@/components/ui";
import { MaterialDetailView } from "@/app/_components/material-detail-view";

type Props = { params: Promise<{ id: string }> };

// PUBLIC material detail — the CTA sends visitors to log in / sign up and
// lands them back on this material inside the designer catalog.
export default async function PublicMaterialDetailPage({ params }: Props) {
  const { id } = await params;
  const [t, session] = await Promise.all([getTranslations("catalog"), auth()]);
  const loggedIn = !!session?.user;

  return (
    <MaterialDetailView
      id={id}
      basePath="/catalog"
      canManage={false}
      actionSlot={
        loggedIn ? (
          <Link href={`/designer/catalog/${id}`} className={buttonClasses({ size: "md" })}>
            {t("openInWorkspace")}
          </Link>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(`/designer/catalog/${id}`)}`}
              className={buttonClasses({ size: "md" })}
            >
              {t("loginToAdd")}
            </Link>
            <p className="text-xs text-mut">{t("loginToAddHint")}</p>
          </div>
        )
      }
    />
  );
}
