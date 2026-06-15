"use client";

import { RotateCcwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { ToolExecutorRuntimeInputValues } from "@/contracts/runs/executors";
import {
  isTerminalRunStatus,
  type WorkflowRunStatus,
} from "@/contracts/runs/lifecycle";
import { createRunResponseSchema } from "@/contracts/runs/responses";
import { apiClientPost } from "@/lib/api/browser-client";

/**
 * @see Story 8.4.1 — Add rerun with same inputs
 */

type RunRerunButtonProps = {
  runId: string;
  workflowId: string;
  status: WorkflowRunStatus;
  inputValues: ToolExecutorRuntimeInputValues;
};

export function RunRerunButton({
  runId,
  workflowId,
  status,
  inputValues,
}: RunRerunButtonProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isTerminalRunStatus(status)) {
    return null;
  }

  function handleRerun() {
    setErrorMessage(null);

    startTransition(async () => {
      const result = await apiClientPost(
        "/api/v1/runs",
        {
          workflowId,
          inputs: inputValues,
          sourceRunId: runId,
        },
        {
          headers: {
            "Idempotency-Key": crypto.randomUUID(),
          },
          schema: createRunResponseSchema,
        },
      );

      if (!result.ok) {
        setErrorMessage(result.error.message);
        return;
      }

      router.push(`/runs/${result.data.runId}`);
    });
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={handleRerun}
      >
        <RotateCcwIcon data-icon="inline-start" />
        {isPending ? "Starting rerun…" : "Rerun with same inputs"}
      </Button>
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
