import { describe, expect, it } from "vitest";

import type {
  RunDetailAreaResult,
  RunDetailPropertyResult,
} from "@/contracts/runs/responses";

import {
  filterPropertyResultsByArea,
  formatAreaAggregateMetricDisplay,
  formatAreaKeyDisplay,
  formatAreaGroupingLevelLabel,
  getVisibleAreaMetricFields,
  hasAreaRankColumn,
  propertyResultMatchesArea,
} from "./area-results-panel";

function createAreaResult(
  overrides: Partial<RunDetailAreaResult> = {},
): RunDetailAreaResult {
  return {
    areaResultId: "00000000-0000-4000-8000-000000000010",
    areaKey: "98101",
    groupingLevel: "zip",
    propertyCount: 3,
    rank: 1,
    meetsMinimumSample: true,
    aggregates: {
      areaKey: "98101",
      groupingLevel: "zip",
      propertyCount: 3,
      minimumSampleSize: 2,
      meetsMinimumSample: true,
      capRate: { status: "available", value: 0.05 },
      metricMedians: {
        capRate: { status: "available", value: 0.048 },
      },
    },
    warnings: [],
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

describe("formatAreaKeyDisplay", () => {
  it("formats ZIP and city grouping keys for display", () => {
    expect(formatAreaKeyDisplay("98101", "zip")).toBe("ZIP 98101");
    expect(formatAreaKeyDisplay("Seattle|WA", "city")).toBe("Seattle, WA");
    expect(formatAreaKeyDisplay("Seattle", "city")).toBe("Seattle");
  });
});

describe("formatAreaGroupingLevelLabel", () => {
  it("returns human-readable grouping labels", () => {
    expect(formatAreaGroupingLevelLabel("zip")).toBe("ZIP code");
    expect(formatAreaGroupingLevelLabel("city")).toBe("City");
  });
});

describe("getVisibleAreaMetricFields", () => {
  it("includes only metrics present on at least one area row", () => {
    const areaResults = [
      createAreaResult(),
      createAreaResult({
        areaResultId: "00000000-0000-4000-8000-000000000011",
        areaKey: "98102",
        aggregates: {
          areaKey: "98102",
          groupingLevel: "zip",
          propertyCount: 2,
          minimumSampleSize: 2,
          meetsMinimumSample: true,
          monthlyCashFlow: { status: "available", value: 250 },
        },
      }),
    ];

    expect(getVisibleAreaMetricFields(areaResults).map((field) => field.key)).toEqual([
      "capRate",
      "monthlyCashFlow",
    ]);
  });
});

describe("formatAreaAggregateMetricDisplay", () => {
  it("shows mean as primary and median as secondary text", () => {
    expect(
      formatAreaAggregateMetricDisplay(
        createAreaResult(),
        { key: "capRate", label: "Cap rate", format: "percent" },
      ),
    ).toEqual({
      primary: "5.00%",
      secondary: "Median: 4.80%",
    });
  });
});

describe("hasAreaRankColumn", () => {
  it("is true only when at least one row has a rank", () => {
    expect(hasAreaRankColumn([createAreaResult()])).toBe(true);
    expect(
      hasAreaRankColumn([createAreaResult({ rank: null })]),
    ).toBe(false);
  });
});

describe("propertyResultMatchesArea", () => {
  it("matches properties to ZIP and city area keys from address summaries", () => {
    const zipArea = createAreaResult();
    const cityArea = createAreaResult({
      areaKey: "Austin|TX",
      groupingLevel: "city",
      aggregates: {
        areaKey: "Austin|TX",
        groupingLevel: "city",
        propertyCount: 2,
        minimumSampleSize: 2,
        meetsMinimumSample: true,
      },
    });

    const zipProperty = createPropertyResult({
      addressSummary: {
        line1: "123 Main St",
        city: "Seattle",
        state: "WA",
        postalCode: "98101",
      },
    });
    const cityProperty = createPropertyResult({
      propertyResultId: "00000000-0000-4000-8000-000000000002",
      addressSummary: {
        line1: "456 Congress Ave",
        city: "Austin",
        state: "TX",
        postalCode: "78701",
      },
    });

    expect(propertyResultMatchesArea(zipProperty, zipArea)).toBe(true);
    expect(propertyResultMatchesArea(cityProperty, cityArea)).toBe(true);
    expect(propertyResultMatchesArea(cityProperty, zipArea)).toBe(false);
  });
});

describe("filterPropertyResultsByArea", () => {
  it("returns all properties when no area filter is selected", () => {
    const properties = [createPropertyResult()];

    expect(filterPropertyResultsByArea(properties, null)).toEqual(properties);
  });

  it("filters properties to the selected area", () => {
    const areaResult = createAreaResult();
    const matching = createPropertyResult({
      addressSummary: {
        line1: "123 Main St",
        postalCode: "98101",
      },
    });
    const other = createPropertyResult({
      propertyResultId: "00000000-0000-4000-8000-000000000002",
      addressSummary: {
        line1: "789 Pine St",
        postalCode: "98102",
      },
    });

    expect(
      filterPropertyResultsByArea([matching, other], areaResult).map(
        (propertyResult) => propertyResult.propertyResultId,
      ),
    ).toEqual([matching.propertyResultId]);
  });
});
