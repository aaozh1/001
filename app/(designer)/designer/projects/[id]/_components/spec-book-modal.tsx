"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Modal } from "@/components/ui";
import { createSpecBookAction, shareSpecBookAction } from "@/lib/spec-book/actions";

export interface SpecBookVersion {
  version: number;
  dateLabel: string;
  shareToken: string | null;
  diff?: { added: number; removed: number; changed: number; confirmed: number } | null;
}

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
            {list.map((b) => (
              <li key={b.version} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 text-sm">
                <span className="text-ink">
                  {t("sbVersion")} {b.version}
                  {b.dateLabel ? <span className="text-mut"> · {b.dateLabel}</span> : null}
                  {created === b.version && (
                    <span className="ml-2 font-medium text-ok">✓ {t("sbReady")}</span>
                  )}
                  {b.diff && b.version > 1 && (
                    <span className="ml-2 font-mono text-[11px] text-mut">
                      {[
                        b.diff.added > 0 ? `+${b.diff.added}` : null,
                        b.diff.removed > 0 ? `−${b.diff.removed}` : null,
                        b.diff.changed > 0 ? t("sbChanged", { n: b.diff.changed }) : null,
                        b.diff.confirmed > 0 ? t("sbConfirmed", { n: b.diff.confirmed }) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
