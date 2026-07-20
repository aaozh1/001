import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { jsonError } from "@/lib/http";
import { listNotifications } from "@/lib/notifications/service";

// GET /api/notifications — the bell's data: latest items + unread count.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return jsonError("unauthorized", "Login required", 401);
  const data = await listNotifications(session.user.id);
  return NextResponse.json(data);
}
