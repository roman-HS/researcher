import { describe, expect, it } from "vitest";

import { computePropertyScore } from "@/modules/analysis/scoring/compute-property-score";
import { normalizeLinearClamp } from "@/modules/analysis/scoring/normalize-metric-score";
import { scorePropertiesConfigSchema } from "@/modules/tools/definitions/score-properties";

const defaultConfig = scorePropertiesConfigSchema.parse({});

const availableMetric = (value: number) =>
  ({
    status: "available",
    value,
  }) as const;

const strongMetricsBundle = {
  propertyKey: "prop-1",
  capRate: availableMetric(0.09),
  cashOnCashReturn: availableMetric(0.15),
  monthlyCashFlow: availableMetric(600),
  estimatedMonthlyIncome: availableMetric(3_500),
  estimatedMonthlyExpenses: availableMetric(1_400),
  grossRentMultiplier: availableMetric(12),
};

describe("normalizeLinearClamp", () => {
  it("maps values linearly between bounds and clamps to 0-100", () => {
    expect(normalizeLinearClamp(0, 0, 0.1)).toBe(0);
    expect(normalizeLinearClamp(0.05, 0, 0.1)).toBe(50);
    expect(normalizeLinearClamp(0.1, 0, 0.1)).toBe(100);
    expect(normalizeLinearClamp(0.15, 0, 0.1)).toBe(100);
    expect(normalizeLinearClamp(-500, -500, 1_000)).toBe(0);
    expect(normalizeLinearClamp(1_000, -500, 1_000)).toBe(100);
  });
});

describe("computePropertyScore", () => {
  it("computes a weighted total score when all scorecard metrics are available", () => {
    const result = computePropertyScore({
      propertyKey: "prop-1",
      metrics: strongMetricsBundle,
      config: defaultConfig,
    });

    expect(result.score.scoreStatus).toBe("available");

    if (result.score.scoreStatus !== "available") {
      throw new Error("Expected an available score.");
    }

    expect(result.score.totalScore).toBe(89.33);
    expect(result.score.components).toHaveLength(3);
    expect(result.score.components[0]).toMatchObject({
      metricKey: "capRate",
      weight: 40,
    });
    expect(result.warnings).toHaveLength(0);
    expect(result.score.reasons.some((reason) => reason.code === "strong_cap_rate")).toBe(
      true,
    );
    expect(
      result.score.reasons.some((reason) => reason.code === "strong_cash_on_cash"),
    ).toBe(true);
    expect(
      result.score.reasons.some((reason) => reason.code === "strong_cash_flow"),
    ).toBe(true);
  });

  it("marks the score unavailable when a weighted metric is missing", () => {
    const result = computePropertyScore({
      propertyKey: "prop-1",
      metrics: {
        ...strongMetricsBundle,
        capRate: {
          status: "missing",
          reasonCode: "missing_rent_estimate",
        },
      },
      config: defaultConfig,
    });

    expect(result.score.scoreStatus).toBe("unavailable");

    if (result.score.scoreStatus !== "unavailable") {
      throw new Error("Expected an unavailable score.");
    }

    expect(result.score.unavailableReasonCodes).toContain("missing_rent_estimate");
    expect(result.warnings.some((warning) => warning.code === "missing_rent_estimate")).toBe(
      true,
    );
  });

  it("marks the score unavailable when a weighted metric is not applicable", () => {
    const result = computePropertyScore({
      propertyKey: "prop-1",
      metrics: {
        ...strongMetricsBundle,
        monthlyCashFlow: {
          status: "not_applicable",
          reasonCode: "cash_flow_disabled",
        },
      },
      config: defaultConfig,
    });

    expect(result.score.scoreStatus).toBe("unavailable");

    if (result.score.scoreStatus !== "unavailable") {
      throw new Error("Expected an unavailable score.");
    }

    expect(result.score.unavailableReasonCodes).toContain("missing_metrics");
  });

  it("scores only metrics with positive weights", () => {
    const result = computePropertyScore({
      propertyKey: "prop-1",
      metrics: {
        capRate: availableMetric(0.08),
        cashOnCashReturn: availableMetric(0.1),
        monthlyCashFlow: {
          status: "missing",
          reasonCode: "missing_rent_estimate",
        },
      },
      config: {
        ...defaultConfig,
        monthlyCashFlowWeight: 0,
      },
    });

    expect(result.score.scoreStatus).toBe("available");

    if (result.score.scoreStatus !== "available") {
      throw new Error("Expected an available score.");
    }

    expect(result.score.components).toHaveLength(2);
    expect(result.score.components.some((component) => component.metricKey === "monthlyCashFlow")).toBe(
      false,
    );
  });

  it("adds supplementary reason codes for expense ratio and rent-to-price", () => {
    const result = computePropertyScore({
      propertyKey: "prop-1",
      metrics: {
        ...strongMetricsBundle,
        estimatedMonthlyIncome: availableMetric(2_000),
        estimatedMonthlyExpenses: availableMetric(1_200),
        grossRentMultiplier: availableMetric(20),
      },
      config: defaultConfig,
    });

    expect(result.score.scoreStatus).toBe("available");

    if (result.score.scoreStatus !== "available") {
      throw new Error("Expected an available score.");
    }

    expect(result.score.reasons.some((reason) => reason.code === "high_expense_ratio")).toBe(
      true,
    );
    expect(result.score.reasons.some((reason) => reason.code === "low_rent_to_price")).toBe(
      true,
    );
  });

  it("reflects higher cap-rate weight in the total score", () => {
    const baseline = computePropertyScore({
      propertyKey: "prop-1",
      metrics: {
        capRate: availableMetric(0.09),
        cashOnCashReturn: availableMetric(0.02),
        monthlyCashFlow: availableMetric(0),
      },
      config: defaultConfig,
    });

    const capRateHeavy = computePropertyScore({
      propertyKey: "prop-1",
      metrics: {
        capRate: availableMetric(0.09),
        cashOnCashReturn: availableMetric(0.02),
        monthlyCashFlow: availableMetric(0),
      },
      config: {
        ...defaultConfig,
        capRateWeight: 90,
        cashOnCashReturnWeight: 5,
        monthlyCashFlowWeight: 5,
      },
    });

    expect(baseline.score.scoreStatus).toBe("available");
    expect(capRateHeavy.score.scoreStatus).toBe("available");

    if (
      baseline.score.scoreStatus !== "available" ||
      capRateHeavy.score.scoreStatus !== "available"
    ) {
      throw new Error("Expected available scores.");
    }

    expect(capRateHeavy.score.totalScore).toBeGreaterThan(baseline.score.totalScore);
  });
});
