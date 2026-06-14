import { describe, expect, it } from "vitest";

import {
  computeWorkflowSummary,
  formatPropertyLabel,
} from "@/modules/analysis/summary/compute-workflow-summary";
import { generateSummaryConfigSchema } from "@/modules/tools/definitions/generate-summary";

const defaultConfig = generateSummaryConfigSchema.parse({});

const availableMetric = (value: number) =>
  ({
    status: "available",
    value,
  }) as const;

const baseAddress = {
  line1: "123 Main St",
  city: "Austin",
  state: "TX" as const,
  postalCode: "78701",
  country: "US",
};

describe("formatPropertyLabel", () => {
  it("formats a full address from property details", () => {
    expect(
      formatPropertyLabel(
        "prop-1",
        {
          source: { provider: "zillow", externalId: "1" },
          address: baseAddress,
        },
        undefined,
      ),
    ).toBe("123 Main St, Austin, TX, 78701");
  });

  it("falls back to the property key when no address is available", () => {
    expect(formatPropertyLabel("prop-1", undefined, undefined)).toBe("prop-1");
  });
});

describe("computeWorkflowSummary", () => {
  it("builds a deterministic summary with top properties ranked by score", () => {
    const result = computeWorkflowSummary({
      propertyOrder: ["prop-1", "prop-2", "prop-3"],
      metricsByKey: {
        "prop-1": {
          propertyKey: "prop-1",
          capRate: availableMetric(0.08),
          warnings: ["Rent estimate was imputed."],
          missingMetricCodes: ["missing_rent_estimate"],
        },
        "prop-2": {
          propertyKey: "prop-2",
          capRate: availableMetric(0.06),
        },
        "prop-3": {
          propertyKey: "prop-3",
          capRate: availableMetric(0.04),
        },
      },
      scoresByKey: {
        "prop-1": {
          scoreStatus: "available",
          propertyKey: "prop-1",
          totalScore: 82,
          components: [],
          reasons: [
            {
              code: "strong_cap_rate",
              severity: "positive",
              message: "Cap rate is strong relative to the V1 benchmark.",
            },
            {
              code: "strong_cash_flow",
              severity: "positive",
              message: "Monthly cash flow is strong relative to the V1 benchmark.",
            },
            {
              code: "high_expense_ratio",
              severity: "negative",
              message: "Estimated expenses exceed 50% of gross monthly rent.",
            },
          ],
        },
        "prop-2": {
          scoreStatus: "available",
          propertyKey: "prop-2",
          totalScore: 91,
          components: [],
          reasons: [
            {
              code: "strong_cash_on_cash",
              severity: "positive",
              message: "Cash-on-cash return is strong relative to the V1 benchmark.",
            },
          ],
        },
        "prop-3": {
          scoreStatus: "unavailable",
          propertyKey: "prop-3",
          unavailableReasonCodes: ["missing_metrics"],
          reasons: [
            {
              code: "missing_metrics",
              severity: "negative",
              message: "Score is unavailable because required metrics are missing.",
            },
          ],
        },
      },
      areaAggregatesByKey: {
        "78701": {
          areaKey: "78701",
          groupingLevel: "zip",
          propertyCount: 2,
          minimumSampleSize: 3,
          meetsMinimumSample: false,
          capRate: availableMetric(0.07),
          monthlyCashFlow: availableMetric(500),
          rank: 1,
          warnings: ["Sample size is below the configured minimum."],
        },
      },
      detailsByKey: {
        "prop-1": {
          source: { provider: "zillow", externalId: "1" },
          address: baseAddress,
        },
        "prop-2": {
          source: { provider: "zillow", externalId: "2" },
          address: { ...baseAddress, line1: "456 Oak Ave" },
        },
        "prop-3": {
          source: { provider: "zillow", externalId: "3" },
          address: { ...baseAddress, line1: "789 Pine Rd" },
        },
      },
      listingsByKey: {},
      config: {
        ...defaultConfig,
        topPropertyCount: 2,
        includedSections: [
          "overview",
          "topProperties",
          "areaHighlights",
          "warningsAndNotes",
        ],
      },
    });

    expect(result.summary.title).toBe(defaultConfig.title);
    expect(result.summary.topProperties).toEqual([
      {
        propertyKey: "prop-2",
        rank: 1,
        score: 91,
        highlightReasonCodes: ["strong_cash_on_cash"],
      },
      {
        propertyKey: "prop-1",
        rank: 2,
        score: 82,
        highlightReasonCodes: ["strong_cap_rate", "strong_cash_flow"],
      },
    ]);
    expect(result.summary.warnings).toContain(
      "1 property was excluded from top-property ranking because scores were unavailable.",
    );
    expect(result.summary.warnings).toContain(
      "123 Main St, Austin, TX, 78701: Rent estimate was imputed.",
    );
    expect(result.summary.warnings).toContain(
      "Area 78701 has 2 properties, below the minimum sample size of 3.",
    );
    expect(result.summary.missingDataNotes).toContain(
      "123 Main St, Austin, TX, 78701: missing missing rent estimate.",
    );
    expect(result.summary.missingDataNotes).toContain(
      "789 Pine Rd, Austin, TX, 78701: Score is unavailable because required metrics are missing.",
    );

    const topPropertiesSection = result.summary.sections.find(
      (section) => section.id === "topProperties",
    );

    expect(topPropertiesSection?.bullets[0]).toContain("456 Oak Ave");
    expect(topPropertiesSection?.bullets[0]).toContain("score 91.0");

    const areaSection = result.summary.sections.find(
      (section) => section.id === "areaHighlights",
    );

    expect(areaSection?.bullets[0]).toContain("[Low sample: 2/3]");
    expect(result.summary.markdown).toContain("# Investment analysis summary");
    expect(result.summary.markdown).toContain("## Top properties");
    expect(result.warnings).toEqual([]);
  });

  it("emits executor warnings and placeholder bullets when sections lack upstream data", () => {
    const result = computeWorkflowSummary({
      propertyOrder: ["prop-1"],
      metricsByKey: {},
      scoresByKey: {},
      areaAggregatesByKey: {},
      detailsByKey: {},
      listingsByKey: {},
      config: {
        ...defaultConfig,
        includedSections: ["topProperties", "areaHighlights"],
        includeMarkdown: false,
      },
    });

    expect(result.warnings).toEqual([
      {
        code: "no_scored_properties",
        message:
          "Top properties section is enabled, but no scored properties are available.",
      },
      {
        code: "no_area_aggregates",
        message:
          "Area highlights section is enabled, but no area aggregates are available.",
      },
    ]);
    expect(
      result.summary.sections.find((section) => section.id === "topProperties")
        ?.bullets,
    ).toEqual(["No scored properties available."]);
    expect(
      result.summary.sections.find((section) => section.id === "areaHighlights")
        ?.bullets,
    ).toEqual(["No area aggregates available."]);
    expect(result.summary.markdown).toBeUndefined();
  });
});
