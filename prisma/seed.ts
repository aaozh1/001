import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { CATEGORIES, RAW_MATERIALS } from "./seed-data";

const prisma = new PrismaClient();

// Dev-only password for the seeded accounts so they can log in locally.
// designer@matlist.dev / seller@matlist.dev — both use this password.
const SEED_PASSWORD = "matlist123";

/**
 * Compute a rough data-completeness score (0-100) from how many meaningful
 * fields are filled. This mirrors DATA_MODEL's `completeness` — it is NOT a
 * paid ranking; it only reflects data richness (see CLAUDE.md rule #1).
 */
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

async function main() {
  console.log("🌱 Seeding MatList…");

  // Idempotent: wipe existing seed rows (dev only) so re-running is safe.
  // Order respects FK dependencies.
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
  await prisma.material.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.project.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  // ── Designer org + owner ──
  const designerOrg = await prisma.organization.create({
    data: {
      name: "สตูดิโอ อาศรม",
      type: "designer",
      taxId: "0105551000001",
      verified: true,
      addresses: [
        { label: "ออฟฟิศ", line: "123 ถ.สุขุมวิท กรุงเทพฯ 10110" },
      ] as Prisma.InputJsonValue,
      subscriptions: { create: { plan: "pro", seats: 5 } },
    },
  });
  const designer = await prisma.user.create({
    data: {
      email: "designer@matlist.dev",
      name: "ปวีณ์ สถาปนิก",
      locale: "th",
      passwordHash,
      professionalLicense: "ภ.สถ. 12345",
      memberships: { create: { orgId: designerOrg.id, role: "owner" } },
    },
  });

  // ── Seller org + owner ──
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
      passwordHash,
      memberships: { create: { orgId: sellerOrg.id, role: "owner" } },
    },
  });

  // ── Brands (one per unique brand name in the catalog), under the seller ──
  const brandNames = [...new Set(RAW_MATERIALS.map((m) => m.brand))];
  const brandByName = new Map<string, string>();
  for (const name of brandNames) {
    const b = await prisma.brand.create({
      data: {
        sellerOrgId: sellerOrg.id,
        name,
        story: `แบรนด์ ${name} — ข้อมูลตัวอย่างสำหรับ prototype`,
      },
    });
    brandByName.set(name, b.id);
  }

  // ── Materials (29 from the prototype) ──
  const materialIds: string[] = [];
  for (const m of RAW_MATERIALS) {
    const [firstColorName, firstColorHex] = m.colors[0] ?? [null, null];
    const data = {
      sellerOrgId: sellerOrg.id,
      brandId: brandByName.get(m.brand)!,
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
    materialIds.push(created.id);
  }

  // ── Demo project exercising the core chain: SpecItem → SpecOption → Material ──
  const project = await prisma.project.create({
    data: {
      orgId: designerOrg.id,
      name: "บ้านพักตากอากาศ หัวหิน",
      buildingType: "บ้านเดี่ยว",
      status: "active",
      createdById: designer.id,
    },
  });

  // FL-01: floor — two tile options, one confirmed
  const fl01 = await prisma.specItem.create({
    data: {
      projectId: project.id,
      code: "FL-01",
      zone: "พื้นห้องนั่งเล่น",
      category: CATEGORIES[0].key,
      qty: new Prisma.Decimal(48),
      qtyUnit: "ตร.ม.",
      sortOrder: 0,
      options: {
        create: [
          { materialId: materialIds[0], isConfirmed: true },
          { materialId: materialIds[1], isConfirmed: false },
        ],
      },
    },
  });
  await prisma.specItem.update({
    where: { id: fl01.id },
    data: { confirmedMaterialId: materialIds[0] },
  });

  // WL-01: wall — one option, not yet confirmed
  await prisma.specItem.create({
    data: {
      projectId: project.id,
      code: "WL-01",
      zone: "ผนังห้องน้ำ",
      category: CATEGORIES[0].key,
      qty: new Prisma.Decimal(22),
      qtyUnit: "ตร.ม.",
      sortOrder: 1,
      options: { create: [{ materialId: materialIds[2], isConfirmed: false }] },
    },
  });

  // CL-01: ceiling — no material chosen yet (status derives to "empty")
  await prisma.specItem.create({
    data: {
      projectId: project.id,
      code: "CL-01",
      zone: "ฝ้าเพดานห้องนอน",
      category: CATEGORIES[6].key,
      qty: new Prisma.Decimal(30),
      qtyUnit: "ตร.ม.",
      sortOrder: 2,
    },
  });

  const counts = {
    users: await prisma.user.count(),
    organizations: await prisma.organization.count(),
    brands: await prisma.brand.count(),
    materials: await prisma.material.count(),
    projects: await prisma.project.count(),
    specItems: await prisma.specItem.count(),
    specOptions: await prisma.specOption.count(),
  };
  console.log("✅ Seed complete:", counts);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
