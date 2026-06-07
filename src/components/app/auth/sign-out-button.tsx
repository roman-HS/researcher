"use client";

import { LogOut } from "lucide-react";
import { useFormStatus } from "react-dom";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { signOutAction } from "@/modules/auth/actions";

function SignOutSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <SidebarMenuButton type="submit" disabled={pending} tooltip="Sign out">
      <LogOut />
      <span>{pending ? "Signing out…" : "Sign out"}</span>
    </SidebarMenuButton>
  );
}

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <SidebarMenu>
        <SidebarMenuItem>
          <SignOutSubmitButton />
        </SidebarMenuItem>
      </SidebarMenu>
    </form>
  );
}
