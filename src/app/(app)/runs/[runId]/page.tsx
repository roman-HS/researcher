import { notFound } from "next/navigation";

import { RunDetailHeader } from "@/components/app/runs/run-detail-header";
import { RunStepTimeline } from "@/components/app/runs/run-step-timeline";
import { domainEntityIdSchema } from "@/contracts/domain/primitives";
import type { GetRunDetailResponse } from "@/contracts/runs/responses";
import { isAppError } from "@/lib/api/errors";
import { getRun } from "@/modules/runs";
import { requireCurrentWorkspace } from "@/modules/workspace";

/**
 * @see Story 8.2.2 — Build run detail header
 * @see Story 8.2.3 — Build run step timeline
 */

type RunDetailPageProps = {
  params: Promise<{ runId: string }>;
};

async function loadRunDetail(runId: string): Promise<GetRunDetailResponse> {
  const workspace = await requireCurrentWorkspace();

  try {
    return await getRun(runId, { includeStepDetails: true }, { workspace });
  } catch (error) {
    if (isAppError(error) && error.code === "not_found") {
      notFound();
    }

    throw error;
  }
}

export default async function RunDetailPage({ params }: RunDetailPageProps) {
  const { runId } = await params;
  const parsedRunId = domainEntityIdSchema.safeParse(runId);

  if (!parsedRunId.success) {
    notFound();
  }

  const run = await loadRunDetail(parsedRunId.data);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto p-4 md:p-6">
      <RunDetailHeader
        status={run.status}
        workflowId={run.workflowId}
        workflowName={run.workflowName}
        workflowVersionNumber={run.workflowVersionNumber}
        startedAt={run.startedAt}
        completedAt={run.completedAt}
        runtimeInputs={run.runtimeInputs}
        inputValues={run.inputValues}
        error={run.error}
        counts={run.counts}
      />
      <RunStepTimeline steps={run.steps} />
    </div>
  );
}
