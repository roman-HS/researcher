import { z, type ZodError } from "zod";

import type { ToolExecutorRuntimeInputValues } from "@/contracts/runs/executors";
import type {
  WorkflowRuntimeInput,
  WorkflowRuntimeInputs,
} from "@/contracts/workflows/runtime-inputs";

/**
 * Shared runtime input validation for server run creation and client run forms.
 *
 * @see Story 7.2.3 — Implement runtime input validation
 * @see Story 8.1.1 — Build workflow run form
 */

export type RuntimeInputValidationIssue = {
  key: string;
  message: string;
};

export type ValidateRuntimeInputValuesResult =
  | {
      valid: true;
      values: ToolExecutorRuntimeInputValues;
    }
  | {
      valid: false;
      issues: RuntimeInputValidationIssue[];
    };

function issue(key: string, message: string): RuntimeInputValidationIssue {
  return { key, message };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type NormalizedSubmittedInput =
  | {
      kind: "error";
      result: Extract<ValidateRuntimeInputValuesResult, { valid: false }>;
    }
  | {
      kind: "value";
      value: Record<string, unknown>;
    };

function normalizeSubmittedInput(submitted: unknown): NormalizedSubmittedInput {
  if (submitted === undefined || submitted === null) {
    return { kind: "value", value: {} };
  }

  if (!isPlainObject(submitted)) {
    return {
      kind: "error",
      result: {
        valid: false,
        issues: [issue("_root", "Run inputs must be a JSON object.")],
      },
    };
  }

  return { kind: "value", value: submitted };
}

function findUnknownInputKeys(
  definitions: WorkflowRuntimeInputs,
  submitted: Record<string, unknown>,
): RuntimeInputValidationIssue[] {
  const declaredKeys = new Set(definitions.map((input) => input.key));

  return Object.keys(submitted)
    .filter((key) => !declaredKeys.has(key))
    .map((key) => issue(key, `Unknown runtime input "${key}".`));
}

function applyRuntimeInputDefaults(
  definitions: WorkflowRuntimeInputs,
  submitted: Record<string, unknown>,
): Record<string, unknown> {
  const withDefaults: Record<string, unknown> = { ...submitted };

  for (const input of definitions) {
    if (!(input.key in withDefaults) && input.default !== undefined) {
      withDefaults[input.key] = input.default;
    }
  }

  return withDefaults;
}

function buildValueSchema(input: WorkflowRuntimeInput): z.ZodTypeAny {
  const isRequiredField = input.required || input.default !== undefined;

  switch (input.type) {
    case "text": {
      const schema =
        input.required && input.default === undefined
          ? z.string().min(1, `${input.label} is required.`)
          : z.string();

      return isRequiredField ? schema : schema.optional();
    }
    case "number": {
      const schema = z.number({
        error: `${input.label} must be a number.`,
      }).finite(`${input.label} must be a finite number.`);

      return isRequiredField ? schema : schema.optional();
    }
    case "boolean": {
      const schema = z.boolean({
        error: `${input.label} must be a boolean.`,
      });

      return isRequiredField ? schema : schema.optional();
    }
    case "select": {
      const optionValues = input.options.map((option) => option.value);
      const schema = z.enum(optionValues, {
        error: `${input.label} must be one of the allowed options.`,
      });

      return isRequiredField ? schema : schema.optional();
    }
  }
}

export function buildRuntimeInputValuesSchema(
  definitions: WorkflowRuntimeInputs,
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const input of definitions) {
    shape[input.key] = buildValueSchema(input);
  }

  return z.object(shape).strict();
}

function formatZodIssues(error: ZodError): RuntimeInputValidationIssue[] {
  return error.issues.map((zodIssue) => {
    const key =
      typeof zodIssue.path[0] === "string" ? zodIssue.path[0] : "_root";

    return issue(key, zodIssue.message);
  });
}

function buildValidatedOutput(
  definitions: WorkflowRuntimeInputs,
  submitted: Record<string, unknown>,
  parsed: Record<string, unknown>,
): ToolExecutorRuntimeInputValues {
  const values: ToolExecutorRuntimeInputValues = {};

  for (const input of definitions) {
    if (!(input.key in parsed) || parsed[input.key] === undefined) {
      continue;
    }

    if (
      !input.required &&
      input.default === undefined &&
      !(input.key in submitted)
    ) {
      continue;
    }

    values[input.key] = parsed[input.key] as string | number | boolean;
  }

  return values;
}

export function validateRuntimeInputValues(
  definitions: WorkflowRuntimeInputs,
  submitted: unknown,
): ValidateRuntimeInputValuesResult {
  const normalized = normalizeSubmittedInput(submitted);

  if (normalized.kind === "error") {
    return normalized.result;
  }

  const submittedRecord = normalized.value;
  const unknownKeyIssues = findUnknownInputKeys(definitions, submittedRecord);

  if (unknownKeyIssues.length > 0) {
    return {
      valid: false,
      issues: unknownKeyIssues,
    };
  }

  const withDefaults = applyRuntimeInputDefaults(definitions, submittedRecord);
  const schema = buildRuntimeInputValuesSchema(definitions);
  const parseResult = schema.safeParse(withDefaults);

  if (!parseResult.success) {
    return {
      valid: false,
      issues: formatZodIssues(parseResult.error),
    };
  }

  return {
    valid: true,
    values: buildValidatedOutput(definitions, submittedRecord, parseResult.data),
  };
}
