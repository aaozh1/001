import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Card } from "@/components/ui";
import { getSellerContext } from "@/lib/seller/context";
import { listSellerThreads } from "@/lib/chat/service";

export default async function SellerChatInboxPage() {
  const session = await auth();
  const ctx = session?.user?.id ? await getSellerContext(session.user.id) : null;
  if (!ctx) redirect("/seller");

  const [t, threads] = await Promise.all([
    getTranslations("chat"),
    listSellerThreads(ctx.orgId),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{t("title")}</h1>
        <p className="mt-1 text-sub">{t("sellerSubtitle")}</p>
        <p className="mt-1 text-xs text-mut">🔒 {t("privacy")}</p>
      </header>

      {threads.length === 0 ? (
        <p className="rounded-card border border-dashed border-line-2 bg-surface p-10 text-center text-sub">
          {t("noThreads")}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {threads.map((th) => (
            <Link key={th.threadId} href={`/seller/chat/${th.threadId}`}>
              <Card className="flex-row items-center justify-between gap-4 transition hover:shadow-lifted">
                <div className="min-w-0">
                  <div className="font-semibold text-ink">{th.projectName ?? "—"}</div>
                  <div className="mt-0.5 truncate text-sm text-sub">
                    {th.buildingType ? `${th.buildingType} · ` : ""}
                    {th.specItemCount} {t("specItems")}
                  </div>
                </div>
                <span className="shrink-0 text-sm text-sub">{t("open")}</span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
