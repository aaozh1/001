import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Badge, Card, buttonClasses } from "@/components/ui";
import { getSellerContext } from "@/lib/seller/context";
import { listSellerInbox } from "@/lib/quote/service";
import { SlaCountdown } from "@/app/_components/sla-countdown";

// Seller landing — the one question that matters on this side: which leads are
// waiting on me right now? Answering inside the SLA window is how a seller wins
// the order, so the unanswered/overdue counts lead the page.
export default async function SellerDashboard() {
  const session = await auth();
  const ctx = session?.user?.id ? await getSellerContext(session.user.id) : null;
  if (!ctx) redirect("/login?callbackUrl=/seller");

  const [t, inbox] = await Promise.all([
    getTranslations("seller"),
    listSellerInbox(ctx.orgId),
  ]);
  const name = session?.user?.name ?? session?.user?.email ?? "";

  const now = Date.now();
  const awaiting = inbox.filter(
    (r) => !r.responded && (r.status === "open" || r.status === "quoted"),
  );
  const overdue = awaiting.filter(
    (r) => r.slaDueAt && new Date(r.slaDueAt).getTime() < now,
  );
  const won = inbox.filter((r) => r.quoteStatus === "selected");
  // The most urgent live lead — inbox is already SLA-ascending.
  const urgent = awaiting.find((r) => r.slaDueAt) ?? null;

  const metric = (label: string, value: number, warn?: boolean) => (
    <Card className="gap-1" padded>
      <span
        className={`text-2xl font-bold tracking-tight ${warn && value > 0 ? "text-warn" : "text-ink"}`}
      >
        {value}
      </span>
      <span className="text-xs text-mut">{label}</span>
    </Card>
  );

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight text-ink">
        {t("welcome", { name })}
      </h1>
      <p className="mt-1 text-sub">{t("dashboardIntro")}</p>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {metric(t("statAwaiting"), awaiting.length)}
        {metric(t("statOverdue"), overdue.length, true)}
        {metric(t("statWon"), won.length)}
      </div>

      {/* SLA card — the single most urgent lead, live countdown (AC 3.3). */}
      {urgent && (
        <Card className="mt-4 gap-2 border-brand/30 bg-brand-soft p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-ink">⏱ {t("slaCardTitle")}</h2>
            <SlaCountdown slaDueAt={urgent.slaDueAt} className="text-sm" />
          </div>
          <p className="text-sm text-sub">
            {urgent.projectName} · {urgent.materials.map((m) => m.name).join(", ")}
          </p>
          <div>
            <Link
              href={`/seller/rfq/${urgent.id}`}
              className={buttonClasses({ size: "sm" })}
            >
              {t("slaCardCta")}
            </Link>
          </div>
        </Card>
      )}

      <Card className="mt-4 gap-3 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold text-ink">{t("inbox")}</h2>
          {awaiting.length > 0 && (
            <Badge variant={overdue.length > 0 ? "warn" : "brand"}>
              {t("inboxPending", { n: awaiting.length })}
            </Badge>
          )}
        </div>
        <p className="text-sm text-sub">{t("inboxHint")}</p>
        <div>
          <Link href="/seller/rfq" className={buttonClasses({ size: "sm" })}>
            {t("goInbox")}
          </Link>
        </div>
      </Card>
    </div>
  );
}
