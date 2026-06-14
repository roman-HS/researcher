import type { WorkflowRuntimeInputs } from "@/contracts/workflows/runtime-inputs";

/**
 * Coerces client form state into the shape expected by `validateRuntimeInputValues`.
 *
 * @see Story 8.1.1 — Build workflow run form
 */

export function buildRuntimeInputFormState(
  definitions: WorkflowRuntimeInputs,
): Record<string, unknown> {
  const state: Record<string, unknown> = {};

  for (const input of definitions) {
    if (input.default !== undefined) {
      state[input.key] = input.default;
    }
  }

  return state;
}

export function normalizeRuntimeInputFormValues(
  definitions: WorkflowRuntimeInputs,
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const input of definitions) {
    if (!(input.key in raw)) {
      continue;
    }

    const value = raw[input.key];

    switch (input.type) {
      case "text": {
        if (value === undefined || value === null) {
          continue;
        }

        const text = String(value);

        if (
          !input.required &&
          input.default === undefined &&
          text.trim().length === 0
        ) {
          continue;
        }

        normalized[input.key] = text;
        break;
      }
      case "number": {
        if (value === undefined || value === null || value === "") {
          continue;
        }

        if (typeof value === "number") {
          normalized[input.key] = value;
          break;
        }

        const parsed = Number(value);
        normalized[input.key] = Number.isFinite(parsed) ? parsed : value;
        break;
      }
      case "boolean": {
        if (value === undefined || value === null) {
          continue;
        }

        normalized[input.key] = Boolean(value);
        break;
      }
      case "select": {
        if (value === undefined || value === null || value === "") {
          continue;
        }

        normalized[input.key] = String(value);
        break;
      }
    }
  }

  return normalized;
}
