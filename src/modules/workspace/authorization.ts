import "server-only";

import { and, eq } from "drizzle-orm";
import { cache } from "react";

import { getDb } from "@/db";
import {
  workspaceMembers,
  workspaces,
  type workspaceMembers as workspaceMembersTable,
} from "@/db/schema/workspace";
import { requireUser, type CurrentUser } from "@/modules/auth/session";

import { requireCurrentWorkspace, type CurrentWorkspace } from "./context";
import { ForbiddenError } from "./errors";

export type WorkspaceMembership = typeof workspaceMembersTable.$inferSelect;

export type WorkspaceAuthorizationContext = {
  user: CurrentUser;
  workspace: CurrentWorkspace;
  membership: WorkspaceMembership;
};

async function loadWorkspaceMembership(
  workspaceId: string,
  userId: string,
): Promise<WorkspaceMembership | undefined> {
  const db = getDb();

  return db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, userId),
    ),
  });
}

async function resolveWorkspace(
  workspaceId?: string,
): Promise<CurrentWorkspace | undefined> {
  if (!workspaceId) {
    return requireCurrentWorkspace();
  }

  const db = getDb();

  return db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
  });
}

async function requireWorkspaceMemberImpl(
  workspaceId?: string,
): Promise<WorkspaceAuthorizationContext> {
  const user = await requireUser();
  const workspace = await resolveWorkspace(workspaceId);

  if (!workspace?.id) {
    throw new ForbiddenError();
  }

  const membership = await loadWorkspaceMembership(workspace.id, user.id);

  if (!membership) {
    throw new ForbiddenError();
  }

  return { user, workspace, membership };
}

export const requireWorkspaceMember = cache(requireWorkspaceMemberImpl);

export async function requireWorkspaceOwner(
  workspaceId?: string,
): Promise<WorkspaceAuthorizationContext> {
  const context = await requireWorkspaceMember(workspaceId);

  if (context.membership.role !== "owner") {
    throw new ForbiddenError();
  }

  return context;
}
