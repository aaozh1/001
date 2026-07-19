import { getTranslations } from "next-intl/server";
import type { SessionMembership } from "@/types/next-auth";
import type { Side } from "@/lib/permissions/access";

// Placeholder workspace body for Phase 0 — proves the user is authenticated and
// on the right side, and lists their memberships. Real dashboards land later
// (Designer: Phase 3.1 / Seller: Phase 3.3).
export async function WorkspaceHome({
  side,
  memberships,
}: {
  side: Side;
  memberships: SessionMembership[];
}) {
  const t = await getTranslations("workspace");
  const heading = side === "designer" ? t("designerHome") : t("sellerHome");
  const sideMemberships = memberships.filter((m) => m.orgType === side);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-earth">{heading}</h1>
        <p className="mt-1 text-muted">{t("comingSoon")}</p>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-[0_8px_24px_-12px_rgba(28,26,23,0.18)]">
        <h2 className="mb-3 text-sm font-semibold text-ink/70">
          {t("yourOrgs")}
        </h2>
        <ul className="flex flex-col gap-2">
          {sideMemberships.map((m) => (
            <li
              key={m.orgId}
              className="flex items-center justify-between rounded-lg border border-sand px-3 py-2"
            >
              <span className="font-medium">{m.orgName}</span>
              <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand">
                {t("role")}: {m.role}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
