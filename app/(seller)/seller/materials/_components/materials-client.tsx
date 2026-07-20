"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge, Button, Input, Modal } from "@/components/ui";
import { cn } from "@/lib/ui/cn";
import {
  saveMaterialAction,
  setMaterialStatusAction,
} from "@/lib/materials/seller-actions";
import type { SellerMaterialRow } from "@/lib/materials/seller-service";

export interface CategoryOption {
  key: string;
  label: string;
}

type FormState = {
  brandId: string;
  nameTh: string;
  nameEn: string;
  model: string;
  sku: string;
  category: string;
  color: string;
  size: string;
  price: string;
  unit: string;
  cert: string;
  leadTime: string;
  moq: string;
  warranty: string;
  noteTh: string;
  swatchHex: string;
  specsheetUrl: string;
};

const EMPTY: FormState = {
  brandId: "",
  nameTh: "",
  nameEn: "",
  model: "",
  sku: "",
  category: "",
  color: "",
  size: "",
  price: "",
  unit: "",
  cert: "",
  leadTime: "",
  moq: "",
  warranty: "",
  noteTh: "",
  swatchHex: "",
  specsheetUrl: "",
};

function fromRow(row: SellerMaterialRow): FormState {
  return {
    brandId: row.brandId ?? "",
    nameTh: row.nameTh,
    nameEn: row.nameEn ?? "",
    model: row.model ?? "",
    sku: row.sku ?? "",
    category: row.category,
    color: row.color ?? "",
    size: row.size ?? "",
    price: row.price ?? "",
    unit: row.unit ?? "",
    cert: row.cert ?? "",
    leadTime: row.leadTime ?? "",
    moq: row.moq ?? "",
    warranty: row.warranty ?? "",
    noteTh: row.noteTh ?? "",
    swatchHex: row.swatchHex ?? "",
    specsheetUrl: row.specsheetUrl ?? "",
  };
}

