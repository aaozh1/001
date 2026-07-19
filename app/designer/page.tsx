import { auth } from "@/auth";
import { WorkspaceHome } from "@/components/WorkspaceHome";

export default async function DesignerDashboard() {
  const session = await auth();
  return (
    <WorkspaceHome side="designer" memberships={session?.user?.memberships ?? []} />
  );
}
