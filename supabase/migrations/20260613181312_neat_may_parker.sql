CREATE TYPE "public"."workflow_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "workflow_status" DEFAULT 'active' NOT NULL,
	"createdByUserId" uuid NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"archivedAt" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_createdByUserId_user_id_fk" FOREIGN KEY ("createdByUserId") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workflows_workspace_id_status_idx" ON "workflows" USING btree ("workspaceId","status");--> statement-breakpoint
CREATE UNIQUE INDEX "workflows_workspace_name_active_unique" ON "workflows" USING btree ("workspaceId","name") WHERE "workflows"."status" = 'active';