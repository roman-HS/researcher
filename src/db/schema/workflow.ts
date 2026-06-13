import { relations, sql } from "drizzle-orm";
import { index, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "./auth";
import {
  entityIdColumn,
  foreignEntityIdColumn,
  standardArchiveColumn,
  standardTimestampColumns,
} from "./helpers/columns";
import { createStatusEnum } from "./helpers/enums";
import { workspaces } from "./workspace";

export const workflowStatusEnum = createStatusEnum("workflow_status", [
  "active",
  "archived",
]);

export const workflows = pgTable(
  "workflows",
  {
    id: entityIdColumn(),
    workspaceId: foreignEntityIdColumn("workspaceId")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    status: workflowStatusEnum("status").notNull().default("active"),
    createdByUserId: foreignEntityIdColumn("createdByUserId")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    ...standardTimestampColumns,
    ...standardArchiveColumn,
  },
  (table) => [
    index("workflows_workspace_id_status_idx").on(
      table.workspaceId,
      table.status,
    ),
    uniqueIndex("workflows_workspace_name_active_unique")
      .on(table.workspaceId, table.name)
      .where(sql`${table.status} = 'active'`),
  ],
);

export const workflowsRelations = relations(workflows, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workflows.workspaceId],
    references: [workspaces.id],
  }),
  createdBy: one(user, {
    fields: [workflows.createdByUserId],
    references: [user.id],
  }),
}));
