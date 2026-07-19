import "server-only";
import { auth } from "@/auth";
import { canManageProjects } from "@/lib/permissions";
import { getDesignerContext, type DesignerContext } from "./service";

// Shared by project + spec server actions: resolve the caller as a
// project-managing designer (owner/editor) or throw. The UI hides mutating
// controls from viewers; this is the server-side backstop.
export async function managerContextOrThrow(): Promise<DesignerContext> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("unauthorized");
  const ctx = await getDesignerContext(session.user.id);
  if (!ctx || !canManageProjects(ctx.role)) throw new Error("forbidden");
  return ctx;
}
