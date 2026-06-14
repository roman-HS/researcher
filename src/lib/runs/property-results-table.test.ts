import { describe, expect, it } from "vitest";

import type { RunDetailPropertyResult } from "@/contracts/runs/responses";

import {
  DEFAULT_PROPERTY_RESULT_SORT,
  filterPropertyResults,
  formatPropertyAddressDisplay,
  formatPropertyResultFilterLabel,
  getPropertyResultFilterCounts,
  sortPropertyResults,
} from "./property-results-table";

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

describe("formatPropertyAddressDisplay", () => {
  it("falls back to the property key when address data is missing", () => {
    expect(
      formatPropertyAddressDisplay(null, "zillow:123"),
    ).toEqual({
      primary: "zillow:123",
      secondary: null,
    });
  });

  it("formats line1 and locality when available", () => {
    expect(
      formatPropertyAddressDisplay(
        {
          line1: "123 Main St",
          city: "Austin",
          state: "TX",
          postalCode: "78701",
        },
        "zillow:123",
      ),
    ).toEqual({
      primary: "123 Main St",
      secondary: "Austin, TX 78701",
    });
  });
});

describe("filterPropertyResults", () => {
  it("filters warning and failed properties independently", () => {
    const results = [
      createPropertyResult({
        propertyKey: "clean",
        displayOrder: 0,
      }),
      createPropertyResult({
        propertyKey: "warned",
        displayOrder: 1,
        warnings: ["Low confidence rent estimate"],
      }),
      createPropertyResult({
        propertyKey: "failed",
        displayOrder: 2,
        errors: [
          {
            code: "provider_error",
            userMessage: "Rent estimate failed",
            propertyKey: "failed",
          },
        ],
      }),
    ];

    expect(filterPropertyResults(results, "all")).toHaveLength(3);
    expect(filterPropertyResults(results, "warnings").map((row) => row.propertyKey)).toEqual([
      "warned",
    ]);
    expect(filterPropertyResults(results, "failed").map((row) => row.propertyKey)).toEqual([
      "failed",
    ]);
  });
});

describe("property result filter labels", () => {
  it("includes counts in filter labels", () => {
    const results = [
      createPropertyResult({ propertyKey: "clean" }),
      createPropertyResult({
        propertyKey: "warned",
        warnings: ["Low confidence rent estimate"],
      }),
      createPropertyResult({
        propertyKey: "failed",
        errors: [
          {
            code: "provider_error",
            userMessage: "Rent estimate failed",
            propertyKey: "failed",
          },
        ],
      }),
    ];
    const counts = getPropertyResultFilterCounts(results);

    expect(counts).toEqual({
      all: 3,
      warnings: 1,
      failed: 1,
    });
    expect(formatPropertyResultFilterLabel("failed", counts)).toBe("Failed (1)");
  });
});

describe("sortPropertyResults", () => {
  it("defaults to score descending with null scores last", () => {
    const results = [
      createPropertyResult({
        propertyKey: "missing-score",
        displayOrder: 0,
        totalScore: null,
      }),
      createPropertyResult({
        propertyKey: "mid",
        displayOrder: 1,
        totalScore: 72.5,
      }),
      createPropertyResult({
        propertyKey: "top",
        displayOrder: 2,
        totalScore: 91.2,
      }),
    ];

    expect(
      sortPropertyResults(
        results,
        DEFAULT_PROPERTY_RESULT_SORT.key,
        DEFAULT_PROPERTY_RESULT_SORT.direction,
      ).map((row) => row.propertyKey),
    ).toEqual(["top", "mid", "missing-score"]);
  });

  it("uses display order as a tie-breaker", () => {
    const results = [
      createPropertyResult({
        propertyKey: "second",
        displayOrder: 1,
        totalScore: 80,
      }),
      createPropertyResult({
        propertyKey: "first",
        displayOrder: 0,
        totalScore: 80,
      }),
    ];

    expect(
      sortPropertyResults(results, "score", "desc").map((row) => row.propertyKey),
    ).toEqual(["first", "second"]);
  });
});
