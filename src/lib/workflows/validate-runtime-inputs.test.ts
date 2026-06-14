import { describe, expect, it } from "vitest";

import type { WorkflowRuntimeInputs } from "@/contracts/workflows/runtime-inputs";
import { validateRuntimeInputValues } from "@/lib/workflows/validate-runtime-inputs";
import { RunInputValidationError } from "@/modules/runs/errors";
import { parseRuntimeInputValues } from "@/modules/runs/validate-runtime-inputs";

const definitions: WorkflowRuntimeInputs = [
  {
    key: "market",
    label: "Market",
    type: "text",
    required: true,
  },
  {
    key: "maxPrice",
    label: "Max price",
    type: "number",
    required: false,
    default: 500000,
  },
  {
    key: "includeSold",
    label: "Include sold",
    type: "boolean",
    required: false,
  },
  {
    key: "strategy",
    label: "Strategy",
    type: "select",
    required: true,
    default: "cashflow",
    options: [
      { value: "cashflow", label: "Cash flow" },
      { value: "appreciation", label: "Appreciation" },
    ],
  },
];

describe("validateRuntimeInputValues", () => {
  it("accepts an empty submission when no inputs are declared", () => {
    expect(validateRuntimeInputValues([], {})).toEqual({
      valid: true,
      values: {},
    });
  });

  it("applies defaults from the published input definitions", () => {
    expect(
      validateRuntimeInputValues(definitions, {
        market: "Austin, TX",
      }),
    ).toEqual({
      valid: true,
      values: {
        market: "Austin, TX",
        maxPrice: 500000,
        strategy: "cashflow",
      },
    });
  });

  it("rejects unknown keys", () => {
    const result = validateRuntimeInputValues(definitions, {
      market: "Austin, TX",
      extra: "nope",
    });

    expect(result.valid).toBe(false);

    if (!result.valid) {
      expect(result.issues).toEqual([
        { key: "extra", message: 'Unknown runtime input "extra".' },
      ]);
    }
  });

  it("rejects missing required inputs without defaults", () => {
    const result = validateRuntimeInputValues(definitions, {
      maxPrice: 400000,
    });

    expect(result.valid).toBe(false);

    if (!result.valid) {
      expect(result.issues.some((issue) => issue.key === "market")).toBe(true);
    }
  });

  it("omits optional unset inputs without defaults", () => {
    const result = validateRuntimeInputValues(definitions, {
      market: "Austin, TX",
    });

    expect(result).toEqual({
      valid: true,
      values: {
        market: "Austin, TX",
        maxPrice: 500000,
        strategy: "cashflow",
      },
    });
    expect(result.valid && "includeSold" in result.values).toBe(false);
  });

  it("accepts explicit false for optional booleans", () => {
    expect(
      validateRuntimeInputValues(definitions, {
        market: "Austin, TX",
        includeSold: false,
      }),
    ).toEqual({
      valid: true,
      values: {
        market: "Austin, TX",
        maxPrice: 500000,
        includeSold: false,
        strategy: "cashflow",
      },
    });
  });

  it("rejects invalid select values and non-JSON types", () => {
    const invalidSelect = validateRuntimeInputValues(definitions, {
      market: "Austin, TX",
      strategy: "invalid",
    });

    expect(invalidSelect.valid).toBe(false);

    const invalidNumber = validateRuntimeInputValues(definitions, {
      market: "Austin, TX",
      maxPrice: "500000",
    });

    expect(invalidNumber.valid).toBe(false);

    if (!invalidNumber.valid) {
      expect(invalidNumber.issues.some((issue) => issue.key === "maxPrice")).toBe(
        true,
      );
    }
  });

  it("rejects non-object submissions", () => {
    expect(validateRuntimeInputValues(definitions, "bad")).toEqual({
      valid: false,
      issues: [{ key: "_root", message: "Run inputs must be a JSON object." }],
    });
  });
});

describe("parseRuntimeInputValues", () => {
  it("throws RunInputValidationError for invalid submissions", () => {
    expect(() => parseRuntimeInputValues(definitions, {})).toThrow(
      RunInputValidationError,
    );
  });
});
