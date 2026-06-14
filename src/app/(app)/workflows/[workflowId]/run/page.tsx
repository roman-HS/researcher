import Link from "next/link";
import { notFound } from "next/navigation";

import { WorkflowRunForm } from "@/components/app/workflows/workflow-run-form";
import { WorkflowRunUnavailable } from "@/components/app/workflows/workflow-run-unavailable";
import { domainEntityIdSchema } from "@/contracts/domain/primitives";
import { isAppError } from "@/lib/api/errors";
import {
  getWorkflowRunFormContext,
  isWorkflowLifecycleError,
  type WorkflowRunFormContext,
} from "@/modules/workflows";
import { requireCurrentWorkspace } from "@/modules/workspace";

type WorkflowRunPageProps = {
  params: Promise<{ workflowId: string }>;
};

type WorkflowRunPageState =
  | { kind: "ready"; context: WorkflowRunFormContext }
  | { kind: "archived" }
  | { kind: "no_published_version" };

export default async function WorkflowRunPage({ params }: WorkflowRunPageProps) {
  const { workflowId } = await params;
  const parsedWorkflowId = domainEntityIdSchema.safeParse(workflowId);

  if (!parsedWorkflowId.success) {
    notFound();
  }

  const workspace = await requireCurrentWorkspace();
  let pageState: WorkflowRunPageState;

  try {
    const context = await getWorkflowRunFormContext(
      { workflowId: parsedWorkflowId.data },
      { workspace },
    );

    pageState = { kind: "ready", context };
  } catch (error) {
    if (isAppError(error) && error.code === "not_found") {
      notFound();
    }

    if (isWorkflowLifecycleError(error) && error.code === "workflow_archived") {
      pageState = { kind: "archived" };
    } else if (isAppError(error) && error.code === "conflict") {
      pageState = { kind: "no_published_version" };
    } else {
      throw error;
    }
  }

  if (pageState.kind === "archived") {
    return (
      <WorkflowRunUnavailable
        workflowId={parsedWorkflowId.data}
        title="Workflow is archived"
        description="Archived workflows cannot be run. Duplicate the workflow or restore it before starting a new run."
      />
    );
  }

  if (pageState.kind === "no_published_version") {
    return (
      <WorkflowRunUnavailable
        workflowId={parsedWorkflowId.data}
        title="Publish before running"
        description="This workflow has no published version yet. Open the builder, save your draft, and publish before starting a run."
      />
    );
  }

  const { context } = pageState;

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 p-4 md:p-6">
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">
          <Link href="/workflows" className="hover:text-foreground">
            Workflows
          </Link>
          {" / "}
          <Link
            href={`/workflows/${context.workflowId}`}
            className="hover:text-foreground"
          >
            {context.workflowName}
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Run workflow
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Published version v{context.publishedVersionNumber}
          {context.workflowDescription
            ? ` · ${context.workflowDescription}`
            : null}
        </p>
      </div>

      <WorkflowRunForm
        workflowId={context.workflowId}
        workflowName={context.workflowName}
        runtimeInputs={context.runtimeInputs}
      />
    </div>
  );
}
