import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { CATEGORIES, RAW_MATERIALS } from "./seed-data";

const prisma = new PrismaClient();

// ── Presentation-ready demo dataset ────────────────────────────────────
// เป้าหมาย: login แล้วทุกหน้ามีของให้ดูทันที — ตารางเทียบราคาหลายเจ้า,
// SLA countdown (ทั้งใกล้หมดเวลาและเลยกำหนด), แท็บ inbox ครบทุกสถานะ,
// dashboard สองฝั่งมีตัวเลขจริง, Studio tools ปลดล็อก, funnel ใน /ops/metrics
//
// บัญชีเดโม่ (รหัสเดียวกันทุกบัญชี — DEV ONLY, ห้ามใช้บน production):
//   designer@matlist.dev  ผู้ออกแบบ (เจ้าของ สตูดิโอ อาศรม, แผน Studio)
//   seller@matlist.dev    ผู้ขายหลัก (เจ้าของ MatList Demo Supply)
//   seller2@matlist.dev   ผู้ขายคู่แข่ง (สยามวัสดุภัณฑ์) — ทำให้มีการแข่งราคา
//   content@matlist.dev   ทีมข้อมูลสินค้าของผู้ขายหลัก (role: content)
const DEMO_PASSWORD = "matlist1234";

// แบรนด์เหล่านี้ย้ายไปอยู่กับผู้ขายคู่แข่ง เพื่อให้หมวดหลัก ๆ มีของทั้งสองเจ้า
// (จำเป็นต่อเดโม่ตารางเทียบราคา — RFQ เดียวได้ quote จาก 2 บริษัท)
const SELLER2_BRANDS = new Set([
  "EcoTile",
  "Northern",
  "VinylPro",
  "Knauf",
  "BathPro",
  "Upholstery",
]);

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3_600_000);
const hoursFromNow = (h: number) => new Date(now + h * 3_600_000);
const daysAgo = (d: number) => hoursAgo(d * 24);

