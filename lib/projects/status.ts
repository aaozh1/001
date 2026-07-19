import type { BadgeVariant } from "@/lib/spec/status";

// Project lifecycle status (docs/DATA_MODEL Project.status). Stored (unlike the
// derived SpecItem status). This module owns its → badge-variant mapping so the
// UI stays consistent and testable.
export const PROJECT_STATUSES = [
  "active",
  "waiting_client",
  "delivered",
  "archived",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

const STATUS_VARIANT: Record<ProjectStatus, BadgeVariant> = {
  active: "info",
  waiting_client: "warn",
  delivered: "ok",
  archived: "neutral",
};

export function projectStatusVariant(status: ProjectStatus): BadgeVariant {
  return STATUS_VARIANT[status];
}

export function isProjectStatus(value: unknown): value is ProjectStatus {
  return (
    typeof value === "string" &&
    (PROJECT_STATUSES as readonly string[]).includes(value)
  );
}
