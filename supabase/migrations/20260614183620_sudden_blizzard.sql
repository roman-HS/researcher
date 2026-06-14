CREATE TYPE "public"."area_grouping_level" AS ENUM('zip', 'city', 'other');--> statement-breakpoint
CREATE TYPE "public"."workflow_run_status" AS ENUM('pending', 'running', 'succeeded', 'partial', 'failed', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."workflow_run_step_status" AS ENUM('pending', 'running', 'succeeded', 'failed', 'skipped');--> statement-breakpoint
CREATE TABLE "run_area_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"runId" uuid NOT NULL,
	"areaKey" text NOT NULL,
	"groupingLevel" "area_grouping_level" NOT NULL,
	"propertyCount" integer NOT NULL,
	"rank" integer,
	"meetsMinimumSample" boolean NOT NULL,
	"aggregatesJson" jsonb NOT NULL,
	"warningsJson" jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "run_idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"idempotencyKey" text NOT NULL,
	"requestHash" text NOT NULL,
	"runId" uuid NOT NULL,
	"expiresAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "run_property_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"runId" uuid NOT NULL,
	"propertyKey" text NOT NULL,
	"displayOrder" integer NOT NULL,
	"totalScore" numeric(5, 2),
	"listPriceCents" bigint,
	"capRate" numeric(8, 4),
	"monthlyCashFlow" numeric(14, 2),
	"addressSummaryJson" jsonb,
	"listingJson" jsonb,
	"detailJson" jsonb,
	"metricsJson" jsonb,
	"scoreJson" jsonb,
	"warningsJson" jsonb,
	"errorsJson" jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_run_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"runId" uuid NOT NULL,
	"stepNodeId" text NOT NULL,
	"toolKey" text NOT NULL,
	"status" "workflow_run_step_status" DEFAULT 'pending' NOT NULL,
	"inputJson" jsonb,
	"outputJson" jsonb,
	"warningsJson" jsonb,
	"errorJson" jsonb,
	"startedAt" timestamp with time zone,
	"completedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"workflowId" uuid NOT NULL,
	"workflowVersionId" uuid NOT NULL,
	"createdByUserId" uuid NOT NULL,
	"status" "workflow_run_status" DEFAULT 'pending' NOT NULL,
	"inputJson" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"outputSummaryJson" jsonb,
	"errorJson" jsonb,
	"startedAt" timestamp with time zone,
	"completedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "run_area_results" ADD CONSTRAINT "run_area_results_runId_workflow_runs_id_fk" FOREIGN KEY ("runId") REFERENCES "public"."workflow_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_idempotency_keys" ADD CONSTRAINT "run_idempotency_keys_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_idempotency_keys" ADD CONSTRAINT "run_idempotency_keys_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_idempotency_keys" ADD CONSTRAINT "run_idempotency_keys_runId_workflow_runs_id_fk" FOREIGN KEY ("runId") REFERENCES "public"."workflow_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_property_results" ADD CONSTRAINT "run_property_results_runId_workflow_runs_id_fk" FOREIGN KEY ("runId") REFERENCES "public"."workflow_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_run_steps" ADD CONSTRAINT "workflow_run_steps_runId_workflow_runs_id_fk" FOREIGN KEY ("runId") REFERENCES "public"."workflow_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workflowId_workflows_id_fk" FOREIGN KEY ("workflowId") REFERENCES "public"."workflows"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workflowVersionId_workflow_versions_id_fk" FOREIGN KEY ("workflowVersionId") REFERENCES "public"."workflow_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_createdByUserId_user_id_fk" FOREIGN KEY ("createdByUserId") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "run_area_results_run_id_idx" ON "run_area_results" USING btree ("runId");--> statement-breakpoint
CREATE INDEX "run_area_results_run_id_rank_idx" ON "run_area_results" USING btree ("runId","rank");--> statement-breakpoint
CREATE UNIQUE INDEX "run_idempotency_keys_workspace_user_key_unique" ON "run_idempotency_keys" USING btree ("workspaceId","userId","idempotencyKey");--> statement-breakpoint
CREATE INDEX "run_idempotency_keys_run_id_idx" ON "run_idempotency_keys" USING btree ("runId");--> statement-breakpoint
CREATE INDEX "run_property_results_run_id_idx" ON "run_property_results" USING btree ("runId");--> statement-breakpoint
CREATE INDEX "run_property_results_run_id_display_order_idx" ON "run_property_results" USING btree ("runId","displayOrder");--> statement-breakpoint
CREATE INDEX "run_property_results_run_id_total_score_idx" ON "run_property_results" USING btree ("runId","totalScore");--> statement-breakpoint
CREATE INDEX "workflow_run_steps_run_id_idx" ON "workflow_run_steps" USING btree ("runId");--> statement-breakpoint
CREATE INDEX "workflow_run_steps_run_id_status_idx" ON "workflow_run_steps" USING btree ("runId","status");--> statement-breakpoint
CREATE INDEX "workflow_runs_workspace_id_idx" ON "workflow_runs" USING btree ("workspaceId");--> statement-breakpoint
CREATE INDEX "workflow_runs_workflow_id_idx" ON "workflow_runs" USING btree ("workflowId");--> statement-breakpoint
CREATE INDEX "workflow_runs_status_idx" ON "workflow_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "workflow_runs_created_at_idx" ON "workflow_runs" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "workflow_runs_workspace_id_status_created_at_idx" ON "workflow_runs" USING btree ("workspaceId","status","createdAt");