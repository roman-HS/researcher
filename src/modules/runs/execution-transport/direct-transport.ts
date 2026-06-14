import "server-only";

import {
  parseExecutionTransportStartPayload,
  type ExecutionTransport,
} from "@/contracts/runs/execution-transport";

import { enqueueWorkflowRunExecution } from "./enqueue-workflow-run-execution";

export const DIRECT_EXECUTION_TRANSPORT_NAME = "direct" as const;

export function createDirectExecutionTransport(): ExecutionTransport {
  return {
    name: DIRECT_EXECUTION_TRANSPORT_NAME,
    async startRun(payload) {
      const { runId } = parseExecutionTransportStartPayload(payload);

      queueMicrotask(() => {
        void enqueueWorkflowRunExecution(runId);
      });
    },
  };
}
