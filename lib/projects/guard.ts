import "server-only";
import { auth } from "@/auth";
import { canManageProjects } from "@/lib/permissions";
import { jsonError } from "@/lib/http";
import { getDesignerContext, type DesignerContext } from "./service";

type GuardResult =
  | { ok: true; ctx: DesignerContext }
  | { ok: false; response: ReturnType<typeof jsonError> };

/**
 * Resolve the caller's designer context for project routes.
 *  - not logged in                      → 401
 *  - logged in but not a designer       → 403
 *  - manage=true and role is viewer     → 403 (read-only members can't mutate)
 */
export async function requireDesigner(
  opts: { manage?: boolean } = {},
): Promise<GuardResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, response: jsonError("unauthorized", "Login required", 401) };
  }

  const ctx = await getDesignerContext(session.user.id);
  if (!ctx) {
    return {
      ok: false,
      response: jsonError("forbidden", "No designer workspace", 403),
    };
  }

  if (opts.manage && !canManageProjects(ctx.role)) {
    return {
      ok: false,
      response: jsonError("forbidden", "Insufficient role", 403),
    };
  }

  return { ok: true, ctx };
}
