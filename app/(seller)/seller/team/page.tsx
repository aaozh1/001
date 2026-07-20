import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { getSellerContext } from "@/lib/seller/context";
import { listTeam } from "@/lib/seller/team-service";
import { TeamClient } from "./_components/team-client";

// Admin console (ROADMAP 3.4): members + roles. Everyone can see the team;
// only the owner can change it.
export default async function SellerTeamPage() {
  const session = await auth();
  const ctx = session?.user?.id ? await getSellerContext(session.user.id) : null;
  if (!ctx) redirect("/seller");

  const [t, members] = await Promise.all([
    getTranslations("sellerTeam"),
    listTeam(ctx.orgId, ctx.userId),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{t("title")}</h1>
        <p className="mt-1 text-sub">{t("subtitle")}</p>
      </header>

      <TeamClient members={members} isOwner={ctx.role === "owner"} />
    </div>
  );
}
