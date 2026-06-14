import { describe, expect, it, vi } from "vitest";

import { parseExecutionTransportStartPayload } from "@/contracts/runs/execution-transport";
import { createVercelWorkflowsExecutionTransportPlaceholder } from "@/integrations/vercel-workflows";
import {
  ExecutionTransportStartError,
  isExecutionTransportStartError,
} from "@/modules/runs/errors";
import {
  createDirectExecutionTransport,
  createExecutionTransport,
  DIRECT_EXECUTION_TRANSPORT_NAME,
} from "@/modules/runs/execution-transport";
import * as enqueueModule from "@/modules/runs/execution-transport/enqueue-workflow-run-execution";

const runId = "11111111-1111-4111-8111-111111111111";

describe("executionTransportStartPayloadSchema", () => {
  it("accepts a valid run id payload", () => {
    expect(parseExecutionTransportStartPayload({ runId })).toEqual({ runId });
  });

  it("rejects invalid payloads", () => {
    expect(() => parseExecutionTransportStartPayload({ runId: "not-a-uuid" })).toThrow();
    expect(() => parseExecutionTransportStartPayload({})).toThrow();
  });
});

describe("createDirectExecutionTransport", () => {
  it("resolves once the run is scheduled", async () => {
    const spy = vi
      .spyOn(enqueueModule, "enqueueWorkflowRunExecution")
      .mockResolvedValue(undefined);

    await expect(
      createDirectExecutionTransport().startRun({ runId }),
    ).resolves.toBeUndefined();

    await new Promise<void>((resolve) => {
      queueMicrotask(() => resolve());
    });

    expect(spy).toHaveBeenCalledWith(runId);
    spy.mockRestore();
  });

  it("uses the direct transport name", () => {
    expect(createDirectExecutionTransport().name).toBe(DIRECT_EXECUTION_TRANSPORT_NAME);
  });
});

describe("createVercelWorkflowsExecutionTransportPlaceholder", () => {
  it("throws ExecutionTransportStartError when starting a run", async () => {
    const transport = createVercelWorkflowsExecutionTransportPlaceholder();

    await expect(transport.startRun({ runId })).rejects.toSatisfy(
      (error: unknown) => {
        expect(isExecutionTransportStartError(error)).toBe(true);
        expect(error).toBeInstanceOf(ExecutionTransportStartError);

        if (error instanceof ExecutionTransportStartError) {
          expect(error.code).toBe("transport_unavailable");
          expect(error.userMessage).toContain("temporarily unavailable");
        }

        return true;
      },
    );
  });
});

describe("createExecutionTransport", () => {
  it("creates the direct transport", () => {
    expect(createExecutionTransport("direct").name).toBe(DIRECT_EXECUTION_TRANSPORT_NAME);
  });

  it("creates the vercel workflows placeholder transport", () => {
    expect(createExecutionTransport("vercel_workflows").name).toBe("vercel_workflows");
  });
});
