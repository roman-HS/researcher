"use client";

import { LayoutList, Play, Settings, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SignOutButton } from "@/components/app/auth/sign-out-button";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navItems: {
  title: string;
  href: string;
  icon: LucideIcon;
}[] = [
  { title: "Workflows", href: "/workflows", icon: LayoutList },
  { title: "Runs", href: "/runs", icon: Play },
  { title: "Settings", href: "/settings", icon: Settings },
];

type AppShellProps = {
  children: React.ReactNode;
  userLabel: string;
  workspaceName: string;
};

export function AppShell({
  children,
  userLabel,
  workspaceName,
}: AppShellProps) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar collapsible="offcanvas">
        <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
          <span className="text-sm font-semibold tracking-tight">
            Researcher
          </span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Product</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      tooltip={item.title}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SignOutButton />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex max-h-svh min-h-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
          <SidebarTrigger />
          <div className="flex flex-1 items-center justify-end gap-4 text-sm text-muted-foreground">
            <span>{workspaceName}</span>
            <Separator orientation="vertical" className="h-4" />
            <span>{userLabel}</span>
          </div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
