import type {
  MetricBundle,
  MetricReasonCode,
  MetricValue,
} from "@/contracts/domain/analysis";
import type {
  PropertyDetail,
  PropertyListing,
  RentEstimate,
} from "@/contracts/domain/property";
import type { CalculateMetricsResolvedConfig } from "@/modules/tools/definitions/calculate-metrics";

import {
  calculateCapRate,
  calculateCashOnCashReturn,
  calculateGrossRentMultiplier,
  calculateMonthlyHoa,
  calculateMonthlyMortgagePayment,
  calculateMonthlyPropertyTax,
  calculateRentBasedExpense,
  parseMoneyAmount,
  roundMoney,
} from "@/modules/analysis/metrics/formulas";

/**
 * Deterministic metric bundle computation for one property.
 *
 * @see Story 6.4.1 — Implement Metrics Calculation executor
 */

export const LAUNCH_METRIC_KEYS = [
  "capRate",
  "cashOnCashReturn",
  "grossRentMultiplier",
  "monthlyCashFlow",
  "estimatedMonthlyIncome",
  "estimatedMonthlyExpenses",
  "monthlyMortgagePayment",
] as const;

export type LaunchMetricKey = (typeof LAUNCH_METRIC_KEYS)[number];

export type ComputeMetricBundleInput = {
  propertyKey: string;
  detail: PropertyDetail;
  listing?: PropertyListing;
  rentEstimate?: RentEstimate;
  config: CalculateMetricsResolvedConfig;
};

export type ComputeMetricBundleResult = {
  bundle: MetricBundle;
  warnings: ComputeMetricBundleWarning[];
};

export type ComputeMetricBundleWarning = {
  code: string;
  message: string;
};

export function computeMetricBundle(
  input: ComputeMetricBundleInput,
): ComputeMetricBundleResult {
  const { propertyKey, detail, listing, rentEstimate, config } = input;
  const warnings: ComputeMetricBundleWarning[] = [];
  const missingMetricCodes: LaunchMetricKey[] = [];

  const purchasePrice = resolvePurchasePrice(listing, detail);

  if (purchasePrice === undefined) {
    warnings.push({
      code: "missing_list_price",
      message:
        "No list price or last sale price is available for this property.",
    });
  }

  const grossMonthlyRent = resolveGrossMonthlyRent(rentEstimate);

  if (grossMonthlyRent === undefined) {
    warnings.push({
      code: "missing_rent_estimate",
      message: "No rent estimate is available for this property.",
    });
  }

  const estimatedMonthlyIncome = buildMetricValue(
    grossMonthlyRent,
    "missing_rent_estimate",
    (rent) => available(roundMoney(rent)),
    missingMetricCodes,
    "estimatedMonthlyIncome",
  );

  const monthlyMortgagePayment = buildMortgageMetric(
    purchasePrice,
    config,
    missingMetricCodes,
  );

  const operatingExpenses = buildOperatingExpenses(
    purchasePrice,
    grossMonthlyRent,
    detail,
    config,
  );

  const estimatedMonthlyExpenses = buildEstimatedMonthlyExpensesMetric(
    operatingExpenses,
    monthlyMortgagePayment,
    missingMetricCodes,
  );

  const capRate = buildCapRateMetric(
    purchasePrice,
    grossMonthlyRent,
    operatingExpenses,
    missingMetricCodes,
  );

  const grossRentMultiplier = buildMetricValue(
    purchasePrice !== undefined && grossMonthlyRent !== undefined
      ? { purchasePrice, grossMonthlyRent }
      : undefined,
    purchasePrice === undefined ? "missing_list_price" : "missing_rent_estimate",
    ({ purchasePrice: price, grossMonthlyRent: rent }) =>
      available(calculateGrossRentMultiplier(price, rent)),
    missingMetricCodes,
    "grossRentMultiplier",
  );

  const monthlyCashFlow = buildCashFlowMetric(
    config.includeCashFlow,
    grossMonthlyRent,
    operatingExpenses,
    monthlyMortgagePayment,
    missingMetricCodes,
    "monthlyCashFlow",
  );

  const cashOnCashReturn = buildCashOnCashMetric(
    config,
    purchasePrice,
    grossMonthlyRent,
    operatingExpenses,
    monthlyMortgagePayment,
    missingMetricCodes,
  );

  const bundleWarnings =
    warnings.length > 0
      ? warnings.map((warning) => warning.message)
      : undefined;

  return {
    bundle: {
      propertyKey,
      subjectSource: detail.source,
      capRate,
      cashOnCashReturn,
      grossRentMultiplier,
      monthlyCashFlow,
      estimatedMonthlyIncome,
      estimatedMonthlyExpenses,
      monthlyMortgagePayment,
      ...(bundleWarnings ? { warnings: bundleWarnings } : {}),
      ...(missingMetricCodes.length > 0
        ? { missingMetricCodes: [...missingMetricCodes] }
        : {}),
    },
    warnings,
  };
}

