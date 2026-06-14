import { z } from "zod";

import { domainEntityIdSchema } from "@/contracts/domain/primitives";

/**
 * Background workflow execution transport contract.
 *
 * @see Story 7.3.1 — Define ExecutionTransport interface
 * @see Story 7.3.2 — Implement idempotent run creation service
 */

export const executionTransportStartPayloadSchema = z
  .object({
    runId: domainEntityIdSchema,
  })
  .strict();

export type ExecutionTransportStartPayload = z.infer<
  typeof executionTransportStartPayloadSchema
>;

export type ExecutionTransport = {
  readonly name: string;
  startRun(payload: ExecutionTransportStartPayload): Promise<void>;
};

export function parseExecutionTransportStartPayload(
  value: unknown,
): ExecutionTransportStartPayload {
  return executionTransportStartPayloadSchema.parse(value);
}
