import "server-only";
import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import type { SpecBookSnapshot, SnapshotOption } from "./snapshot";

// Bundled Sarabun (Thai + Latin, OFL) — read once. See assets/fonts/NOTICE.md.
const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
let fonts: { regular: Buffer; bold: Buffer } | null = null;
function loadFonts() {
  if (!fonts) {
    fonts = {
      regular: fs.readFileSync(path.join(FONT_DIR, "Sarabun-Regular.ttf")),
      bold: fs.readFileSync(path.join(FONT_DIR, "Sarabun-SemiBold.ttf")),
    };
  }
  return fonts;
}

const C = {
  brand: "#F4632A",
  ink: "#1F2430",
  sub: "#6B7280",
  mut: "#9AA1AC",
  line: "#E2E4E9",
  ok: "#12A150",
};

interface Labels {
  specBook: string;
  version: string;
  generated: string;
  confirmed: string;
  brand: string;
  model: string;
  sku: string;
  seller: string;
  price: string;
  cert: string;
  lead: string;
  moq: string;
  warranty: string;
  note: string;
  noOptions: string;
  tagline: string;
}

const LABELS: Record<"th" | "en", Labels> = {
  th: {
    specBook: "Spec Book — ตารางสเปกวัสดุ",
    version: "เวอร์ชัน",
    generated: "ออกเอกสารเมื่อ",
    confirmed: "เลือกใช้",
    brand: "ยี่ห้อ",
    model: "รุ่น",
    sku: "รหัสสินค้า",
    seller: "ผู้ผลิต/จัดจำหน่าย",
    price: "ราคา",
    cert: "มาตรฐาน",
    lead: "ระยะส่งของ",
    moq: "สั่งขั้นต่ำ",
    warranty: "รับประกัน",
    note: "หมายเหตุผู้ผลิต",
    noOptions: "ยังไม่มีตัวเลือกวัสดุ",
    tagline: "วัสดุครบ จบที่ลิสต์เดียว",
  },
  en: {
    specBook: "Spec Book — material schedule",
    version: "Version",
    generated: "Generated",
    confirmed: "Confirmed",
    brand: "Brand",
    model: "Model",
    sku: "SKU",
    seller: "Manufacturer / distributor",
    price: "Price",
    cert: "Standard",
    lead: "Lead time",
    moq: "MOQ",
    warranty: "Warranty",
    note: "Manufacturer note",
    noOptions: "No material options yet",
    tagline: "Every material. One list.",
  },
};

/** Render a Spec Book snapshot to a PDF Buffer. */
export function renderSpecBookPdf(
  snapshot: SpecBookSnapshot,
  opts: { version: number; locale: "th" | "en" },
): Promise<Buffer> {
  const { regular, bold } = loadFonts();
  const L = LABELS[opts.locale];
  const isEn = opts.locale === "en";

  const doc = new PDFDocument({ size: "A4", margin: 46, bufferPages: true });
  doc.registerFont("body", regular);
  doc.registerFont("bold", bold);

  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const width = right - left;
  const bottom = doc.page.height - doc.page.margins.bottom;

  const ensure = (needed: number) => {
    if (doc.y + needed > bottom) doc.addPage();
  };
  const optText = (o: SnapshotOption, th: string | null, en: string | null) =>
    (isEn && en ? en : th) ?? "";

  // ── Header ──
  doc.font("bold").fontSize(20).fillColor(C.brand).text("MatList", left, doc.y);
  doc.font("body").fontSize(11).fillColor(C.sub).text(L.specBook, left, doc.y + 2);
  doc.moveDown(0.6);
  doc.font("bold").fontSize(16).fillColor(C.ink).text(snapshot.projectName, { width });
  const metaBits = [
    snapshot.buildingType,
    `${L.version} ${opts.version}`,
    `${L.generated} ${snapshot.generatedAt}`,
  ].filter(Boolean);
  doc.font("body").fontSize(10).fillColor(C.sub).text(metaBits.join("  ·  "), { width });
  doc.moveDown(0.5);
  doc
    .strokeColor(C.brand)
    .lineWidth(2)
    .moveTo(left, doc.y)
    .lineTo(left + 48, doc.y)
    .stroke();
  doc.moveDown(0.8);

  // ── Items ──
  for (const item of snapshot.items) {
    ensure(60);
    const head = [
      item.code,
      item.zone,
      item.category,
      item.qty ? `${item.qty} ${item.qtyUnit ?? ""}`.trim() : null,
    ]
      .filter(Boolean)
      .join("   ·   ");
    doc.font("bold").fontSize(12).fillColor(C.ink).text(head, left, doc.y);
    doc.moveDown(0.2);

    if (item.options.length === 0) {
      doc.font("body").fontSize(9.5).fillColor(C.mut).text(L.noOptions, left + 8);
      doc.moveDown(0.5);
    }

    for (const o of item.options) {
      ensure(74);
      const top = doc.y;
      // swatch
      if (o.swatchHex) {
        doc.save().rect(left, top + 1, 22, 22).fill(o.swatchHex);
        doc.restore().strokeColor(C.line).lineWidth(0.5).rect(left, top + 1, 22, 22).stroke();
      }
      const tx = left + 32;
      const tw = width - 32;
      const name = optText(o, o.name, o.nameEn);
      doc.font(o.isConfirmed ? "bold" : "body").fontSize(11).fillColor(C.ink).text(name, tx, top, { width: tw, continued: false });
      if (o.isConfirmed) {
        doc.font("bold").fontSize(8.5).fillColor(C.ok).text(`✓ ${L.confirmed}`, tx, doc.y);
      }

      const kv = (k: string, v: string | null) => (v && v !== "—" ? `${k}: ${v}` : null);
      const line1 = [
        kv(L.brand, o.brand),
        kv(L.model, o.model),
        kv(L.sku, o.sku),
        kv(L.seller, o.sellerName),
      ]
        .filter(Boolean)
        .join("   ");
      const line2 = [
        kv(L.price, o.price ? `${o.price}${o.unit ? `/${o.unit}` : ""}` : null),
        kv(L.cert, o.cert),
        kv(L.lead, o.leadTime),
        kv(L.moq, o.moq),
        kv(L.warranty, o.warranty),
      ]
        .filter(Boolean)
        .join("   ");
      doc.font("body").fontSize(9).fillColor(C.sub);
      if (line1) doc.text(line1, tx, doc.y, { width: tw });
      if (line2) doc.text(line2, tx, doc.y, { width: tw });
      const spec = optText(o, o.specTh, o.specEn);
      if (spec) doc.fillColor(C.mut).text(spec, tx, doc.y, { width: tw });
      const note = optText(o, o.noteTh, o.noteEn);
      if (note && note !== "—")
        doc.fillColor(C.mut).text(`${L.note}: ${note}`, tx, doc.y, { width: tw });
      doc.moveDown(0.5);
    }
    doc.moveDown(0.3);
  }

  // ── Logo at the end ──
  ensure(90);
  doc.moveDown(1);
  doc.strokeColor(C.line).lineWidth(0.5).moveTo(left, doc.y).lineTo(right, doc.y).stroke();
  doc.moveDown(0.8);
  doc.font("bold").fontSize(15).fillColor(C.brand).text("MatList", { align: "center", width });
  doc.font("body").fontSize(10).fillColor(C.sub).text(L.tagline, { align: "center", width });

  // ── Page footers ──
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc
      .font("body")
      .fontSize(8)
      .fillColor(C.mut)
      .text(`MatList · ${i + 1}/${range.count}`, left, bottom + 12, { width, align: "center", lineBreak: false });
  }

  doc.end();
  return done;
}
