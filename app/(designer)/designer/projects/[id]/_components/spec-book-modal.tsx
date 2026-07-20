"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Modal } from "@/components/ui";
import { createSpecBookAction } from "@/lib/spec-book/actions";

export interface SpecBookVersion {
  version: number;
  dateLabel: string;
}

// Spec Book — now an icon button above the Material List; the modal holds the
// version list + create action.
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
              : [{ version: r.version!, dateLabel: "" }, ...prev],
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
              <li key={b.version} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-ink">
                  {t("sbVersion")} {b.version}
                  {b.dateLabel ? <span className="text-mut"> · {b.dateLabel}</span> : null}
                  {created === b.version && (
                    <span className="ml-2 font-medium text-ok">✓ {t("sbReady")}</span>
                  )}
                </span>
                <a
                  href={pdfUrl(b.version)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-brand hover:underline"
                >
                  {t("downloadPdf")}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
