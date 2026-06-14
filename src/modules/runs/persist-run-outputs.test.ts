import { describe, expect, it } from "vitest";

import { createEmptyExecutionWorkingSet } from "@/contracts/runs/working-set";
import {
  buildAreaResultRows,
  buildPropertyResultRows,
  moneyAmountToCents,
  RunOutputAccumulator,
} from "@/modules/runs/persist-run-outputs";

const runId = "11111111-1111-4111-8111-111111111111";

describe("RunOutputAccumulator", () => {
  it("accumulates item errors and property-scoped warnings by property key", () => {
    const accumulator = new RunOutputAccumulator();

    accumulator.recordStepOutputs(
      [
        {
          code: "provider_error",
          userMessage: "Detail failed.",
          propertyKey: "provider:2",
        },
      ],
      [
        {
          code: "retry",
          message: "Retried once.",
          propertyKey: "provider:1",
        },
      ],
    );

    expect(accumulator.getItemErrorsByPropertyKey()).toEqual({
      "provider:2": [
        expect.objectContaining({
          code: "provider_error",
          propertyKey: "provider:2",
        }),
      ],
    });
    expect(accumulator.getPropertyWarningsByPropertyKey()).toEqual({
      "provider:1": ["Retried once."],
    });
  });
});

describe("buildPropertyResultRows", () => {
  it("maps one row per property order entry with promoted columns when available", () => {
    const workingSet = createEmptyExecutionWorkingSet();

    workingSet.propertyOrder = ["provider:1", "provider:2"];
    workingSet.listingsByKey = {
      "provider:1": {
        source: { provider: "zillow", externalId: "1" },
        listPrice: { amount: "450000.00", currency: "USD" },
        address: {
          line1: "123 Main St",
          city: "Seattle",
          state: "WA",
          postalCode: "98101",
          country: "US",
        },
      },
    };
    workingSet.detailsByKey = {
      "provider:1": {
        source: { provider: "zillow", externalId: "1" },
        address: {
          line1: "123 Main St",
          city: "Seattle",
          state: "WA",
          postalCode: "98101",
          country: "US",
        },
      },
    };
    workingSet.metricsByKey = {
      "provider:1": {
        capRate: { status: "available", value: 0.0612 },
        monthlyCashFlow: { status: "available", value: 412.5 },
        warnings: ["Rent estimate missing."],
      },
    };
    workingSet.scoresByKey = {
      "provider:1": {
        scoreStatus: "available",
        totalScore: 82.5,
        components: [],
        reasons: [],
      },
    };

    const rows = buildPropertyResultRows({
      runId,
      workingSet,
      itemErrorsByPropertyKey: {
        "provider:2": [
          {
            code: "provider_error",
            userMessage: "Detail failed.",
            propertyKey: "provider:2",
          },
        ],
      },
      propertyWarningsByPropertyKey: {
        "provider:1": ["Retried once."],
      },
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      runId,
      propertyKey: "provider:1",
      displayOrder: 0,
      totalScore: "82.5",
      listPriceCents: 45000000,
      capRate: "0.0612",
      monthlyCashFlow: "412.5",
      warningsJson: ["Rent estimate missing.", "Retried once."],
      errorsJson: null,
    });
    expect(rows[1]).toMatchObject({
      propertyKey: "provider:2",
      displayOrder: 1,
      totalScore: null,
      listPriceCents: null,
      capRate: null,
      monthlyCashFlow: null,
      listingJson: null,
      detailJson: null,
      errorsJson: {
        items: [
          expect.objectContaining({
            propertyKey: "provider:2",
          }),
        ],
      },
    });
  });

  it("leaves promoted columns null when upstream values are unavailable", () => {
    const workingSet = createEmptyExecutionWorkingSet();
    workingSet.propertyOrder = ["provider:1"];
    workingSet.metricsByKey = {
      "provider:1": {
        capRate: { status: "missing", reasonCode: "missing_rent_estimate" },
        monthlyCashFlow: {
          status: "not_applicable",
          reasonCode: "cash_flow_disabled",
        },
      },
    };
    workingSet.scoresByKey = {
      "provider:1": {
        scoreStatus: "unavailable",
        unavailableReasonCodes: ["missing_metrics"],
      },
    };

    const rows = buildPropertyResultRows({
      runId,
      workingSet,
      itemErrorsByPropertyKey: {},
      propertyWarningsByPropertyKey: {},
    });
    const row = rows[0];

    expect(row).toBeDefined();
    expect(row?.totalScore).toBeNull();
    expect(row?.capRate).toBeNull();
    expect(row?.monthlyCashFlow).toBeNull();
  });

  it("persists rent estimate and comparables payloads when present", () => {
    const workingSet = createEmptyExecutionWorkingSet();
    workingSet.propertyOrder = ["provider:1"];
    workingSet.rentEstimatesByKey = {
      "provider:1": {
        source: { provider: "zillow", externalId: "1" },
        estimatedRent: { amount: "3500.00", currency: "USD" },
        rentRangeLow: { amount: "3200.00", currency: "USD" },
        rentRangeHigh: { amount: "3800.00", currency: "USD" },
        confidenceLabel: "High",
      },
    };
    workingSet.comparablesByKey = {
      "provider:1": {
        subjectSource: { provider: "zillow", externalId: "1" },
        comparables: [
          {
            source: { provider: "zillow", externalId: "2" },
            address: { line1: "125 Main St", country: "US" },
            soldPrice: { amount: "430000.00", currency: "USD" },
            distanceMiles: 0.4,
          },
        ],
      },
    };

    const rows = buildPropertyResultRows({
      runId,
      workingSet,
      itemErrorsByPropertyKey: {},
      propertyWarningsByPropertyKey: {},
    });

    expect(rows[0]?.rentEstimateJson).toEqual(
      workingSet.rentEstimatesByKey["provider:1"],
    );
    expect(rows[0]?.comparablesJson).toEqual(
      workingSet.comparablesByKey["provider:1"],
    );
  });
});

describe("buildAreaResultRows", () => {
  it("maps area aggregates into queryable rows", () => {
    const workingSet = createEmptyExecutionWorkingSet();
    workingSet.areaAggregatesByKey = {
      "98101": {
        areaKey: "98101",
        groupingLevel: "zip",
        propertyCount: 3,
        minimumSampleSize: 2,
        meetsMinimumSample: true,
        rank: 1,
        capRate: { status: "available", value: 0.05 },
        warnings: ["Small sample."],
      },
    };

    expect(buildAreaResultRows(runId, workingSet)).toEqual([
      {
        runId,
        areaKey: "98101",
        groupingLevel: "zip",
        propertyCount: 3,
        rank: 1,
        meetsMinimumSample: true,
        aggregatesJson: workingSet.areaAggregatesByKey["98101"],
        warningsJson: ["Small sample."],
      },
    ]);
  });
});

describe("moneyAmountToCents", () => {
  it("converts decimal money strings to integer cents", () => {
    expect(moneyAmountToCents("450000")).toBe(45000000);
    expect(moneyAmountToCents("450000.00")).toBe(45000000);
    expect(moneyAmountToCents("1234.56")).toBe(123456);
  });
});
