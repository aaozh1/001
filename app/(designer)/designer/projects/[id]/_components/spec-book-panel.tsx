"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { createSpecBookAction } from "@/lib/spec-book/actions";

export interface SpecBookVersion {
  version: number;
  dateLabel: string;
}

export function SpecBookPanel({
  projectId,
  canManage,
  books,
}: {
  projectId: string;
  canManage: boolean;
  books: SpecBookVersion[];
}) {
  const t = useTranslations("projects");
  const [pending, startTransition] = useTransition();
  const [list, setList] = useState(books);

  const pdfUrl = (v: number) => `/api/projects/${projectId}/spec-book/${v}/pdf`;

  function create() {
    startTransition(async () => {
      const r = await createSpecBookAction(projectId);
      if (r.ok && r.version != null) {
        window.open(pdfUrl(r.version), "_blank", "noopener");
        setList((prev) =>
          prev.some((b) => b.version === r.version)
            ? prev
            : [{ version: r.version!, dateLabel: "" }, ...prev],
        );
      }
    });
  }

  return (
    <div className="mt-4 rounded-card border border-line bg-surface p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-ink">{t("specBook")}</h2>
          <p className="text-xs text-mut">{t("specBookHint")}</p>
        </div>
        {canManage && (
          <Button size="sm" onClick={create} disabled={pending}>
            {pending ? t("creating") : t("createSpecBook")}
          </Button>
        )}
      </div>

      {list.length === 0 ? (
        <p className="mt-3 text-sm text-sub">{t("noVersions")}</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {list.map((b) => (
            <li key={b.version} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="text-ink">
                {t("sbVersion")} {b.version}
                {b.dateLabel ? <span className="text-mut"> · {b.dateLabel}</span> : null}
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
  );
}
