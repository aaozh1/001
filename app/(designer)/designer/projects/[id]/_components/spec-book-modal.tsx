"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Modal } from "@/components/ui";
import { createSpecBookAction, shareSpecBookAction } from "@/lib/spec-book/actions";

export interface SpecBookDiffEntry {
  kind: "added" | "removed" | "changed" | "confirmed";
  code: string;
  title: string | null;
  from: string | null;
  to: string | null;
}

export interface SpecBookVersion {
  version: number;
  dateLabel: string;
  shareToken: string | null;
  diff?: {
    added: number;
    removed: number;
    changed: number;
    confirmed: number;
    entries?: SpecBookDiffEntry[];
  } | null;
}

// 5G detail row colors — CHANGED orange, CONFIRMED green, ADDED brand,
// REMOVED muted (matching the mock's left-edge coding).
const DIFF_STYLE: Record<SpecBookDiffEntry["kind"], { label: string; cls: string }> = {
  changed: { label: "CHANGED", cls: "border-l-warn text-warn" },
  confirmed: { label: "CONFIRMED", cls: "border-l-ok text-ok" },
  added: { label: "ADDED", cls: "border-l-brand text-brand" },
  removed: { label: "REMOVED", cls: "border-l-line-3 text-mut" },
};

// Spec Book — now an icon button above the Material List; the modal holds the
// version list + create action.
function ShareControls({
  projectId,
  version,
  token,
  onChange,
}: {
  projectId: string;
  version: number;
  token: string | null;
  onChange: (token: string | null) => void;
}) {
  const t = useTranslations("share");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/s/${token}`
    : null;

  async function toggle(enable: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      const r = await shareSpecBookAction(projectId, version, enable);
      if (r.ok) onChange(r.token ?? null);
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => void toggle(true)}
        className="text-xs font-medium text-brand hover:underline disabled:opacity-50"
      >
        🔗 {t("createLink")}
      </button>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => {
          if (url) void navigator.clipboard?.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="rounded-pill border border-line-2 px-2 py-0.5 text-xs text-sub hover:border-brand hover:text-brand"
        title={url ?? undefined}
      >
        {copied ? `✓ ${t("copied")}` : `📋 ${t("copyLink")}`}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void toggle(false)}
        className="text-xs text-mut hover:text-warn disabled:opacity-50"
      >
        {t("revoke")}
      </button>
    </span>
  );
}

export function SpecBookModal({
  open,
  onClose,
  projectId,
  books,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  books: SpecBookVersion[];
}) {
  const t = useTranslations("projects");
  const [pending, startTransition] = useTransition();
  const [list, setList] = useState(books);
  const [created, setCreated] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [openDiff, setOpenDiff] = useState<number | null>(null);

  const pdfUrl = (v: number) => `/api/projects/${projectId}/spec-book/${v}/pdf`;

  function create() {
    setFailed(false);
    startTransition(async () => {
      try {
        const r = await createSpecBookAction(projectId);
        if (r.ok && r.version != null) {
          // No window.open here: after an await we're outside the user-gesture
          // window, so browsers popup-block it silently. Highlight the fresh
          // version's download link instead.
          setCreated(r.version);
          setList((prev) =>
            prev.some((b) => b.version === r.version)
              ? prev
              : [{ version: r.version!, dateLabel: "", shareToken: null, diff: null }, ...prev],
          );
        } else {
          setFailed(true);
        }
      } catch {
        setFailed(true);
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={`📕 ${t("specBook")}`}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-mut">{t("specBookHint")}</p>
          <Button size="sm" onClick={create} disabled={pending}>
            {pending ? t("creating") : t("createSpecBook")}
          </Button>
        </div>

        {failed && (
          <p className="text-sm text-warn" role="alert">
            {t("sbFailed")}
          </p>
        )}

        {list.length === 0 ? (
          <p className="text-sm text-sub">{t("noVersions")}</p>
        ) : (
          <ul className="divide-y divide-line">
            {list.map((b) => {
              const entries = b.diff?.entries ?? [];
              return (
              <li key={b.version} className="py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <span className="text-ink">
                  {t("sbVersion")} {b.version}
                  {b.dateLabel ? <span className="text-mut"> · {b.dateLabel}</span> : null}
                  {created === b.version && (
                    <span className="ml-2 font-medium text-ok">✓ {t("sbReady")}</span>
                  )}
                  {b.diff && b.version > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setOpenDiff((v) => (v === b.version ? null : b.version))
                      }
                      disabled={entries.length === 0}
                      className="ml-2 font-mono text-[11px] text-mut enabled:hover:text-brand enabled:hover:underline"
                    >
                      {[
                        b.diff.added > 0 ? `+${b.diff.added}` : null,
                        b.diff.removed > 0 ? `−${b.diff.removed}` : null,
                        b.diff.changed > 0 ? t("sbChanged", { n: b.diff.changed }) : null,
                        b.diff.confirmed > 0 ? t("sbConfirmed", { n: b.diff.confirmed }) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || t("sbNoChanges")}
                      {entries.length > 0 && (openDiff === b.version ? " ▴" : " ▾")}
                    </button>
                  )}
                </span>
                <span className="flex flex-wrap items-center gap-3">
                  <ShareControls
                    projectId={projectId}
                    version={b.version}
                    token={b.shareToken}
                    onChange={(token) =>
                      setList((prev) =>
                        prev.map((x) =>
                          x.version === b.version ? { ...x, shareToken: token } : x,
                        ),
                      )
                    }
                  />
                  <a
                    href={pdfUrl(b.version)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-brand hover:underline"
                  >
                    {t("downloadPdf")}
                  </a>
                </span>
                </div>

                {/* 5G per-item diff detail — color-coded like the mock */}
                {openDiff === b.version && entries.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1.5">
                    {entries.map((e, i) => (
                      <div
                        key={`${e.code}-${i}`}
                        className={`rounded-sm border border-line border-l-[3px] bg-canvas px-3 py-2 ${DIFF_STYLE[e.kind].cls}`}
                      >
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-[10px] font-semibold tracking-[.06em]">
                            {DIFF_STYLE[e.kind].label}
                          </span>
                          <span className="text-[13px] font-semibold text-ink">
                            {e.code}
                            {e.title ? ` · ${e.title}` : ""}
                          </span>
                        </div>
                        {(e.from || e.to) && (
                          <div className="mt-0.5 font-mono text-[11px] text-sub">
                            {e.kind === "changed" || e.kind === "confirmed" ? (
                              <>
                                {e.from && <span className="line-through opacity-70">{e.from}</span>}
                                {e.from && e.to && " → "}
                                {e.to}
                              </>
                            ) : (
                              (e.to ?? e.from)
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    <p className="font-mono text-[10.5px] text-mut">{t("sbPinnedNote")}</p>
                  </div>
                )}
              </li>
            );})}
          </ul>
        )}
      </div>
    </Modal>
  );
}
