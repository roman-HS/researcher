import { ZodError } from "zod";

import {
  parseRunIdempotencyKey,
  type RunIdempotencyKey,
} from "@/contracts/runs/requests";
import { apiErrorResponse } from "@/lib/api/responses";

const IDEMPOTENCY_KEY_HEADER = "Idempotency-Key";

export function parseIdempotencyKeyHeader(
  request: Request,
):
  | { ok: true; value: RunIdempotencyKey }
  | { ok: false; response: Response } {
  const raw = request.headers.get(IDEMPOTENCY_KEY_HEADER);

  if (!raw?.trim()) {
    return {
      ok: false,
      response: apiErrorResponse("validation_error", "Validation failed", {
        details: {
          issues: [{ path: IDEMPOTENCY_KEY_HEADER, message: "Required" }],
        },
      }),
    };
  }

  try {
    return { ok: true, value: parseRunIdempotencyKey(raw) };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        ok: false,
        response: apiErrorResponse("validation_error", "Validation failed", {
          details: {
            issues: error.issues.map((issue) => ({
              path: IDEMPOTENCY_KEY_HEADER,
              message: issue.message,
            })),
          },
        }),
      };
    }

    throw error;
  }
}