/** Rough data-completeness (mirrors lib/materials/completeness — data, not money). */
function completenessOf(m: {
  nameTh?: string | null;
  nameEn?: string | null;
  model?: string | null;
  sku?: string | null;
  price?: unknown;
  unit?: string | null;
  spec?: unknown;
  cert?: string | null;
  leadTime?: string | null;
  moq?: string | null;
  warranty?: string | null;
  swatchHex?: string | null;
}): number {
  const fields = [
    m.nameTh,
    m.nameEn,
    m.model,
    m.sku,
    m.price != null ? "y" : null,
    m.unit,
    m.spec != null ? "y" : null,
    m.cert && m.cert !== "—" ? m.cert : null,
    m.leadTime,
    m.moq,
    m.warranty && m.warranty !== "—" ? m.warranty : null,
    m.swatchHex,
  ];
  const filled = fields.filter((f) => f != null && f !== "").length;
  return Math.round((filled / fields.length) * 100);
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

interface SeededMaterial {
  id: string;
  cat: number;
  sellerOrgId: string;
  price: number;
  nameTh: string;
}

async function main() {
  console.log("🌱 Seeding MatList (presentation dataset)…");

  const demoPasswordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // Idempotent wipe (dev only), FK order.
  await prisma.analyticsEvent.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatThread.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.rFQRecipient.deleteMany();
  await prisma.rFQ.deleteMany();
  await prisma.vEHistory.deleteMany();
  await prisma.specOption.deleteMany();
  await prisma.specItem.deleteMany();
  await prisma.specBook.deleteMany();
  await prisma.project.deleteMany();
  await prisma.review.deleteMany();
  await prisma.materialSet.deleteMany();
  await prisma.template.deleteMany();
  await prisma.importMapping.deleteMany();
  await prisma.material.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  // ── Designer org (แผน Studio → เดโม่ Templates/Sets ได้เลย) ──
  const designerOrg = await prisma.organization.create({
    data: {
      name: "สตูดิโอ อาศรม",
      type: "designer",
      taxId: "0105551000001",
      verified: true,
      addresses: [
        { label: "ออฟฟิศ", line: "123 ถ.สุขุมวิท กรุงเทพฯ 10110" },
      ] as Prisma.InputJsonValue,
      subscriptions: {
        create: { plan: "studio", seats: 3, currentPeriodEnd: hoursFromNow(20 * 24) },
      },
      invoices: {
        create: [
          {
            amount: new Prisma.Decimal(2070),
            taxInvoiceUrl: "https://example.com/tax/matlist-2026-06.pdf",
            issuedAt: daysAgo(40),
          },
          {
            amount: new Prisma.Decimal(2070),
            taxInvoiceUrl: "https://example.com/tax/matlist-2026-07.pdf",
            issuedAt: daysAgo(10),
          },
        ],
      },
    },
  });
  const designer = await prisma.user.create({
    data: {
      email: "designer@matlist.dev",
      name: "ปวีณ์ สถาปนิก",
      locale: "th",
      passwordHash: demoPasswordHash,
      termsAcceptedAt: daysAgo(60),
      professionalLicense: "ภ.สถ. 12345",
      memberships: { create: { orgId: designerOrg.id, role: "owner" } },
    },
  });

  // ── Seller org #1 (บัญชีเดโม่หลักฝั่งผู้ขาย) ──
  const sellerOrg = await prisma.organization.create({
    data: {
      name: "MatList Demo Supply",
      type: "seller",
      taxId: "0105551000002",
      verified: true,
      addresses: [
        { label: "คลังส่งตัวอย่าง", line: "88 นิคมอุตสาหกรรม สมุทรปราการ 10280" },
      ] as Prisma.InputJsonValue,
      subscriptions: { create: { plan: "standard", seats: 3 } },
    },
  });
  const seller = await prisma.user.create({
    data: {
      email: "seller@matlist.dev",
      name: "สมชาย ฝ่ายขาย",
      locale: "th",
      passwordHash: demoPasswordHash,
      termsAcceptedAt: daysAgo(55),
      memberships: { create: { orgId: sellerOrg.id, role: "owner" } },
    },
  });
  // สมาชิกทีมเพิ่ม → หน้า "ทีมและสิทธิ์" มีหลายแถวให้ดู
  await prisma.user.create({
    data: {
      email: "content@matlist.dev",
      name: "กานดา ข้อมูลสินค้า",
      locale: "th",
      passwordHash: demoPasswordHash,
      termsAcceptedAt: daysAgo(30),
      memberships: { create: { orgId: sellerOrg.id, role: "content" } },
    },
  });

  // ── Seller org #2 (คู่แข่ง — ทำให้เกิดการแข่งราคาจริง) ──
  const sellerOrg2 = await prisma.organization.create({
    data: {
      name: "สยามวัสดุภัณฑ์",
      type: "seller",
      taxId: "0105551000003",
      verified: true,
      subscriptions: { create: { plan: "free", seats: 1 } },
    },
  });
  await prisma.user.create({
    data: {
      email: "seller2@matlist.dev",
      name: "วิรัช การค้า",
      locale: "th",
      passwordHash: demoPasswordHash,
      termsAcceptedAt: daysAgo(45),
      memberships: { create: { orgId: sellerOrg2.id, role: "owner" } },
    },
  });

  // ── Brands — แยกเจ้าของตาม SELLER2_BRANDS ──
  const brandNames = [...new Set(RAW_MATERIALS.map((m) => m.brand))];
  const brandByName = new Map<string, { id: string; orgId: string }>();
  for (const name of brandNames) {
    const orgId = SELLER2_BRANDS.has(name) ? sellerOrg2.id : sellerOrg.id;
    const b = await prisma.brand.create({
      data: {
        sellerOrgId: orgId,
        name,
        story: `แบรนด์ ${name} — ตัวแทนจำหน่ายอย่างเป็นทางการ`,
      },
    });
    brandByName.set(name, { id: b.id, orgId });
  }

  // ── Materials (30 ตัวจาก prototype, เจ้าของตามแบรนด์) ──
  const materials: SeededMaterial[] = [];
  for (const m of RAW_MATERIALS) {
    const brand = brandByName.get(m.brand)!;
    const [firstColorName, firstColorHex] = m.colors[0] ?? [null, null];
    const data = {
      sellerOrgId: brand.orgId,
      brandId: brand.id,
      nameTh: m.th,
      nameEn: m.en,
      model: m.model,
      sku: `${slug(m.brand)}-${slug(m.model)}`.toUpperCase(),
      category: CATEGORIES[m.cat].key,
      color: firstColorName,
      size: m.sizes[0] ?? null,
      price: new Prisma.Decimal(m.base),
      unit: m.unit,
      spec: {
        summary_th: m.spec,
        summary_en: m.specEn,
        colors: m.colors,
        sizes: m.sizes,
      } as Prisma.InputJsonValue,
      cert: m.cert,
      leadTime: m.lead,
      moq: m.moq,
      warranty: m.wty,
      noteTh: m.note,
      noteEn: m.noteEn,
      swatchHex: firstColorHex,
      status: "published" as const,
    };
    const created = await prisma.material.create({
      data: { ...data, completeness: completenessOf(data) },
    });
    materials.push({
      id: created.id,
      cat: m.cat,
      sellerOrgId: brand.orgId,
      price: m.base,
      nameTh: m.th,
    });
  }

  // สินค้า 1 ตัวของผู้ขายหลักเป็น "ฉบับร่าง" ข้อมูลบาง ๆ → เดโม่แถบ completeness ต่ำ
  const draftMat = materials.filter((x) => x.sellerOrgId === sellerOrg.id).at(-1)!;
  await prisma.material.update({
    where: { id: draftMat.id },
    data: {
      status: "draft",
      price: null,
      leadTime: null,
      warranty: null,
      completeness: 42,
    },
  });

  // helper: วัสดุตามหมวด+เจ้าของ (ข้ามตัวที่ถูกทำเป็น draft)
  const pick = (cat: number, orgId: string, nth = 0): SeededMaterial => {
    const list = materials.filter(
      (x) => x.cat === cat && x.sellerOrgId === orgId && x.id !== draftMat.id,
    );
    const found = list[nth] ?? list[0];
    if (!found) throw new Error(`no material cat=${cat} org=${orgId}`);
    return found;
  };

  // ═══ โปรเจกต์ 1: บ้านพักตากอากาศ หัวหิน — journey ครบทุกสถานะ ═══
  const p1 = await prisma.project.create({
    data: {
      orgId: designerOrg.id,
      name: "บ้านพักตากอากาศ หัวหิน",
      buildingType: "บ้านเดี่ยว",
      status: "active",
      createdById: designer.id,
      createdAt: daysAgo(14),
    },
  });

  const item = (
    sort: number,
    code: string,
    zone: string,
    cat: number | null,
    qty: number | null,
    unit: string | null,
  ) =>
    prisma.specItem.create({
      data: {
        projectId: p1.id,
        code,
        zone,
        category: cat != null ? CATEGORIES[cat].key : null,
        qty: qty != null ? new Prisma.Decimal(qty) : null,
        qtyUnit: unit,
        sortOrder: sort,
      },
    });

  // FL-01 — ดีลปิดแล้ว (closed_won): ชนะ = ผู้ขายหลัก, แพ้ = คู่แข่ง
  const fl01 = await item(0, "FL-01", "พื้นห้องนั่งเล่น", 0, 48, "ตร.ม.");
  const fl01a = pick(0, sellerOrg.id);
  const fl01b = pick(0, sellerOrg2.id);
  await prisma.specOption.createMany({
    data: [
      { specItemId: fl01.id, materialId: fl01a.id, isConfirmed: true },
      { specItemId: fl01.id, materialId: fl01b.id },
    ],
  });
  await prisma.specItem.update({
    where: { id: fl01.id },
    data: { confirmedMaterialId: fl01a.id },
  });
  await prisma.rFQ.create({
    data: {
      specItemId: fl01.id,
      projectId: p1.id,
      createdById: designer.id,
      status: "closed_won",
      wantSample: true,
      createdAt: daysAgo(5),
      slaDueAt: daysAgo(3),
      recipients: {
        create: [
          {
            sellerOrgId: sellerOrg.id,
            materialId: fl01a.id,
            respondedAt: hoursAgo(5 * 24 - 11),
          },
          {
            sellerOrgId: sellerOrg2.id,
            materialId: fl01b.id,
            respondedAt: hoursAgo(5 * 24 - 19),
          },
        ],
      },
      quotes: {
        create: [
          {
            sellerOrgId: sellerOrg.id,
            pricePerUnit: new Prisma.Decimal(Math.round(fl01a.price * 0.97)),
            projectDiscount: new Prisma.Decimal(15),
            leadTime: "7 วัน",
            paymentTerms: "มัดจำ 30% ที่เหลือก่อนส่ง",
            includeSample: true,
            status: "selected",
            createdAt: hoursAgo(5 * 24 - 11),
          },
          {
            sellerOrgId: sellerOrg2.id,
            pricePerUnit: new Prisma.Decimal(Math.round(fl01b.price * 1.02)),
            leadTime: "12 วัน",
            status: "rejected",
            createdAt: hoursAgo(5 * 24 - 19),
          },
        ],
      },
    },
  });

  // FL-02 — ได้ราคาแล้ว 2 เจ้า → จุดเดโม่ "ตารางเทียบ + เลือกผู้ชนะ" สด ๆ
  const fl02 = await item(1, "FL-02", "พื้นห้องนอนชั้นบน", 3, 36, "ตร.ม.");
  const fl02a = pick(3, sellerOrg.id);
  const fl02b = pick(3, sellerOrg2.id);
  await prisma.specOption.createMany({
    data: [
      { specItemId: fl02.id, materialId: fl02a.id },
      { specItemId: fl02.id, materialId: fl02b.id },
    ],
  });
  await prisma.rFQ.create({
    data: {
      specItemId: fl02.id,
      projectId: p1.id,
      createdById: designer.id,
      status: "quoted",
      wantSample: true,
      note: "โครงการ 500 ตร.ม. ต้องการของภายในเดือนนี้",
      createdAt: daysAgo(2),
      slaDueAt: hoursFromNow(28),
      recipients: {
        create: [
          {
            sellerOrgId: sellerOrg.id,
            materialId: fl02a.id,
            respondedAt: hoursAgo(2 * 24 - 14),
          },
          {
            sellerOrgId: sellerOrg2.id,
            materialId: fl02b.id,
            respondedAt: hoursAgo(2 * 24 - 26),
          },
        ],
      },
      quotes: {
        create: [
          {
            sellerOrgId: sellerOrg.id,
            pricePerUnit: new Prisma.Decimal(Math.round(fl02a.price * 0.99)),
            projectDiscount: new Prisma.Decimal(20),
            leadTime: "3 วัน",
            paymentTerms: "เครดิต 30 วัน",
            validUntil: hoursFromNow(14 * 24),
            includeSample: true,
            createdAt: hoursAgo(2 * 24 - 14),
          },
          {
            sellerOrgId: sellerOrg2.id,
            pricePerUnit: new Prisma.Decimal(Math.round(fl02b.price * 0.94)),
            leadTime: "5 วัน",
            paymentTerms: "มัดจำ 50%",
            validUntil: hoursFromNow(10 * 24),
            createdAt: hoursAgo(2 * 24 - 26),
          },
        ],
      },
    },
  });

  // WL-01 — ส่งแล้วรอราคา ใกล้ครบกำหนด → การ์ด "ด่วนสุด" ฝั่งผู้ขายนับถอยหลัง
  const wl01 = await item(2, "WL-01", "ผนังห้องน้ำหลัก", 0, 22, "ตร.ม.");
  const wl01a = pick(0, sellerOrg.id, 1);
  await prisma.specOption.create({
    data: { specItemId: wl01.id, materialId: wl01a.id },
  });
  await prisma.rFQ.create({
    data: {
      specItemId: wl01.id,
      projectId: p1.id,
      createdById: designer.id,
      status: "open",
      createdAt: hoursAgo(28),
      slaDueAt: hoursFromNow(20),
      recipients: { create: [{ sellerOrgId: sellerOrg.id, materialId: wl01a.id }] },
    },
  });

  // WL-02 — มีตัวเลือกแต่ยังไม่ส่ง RFQ (สถานะ "ตัวเลือก" + นับใน dashboard)
  const wl02 = await item(3, "WL-02", "ผนัง feature โถงกลาง", 2, 18, "ตร.ม.");
  await prisma.specOption.createMany({
    data: [
      { specItemId: wl02.id, materialId: pick(2, sellerOrg.id).id },
      { specItemId: wl02.id, materialId: pick(2, sellerOrg2.id).id },
    ],
  });

  // CL-01 — RFQ เลยกำหนดตอบ → ป้าย "เลยกำหนด" ฝั่งผู้ขายหลัก
  const cl01 = await item(4, "CL-01", "ฝ้าเพดานห้องนั่งเล่น", 6, 64, "ตร.ม.");
  const cl01a = pick(6, sellerOrg.id);
  await prisma.specOption.create({
    data: { specItemId: cl01.id, materialId: cl01a.id },
  });
  await prisma.rFQ.create({
    data: {
      specItemId: cl01.id,
      projectId: p1.id,
      createdById: designer.id,
      status: "open",
      createdAt: daysAgo(3),
      slaDueAt: hoursAgo(6),
      recipients: { create: [{ sellerOrgId: sellerOrg.id, materialId: cl01a.id }] },
    },
  });

  // CL-02 — ยังว่าง (สถานะ "ยังไม่เลือกวัสดุ")
  await item(5, "CL-02", "ฝ้าเพดานห้องนอน", null, 40, "ตร.ม.");

  // LT-01 — ยืนยันเองโดยไม่ผ่าน RFQ (สถานะ "เลือกแล้ว")
  const lt01 = await item(6, "LT-01", "ไฟรางโถงทางเดิน", 13, 12, "ม.");
  const lt01a = pick(13, sellerOrg.id);
  await prisma.specOption.create({
    data: { specItemId: lt01.id, materialId: lt01a.id, isConfirmed: true },
  });
  await prisma.specItem.update({
    where: { id: lt01.id },
    data: { confirmedMaterialId: lt01a.id },
  });

  // SN-01 — สองตัวเลือกสองเจ้า: คู่แข่งตอบแล้ว ผู้ขายหลักยังไม่ตอบ (เหลือ 40 ชม.)
  const sn01 = await item(7, "SN-01", "สุขภัณฑ์ห้องน้ำหลัก", 12, 6, "ชุด");
  const sn01a = pick(12, sellerOrg.id);
  const sn01b = pick(12, sellerOrg2.id);
  await prisma.specOption.createMany({
    data: [
      { specItemId: sn01.id, materialId: sn01a.id },
      { specItemId: sn01.id, materialId: sn01b.id },
    ],
  });
  await prisma.rFQ.create({
    data: {
      specItemId: sn01.id,
      projectId: p1.id,
      createdById: designer.id,
      status: "quoted",
      createdAt: daysAgo(1),
      slaDueAt: hoursFromNow(40),
      recipients: {
        create: [
          { sellerOrgId: sellerOrg.id, materialId: sn01a.id },
          {
            sellerOrgId: sellerOrg2.id,
            materialId: sn01b.id,
            respondedAt: hoursAgo(8),
          },
        ],
      },
      quotes: {
        create: [
          {
            sellerOrgId: sellerOrg2.id,
            pricePerUnit: new Prisma.Decimal(Math.round(sn01b.price * 0.96)),
            leadTime: "10 วัน",
            includeSample: true,
            createdAt: hoursAgo(8),
          },
        ],
      },
    },
  });

  // ═══ โปรเจกต์ 2: โรงแรมบูทีค เชียงใหม่ — กลางทาง ═══
  const p2 = await prisma.project.create({
    data: {
      orgId: designerOrg.id,
      name: "โรงแรมบูทีค เชียงใหม่",
      buildingType: "โรงแรม",
      status: "active",
      createdById: designer.id,
      createdAt: daysAgo(6),
    },
  });
  const p2item = (
    sort: number,
    code: string,
    zone: string,
    cat: number | null,
    qty: number | null,
    unit: string | null,
  ) =>
    prisma.specItem.create({
      data: {
        projectId: p2.id,
        code,
        zone,
        category: cat != null ? CATEGORIES[cat].key : null,
        qty: qty != null ? new Prisma.Decimal(qty) : null,
        qtyUnit: unit,
        sortOrder: sort,
      },
    });

  const hFl = await p2item(0, "FL-01", "พื้นล็อบบี้", 1, 120, "ตร.ม.");
  await prisma.specOption.createMany({
    data: [
      { specItemId: hFl.id, materialId: pick(1, sellerOrg.id).id },
      { specItemId: hFl.id, materialId: pick(1, sellerOrg.id, 1).id },
    ],
  });

  const hWl = await p2item(1, "WL-01", "ผนังภายนอกอาคาร", 9, 800, "ตร.ม.");
  const hWlMat = pick(9, sellerOrg.id);
  await prisma.specOption.create({
    data: { specItemId: hWl.id, materialId: hWlMat.id },
  });
  await prisma.rFQ.create({
    data: {
      specItemId: hWl.id,
      projectId: p2.id,
      createdById: designer.id,
      status: "quoted",
      createdAt: daysAgo(1),
      slaDueAt: hoursFromNow(24),
      recipients: {
        create: [
          {
            sellerOrgId: sellerOrg.id,
            materialId: hWlMat.id,
            respondedAt: hoursAgo(15),
          },
        ],
      },
      quotes: {
        create: [
          {
            sellerOrgId: sellerOrg.id,
            pricePerUnit: new Prisma.Decimal(Math.round(hWlMat.price * 0.93)),
            projectDiscount: new Prisma.Decimal(100),
            leadTime: "5 วัน",
            paymentTerms: "เครดิต 45 วัน (โครงการ)",
            validUntil: hoursFromNow(21 * 24),
            createdAt: hoursAgo(15),
          },
        ],
      },
    },
  });

  const hFb = await p2item(2, "FB-01", "ผ้าม่านห้องพัก", 11, 260, "ม.");
  await prisma.specOption.create({
    data: { specItemId: hFb.id, materialId: pick(11, sellerOrg2.id).id },
  });

  const hGl = await p2item(3, "GL-01", "พาร์ทิชันกระจกห้องอาหาร", 8, 45, "ตร.ม.");
  await prisma.specOption.create({
    data: { specItemId: hGl.id, materialId: pick(8, sellerOrg.id).id },
  });

  await p2item(4, "CL-01", "ฝ้าห้องประชุม", null, 90, "ตร.ม.");

  // ═══ โปรเจกต์ 3: งานส่งแล้ว รอลูกค้า — โชว์สถานะโปรเจกต์หลากหลาย ═══
  const p3 = await prisma.project.create({
    data: {
      orgId: designerOrg.id,
      name: "รีโนเวทคอนโด ทองหล่อ 23",
      buildingType: "คอนโด",
      status: "waiting_client",
      createdById: designer.id,
      createdAt: daysAgo(30),
    },
  });
  const p3mats = [pick(3, sellerOrg.id), pick(9, sellerOrg.id), pick(12, sellerOrg.id)];
  const p3codes: [string, string][] = [
    ["FL-01", "พื้นทั้งยูนิต"],
    ["PT-01", "สีภายในทั้งหมด"],
    ["SN-01", "สุขภัณฑ์ห้องน้ำ"],
  ];
  for (let i = 0; i < 3; i++) {
    const it = await prisma.specItem.create({
      data: {
        projectId: p3.id,
        code: p3codes[i][0],
        zone: p3codes[i][1],
        category: CATEGORIES[p3mats[i].cat].key,
        qty: new Prisma.Decimal([64, 180, 2][i]),
        qtyUnit: ["ตร.ม.", "ตร.ม.", "ชุด"][i],
        sortOrder: i,
        confirmedMaterialId: p3mats[i].id,
      },
    });
    await prisma.specOption.create({
      data: { specItemId: it.id, materialId: p3mats[i].id, isConfirmed: true },
    });
  }

  // ── แชท: ผู้ออกแบบ ↔ ผู้ขายหลัก ผูกกับโปรเจกต์ 1 ──
  await prisma.chatThread.create({
    data: {
      designerOrgId: designerOrg.id,
      sellerOrgId: sellerOrg.id,
      projectId: p1.id,
      createdAt: daysAgo(2),
      messages: {
        create: [
          {
            senderUserId: designer.id,
            senderSide: "designer",
            body: "สวัสดีครับ เห็นใบเสนอราคาพื้น SPC แล้ว ถ้าสั่งพร้อมกันทั้งชั้นบน-ล่างประมาณ 80 ตร.ม. ปรับราคาได้อีกไหมครับ",
            createdAt: hoursAgo(30),
          },
          {
            senderUserId: seller.id,
            senderSide: "seller",
            body: "สวัสดีครับคุณปวีณ์ ถ้ายอด 80 ตร.ม. ขึ้นไป เพิ่มส่วนลดโครงการเป็น 35 บาท/ตร.ม. ได้ครับ ยืนราคาถึงสิ้นเดือน",
            createdAt: hoursAgo(28),
          },
          {
            senderUserId: designer.id,
            senderSide: "designer",
            body: "รับทราบครับ รบกวนแนบ specsheet รุ่น AquaLock กับตารางสี ให้ทีมภายในดูหน่อยครับ",
            createdAt: hoursAgo(26),
          },
          {
            senderUserId: seller.id,
            senderSide: "seller",
            body: "จัดให้ครับ แนบไว้ในระบบแล้ว ตัวอย่างจริงส่งถึงออฟฟิศพรุ่งนี้ก่อนเที่ยงครับ 🙏",
            createdAt: hoursAgo(25),
          },
        ],
      },
    },
  });

  // ── Studio: เทมเพลต + ชุดวัสดุ ของออฟฟิศ ──
  await prisma.template.create({
    data: {
      orgId: designerOrg.id,
      name: "โครงบ้านพักตากอากาศ — มาตรฐานออฟฟิศ",
      buildingType: "บ้านเดี่ยว",
      structure: [
        { code: "FL-01", zone: "พื้นห้องนั่งเล่น", category: CATEGORIES[0].key, qtyUnit: "ตร.ม." },
        { code: "FL-02", zone: "พื้นห้องนอน", category: CATEGORIES[3].key, qtyUnit: "ตร.ม." },
        { code: "WL-01", zone: "ผนังห้องน้ำ", category: CATEGORIES[0].key, qtyUnit: "ตร.ม." },
        { code: "CL-01", zone: "ฝ้าเพดาน", category: CATEGORIES[6].key, qtyUnit: "ตร.ม." },
        { code: "LT-01", zone: "แสงสว่างหลัก", category: CATEGORIES[13].key, qtyUnit: "ม." },
        { code: "SN-01", zone: "สุขภัณฑ์", category: CATEGORIES[12].key, qtyUnit: "ชุด" },
      ] as Prisma.InputJsonValue,
    },
  });
  await prisma.materialSet.create({
    data: {
      orgId: designerOrg.id,
      name: "พาเลตต์วอร์มโทน ธรรมชาติ",
      materialIds: [fl01a.id, fl02a.id, pick(2, sellerOrg.id).id, hWlMat.id, lt01a.id],
    },
  });

  // ── Analytics: funnel สองฝั่งย้อนหลัง 3 สัปดาห์ (org จริง + org สมมุติ) ──
  const events: { event: string; orgId: string; daysBack: number }[] = [];
  const dOrgs = [designerOrg.id, "demo-d2", "demo-d3", "demo-d4", "demo-d5", "demo-d6", "demo-d7"];
  const sOrgs = [sellerOrg.id, sellerOrg2.id, "demo-s3", "demo-s4"];
  dOrgs.forEach((o, i) => events.push({ event: "signup_designer", orgId: o, daysBack: 20 - i * 2 }));
  dOrgs.slice(0, 5).forEach((o, i) => events.push({ event: "project_created", orgId: o, daysBack: 18 - i * 2 }));
  dOrgs.slice(0, 4).forEach((o, i) => events.push({ event: "option_added", orgId: o, daysBack: 16 - i * 2 }));
  dOrgs.slice(0, 3).forEach((o, i) => events.push({ event: "rfq_sent", orgId: o, daysBack: 10 - i * 2 }));
  dOrgs.slice(0, 2).forEach((o, i) => events.push({ event: "winner_selected", orgId: o, daysBack: 5 - i }));
  sOrgs.forEach((o, i) => events.push({ event: "signup_seller", orgId: o, daysBack: 21 - i * 3 }));
  sOrgs.slice(0, 3).forEach((o, i) => events.push({ event: "material_published", orgId: o, daysBack: 15 - i * 2 }));
  sOrgs.slice(0, 3).forEach((o, i) => events.push({ event: "quote_submitted", orgId: o, daysBack: 8 - i }));
  [sellerOrg.id, "demo-s3"].forEach((o, i) => events.push({ event: "rfq_won", orgId: o, daysBack: 4 - i }));
  events.push({ event: "specbook_created", orgId: designerOrg.id, daysBack: 7 });
  events.push({ event: "excel_imported", orgId: "demo-d2", daysBack: 12 });
  events.push({ event: "chat_opened", orgId: designerOrg.id, daysBack: 2 });
  await prisma.analyticsEvent.createMany({
    data: events.map((e) => ({
      event: e.event,
      orgId: e.orgId,
      createdAt: daysAgo(Math.max(0, e.daysBack)),
    })),
  });

  const counts = {
    users: await prisma.user.count(),
    organizations: await prisma.organization.count(),
    brands: await prisma.brand.count(),
    materials: await prisma.material.count(),
    projects: await prisma.project.count(),
    specItems: await prisma.specItem.count(),
    specOptions: await prisma.specOption.count(),
    rfqs: await prisma.rFQ.count(),
    quotes: await prisma.quote.count(),
    chatMessages: await prisma.chatMessage.count(),
    analyticsEvents: await prisma.analyticsEvent.count(),
  };
  console.log("✅ Seed complete:", counts);
  console.log("🔑 Demo logins (password: matlist1234):");
  console.log(
    "   designer@matlist.dev · seller@matlist.dev · seller2@matlist.dev · content@matlist.dev",
  );
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
