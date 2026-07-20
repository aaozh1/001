import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/health — for uptime monitors (Phase 4.3). Unauthenticated by
// design; returns liveness + DB reachability and nothing sensitive.
export async function GET() {
  let db = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch {
    // db stays false — the 503 below is the signal.
  }
  return NextResponse.json(
    { ok: db, db, time: new Date().toISOString() },
    { status: db ? 200 : 503 },
  );
}
