import { describe, expect, it } from "vitest";

import type { WorkflowRuntimeInputs } from "@/contracts/workflows/runtime-inputs";
import { resolveWorkflowStepConfig } from "@/lib/workflows/resolve-step-config";
import { RunStepConfigResolutionError } from "@/modules/runs/errors";
import { parseResolvedStepConfig } from "@/modules/runs/resolve-step-config";

const runtimeInputs: WorkflowRuntimeInputs = [
  {
    key: "searchZip",
    label: "Search ZIP",
    type: "text",
    required: false,
  },
  {
    key: "maxPrice",
    label: "Max price",
    type: "number",
    required: false,
    default: 500000,
  },
];

const listingSearchBindableFieldTypes = {
  zip: "text",
  city: "text",
  state: "text",
  minPrice: "number",
  maxPrice: "number",
} as const;

describe("resolveWorkflowStepConfig", () => {
  it("resolves const bindings and bare literals into executor-ready values", () => {
    expect(
      resolveWorkflowStepConfig(
        {
          locationSource: "zip",
          zip: { kind: "const", value: "78701" },
          minPrice: 250000,
        },
        {},
        {
          runtimeInputs,
          bindableFieldTypes: listingSearchBindableFieldTypes,
        },
      ),
    ).toEqual({
      valid: true,
      config: {
        locationSource: "zip",
        zip: "78701",
        minPrice: 250000,
      },
    });
  });

  it("substitutes workflowInput bindings from runtime input values", () => {
    expect(
      resolveWorkflowStepConfig(
        {
          locationSource: "zip",
          zip: { kind: "workflowInput", inputKey: "searchZip" },
          maxPrice: { kind: "workflowInput", inputKey: "maxPrice" },
        },
        {
          searchZip: "73301",
          maxPrice: 450000,
        },
        {
          runtimeInputs,
          bindableFieldTypes: listingSearchBindableFieldTypes,
        },
      ),
    ).toEqual({
      valid: true,
      config: {
        locationSource: "zip",
        zip: "73301",
        maxPrice: 450000,
      },
    });
  });

  it("omits bindable fields when a bound runtime input is absent", () => {
    expect(
      resolveWorkflowStepConfig(
        {
          locationSource: "zip",
          zip: { kind: "workflowInput", inputKey: "searchZip" },
          maxPrice: { kind: "workflowInput", inputKey: "maxPrice" },
        },
        {
          maxPrice: 450000,
        },
        {
          runtimeInputs,
          bindableFieldTypes: listingSearchBindableFieldTypes,
        },
      ),
    ).toEqual({
      valid: true,
      config: {
        locationSource: "zip",
        maxPrice: 450000,
      },
    });
  });

  it("omits unset const bindings and empty bindable strings", () => {
    expect(
      resolveWorkflowStepConfig(
        {
          locationSource: "zip",
          zip: { kind: "const", value: null },
          city: { kind: "const", value: "  " },
          maxPrice: { kind: "const", value: null },
        },
        {},
        {
          runtimeInputs,
          bindableFieldTypes: listingSearchBindableFieldTypes,
        },
      ),
    ).toEqual({
      valid: true,
      config: {
        locationSource: "zip",
      },
    });
  });

  it("passes through non-bindable config values unchanged", () => {
    expect(
      resolveWorkflowStepConfig(
        {
          title: "Investment analysis summary",
          topPropertyCount: 5,
          includeMarkdown: true,
          includedSections: ["overview", "topProperties"],
        },
        {},
      ),
    ).toEqual({
      valid: true,
      config: {
        title: "Investment analysis summary",
        topPropertyCount: 5,
        includeMarkdown: true,
        includedSections: ["overview", "topProperties"],
      },
    });
  });

  it("rejects unknown workflow input references", () => {
    const result = resolveWorkflowStepConfig(
      {
        zip: { kind: "workflowInput", inputKey: "missingInput" },
      },
      {},
      {
        runtimeInputs,
        bindableFieldTypes: listingSearchBindableFieldTypes,
      },
    );

    expect(result.valid).toBe(false);

    if (!result.valid) {
      expect(result.issues).toEqual([
        {
          field: "zip",
          message:
            'Binding references unknown workflow input "missingInput".',
        },
      ]);
    }
  });

  it("rejects incompatible runtime input types for bindable fields", () => {
    const result = resolveWorkflowStepConfig(
      {
        zip: { kind: "workflowInput", inputKey: "maxPrice" },
      },
      {
        maxPrice: 450000,
      },
      {
        runtimeInputs,
        bindableFieldTypes: listingSearchBindableFieldTypes,
      },
    );

    expect(result.valid).toBe(false);

    if (!result.valid) {
      expect(result.issues).toEqual([
        {
          field: "zip",
          message:
            'Workflow input "maxPrice" must be a text type for config field "zip".',
        },
      ]);
    }
  });
});

describe("parseResolvedStepConfig", () => {
  it("throws RunStepConfigResolutionError for invalid bindings", () => {
    expect(() =>
      parseResolvedStepConfig(
        {
          zip: { kind: "workflowInput", inputKey: "missingInput" },
        },
        {},
        {
          runtimeInputs,
          bindableFieldTypes: listingSearchBindableFieldTypes,
        },
      ),
    ).toThrow(RunStepConfigResolutionError);
  });
});
