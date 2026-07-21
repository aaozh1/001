"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Input, Modal } from "@/components/ui";
import { cn } from "@/lib/ui/cn";
import {
  removeMaterialImageAction,
  saveMaterialAction,
  setMaterialStatusAction,
  uploadMaterialImageAction,
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
  const [editing, setEditing] = useState<
    { id: string | null; form: FormState; images: string[] } | null
  >(null);
  const [imgBusy, setImgBusy] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);
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

  async function uploadImage(file: File) {
    if (!editing?.id || imgBusy) return;
    setImgBusy(true);
    setImgError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const r = await uploadMaterialImageAction(editing.id, form);
      if (r.ok) {
        setEditing((prev) => (prev ? { ...prev, images: r.images } : prev));
        router.refresh();
      } else {
        setImgError(
          r.error === "too_large"
            ? t("imgTooLarge")
            : r.error === "limit"
              ? t("imgLimit")
              : t("imgFailed"),
        );
      }
    } catch {
      setImgError(t("imgFailed"));
    } finally {
      setImgBusy(false);
    }
  }

  async function removeImage(url: string) {
    if (!editing?.id || imgBusy) return;
    setImgBusy(true);
    try {
      const r = await removeMaterialImageAction(editing.id, url);
      if (r.ok) {
        setEditing((prev) => (prev ? { ...prev, images: r.images } : prev));
        router.refresh();
      }
    } finally {
      setImgBusy(false);
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
          <Button size="sm" onClick={() => setEditing({ id: null, form: EMPTY, images: [] })}>
            {t("new")}
          </Button>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="rounded-card border border-dashed border-line-2 bg-surface p-10 text-center text-sub">
          {t("empty")}
        </p>
      ) : (
        // 3H: table view — swatch tile, mono SKU/price, completeness bar
        // (= the only default-ranking lever, rule #1) and a status pill.
        <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left font-mono text-[11px] uppercase tracking-[.05em] text-mut">
                <th className="px-3 py-3.5 font-medium">{t("colMaterial")}</th>
                <th className="px-3 py-3.5 font-medium">{t("colSku")}</th>
                <th className="px-3 py-3.5 text-right font-medium">{t("colPrice")}</th>
                <th className="px-3 py-3.5 font-medium">{t("colCompleteness")}</th>
                <th className="px-3 py-3.5 font-medium">{t("colStatus")}</th>
                {canEdit && <th className="px-3 py-3.5" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-t border-line">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      {m.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.images[0]}
                          alt=""
                          className="h-[34px] w-[34px] shrink-0 rounded-sm border border-line object-cover"
                        />
                      ) : (
                        <span
                          className="h-[34px] w-[34px] shrink-0 rounded-sm border border-line"
                          style={{ backgroundColor: m.swatchHex ?? "#c9c2b4" }}
                        />
                      )}
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink">{m.nameTh}</span>
                        <span className="block text-xs text-mut">
                          {m.category}
                          {m.model ? ` · ${m.model}` : ""}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-mut">{m.sku ?? "—"}</td>
                  <td className="px-3 py-3 text-right font-mono text-ink-2">
                    {m.price
                      ? `฿${Number(m.price).toLocaleString()}${m.unit ? `/${m.unit}` : ""}`
                      : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-1.5 w-[110px] overflow-hidden rounded-pill bg-canvas-2">
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
                      <span className="font-mono text-[11.5px] text-mut">{m.completeness}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "rounded-pill px-2.5 py-1 font-mono text-[11.5px] font-semibold",
                        m.status === "published"
                          ? "bg-ok-soft text-ok"
                          : m.status === "suspended"
                            ? "bg-warn-soft text-warn"
                            : "bg-canvas-2 text-sub",
                      )}
                    >
                      {t(`status.${m.status}`)}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-3 py-3 text-right">
                      <span className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setEditing({ id: m.id, form: fromRow(m), images: m.images })
                          }
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
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
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
            {/* รูปสินค้า — อัปโหลดได้เมื่อบันทึกสินค้าแล้ว (ต้องมี id) */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-ink">
                📷 {t("fImages")}
                <span className="ml-1 text-xs font-normal text-mut">{t("fImagesHint")}</span>
              </span>
              {editing.id ? (
                <div className="flex flex-wrap items-center gap-2">
                  {editing.images.map((img) => (
                    <span key={img} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img}
                        alt=""
                        className="h-16 w-16 rounded-sm border border-line object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => void removeImage(img)}
                        disabled={imgBusy}
                        aria-label={t("imgRemove")}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink/80 text-[10px] text-white hover:bg-brand"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  {editing.images.length < 6 && (
                    <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-sm border border-dashed border-line-2 text-xl text-mut hover:border-brand hover:text-brand">
                      {imgBusy ? "…" : "＋"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        disabled={imgBusy}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void uploadImage(f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                </div>
              ) : (
                <p className="text-xs text-mut">{t("imgSaveFirst")}</p>
              )}
              {imgError && (
                <p className="text-sm text-warn" role="alert">
                  {imgError}
                </p>
              )}
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
