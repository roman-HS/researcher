import { redirect } from "next/navigation";

import { AppShell, WorkspaceProvisioningError } from "@/components/app";
import { appContextPlaceholder } from "@/modules/app-context";
import { formatUserLabel, getCurrentSession } from "@/modules/auth/session";
import { requireCurrentWorkspace } from "@/modules/workspace";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  void appContextPlaceholder;

  const session = await getCurrentSession();

  if (!session) {
    redirect("/sign-in");
  }

  let workspace;

  try {
    workspace = await requireCurrentWorkspace();
  } catch {
    return <WorkspaceProvisioningError />;
  }

  return (
    <AppShell
      userLabel={formatUserLabel(session.user)}
      workspaceName={workspace.name}
    >
      {children}
    </AppShell>
  );
}
