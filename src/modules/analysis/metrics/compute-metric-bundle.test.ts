import { describe, expect, it } from "vitest";

import { calculateMetricsConfigSchema } from "@/modules/tools/definitions/calculate-metrics";
import { computeMetricBundle } from "@/modules/analysis/metrics/compute-metric-bundle";
import {
  calculateMonthlyMortgagePayment,
  calculateGrossRentMultiplier,
} from "@/modules/analysis/metrics/formulas";

const defaultConfig = calculateMetricsConfigSchema.parse({});

const baseDetail = {
  source: {
    provider: "zillow",
    externalId: "12345",
  },
} as const;

describe("formulas", () => {
  it("calculates a standard amortizing mortgage payment", () => {
    const payment = calculateMonthlyMortgagePayment(400_000, 7, 30);

    expect(payment).toBeGreaterThan(2_600);
    expect(payment).toBeLessThan(2_700);
  });

  it("calculates gross rent multiplier from annualized rent", () => {
    expect(calculateGrossRentMultiplier(500_000, 3_500)).toBeCloseTo(11.9048, 4);
  });
});

describe("computeMetricBundle", () => {
  it("computes the launch metric bundle when price and rent are available", () => {
    const result = computeMetricBundle({
      propertyKey: "prop-1",
      detail: baseDetail,
      listing: {
        ...baseDetail,
        listPrice: { amount: "500000.00", currency: "USD" },
      },
      rentEstimate: {
        source: baseDetail.source,
        estimatedRent: { amount: "3500.00", currency: "USD" },
      },
      config: defaultConfig,
    });

    expect(result.warnings).toHaveLength(0);
    expect(result.bundle.estimatedMonthlyIncome).toEqual({
      status: "available",
      value: 3500,
    });
    expect(result.bundle.monthlyMortgagePayment?.status).toBe("available");
    expect(result.bundle.capRate?.status).toBe("available");
    expect(result.bundle.grossRentMultiplier?.status).toBe("available");
    expect(result.bundle.monthlyCashFlow?.status).toBe("available");
    expect(result.bundle.cashOnCashReturn?.status).toBe("available");
  });

  it("marks rent-dependent metrics missing when rent is unavailable", () => {
    const result = computeMetricBundle({
      propertyKey: "prop-1",
      detail: baseDetail,
      listing: {
        ...baseDetail,
        listPrice: { amount: "500000.00", currency: "USD" },
      },
      config: defaultConfig,
    });

    expect(result.warnings.some((warning) => warning.code === "missing_rent_estimate")).toBe(
      true,
    );
    expect(result.bundle.estimatedMonthlyIncome).toEqual({
      status: "missing",
      reasonCode: "missing_rent_estimate",
    });
    expect(result.bundle.capRate).toEqual({
      status: "missing",
      reasonCode: "missing_rent_estimate",
    });
    expect(result.bundle.monthlyMortgagePayment?.status).toBe("available");
  });

  it("marks price-dependent metrics missing when purchase price is unavailable", () => {
    const result = computeMetricBundle({
      propertyKey: "prop-1",
      detail: baseDetail,
      rentEstimate: {
        source: baseDetail.source,
        estimatedRent: { amount: "3500.00", currency: "USD" },
      },
      config: defaultConfig,
    });

    expect(result.warnings.some((warning) => warning.code === "missing_list_price")).toBe(
      true,
    );
    expect(result.bundle.capRate).toEqual({
      status: "missing",
      reasonCode: "missing_list_price",
    });
    expect(result.bundle.estimatedMonthlyIncome?.status).toBe("available");
  });

  it("marks cash-flow metrics not applicable when includeCashFlow is false", () => {
    const result = computeMetricBundle({
      propertyKey: "prop-1",
      detail: baseDetail,
      listing: {
        ...baseDetail,
        listPrice: { amount: "500000.00", currency: "USD" },
      },
      rentEstimate: {
        source: baseDetail.source,
        estimatedRent: { amount: "3500.00", currency: "USD" },
      },
      config: {
        ...defaultConfig,
        includeCashFlow: false,
      },
    });

    expect(result.bundle.monthlyCashFlow).toEqual({
      status: "not_applicable",
      reasonCode: "cash_flow_disabled",
    });
    expect(result.bundle.cashOnCashReturn).toEqual({
      status: "not_applicable",
      reasonCode: "cash_flow_disabled",
    });
    expect(result.bundle.capRate?.status).toBe("available");
  });

  it("marks mortgage payment not applicable for all-cash purchases", () => {
    const result = computeMetricBundle({
      propertyKey: "prop-1",
      detail: baseDetail,
      listing: {
        ...baseDetail,
        listPrice: { amount: "500000.00", currency: "USD" },
      },
      rentEstimate: {
        source: baseDetail.source,
        estimatedRent: { amount: "3500.00", currency: "USD" },
      },
      config: {
        ...defaultConfig,
        downPaymentPercent: 100,
      },
    });

    expect(result.bundle.monthlyMortgagePayment).toEqual({
      status: "not_applicable",
      reasonCode: "missing_loan_assumptions",
    });
    expect(result.bundle.monthlyCashFlow?.status).toBe("available");
    expect(result.bundle.cashOnCashReturn?.status).toBe("available");
  });

  it("falls back to last sale price when list price is missing", () => {
    const result = computeMetricBundle({
      propertyKey: "prop-1",
      detail: {
        ...baseDetail,
        lastSalePrice: { amount: "480000.00", currency: "USD" },
      },
      rentEstimate: {
        source: baseDetail.source,
        estimatedRent: { amount: "3200.00", currency: "USD" },
      },
      config: defaultConfig,
    });

    expect(result.warnings).toHaveLength(0);
    expect(result.bundle.grossRentMultiplier?.status).toBe("available");
  });
});
