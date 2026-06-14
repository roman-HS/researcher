import "server-only";

import {
  parseExecutionTransportStartPayload,
  type ExecutionTransport,
} from "@/contracts/runs/execution-transport";
import { ExecutionTransportStartError } from "@/modules/runs/errors";

export const VERCEL_WORKFLOWS_EXECUTION_TRANSPORT_NAME = "vercel_workflows" as const;

export function createVercelWorkflowsExecutionTransportPlaceholder(): ExecutionTransport {
  return {
    name: VERCEL_WORKFLOWS_EXECUTION_TRANSPORT_NAME,
    async startRun(payload) {
      parseExecutionTransportStartPayload(payload);

      throw new ExecutionTransportStartError({
        message: "Vercel Workflows execution transport is not implemented yet.",
        code: "transport_unavailable",
        userMessage:
          "Workflow execution is temporarily unavailable. Please try again later.",
        debug: {
          transport: VERCEL_WORKFLOWS_EXECUTION_TRANSPORT_NAME,
        },
      });
    },
  };
}
