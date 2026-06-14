"use client";

import { RunStepTimelineRow } from "@/components/app/runs/run-step-timeline-row";
import type { RunDetailStepTimelineItem } from "@/contracts/runs/responses";

/**
 * @see Story 8.2.3 — Build run step timeline
 */

type RunStepTimelineProps = {
  steps: RunDetailStepTimelineItem[];
};

export function RunStepTimeline({ steps }: RunStepTimelineProps) {
  if (steps.length === 0) {
    return (
      <section className="space-y-3 border-t pt-6">
        <h2 className="text-sm font-medium">Execution timeline</h2>
        <p className="text-sm text-muted-foreground">
          No steps are defined for this workflow version.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4 border-t pt-6">
      <div>
        <h2 className="text-sm font-medium">Execution timeline</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Step-by-step progress in workflow execution order.
        </p>
      </div>

      <ol className="space-y-3">
        {steps.map((step, index) => (
          <li key={step.stepNodeId}>
            <RunStepTimelineRow step={step} stepNumber={index + 1} />
          </li>
        ))}
      </ol>
    </section>
  );
}
