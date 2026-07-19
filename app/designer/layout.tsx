import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";

// Designer workspace shell. Route protection is enforced in middleware; this
// layout renders the authenticated chrome.
export default async function DesignerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const t = await getTranslations("nav");

  return (
    <div className="min-h-screen bg-canvas">
      <WorkspaceHeader
        title={t("designerWorkspace")}
        userName={session?.user?.name ?? session?.user?.email}
      />
      {children}
    </div>
  );
}