function resolvePurchasePrice(
  listing: PropertyListing | undefined,
  detail: PropertyDetail,
): number | undefined {
  if (listing?.listPrice) {
    return parseMoneyAmount(listing.listPrice);
  }

  if (detail.lastSalePrice) {
    return parseMoneyAmount(detail.lastSalePrice);
  }

  return undefined;
}

function resolveGrossMonthlyRent(
  rentEstimate: RentEstimate | undefined,
): number | undefined {
  if (!rentEstimate?.estimatedRent) {
    return undefined;
  }

  return parseMoneyAmount(rentEstimate.estimatedRent);
}

type OperatingExpenses = {
  vacancy: number;
  repairs: number;
  propertyManagement: number;
  insurance: number;
  hoa: number;
  propertyTax: number;
  totalWithoutMortgage: number;
};

function buildOperatingExpenses(
  purchasePrice: number | undefined,
  grossMonthlyRent: number | undefined,
  detail: PropertyDetail,
  config: CalculateMetricsResolvedConfig,
): OperatingExpenses | undefined {
  if (grossMonthlyRent === undefined) {
    return undefined;
  }

  const vacancy = calculateRentBasedExpense(
    grossMonthlyRent,
    config.vacancyRate,
  );
  const repairs = calculateRentBasedExpense(grossMonthlyRent, config.repairsRate);
  const propertyManagement = calculateRentBasedExpense(
    grossMonthlyRent,
    config.propertyManagementRate,
  );
  const insurance = roundMoney(config.monthlyInsurance);
  const hoa = calculateMonthlyHoa(config.monthlyHoa, detail.hoaFee);
  const propertyTax = detail.taxAssessedValue
    ? roundMoney(parseMoneyAmount(detail.taxAssessedValue) / 12)
    : purchasePrice === undefined
      ? 0
      : calculateMonthlyPropertyTax(
          purchasePrice,
          config.propertyTaxRate,
          detail.taxAssessedValue,
        );

  const totalWithoutMortgage = roundMoney(
    vacancy +
      repairs +
      propertyManagement +
      insurance +
      hoa +
      propertyTax,
  );

  return {
    vacancy,
    repairs,
    propertyManagement,
    insurance,
    hoa,
    propertyTax,
    totalWithoutMortgage,
  };
}

function buildMortgageMetric(
  purchasePrice: number | undefined,
  config: CalculateMetricsResolvedConfig,
  missingMetricCodes: LaunchMetricKey[],
): MetricValue {
  if (purchasePrice === undefined) {
    missingMetricCodes.push("monthlyMortgagePayment");
    return missing("missing_list_price");
  }

  if (config.downPaymentPercent >= 100) {
    return notApplicable("missing_loan_assumptions");
  }

  const loanAmount =
    purchasePrice * (1 - config.downPaymentPercent / 100);
  const payment = calculateMonthlyMortgagePayment(
    loanAmount,
    config.interestRateAnnual,
    config.loanTermYears,
  );

  return available(payment);
}

function buildEstimatedMonthlyExpensesMetric(
  operatingExpenses: OperatingExpenses | undefined,
  monthlyMortgagePayment: MetricValue,
  missingMetricCodes: LaunchMetricKey[],
): MetricValue {
  if (operatingExpenses === undefined) {
    missingMetricCodes.push("estimatedMonthlyExpenses");
    return missing("missing_rent_estimate");
  }

  const mortgageComponent =
    monthlyMortgagePayment.status === "available"
      ? monthlyMortgagePayment.value
      : 0;

  return available(
    roundMoney(operatingExpenses.totalWithoutMortgage + mortgageComponent),
  );
}

