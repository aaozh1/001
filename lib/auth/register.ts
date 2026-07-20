import "server-only";
import bcrypt from "bcryptjs";
import { EVENTS } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { RegisterInput } from "./schemas";

// Starter lines by material family; two published options are attached per
// line where the catalog has them (highest completeness first — neutral).
const STARTER_LINES: { code: string; zone: string; category: string; qtyUnit: string }[] = [
  { code: "FL-01", zone: "พื้นส่วนกลาง", category: "กระเบื้อง & พอร์ซเลน", qtyUnit: "ตร.ม." },
  { code: "FL-02", zone: "พื้นห้องนอน", category: "ไวนิล SPC & ลามิเนต", qtyUnit: "ตร.ม." },
  { code: "WL-01", zone: "ผนังตกแต่ง", category: "สี & สารเคลือบผิว", qtyUnit: "ตร.ม." },
  { code: "LT-01", zone: "แสงสว่างหลัก", category: "แสงสว่าง & โคมไฟ", qtyUnit: "จุด" },
];

async function createStarterProject(orgId: string, userId: string): Promise<void> {
  const project = await prisma.project.create({
    data: {
      orgId,
      name: "🎓 โปรเจกต์ตัวอย่าง — ลองเล่นได้เลย",
      buildingType: "ตัวอย่าง",
      createdById: userId,
      specItems: {
        create: STARTER_LINES.map((l, i) => ({ ...l, sortOrder: i })),
      },
    },
    select: { id: true, specItems: { select: { id: true, category: true } } },
  });
  for (const item of project.specItems) {
    const materials = await prisma.material.findMany({
      where: { status: "published", category: item.category ?? "" },
      orderBy: [{ completeness: "desc" }, { nameTh: "asc" }],
      select: { id: true },
      take: 2,
    });
    if (materials.length > 0) {
      await prisma.specOption.createMany({
        data: materials.map((m) => ({ specItemId: item.id, materialId: m.id })),
        skipDuplicates: true,
      });
    }
  }
}

export type CreateAccountResult =
  | { ok: true; user: { id: string; email: string; name: string | null } }
  | { ok: false; error: "email_taken" };

// Create a user + their first organization + an owner membership atomically.
// Shared by the /api/auth/register route and the register server action.
export async function createAccount(
  input: RegisterInput,
): Promise<CreateAccountResult> {
  const passwordHash = await bcrypt.hash(input.password, 12);

  try {
    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        termsAcceptedAt: new Date(),
        memberships: {
          create: {
            role: "owner",
            org: { create: { name: input.orgName, type: input.role } },
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        memberships: { select: { orgId: true } },
      },
    });
    await track(input.role === "designer" ? EVENTS.signupDesigner : EVENTS.signupSeller, {
      userId: user.id,
      orgId: user.memberships[0]?.orgId ?? null,
    });
    // Onboarding: a designer's first minute should show the tool WORKING, not
    // an empty workspace — seed a small sample project (fire-safe).
    if (input.role === "designer" && user.memberships[0]?.orgId) {
      try {
        await createStarterProject(user.memberships[0].orgId, user.id);
      } catch (e) {
        console.error("starter project failed", e);
      }
    }
    return { ok: true, user: { id: user.id, email: user.email, name: user.name } };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { ok: false, error: "email_taken" };
    }
    throw err;
  }
}
