import { describe, expect, it } from "vitest";

import { aggregateMetricValues } from "@/modules/analysis/aggregation/aggregate-metric-values";
import { computeAreaAggregates } from "@/modules/analysis/aggregation/compute-area-aggregates";
import { resolveAreaKey } from "@/modules/analysis/aggregation/resolve-area-key";
import { aggregateAreaConfigSchema } from "@/modules/tools/definitions/aggregate-area";

const defaultConfig = aggregateAreaConfigSchema.parse({});

const availableMetric = (value: number) =>
  ({
    status: "available",
    value,
  }) as const;

describe("resolveAreaKey", () => {
  it("uses postal code for ZIP grouping", () => {
    expect(
      resolveAreaKey("zip", {
        postalCode: "90210",
        city: "Beverly Hills",
        state: "CA",
        country: "US",
      }),
    ).toEqual({
      status: "resolved",
      areaKey: "90210",
      groupingLevel: "zip",
      warnings: [],
    });
  });

  it("uses city and state for city grouping", () => {
    expect(
      resolveAreaKey("city", {
        city: "Austin",
        state: "tx",
        country: "US",
      }),
    ).toEqual({
      status: "resolved",
      areaKey: "Austin|TX",
      groupingLevel: "city",
      warnings: [],
    });
  });

  it("warns when city grouping lacks state", () => {
    const result = resolveAreaKey("city", {
      city: "Portland",
      country: "US",
    });

    expect(result).toEqual({
      status: "resolved",
      areaKey: "Portland",
      groupingLevel: "city",
      warnings: [
        "Property city grouping key omits state; the area key may be ambiguous.",
      ],
    });
  });
});

describe("aggregateMetricValues", () => {
  it("computes mean and median from available values", () => {
    const result = aggregateMetricValues("capRate", [
      availableMetric(0.06),
      availableMetric(0.08),
      availableMetric(0.1),
    ]);

    expect(result.mean).toEqual({ status: "available", value: 0.08 });
    expect(result.median).toEqual({ status: "available", value: 0.08 });
  });

  it("excludes missing values from rollups", () => {
    const result = aggregateMetricValues("monthlyCashFlow", [
      availableMetric(500),
      {
        status: "missing",
        reasonCode: "missing_rent_estimate",
      },
      availableMetric(700),
    ]);

    expect(result.mean).toEqual({ status: "available", value: 600 });
    expect(result.median).toEqual({ status: "available", value: 600 });
  });

  it("returns missing metrics when no values are available", () => {
    const result = aggregateMetricValues("capRate", [
      {
        status: "missing",
        reasonCode: "missing_rent_estimate",
      },
    ]);

    expect(result.mean).toEqual({
      status: "missing",
      reasonCode: "missing_rent_estimate",
    });
    expect(result.median).toEqual({
      status: "missing",
      reasonCode: "missing_rent_estimate",
    });
  });
});

describe("computeAreaAggregates", () => {
  const baseMetrics = {
    capRate: availableMetric(0.07),
    cashOnCashReturn: availableMetric(0.09),
    monthlyCashFlow: availableMetric(400),
  };

  it("groups properties by ZIP and computes configured aggregates", () => {
    const result = computeAreaAggregates({
      propertyOrder: ["prop-1", "prop-2", "prop-3"],
      metricsByKey: {
        "prop-1": { propertyKey: "prop-1", ...baseMetrics },
        "prop-2": {
          propertyKey: "prop-2",
          capRate: availableMetric(0.05),
          cashOnCashReturn: availableMetric(0.06),
          monthlyCashFlow: availableMetric(200),
        },
        "prop-3": {
          propertyKey: "prop-3",
          capRate: availableMetric(0.09),
          cashOnCashReturn: availableMetric(0.12),
          monthlyCashFlow: availableMetric(600),
        },
      },
      detailsByKey: {
        "prop-1": {
          source: { provider: "zillow", externalId: "1" },
          address: { postalCode: "90210", country: "US" },
        },
        "prop-2": {
          source: { provider: "zillow", externalId: "2" },
          address: { postalCode: "90210", country: "US" },
        },
        "prop-3": {
          source: { provider: "zillow", externalId: "3" },
          address: { postalCode: "78701", country: "US" },
        },
      },
      listingsByKey: {},
      config: defaultConfig,
    });

    expect(Object.keys(result.areaAggregatesByKey).sort()).toEqual([
      "78701",
      "90210",
    ]);

    const beverlyHills = result.areaAggregatesByKey["90210"];

    expect(beverlyHills?.propertyCount).toBe(2);
    expect(beverlyHills?.meetsMinimumSample).toBe(false);
    expect(beverlyHills?.capRate).toEqual({ status: "available", value: 0.06 });
    expect(beverlyHills?.metricMedians?.capRate).toEqual({
      status: "available",
      value: 0.06,
    });
    expect(beverlyHills?.warnings?.some((warning) => warning.includes("below"))).toBe(
      true,
    );
    expect(beverlyHills?.rank).toBe(2);
    expect(result.areaAggregatesByKey["78701"]?.rank).toBe(1);
  });

  it("skips properties missing grouping fields and emits warnings", () => {
    const result = computeAreaAggregates({
      propertyOrder: ["prop-1"],
      metricsByKey: {
        "prop-1": { propertyKey: "prop-1", ...baseMetrics },
      },
      detailsByKey: {
        "prop-1": {
          source: { provider: "zillow", externalId: "1" },
          address: { city: "Austin", country: "US" },
        },
      },
      listingsByKey: {},
      config: defaultConfig,
    });

    expect(result.areaAggregatesByKey).toEqual({});
    expect(result.propertyWarnings).toHaveLength(1);
    expect(result.propertyWarnings[0]?.code).toBe("missing_grouping_field");
  });

  it("ranks gross rent multiplier areas in ascending order", () => {
    const result = computeAreaAggregates({
      propertyOrder: ["prop-1", "prop-2"],
      metricsByKey: {
        "prop-1": {
          propertyKey: "prop-1",
          grossRentMultiplier: availableMetric(14),
        },
        "prop-2": {
          propertyKey: "prop-2",
          grossRentMultiplier: availableMetric(10),
        },
      },
      detailsByKey: {
        "prop-1": {
          source: { provider: "zillow", externalId: "1" },
          address: { postalCode: "11111", country: "US" },
        },
        "prop-2": {
          source: { provider: "zillow", externalId: "2" },
          address: { postalCode: "22222", country: "US" },
        },
      },
      listingsByKey: {},
      config: {
        ...defaultConfig,
        aggregateMetrics: ["grossRentMultiplier"],
      },
    });

    expect(result.areaAggregatesByKey["22222"]?.rank).toBe(1);
    expect(result.areaAggregatesByKey["11111"]?.rank).toBe(2);
  });
});
