import "server-only";

import type { ExecutionTransport } from "@/contracts/runs/execution-transport";
import { getServerEnv, type ServerEnv } from "@/lib/env/server";
import { createVercelWorkflowsExecutionTransportPlaceholder } from "@/integrations/vercel-workflows";

import { createDirectExecutionTransport } from "./direct-transport";

let cachedExecutionTransport: ExecutionTransport | undefined;

export function createExecutionTransport(
  transportKind: ServerEnv["EXECUTION_TRANSPORT"] = getServerEnv().EXECUTION_TRANSPORT,
): ExecutionTransport {
  switch (transportKind) {
    case "direct":
      return createDirectExecutionTransport();
    case "vercel_workflows":
      return createVercelWorkflowsExecutionTransportPlaceholder();
    default: {
      const unreachable: never = transportKind;
      throw new Error(`Unsupported execution transport: ${unreachable}`);
    }
  }
}

export function getExecutionTransport(): ExecutionTransport {
  if (!cachedExecutionTransport) {
    cachedExecutionTransport = createExecutionTransport();
  }

  return cachedExecutionTransport;
}
