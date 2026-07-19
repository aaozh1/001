import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { defaultWorkspacePath } from "@/lib/permissions/access";

// Post-login dispatcher: sends the user to the correct workspace for their
// memberships (designer preferred, then seller).
export default async function HomeRedirect() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  redirect(defaultWorkspacePath(session.user.memberships));
}