// Seller product catalog manager (ฟอร์มสินค้า, ROADMAP 3.3): completeness bar
// per product, publish/unpublish, and a create/edit form. Publishing is what
// puts a product in the designers' catalog — completeness is the seller's only
// lever on default ordering there (rule #1).
export function MaterialsClient({
  rows,
  categories,
  brands,
  canEdit,
}: {
  rows: SellerMaterialRow[];
  categories: CategoryOption[];
  brands: { id: string; name: string }[];
  canEdit: boolean;
}) {
  const t = useTranslations("sellerMat");
  const router = useRouter();
  const [editing, setEditing] = useState<{ id: string | null; form: FormState } | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: string) {
    setEditing((prev) => (prev ? { ...prev, form: { ...prev.form, [key]: value } } : prev));
  }

  async function save() {
    if (!editing || pending) return;
    setPending(true);
    setError(null);
    try {
      const f = editing.form;
      const r = await saveMaterialAction(editing.id, {
        ...f,
        price: f.price === "" ? null : f.price,
      });
      if (r.ok) {
        setEditing(null);
        router.refresh();
      } else {
        setError(r.error === "invalid" ? t("errInvalid") : t("errFailed"));
      }
    } catch {
      setError(t("errFailed"));
    } finally {
      setPending(false);
    }
  }

  async function setStatus(id: string, status: "published" | "draft") {
    if (busyId) return;
    setBusyId(id);
    try {
      await setMaterialStatusAction(id, status);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  const field = (key: keyof FormState, label: string, props?: { type?: string; placeholder?: string }) => (
    <label className="flex flex-col gap-1 text-sm font-medium text-ink">
      {label}
      <Input
        type={props?.type ?? "text"}
        placeholder={props?.placeholder}
        value={editing?.form[key] ?? ""}
        onChange={(e) => set(key, e.target.value)}
      />
    </label>
  );

  return (
    <>
      {canEdit && (
        <div className="mb-4">
          <Button size="sm" onClick={() => setEditing({ id: null, form: EMPTY })}>
            {t("new")}
          </Button>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="rounded-card border border-dashed border-line-2 bg-surface p-10 text-center text-sub">
          {t("empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((m) => (
            <div
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-line bg-surface p-4 shadow-soft"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {m.swatchHex && (
                    <span
                      className="h-4 w-4 shrink-0 rounded-full border border-line"
                      style={{ backgroundColor: m.swatchHex }}
                    />
                  )}
                  <span className="font-semibold text-ink">{m.nameTh}</span>
                  {m.model && <span className="text-sm text-sub">{m.model}</span>}
                  <Badge
                    variant={
                      m.status === "published"
                        ? "ok"
                        : m.status === "suspended"
                          ? "warn"
                          : "neutral"
                    }
                  >
                    {t(`status.${m.status}`)}
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-mut">
                  {m.category}
                  {m.price ? ` · ฿${Number(m.price).toLocaleString()}${m.unit ? `/${m.unit}` : ""}` : ""}
                </div>
                {/* Completeness bar — AC 3.3 */}
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 w-40 overflow-hidden rounded-pill bg-line">
                    <div
                      className={cn(
                        "h-full rounded-pill",
                        m.completeness >= 80
                          ? "bg-ok"
                          : m.completeness >= 50
                            ? "bg-brand"
                            : "bg-warn",
                      )}
                      style={{ width: `${m.completeness}%` }}
                    />
                  </div>
                  <span className="text-xs text-mut">
                    {t("completeness")} {m.completeness}%
                  </span>
                </div>
              </div>

              {canEdit && (
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing({ id: m.id, form: fromRow(m) })}
                  >
                    {t("edit")}
                  </Button>
                  {m.status === "published" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busyId === m.id}
                      onClick={() => setStatus(m.id, "draft")}
                    >
                      {t("unpublish")}
                    </Button>
                  ) : m.status !== "suspended" ? (
                    <Button
                      size="sm"
                      disabled={busyId === m.id}
                      onClick={() => setStatus(m.id, "published")}
                    >
                      {t("publish")}
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? t("editTitle") : t("newTitle")}
        wide
      >
        {editing && (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {field("nameTh", `${t("fNameTh")} *`)}
              {field("nameEn", t("fNameEn"))}
              <label className="flex flex-col gap-1 text-sm font-medium text-ink">
                {t("fCategory")} *
                <select
                  value={editing.form.category}
                  onChange={(e) => set("category", e.target.value)}
                  className="rounded-sm border border-line-2 bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
                >
                  <option value="">—</option>
                  {categories.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-ink">
                {t("fBrand")}
                <select
                  value={editing.form.brandId}
                  onChange={(e) => set("brandId", e.target.value)}
                  className="rounded-sm border border-line-2 bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
                >
                  <option value="">—</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              {field("model", t("fModel"))}
              {field("sku", t("fSku"))}
              {field("price", t("fPrice"), { type: "number" })}
              {field("unit", t("fUnit"), { placeholder: t("fUnitPh") })}
              {field("leadTime", t("fLeadTime"), { placeholder: t("fLeadTimePh") })}
              {field("moq", t("fMoq"))}
              {field("warranty", t("fWarranty"))}
              {field("cert", t("fCert"))}
              {field("color", t("fColor"))}
              {field("size", t("fSize"))}
              {field("swatchHex", t("fSwatch"), { placeholder: "#A9743F" })}
              {field("specsheetUrl", t("fSpecsheet"), { placeholder: "https://…" })}
            </div>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink">
              {t("fNote")}
              <textarea
                value={editing.form.noteTh}
                onChange={(e) => set("noteTh", e.target.value)}
                rows={2}
                className="rounded-sm border border-line-2 bg-surface px-3 py-2 text-sm font-normal outline-none focus:border-brand"
              />
            </label>
            <p className="text-xs text-mut">{t("completenessHint")}</p>
            {error && (
              <p className="text-sm text-warn" role="alert">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>
                {t("cancel")}
              </Button>
              <Button
                onClick={save}
                disabled={pending || !editing.form.nameTh.trim() || !editing.form.category}
              >
                {pending ? t("saving") : t("save")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
