import type { RunErrorJson } from "@/contracts/runs/run-error";
import type {
  ToolExecutorFatalError,
  ToolExecutorItemError,
} from "@/contracts/runs/executors";

import type { RunStepOutputSnapshot } from "./step-output-snapshot";

/**
 * Redact secrets before persisting run and step error payloads.
 *
 * @see Story 7.4.6 — Implement run failure handling
 */

const REDACTED = "[REDACTED]" as const;

const SENSITIVE_KEY_PATTERN =
  /(?:authorization|api[_-]?key|secret|password|token|cookie|x-rapidapi-key)/i;

const BEARER_TOKEN_PATTERN = /bearer\s+\S+/gi;

const MIN_SECRET_LENGTH = 8;

function loadPersistedErrorSecretValues(): readonly string[] {
  return [
    process.env.BETTER_AUTH_SECRET,
    process.env.RAPIDAPI_KEY,
    process.env.DATABASE_URL,
    process.env.DATABASE_DIRECT_URL,
  ].filter(
    (value): value is string =>
      typeof value === "string" && value.length >= MIN_SECRET_LENGTH,
  );
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key);
}

function scrubSecretValues(
  text: string,
  secrets: readonly string[],
): string {
  let result = text.replace(BEARER_TOKEN_PATTERN, `Bearer ${REDACTED}`);

  for (const secret of secrets) {
    if (result.includes(secret)) {
      result = result.split(secret).join(REDACTED);
    }
  }

  return result;
}

function sanitizeUnknown(
  value: unknown,
  secrets: readonly string[],
): unknown {
  if (typeof value === "string") {
    return scrubSecretValues(value, secrets);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeUnknown(item, secrets));
  }

  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};

    for (const [key, nested] of Object.entries(value)) {
      result[key] = isSensitiveKey(key)
        ? REDACTED
        : sanitizeUnknown(nested, secrets);
    }

    return result;
  }

  return value;
}

function sanitizeUserMessage(
  message: string,
  secrets: readonly string[],
): string {
  return scrubSecretValues(message, secrets);
}

function sanitizeDebugRecord(
  debug: Record<string, unknown> | undefined,
  secrets: readonly string[],
): Record<string, unknown> | undefined {
  if (!debug) {
    return undefined;
  }

  return sanitizeUnknown(debug, secrets) as Record<string, unknown>;
}

export function sanitizePersistedStepError(
  error: ToolExecutorFatalError,
): ToolExecutorFatalError {
  const secrets = loadPersistedErrorSecretValues();

  return {
    code: error.code,
    userMessage: sanitizeUserMessage(error.userMessage, secrets),
    ...(error.debug
      ? { debug: sanitizeDebugRecord(error.debug, secrets) }
      : {}),
  };
}

export function sanitizePersistedRunError(error: RunErrorJson): RunErrorJson {
  const sanitized = sanitizePersistedStepError(error);

  return {
    ...sanitized,
    ...(error.stepNodeId ? { stepNodeId: error.stepNodeId } : {}),
    ...(error.toolKey ? { toolKey: error.toolKey } : {}),
  };
}

function sanitizePersistedItemError(
  itemError: ToolExecutorItemError,
  secrets: readonly string[],
): ToolExecutorItemError {
  return {
    code: itemError.code,
    userMessage: sanitizeUserMessage(itemError.userMessage, secrets),
    ...(itemError.propertyKey ? { propertyKey: itemError.propertyKey } : {}),
    ...(itemError.debug
      ? { debug: sanitizeDebugRecord(itemError.debug, secrets) }
      : {}),
  };
}

export function sanitizePersistedStepOutputSnapshot(
  snapshot: RunStepOutputSnapshot,
): RunStepOutputSnapshot {
  if (!snapshot.itemErrors || snapshot.itemErrors.length === 0) {
    return snapshot;
  }

  const secrets = loadPersistedErrorSecretValues();

  return {
    ...snapshot,
    itemErrors: snapshot.itemErrors.map((itemError) =>
      sanitizePersistedItemError(itemError, secrets),
    ),
  };
}
