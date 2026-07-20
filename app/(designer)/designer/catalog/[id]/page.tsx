import { auth } from "@/auth";
import { canManageProjects } from "@/lib/permissions";
import { getDesignerContext } from "@/lib/projects/service";
import { MaterialDetailView } from "@/app/_components/material-detail-view";
import { AddToProjectButton } from "../_components/add-to-project-button";

type Props = { params: Promise<{ id: string }> };

export default async function MaterialDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  const ctx = session?.user?.id ? await getDesignerContext(session.user.id) : null;
  const canManage = !!ctx && canManageProjects(ctx.role);

  return (
    <MaterialDetailView
      id={id}
      basePath="/designer/catalog"
      canManage={canManage}
      actionSlot={
        canManage ? <AddToProjectButton materialId={id} variant="primary" size="md" /> : null
      }
    />
  );
}
