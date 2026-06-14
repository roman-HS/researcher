import { describe, expect, it } from "vitest";

import type { RunDetailCounts, RunDetailPropertyResult } from "@/contracts/runs/responses";

import {
  buildFailedPropertyDisplayItems,
  buildPartialRunBannerDescription,
  buildPropertyResultsCompletenessDescription,
  formatFailedPropertyPrimaryError,
  formatSuccessfulPropertyCountLabel,
  getFailedPropertyResults,
  getSuccessfulPropertyCount,
  shouldShowFailedItemsSection,
  shouldShowPartialRunBanner,
} from "./partial-run-visibility";

function createCounts(overrides: Partial<RunDetailCounts> = {}): RunDetailCounts {
  return {
    propertyCount: 3,
    failedPropertyCount: 1,
    warningCount: 2,
    ...overrides,
  };
}

function createPropertyResult(
  overrides: Partial<RunDetailPropertyResult> = {},
): RunDetailPropertyResult {
  return {
    propertyResultId: "00000000-0000-4000-8000-000000000001",
    propertyKey: "zillow:123",
    displayOrder: 0,
    totalScore: null,
    listPriceCents: null,
    capRate: null,
    monthlyCashFlow: null,
    addressSummary: null,
    listing: null,
    detail: null,
    rentEstimate: null,
    comparables: null,
    metrics: null,
    score: null,
    warnings: [],
    errors: [],
    ...overrides,
  };
}

describe("partial run banner helpers", () => {
  it("shows the banner only for partial runs", () => {
    expect(shouldShowPartialRunBanner("partial")).toBe(true);
    expect(shouldShowPartialRunBanner("succeeded")).toBe(false);
  });

  it("describes successful and failed property counts", () => {
    expect(buildPartialRunBannerDescription(createCounts())).toBe(
      "2 properties analyzed successfully and 1 property failed out of 3 properties. Useful results remain available below.",
    );
  });
});

describe("failed property helpers", () => {
  it("computes successful property counts from run detail counts", () => {
    expect(getSuccessfulPropertyCount(createCounts())).toBe(2);
    expect(getSuccessfulPropertyCount(createCounts({ failedPropertyCount: 0 }))).toBe(3);
  });

  it("builds failed property display items with safe user-facing messages", () => {
    const items = buildFailedPropertyDisplayItems([
      createPropertyResult({
        propertyResultId: "00000000-0000-4000-8000-000000000002",
        propertyKey: "zillow:456",
        addressSummary: {
          line1: "456 Oak Ave",
          city: "Seattle",
          state: "WA",
          postalCode: "98101",
        },
        errors: [
          {
            code: "provider_error",
            userMessage: "Rent estimate failed",
            propertyKey: "zillow:456",
          },
        ],
      }),
    ]);

    expect(
      getFailedPropertyResults([
        createPropertyResult({
          propertyResultId: "00000000-0000-4000-8000-000000000002",
          propertyKey: "zillow:456",
          errors: [
            {
              code: "provider_error",
              userMessage: "Rent estimate failed",
              propertyKey: "zillow:456",
            },
          ],
        }),
      ]),
    ).toHaveLength(1);
    expect(items).toEqual([
      {
        propertyResultId: "00000000-0000-4000-8000-000000000002",
        propertyKey: "zillow:456",
        label: "456 Oak Ave",
        secondaryLabel: "Seattle, WA 98101",
        errors: [
          {
            code: "provider_error",
            userMessage: "Rent estimate failed",
            propertyKey: "zillow:456",
          },
        ],
      },
    ]);
    expect(
      formatFailedPropertyPrimaryError(items[0]?.errors ?? []),
    ).toBe("Rent estimate failed");
  });

  it("shows the failed items section when failures exist", () => {
    expect(shouldShowFailedItemsSection(createCounts())).toBe(true);
    expect(
      shouldShowFailedItemsSection(createCounts({ failedPropertyCount: 0 })),
    ).toBe(false);
  });
});

describe("property results completeness copy", () => {
  it("uses successful wording when failures exist", () => {
    expect(formatSuccessfulPropertyCountLabel(createCounts())).toBe("Successful");
    expect(formatSuccessfulPropertyCountLabel(createCounts({ failedPropertyCount: 0 }))).toBe(
      "Properties",
    );
  });

  it("explains partial and failed runs in the results table description", () => {
    expect(
      buildPropertyResultsCompletenessDescription("partial", createCounts()),
    ).toContain("2 of 3 properties completed successfully");
    expect(
      buildPropertyResultsCompletenessDescription("succeeded", createCounts()),
    ).toContain("1 of 3 properties failed");
    expect(
      buildPropertyResultsCompletenessDescription(
        "succeeded",
        createCounts({ failedPropertyCount: 0 }),
      ),
    ).toBeNull();
  });
});
