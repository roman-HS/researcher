import "server-only";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import {
  workspaceMembers,
  workspaces,
  type workspaces as workspacesTable,
} from "@/db/schema/workspace";

import { PERSONAL_WORKSPACE_NAME } from "./constants";

export type CurrentWorkspace = typeof workspacesTable.$inferSelect;

function requireWorkspaceId(workspace: CurrentWorkspace): string {
  if (!workspace.id) {
    throw new Error("Workspace is missing an id.");
  }

  return workspace.id;
}

function isPostgresUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

async function findPersonalWorkspace(
  userId: string,
): Promise<CurrentWorkspace | undefined> {
  const db = getDb();

  return db.query.workspaces.findFirst({
    where: and(
      eq(workspaces.kind, "personal"),
      eq(workspaces.personalOwnerUserId, userId),
    ),
  });
}

async function ensureOwnerMembership(
  workspaceId: string,
  userId: string,
): Promise<void> {
  const db = getDb();

  const existing = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, userId),
    ),
  });

  if (existing) {
    return;
  }

  try {
    await db.insert(workspaceMembers).values({
      workspaceId,
      userId,
      role: "owner",
    });
  } catch (error) {
    if (!isPostgresUniqueViolation(error)) {
      throw error;
    }
  }
}

async function createPersonalWorkspace(
  userId: string,
): Promise<CurrentWorkspace> {
  const db = getDb();

  return db.transaction(async (tx) => {
    const [workspace] = await tx
      .insert(workspaces)
      .values({
        name: PERSONAL_WORKSPACE_NAME,
        kind: "personal",
        personalOwnerUserId: userId,
      })
      .returning();

    if (!workspace) {
      throw new Error("Failed to create personal workspace.");
    }

    await tx.insert(workspaceMembers).values({
      workspaceId: requireWorkspaceId(workspace),
      userId,
      role: "owner",
    });

    return workspace;
  });
}

/**
 * Idempotently ensures the user has a personal workspace and owner membership.
 */
export async function ensurePersonalWorkspace(
  userId: string,
): Promise<CurrentWorkspace> {
  const existing = await findPersonalWorkspace(userId);

  if (existing) {
    await ensureOwnerMembership(requireWorkspaceId(existing), userId);
    return existing;
  }

  try {
    return await createPersonalWorkspace(userId);
  } catch (error) {
    if (!isPostgresUniqueViolation(error)) {
      throw error;
    }

    const workspace = await findPersonalWorkspace(userId);

    if (!workspace) {
      throw new Error(
        "Personal workspace provisioning conflict could not be resolved.",
      );
    }

    await ensureOwnerMembership(requireWorkspaceId(workspace), userId);
    return workspace;
  }
}
