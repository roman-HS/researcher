import type { ZodType } from "zod";

import {
  apiErrorEnvelopeSchema,
  apiSuccessEnvelopeSchema,
  type ApiError,
} from "@/contracts/api";

/**
 * Browser-side fetch helper for `/api/v1/*` route handlers.
 *
 * @see Story 8.1.1 — Build workflow run form
 * @see Story 8.2.4 — Add run status polling
 */

export type ApiClientResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

const FALLBACK_ERROR: ApiError = {
  code: "internal_error",
  message: "Request failed.",
};

async function parseApiResponse<T>(
  response: Response,
  schema?: ZodType<T>,
): Promise<ApiClientResult<T>> {
  let json: unknown;

  try {
    json = await response.json();
  } catch {
    return { ok: false, error: FALLBACK_ERROR };
  }

  if (!response.ok) {
    const parsed = apiErrorEnvelopeSchema.safeParse(json);

    return {
      ok: false,
      error: parsed.success ? parsed.data.error : FALLBACK_ERROR,
    };
  }

  const envelope = apiSuccessEnvelopeSchema.safeParse(json);

  if (!envelope.success) {
    return { ok: false, error: FALLBACK_ERROR };
  }

  if (schema) {
    const dataResult = schema.safeParse(envelope.data.data);

    if (!dataResult.success) {
      return { ok: false, error: FALLBACK_ERROR };
    }

    return { ok: true, data: dataResult.data };
  }

  return { ok: true, data: envelope.data.data as T };
}

export async function apiClientGet<T>(
  path: string,
  options: {
    schema?: ZodType<T>;
  } = {},
): Promise<ApiClientResult<T>> {
  const response = await fetch(path, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  return parseApiResponse(response, options.schema);
}

export async function apiClientPost<T>(
  path: string,
  body: unknown,
  options: {
    headers?: Record<string, string>;
    schema?: ZodType<T>;
  } = {},
): Promise<ApiClientResult<T>> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: JSON.stringify(body),
  });

  return parseApiResponse(response, options.schema);
}

export function mapApiValidationIssuesToFieldErrors(
  details: Record<string, unknown> | undefined,
): Record<string, string> {
  const issues = details?.issues;

  if (!Array.isArray(issues)) {
    return {};
  }

  const fieldErrors: Record<string, string> = {};

  for (const issue of issues) {
    if (typeof issue !== "object" || issue === null) {
      continue;
    }

    const key =
      "key" in issue && typeof issue.key === "string"
        ? issue.key
        : "path" in issue && typeof issue.path === "string"
          ? issue.path
          : "_root";
    const message =
      "message" in issue && typeof issue.message === "string"
        ? issue.message
        : "Invalid value.";

    if (!(key in fieldErrors)) {
      fieldErrors[key] = message;
    }
  }

  return fieldErrors;
}
