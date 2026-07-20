import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Badge, Card } from "@/components/ui";
import { getSellerContext } from "@/lib/seller/context";
import { getSellerThreadContext } from "@/lib/chat/service";
import { ChatPanel } from "@/app/_components/chat-panel";

type Props = { params: Promise<{ id: string }> };

export default async function SellerChatThreadPage({ params }: Props) {
  const session = await auth();
  const ctx = session?.user?.id ? await getSellerContext(session.user.id) : null;
  if (!ctx) redirect("/seller");

  const { id } = await params;
  const context = await getSellerThreadContext(ctx.orgId, id);
  if (!context) notFound();
  const t = await getTranslations("chat");

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/seller/chat" className="text-sm text-sub hover:text-ink">
        {t("back")}
      </Link>

      <header className="mt-2">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{t("title")}</h1>
        <p className="mt-1 text-xs text-mut">🔒 {t("privacy")}</p>
      </header>

      {/* Seller sees the spec context only — never the designer's identity (rule #4). */}
      <Card className="mt-3 gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="brand">{t("projectContext")}</Badge>
          <span className="font-semibold text-ink">{context.projectName ?? "—"}</span>
        </div>
        <p className="text-sm text-sub">
          {context.buildingType ?? "—"} · {context.specItemCount} {t("specItems")}
        </p>
      </Card>

      <div className="mt-4">
        <ChatPanel threadId={context.threadId} />
      </div>
    </div>
  );
}
