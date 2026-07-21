"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/ui/cn";
import {
  addIssueAction,
  addSitePhotoAction,
  setInstalledAction,
} from "@/lib/site-visit/actions";
import type { SiteVisitItem, SiteVisitLog } from "@/lib/site-visit/service";
import type { SpecStatus } from "@/lib/spec/status";

// 5J checklist cards — every tappable control is ≥44px tall (site gloves).

const STATUS_PILL: Record<SpecStatus, string> = {
  empty: "bg-canvas-2 text-sub",
  options: "bg-warn-soft text-warn",
  chosen: "bg-ok-soft text-ok",
  sent: "bg-info-soft text-info",
  quoted: "bg-quoted-soft text-quoted",
};

export function SiteVisitClient({
  projectId,
  items,
  projectIssues,
  canManage,
}: {
  projectId: string;
  items: SiteVisitItem[];
  projectIssues: SiteVisitLog[];
  canManage: boolean;
}) {
  const t = useTranslations("siteVisit");
  const tStatus = useTranslations("status");
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueItem, setIssueItem] = useState<string>("");
  const [issueNote, setIssueNote] = useState("");
  const [issueBusy, setIssueBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleInstalled(item: SiteVisitItem) {
    if (busyId) return;
    setBusyId(item.id);
    setError(null);
    try {
      const r = await setInstalledAction(projectId, item.id, !item.installedAt);
      if (!r.ok) setError(t("errFailed"));
      else router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function uploadPhoto(item: SiteVisitItem, file: File) {
    if (busyId) return;
    setBusyId(item.id);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const r = await addSitePhotoAction(projectId, item.id, form);
      if (!r.ok) setError(r.error === "too_large" ? t("errTooLarge") : t("errFailed"));
      else router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function submitIssue() {
    if (issueBusy || !issueNote.trim()) return;
    setIssueBusy(true);
    setError(null);
    try {
      const r = await addIssueAction(projectId, {
        specItemId: issueItem || null,
        note: issueNote,
      });
      if (r.ok) {
        setIssueOpen(false);
        setIssueItem("");
        setIssueNote("");
        router.refresh();
      } else {
        setError(t("errFailed"));
      }
    } finally {
      setIssueBusy(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-2.5">
      {error && (
        <p className="text-sm text-warn" role="alert">
          {error}
        </p>
      )}

      {items.length === 0 && <p className="text-sm text-mut">{t("empty")}</p>}

      {items.map((item) => (
        <div key={item.id} className="rounded-card border border-line bg-surface p-3.5 shadow-soft">
          <div className="flex items-center gap-2.5">
            {item.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image}
                alt=""
                className="h-[30px] w-[30px] shrink-0 rounded-sm border border-line object-cover"
              />
            ) : (
              <span
                className="h-[30px] w-[30px] shrink-0 rounded-sm border border-line"
                style={{ backgroundColor: item.swatchHex ?? "#c9c2b4" }}
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-bold text-ink">
                {item.code}
                {item.materialName ? ` · ${item.materialName}` : ""}
              </div>
              <div className="font-mono text-[10px] text-mut">
                {[item.zone, item.qty ? `${item.qty} ${item.qtyUnit ?? ""}`.trim() : null]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </div>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-pill px-2 py-0.5 font-mono text-[10px] font-semibold",
                item.installedAt ? "bg-ok-soft text-ok" : STATUS_PILL[item.status],
              )}
            >
              {item.installedAt ? `✓ ${t("installed")}` : tStatus(item.status)}
            </span>
          </div>

          {canManage && (
            <div className="mt-2.5 flex gap-2">
              <label
                className={cn(
                  "flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-sm bg-brand px-2 text-xs font-semibold text-white",
                  busyId === item.id && "opacity-60",
                )}
              >
                📷 {t("addPhoto")}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="hidden"
                  disabled={busyId === item.id}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadPhoto(item, f);
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                type="button"
                disabled={busyId === item.id}
                onClick={() => void toggleInstalled(item)}
                className={cn(
                  "flex min-h-11 flex-1 items-center justify-center rounded-sm border px-2 text-xs font-semibold disabled:opacity-60",
                  item.installedAt
                    ? "border-ok bg-ok-soft text-ok"
                    : "border-line-3 text-ink hover:border-brand hover:text-brand",
                )}
              >
                {item.installedAt ? `✓ ${t("installed")}` : t("markInstalled")}
              </button>
            </div>
          )}

          {item.logs.map((log) => (
            <div
              key={log.id}
              className="mt-2 flex items-center gap-2 rounded-sm border border-line bg-canvas px-2.5 py-2"
            >
              {log.kind === "photo" && log.photo ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={log.photo}
                    alt=""
                    className="h-[34px] w-[34px] shrink-0 rounded-sm border border-line object-cover"
                  />
                  <span className="font-mono text-[10px] text-sub">{t("photoPinned")}</span>
                </>
              ) : (
                <span className="text-xs text-warn">⚠ {log.note}</span>
              )}
            </div>
          ))}
        </div>
      ))}

      {/* Project-level issues + the global "log an issue" affordance */}
      {projectIssues.map((log) => (
        <div
          key={log.id}
          className="flex items-center gap-2 rounded-card border border-line bg-surface px-3.5 py-2.5"
        >
          <span className="text-xs text-warn">⚠ {log.note}</span>
        </div>
      ))}

      {canManage &&
        (issueOpen ? (
          <div className="rounded-card border border-line bg-surface p-3.5">
            <div className="flex flex-col gap-2">
              <select
                value={issueItem}
                onChange={(e) => setIssueItem(e.target.value)}
                className="min-h-11 rounded-sm border border-line-2 bg-surface px-3 text-sm outline-none focus:border-brand"
              >
                <option value="">{t("issueWholeProject")}</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.code}
                    {i.materialName ? ` · ${i.materialName}` : ""}
                  </option>
                ))}
              </select>
              <textarea
                value={issueNote}
                onChange={(e) => setIssueNote(e.target.value)}
                rows={3}
                placeholder={t("issuePlaceholder")}
                className="rounded-sm border border-line-2 bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIssueOpen(false)}
                  className="flex min-h-11 flex-1 items-center justify-center rounded-sm border border-line-3 text-xs font-semibold text-ink"
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  disabled={issueBusy || !issueNote.trim()}
                  onClick={() => void submitIssue()}
                  className="flex min-h-11 flex-1 items-center justify-center rounded-sm bg-brand text-xs font-semibold text-white disabled:opacity-60"
                >
                  {issueBusy ? "…" : t("issueSave")}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIssueOpen(true)}
            className="flex min-h-11 items-center justify-center rounded-card border border-dashed border-line-3 px-3 text-[12.5px] text-mut hover:border-brand hover:text-brand"
          >
            ＋ {t("logIssue")}
          </button>
        ))}
    </div>
  );
}
