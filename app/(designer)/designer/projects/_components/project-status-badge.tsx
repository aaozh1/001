import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui";
import { projectStatusVariant, type ProjectStatus } from "@/lib/projects/status";

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const t = useTranslations("projects.status");
  return <Badge variant={projectStatusVariant(status)}>{t(status)}</Badge>;
}
