CREATE TYPE "public"."workflow_version_state" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "workflow_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflowId" uuid NOT NULL,
	"versionNumber" integer NOT NULL,
	"state" "workflow_version_state" DEFAULT 'draft' NOT NULL,
	"definitionJson" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"compiledPlanJson" jsonb,
	"publishedAt" timestamp with time zone,
	"createdByUserId" uuid NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workflow_versions" ADD CONSTRAINT "workflow_versions_workflowId_workflows_id_fk" FOREIGN KEY ("workflowId") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_versions" ADD CONSTRAINT "workflow_versions_createdByUserId_user_id_fk" FOREIGN KEY ("createdByUserId") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_versions_workflow_id_version_number_unique" ON "workflow_versions" USING btree ("workflowId","versionNumber");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_versions_workflow_id_draft_unique" ON "workflow_versions" USING btree ("workflowId") WHERE "workflow_versions"."state" = 'draft';--> statement-breakpoint
CREATE INDEX "workflow_versions_workflow_id_state_idx" ON "workflow_versions" USING btree ("workflowId","state");