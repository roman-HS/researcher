import { notFound } from "next/navigation";

import { RunDetailView } from "@/components/app/runs/run-detail-view";
import { domainEntityIdSchema } from "@/contracts/domain/primitives";
import type { GetRunDetailResponse } from "@/contracts/runs/responses";
import { isAppError } from "@/lib/api/errors";
import { getRun } from "@/modules/runs";
import { requireCurrentWorkspace } from "@/modules/workspace";

/**
 * @see Story 8.2.2 — Build run detail header
 * @see Story 8.2.3 — Build run step timeline
 * @see Story 8.2.4 — Add run status polling
 * @see Story 8.3.1 — Build property results table
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
      <RunDetailView runId={parsedRunId.data} initialRun={run} />
    </div>
  );
}
