import { redirect } from "next/navigation";

import { getCurrentSession } from "@/modules/auth/session";

export default async function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCurrentSession();

  if (session) {
    redirect("/workflows");
  }

  return children;
}
