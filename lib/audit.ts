import "server-only";
import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";

// Append-only audit trail. ARCHITECTURE decision #4: every mutation that touches
// price / RFQ status / spec must be logged ("ใครเปลี่ยนสเปกตัวนี้"). Project
// mutations qualify since they own the spec schedule.
export interface AuditEntry {
  orgId?: string | null;
  userId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  diff?: Prisma.InputJsonValue;
}

// Accepts a transaction client so the log commits atomically with the mutation.
type Db = PrismaClient | Prisma.TransactionClient;

export function writeAudit(db: Db, entry: AuditEntry) {
  return db.auditLog.create({
    data: {
      orgId: entry.orgId ?? null,
      userId: entry.userId ?? null,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      diff: entry.diff ?? Prisma.JsonNull,
    },
  });
}

export function auditWithPrisma(entry: AuditEntry) {
  return writeAudit(prisma, entry);
}
