"use client";

import { useEffect, useRef, useState } from "react";

import { RunDetailHeader } from "@/components/app/runs/run-detail-header";
import { RunPropertyResultsTable } from "@/components/app/runs/run-property-results-table";
import { RunStepTimeline } from "@/components/app/runs/run-step-timeline";
import { DEFAULT_RUN_POLL_AFTER_MS } from "@/contracts/runs/polling";
import {
  getRunDetailResponseSchema,
  type GetRunDetailResponse,
} from "@/contracts/runs/responses";
import { apiClientGet } from "@/lib/api/browser-client";

/**
 * @see Story 8.2.4 — Add run status polling
 * @see Story 8.3.1 — Build property results table
 */

type RunDetailViewProps = {
  runId: string;
  initialRun: GetRunDetailResponse;
};

function isActiveRunStatus(status: GetRunDetailResponse["status"]): boolean {
  return status === "pending" || status === "running";
}

function buildRunDetailPath(runId: string): string {
  const params = new URLSearchParams({
    includeStepDetails: "true",
  });

  return `/api/v1/runs/${encodeURIComponent(runId)}?${params.toString()}`;
}

export function RunDetailView({ runId, initialRun }: RunDetailViewProps) {
  const [run, setRun] = useState(initialRun);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pollError, setPollError] = useState(false);
  const inFlightRef = useRef(false);
  const shouldPoll = isActiveRunStatus(run.status);

  useEffect(() => {
    if (!shouldPoll) {
      return;
    }

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function poll() {
      if (cancelled || inFlightRef.current) {
        return;
      }

      if (document.visibilityState === "hidden") {
        return;
      }

      inFlightRef.current = true;
      setIsRefreshing(true);

      const result = await apiClientGet(buildRunDetailPath(runId), {
        schema: getRunDetailResponseSchema,
      });

      if (cancelled) {
        return;
      }

      inFlightRef.current = false;
      setIsRefreshing(false);

      if (result.ok) {
        setPollError(false);
        setRun(result.data);
        return;
      }

      setPollError(true);
    }

    function startInterval() {
      if (intervalId) {
        clearInterval(intervalId);
      }

      intervalId = setInterval(() => {
        void poll();
      }, DEFAULT_RUN_POLL_AFTER_MS);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }

        return;
      }

      void poll();
      startInterval();
    }

    void poll();
    startInterval();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      inFlightRef.current = false;

      if (intervalId) {
        clearInterval(intervalId);
      }

      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [runId, shouldPoll]);

  return (
    <>
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
        pollState={
          shouldPoll
            ? pollError
              ? "error"
              : isRefreshing
                ? "refreshing"
                : null
            : null
        }
      />
      <RunPropertyResultsTable
        propertyResults={run.propertyResults}
        runStatus={run.status}
      />
      <RunStepTimeline steps={run.steps} />
    </>
  );
}
