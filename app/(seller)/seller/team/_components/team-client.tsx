"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge, Button, Input } from "@/components/ui";
import {
  addMemberAction,
  changeMemberRoleAction,
  removeMemberAction,
} from "@/lib/seller/team-actions";
import type { TeamMember } from "@/lib/seller/team-service";

const SELLER_ROLES = ["owner", "manager", "sales", "content"] as const;

export function TeamClient({
  members,
  isOwner,
}: {
  members: TeamMember[];
  isOwner: boolean;
}) {
  const t = useTranslations("sellerTeam");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("sales");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; kind: "ok" | "error" } | null>(null);

  function report(error?: string) {
    if (!error) {
      setNotice({ text: t("done"), kind: "ok" });
      router.refresh();
      return;
    }
    const key =
      error === "last_owner"
        ? "errLastOwner"
        : error === "user_not_found"
          ? "errUserNotFound"
          : error === "already_member"
            ? "errAlreadyMember"
            : "errFailed";
    setNotice({ text: t(key), kind: "error" });
  }

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const r = await fn();
      report(r.ok ? undefined : r.error);
    } catch {
      report("failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-soft">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-mut">
              <th className="px-4 py-2 font-semibold">{t("colMember")}</th>
              <th className="px-4 py-2 font-semibold">{t("colRole")}</th>
              {isOwner && <th className="px-4 py-2" />}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.userId} className="border-b border-line last:border-0">
                <td className="px-4 py-2.5">
                  <div className="font-medium text-ink">
                    {m.name ?? "—"} {m.isSelf && <Badge variant="neutral">{t("you")}</Badge>}
                  </div>
                  <div className="text-xs text-mut">{m.email}</div>
                </td>
                <td className="px-4 py-2.5">
                  {isOwner ? (
                    <select
                      value={m.role}
                      disabled={busy}
                      onChange={(e) =>
                        run(() => changeMemberRoleAction(m.userId, e.target.value))
                      }
                      className="rounded-sm border border-line-2 bg-surface px-2 py-1 text-sm outline-none focus:border-brand"
                    >
                      {SELLER_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {t(`role.${r}`)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sub">{t(`role.${m.role}`)}</span>
                  )}
                </td>
                {isOwner && (
                  <td className="px-4 py-2.5 text-right">
                    {!m.isSelf && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (window.confirm(t("removeConfirm"))) {
                            run(() => removeMemberAction(m.userId));
                          }
                        }}
                        className="text-xs text-mut hover:text-warn disabled:opacity-50"
                      >
                        {t("remove")}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isOwner && (
        <div className="rounded-card border border-line bg-surface p-4 shadow-soft">
          <h2 className="font-semibold text-ink">{t("addTitle")}</h2>
          <p className="mt-0.5 text-xs text-mut">{t("addHint")}</p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-sm font-medium text-ink">
              {t("fEmail")}
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@company.co.th"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink">
              {t("colRole")}
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="rounded-sm border border-line-2 bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
              >
                {SELLER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {t(`role.${r}`)}
                  </option>
                ))}
              </select>
            </label>
            <Button
              size="sm"
              disabled={busy || !email.trim()}
              onClick={() =>
                run(async () => {
                  const r = await addMemberAction(email, role);
                  if (r.ok) setEmail("");
                  return r;
                })
              }
            >
              {busy ? t("adding") : t("add")}
            </Button>
          </div>
        </div>
      )}

      {notice && (
        <p
          role={notice.kind === "error" ? "alert" : undefined}
          className={`text-sm font-medium ${notice.kind === "ok" ? "text-ok" : "text-warn"}`}
        >
          {notice.text}
        </p>
      )}

      <p className="text-xs text-mut">{t("rolesLegend")}</p>
    </div>
  );
}