function buildCapRateMetric(
  purchasePrice: number | undefined,
  grossMonthlyRent: number | undefined,
  operatingExpenses: OperatingExpenses | undefined,
  missingMetricCodes: LaunchMetricKey[],
): MetricValue {
  if (purchasePrice === undefined) {
    missingMetricCodes.push("capRate");
    return missing("missing_list_price");
  }

  if (grossMonthlyRent === undefined || operatingExpenses === undefined) {
    missingMetricCodes.push("capRate");
    return missing("missing_rent_estimate");
  }

  const netOperatingIncomeMonthly = roundMoney(
    grossMonthlyRent - operatingExpenses.totalWithoutMortgage,
  );

  return available(
    calculateCapRate(purchasePrice, netOperatingIncomeMonthly * 12),
  );
}

function buildCashFlowMetric(
  includeCashFlow: boolean,
  grossMonthlyRent: number | undefined,
  operatingExpenses: OperatingExpenses | undefined,
  monthlyMortgagePayment: MetricValue,
  missingMetricCodes: LaunchMetricKey[],
  metricKey: LaunchMetricKey,
): MetricValue {
  if (!includeCashFlow) {
    return notApplicable("cash_flow_disabled");
  }

  const cashFlow = computeMonthlyCashFlowAmount(
    grossMonthlyRent,
    operatingExpenses,
    monthlyMortgagePayment,
  );

  if (cashFlow === undefined) {
    missingMetricCodes.push(metricKey);
    return missing("missing_rent_estimate");
  }

  return available(cashFlow);
}

function buildCashOnCashMetric(
  config: CalculateMetricsResolvedConfig,
  purchasePrice: number | undefined,
  grossMonthlyRent: number | undefined,
  operatingExpenses: OperatingExpenses | undefined,
  monthlyMortgagePayment: MetricValue,
  missingMetricCodes: LaunchMetricKey[],
): MetricValue {
  if (!config.includeCashFlow) {
    return notApplicable("cash_flow_disabled");
  }

  const monthlyCashFlow = computeMonthlyCashFlowAmount(
    grossMonthlyRent,
    operatingExpenses,
    monthlyMortgagePayment,
  );

  if (monthlyCashFlow === undefined) {
    missingMetricCodes.push("cashOnCashReturn");
    return missing("missing_rent_estimate");
  }

  if (purchasePrice === undefined) {
    missingMetricCodes.push("cashOnCashReturn");
    return missing("missing_list_price");
  }

  const downPayment = purchasePrice * (config.downPaymentPercent / 100);
  const closingCosts = purchasePrice * (config.closingCostsRate / 100);
  const cashInvested = roundMoney(downPayment + closingCosts);

  if (cashInvested <= 0) {
    missingMetricCodes.push("cashOnCashReturn");
    return missing("missing_list_price");
  }

  return available(
    calculateCashOnCashReturn(cashInvested, monthlyCashFlow * 12),
  );
}

function computeMonthlyCashFlowAmount(
  grossMonthlyRent: number | undefined,
  operatingExpenses: OperatingExpenses | undefined,
  monthlyMortgagePayment: MetricValue,
): number | undefined {
  if (grossMonthlyRent === undefined || operatingExpenses === undefined) {
    return undefined;
  }

  const mortgageComponent =
    monthlyMortgagePayment.status === "available"
      ? monthlyMortgagePayment.value
      : 0;

  return roundMoney(
    grossMonthlyRent -
      operatingExpenses.totalWithoutMortgage -
      mortgageComponent,
  );
}

function buildMetricValue<T>(
  input: T | undefined,
  missingReasonCode: MetricReasonCode,
  compute: (value: T) => MetricValue,
  missingMetricCodes: LaunchMetricKey[],
  metricKey: LaunchMetricKey,
): MetricValue {
  if (input === undefined) {
    missingMetricCodes.push(metricKey);
    return missing(missingReasonCode);
  }

  return compute(input);
}

function available(value: number): MetricValue {
  return { status: "available", value };
}

function missing(reasonCode: MetricReasonCode): MetricValue {
  return { status: "missing", reasonCode };
}

function notApplicable(reasonCode: MetricReasonCode): MetricValue {
  return { status: "not_applicable", reasonCode };
}
