import { relations, sql } from "drizzle-orm";
import { index, pgEnum, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { workflowRuns } from "./run";
import { workflows } from "./workflow";
import {
  entityIdColumn,
  foreignEntityIdColumn,
  standardTimestampColumns,
} from "./helpers/columns";

export const workspaceKindEnum = pgEnum("workspace_kind", ["personal", "team"]);

export const workspaceMemberRoleEnum = pgEnum("workspace_member_role", [
  "owner",
  "member",
]);

export const workspaces = pgTable(
  "workspaces",
  {
    id: entityIdColumn(),
    name: text("name").notNull(),
    kind: workspaceKindEnum("kind").notNull().default("personal"),
    /**
     * Set only for `personal` workspaces. Enforces at most one personal
     * workspace per user at the database layer (Story 2.3.2 provisioning).
     */
    personalOwnerUserId: uuid("personalOwnerUserId").references(() => user.id, {
      onDelete: "cascade",
    }),
    ...standardTimestampColumns,
  },
  (table) => [
    uniqueIndex("workspaces_personal_owner_user_id_unique")
      .on(table.personalOwnerUserId)
      .where(sql`${table.kind} = 'personal'`),
  ],
);

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: entityIdColumn(),
    workspaceId: foreignEntityIdColumn("workspaceId")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: foreignEntityIdColumn("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: workspaceMemberRoleEnum("role").notNull(),
    ...standardTimestampColumns,
  },
  (table) => [
    uniqueIndex("workspace_members_workspace_user_unique").on(
      table.workspaceId,
      table.userId,
    ),
    index("workspace_members_user_id_idx").on(table.userId),
    index("workspace_members_workspace_id_idx").on(table.workspaceId),
  ],
);

export const workspacesRelations = relations(workspaces, ({ many, one }) => ({
  members: many(workspaceMembers),
  workflows: many(workflows),
  runs: many(workflowRuns),
  personalOwner: one(user, {
    fields: [workspaces.personalOwnerUserId],
    references: [user.id],
  }),
}));

export const workspaceMembersRelations = relations(
  workspaceMembers,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceMembers.workspaceId],
      references: [workspaces.id],
    }),
    user: one(user, {
      fields: [workspaceMembers.userId],
      references: [user.id],
    }),
  }),
);
