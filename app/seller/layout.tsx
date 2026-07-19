import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";

// Seller center shell. Route protection is enforced in middleware.
export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const t = await getTranslations("nav");

  return (
    <div className="min-h-screen bg-canvas">
      <WorkspaceHeader
        title={t("sellerCenter")}
        userName={session?.user?.name ?? session?.user?.email}
      />
      {children}
    </div>
  );
}
