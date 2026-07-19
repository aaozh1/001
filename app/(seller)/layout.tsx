import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { WorkspaceShell } from "../_components/workspace-shell";
import {
  canAccessWorkspace,
  defaultWorkspace,
  workspacePath,
} from "@/lib/permissions";

// Authorization gate for the seller workspace (mirrors the designer layout).
export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/seller");

  if (!canAccessWorkspace(session.user.roles, "seller")) {
    const fallback = defaultWorkspace(session.user.roles);
    redirect(fallback ? workspacePath(fallback) : "/login");
  }

  return <WorkspaceShell workspace="seller">{children}</WorkspaceShell>;
}
