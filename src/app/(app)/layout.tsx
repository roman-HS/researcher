import { AppShell } from "@/components/app";
import { appContextPlaceholder } from "@/modules/app-context";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  void appContextPlaceholder;

  return <AppShell>{children}</AppShell>;
}
