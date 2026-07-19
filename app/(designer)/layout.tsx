import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { WorkspaceShell } from "../_components/workspace-shell";
import {
  canAccessWorkspace,
  defaultWorkspace,
  workspacePath,
} from "@/lib/permissions";

// Authorization gate for the designer workspace. Middleware already guarantees
// a logged-in user on /designer/*; here we check the user actually has the
// designer role and, if not, send them to whichever workspace they can enter.
export default async function DesignerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/designer");

  if (!canAccessWorkspace(session.user.roles, "designer")) {
    const fallback = defaultWorkspace(session.user.roles);
    redirect(fallback ? workspacePath(fallback) : "/login");
  }

  return <WorkspaceShell workspace="designer">{children}</WorkspaceShell>;
}
