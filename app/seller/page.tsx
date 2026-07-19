import { auth } from "@/auth";
import { WorkspaceHome } from "@/components/WorkspaceHome";

export default async function SellerDashboard() {
  const session = await auth();
  return (
    <WorkspaceHome side="seller" memberships={session?.user?.memberships ?? []} />
  );
}
