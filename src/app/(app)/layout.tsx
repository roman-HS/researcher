import { redirect } from "next/navigation";

import { AppShell } from "@/components/app";
import { appContextPlaceholder } from "@/modules/app-context";
import { getCurrentSession } from "@/modules/auth/session";

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

  return <AppShell>{children}</AppShell>;
}
