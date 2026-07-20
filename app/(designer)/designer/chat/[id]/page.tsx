import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Badge, Card } from "@/components/ui";
import { getDesignerContext } from "@/lib/projects/service";
import { getDesignerThreadHeader } from "@/lib/chat/service";
import { ChatPanel } from "@/app/_components/chat-panel";

type Props = { params: Promise<{ id: string }> };

export default async function DesignerChatThreadPage({ params }: Props) {
  const session = await auth();
  const ctx = session?.user?.id ? await getDesignerContext(session.user.id) : null;
  if (!ctx) redirect("/designer");

  const { id } = await params;
  const header = await getDesignerThreadHeader(ctx.orgId, id);
  if (!header) notFound();
  const t = await getTranslations("chat");

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/designer/chat" className="text-sm text-sub hover:text-ink">
        {t("back")}
      </Link>

      <header className="mt-2">
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          {t("withSeller")} {header.sellerName ?? "—"}
        </h1>
      </header>

      <Card className="mt-3 gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="brand">{t("projectContext")}</Badge>
          <span className="font-semibold text-ink">{header.projectName ?? "—"}</span>
        </div>
        <p className="text-sm text-sub">
          {header.buildingType ?? "—"} · {header.specItemCount} {t("specItems")}
        </p>
      </Card>

      <div className="mt-4">
        <ChatPanel threadId={header.threadId} />
      </div>
    </div>
  );
}
