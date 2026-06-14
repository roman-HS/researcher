import type {
  MetricBundle,
  MetricReasonCode,
  MetricValue,
  PropertyScore,
  ScoreReason,
  ScoreReasonCode,
  ScoreComponent,
} from "@/contracts/domain/analysis";
import {
  CAP_RATE_SCORE_MAX,
  CAP_RATE_SCORE_MIN,
  CAP_RATE_STRONG_THRESHOLD,
  CAP_RATE_WEAK_THRESHOLD,
  CASH_ON_CASH_SCORE_MAX,
  CASH_ON_CASH_SCORE_MIN,
  CASH_ON_CASH_STRONG_THRESHOLD,
  CASH_ON_CASH_WEAK_THRESHOLD,
  HIGH_EXPENSE_RATIO_THRESHOLD,
  LOW_RENT_TO_PRICE_THRESHOLD,
  MONTHLY_CASH_FLOW_SCORE_MAX,
  MONTHLY_CASH_FLOW_SCORE_MIN,
  MONTHLY_CASH_FLOW_STRONG_THRESHOLD,
  MONTHLY_CASH_FLOW_WEAK_THRESHOLD,
} from "@/modules/analysis/scoring/benchmarks";
import {
  normalizeLinearClamp,
  roundScore,
} from "@/modules/analysis/scoring/normalize-metric-score";
import type { ScorePropertiesResolvedConfig } from "@/modules/tools/definitions/score-properties";

/**
 * Deterministic property scoring from upstream metric bundles.
 *
 * @see Story 6.4.2 — Implement Property Scoring executor
 */

export const SCORECARD_METRIC_KEYS = [
  "capRate",
  "cashOnCashReturn",
  "monthlyCashFlow",
] as const;

export type ScorecardMetricKey = (typeof SCORECARD_METRIC_KEYS)[number];

type ScorecardMetricDefinition = {
  metricKey: ScorecardMetricKey;
  weightConfigKey:
    | "capRateWeight"
    | "cashOnCashReturnWeight"
    | "monthlyCashFlowWeight";
  normalize: (value: number) => number;
  evaluateStrength: (value: number) => ScoreReasonCode[];
};

const SCORECARD_METRICS: ScorecardMetricDefinition[] = [
  {
    metricKey: "capRate",
    weightConfigKey: "capRateWeight",
    normalize: (value) =>
      normalizeLinearClamp(value, CAP_RATE_SCORE_MIN, CAP_RATE_SCORE_MAX),
    evaluateStrength: (value) =>
      evaluateThresholdReasons(
        value,
        CAP_RATE_STRONG_THRESHOLD,
        CAP_RATE_WEAK_THRESHOLD,
        "strong_cap_rate",
        "weak_cap_rate",
      ),
  },
  {
    metricKey: "cashOnCashReturn",
    weightConfigKey: "cashOnCashReturnWeight",
    normalize: (value) =>
      normalizeLinearClamp(
        value,
        CASH_ON_CASH_SCORE_MIN,
        CASH_ON_CASH_SCORE_MAX,
      ),
    evaluateStrength: (value) =>
      evaluateThresholdReasons(
        value,
        CASH_ON_CASH_STRONG_THRESHOLD,
        CASH_ON_CASH_WEAK_THRESHOLD,
        "strong_cash_on_cash",
        "weak_cash_on_cash",
      ),
  },
  {
    metricKey: "monthlyCashFlow",
    weightConfigKey: "monthlyCashFlowWeight",
    normalize: (value) =>
      normalizeLinearClamp(
        value,
        MONTHLY_CASH_FLOW_SCORE_MIN,
        MONTHLY_CASH_FLOW_SCORE_MAX,
      ),
    evaluateStrength: (value) =>
      evaluateThresholdReasons(
        value,
        MONTHLY_CASH_FLOW_STRONG_THRESHOLD,
        MONTHLY_CASH_FLOW_WEAK_THRESHOLD,
        "strong_cash_flow",
        "weak_cash_flow",
      ),
  },
];

export type ComputePropertyScoreInput = {
  propertyKey: string;
  metrics: MetricBundle;
  config: ScorePropertiesResolvedConfig;
};

export type ComputePropertyScoreResult = {
  score: PropertyScore;
  warnings: ComputePropertyScoreWarning[];
};

export type ComputePropertyScoreWarning = {
  code: ScoreReasonCode;
  message: string;
};

export function computePropertyScore(
  input: ComputePropertyScoreInput,
): ComputePropertyScoreResult {
  const { propertyKey, metrics, config } = input;
  const linkage = {
    propertyKey,
    subjectSource: metrics.subjectSource,
  };

  const activeMetrics = SCORECARD_METRICS.filter(
    (definition) => config[definition.weightConfigKey] > 0,
  );

  if (activeMetrics.length === 0) {
    return unavailableResult(linkage, ["missing_metrics"], [
      {
        code: "missing_metrics",
        message: "No scorecard component weights are configured.",
      },
    ]);
  }

  const totalRawWeight = activeMetrics.reduce(
    (sum, definition) => sum + config[definition.weightConfigKey],
    0,
  );

  const unavailableReasonCodes = new Set<ScoreReasonCode>();
  const components: ScoreComponent[] = [];
  const componentReasonCodes = new Set<ScoreReasonCode>();
  let totalScore = 0;

  for (const definition of activeMetrics) {
    const metricValue = metrics[definition.metricKey];
    const normalizedWeight =
      config[definition.weightConfigKey] / totalRawWeight;

    if (!isMetricAvailable(metricValue)) {
      collectUnavailableReason(metricValue, unavailableReasonCodes);
      continue;
    }

    const componentScore = definition.normalize(metricValue.value);
    const contribution = roundScore(normalizedWeight * componentScore);
    const reasonCodes = definition.evaluateStrength(metricValue.value);

    for (const reasonCode of reasonCodes) {
      componentReasonCodes.add(reasonCode);
    }

    totalScore += contribution;

    components.push({
      metricKey: definition.metricKey,
      weight: roundScore(normalizedWeight * 100),
      contribution,
      ...(reasonCodes.length > 0 ? { reasonCodes } : {}),
    });
  }

  if (unavailableReasonCodes.size > 0) {
    const warnings = [...unavailableReasonCodes].map((code) => ({
      code,
      message: unavailableReasonMessage(code),
    }));

    return unavailableResult(
      linkage,
      [...unavailableReasonCodes],
      warnings,
      components,
    );
  }

  const supplementaryReasonCodes = collectSupplementaryReasonCodes(metrics);
  const allReasonCodes = new Set([
    ...componentReasonCodes,
    ...supplementaryReasonCodes,
  ]);

  return {
    score: {
      scoreStatus: "available",
      ...linkage,
      totalScore: roundScore(totalScore),
      components,
      reasons: buildReasons(allReasonCodes),
    },
    warnings: [],
  };
}

function isMetricAvailable(
  metricValue: MetricValue | undefined,
): metricValue is Extract<MetricValue, { status: "available" }> {
  return metricValue?.status === "available";
}

function collectUnavailableReason(
  metricValue: MetricValue | undefined,
  unavailableReasonCodes: Set<ScoreReasonCode>,
): void {
  if (metricValue?.status === "missing") {
    unavailableReasonCodes.add(
      mapMetricReasonToScoreReason(metricValue.reasonCode),
    );
    return;
  }

  unavailableReasonCodes.add("missing_metrics");
}

function mapMetricReasonToScoreReason(
  reasonCode: MetricReasonCode,
): ScoreReasonCode {
  if (reasonCode === "missing_rent_estimate") {
    return "missing_rent_estimate";
  }

  if (reasonCode === "missing_list_price") {
    return "missing_list_price";
  }

  return "missing_metrics";
}

function evaluateThresholdReasons(
  value: number,
  strongThreshold: number,
  weakThreshold: number,
  strongCode: ScoreReasonCode,
  weakCode: ScoreReasonCode,
): ScoreReasonCode[] {
  if (value >= strongThreshold) {
    return [strongCode];
  }

  if (value < weakThreshold) {
    return [weakCode];
  }

  return [];
}

function collectSupplementaryReasonCodes(
  metrics: MetricBundle,
): Set<ScoreReasonCode> {
  const reasonCodes = new Set<ScoreReasonCode>();

  if (hasHighExpenseRatio(metrics)) {
    reasonCodes.add("high_expense_ratio");
  }

  if (hasLowRentToPrice(metrics)) {
    reasonCodes.add("low_rent_to_price");
  }

  return reasonCodes;
}

function hasHighExpenseRatio(metrics: MetricBundle): boolean {
  const income = metrics.estimatedMonthlyIncome;
  const expenses = metrics.estimatedMonthlyExpenses;

  if (income?.status !== "available" || expenses?.status !== "available") {
    return false;
  }

  if (income.value <= 0) {
    return false;
  }

  return expenses.value / income.value > HIGH_EXPENSE_RATIO_THRESHOLD;
}

function hasLowRentToPrice(metrics: MetricBundle): boolean {
  const grossRentMultiplier = metrics.grossRentMultiplier;

  if (grossRentMultiplier?.status !== "available") {
    return false;
  }

  if (grossRentMultiplier.value <= 0) {
    return false;
  }

  return 1 / grossRentMultiplier.value < LOW_RENT_TO_PRICE_THRESHOLD;
}

function buildReasons(reasonCodes: Set<ScoreReasonCode>): ScoreReason[] {
  return [...reasonCodes].map((code) => ({
    code,
    severity: reasonSeverity(code),
    message: reasonMessage(code),
  }));
}

function reasonSeverity(code: ScoreReasonCode): ScoreReason["severity"] {
  if (code.startsWith("strong_")) {
    return "positive";
  }

  if (
    code.startsWith("weak_") ||
    code === "high_expense_ratio" ||
    code === "low_rent_to_price" ||
    code.startsWith("missing_")
  ) {
    return "negative";
  }

  return "neutral";
}

function reasonMessage(code: ScoreReasonCode): string {
  switch (code) {
    case "strong_cap_rate":
      return "Cap rate is strong relative to the V1 benchmark.";
    case "weak_cap_rate":
      return "Cap rate is weak relative to the V1 benchmark.";
    case "strong_cash_on_cash":
      return "Cash-on-cash return is strong relative to the V1 benchmark.";
    case "weak_cash_on_cash":
      return "Cash-on-cash return is weak relative to the V1 benchmark.";
    case "strong_cash_flow":
      return "Monthly cash flow is strong relative to the V1 benchmark.";
    case "weak_cash_flow":
      return "Monthly cash flow is weak relative to the V1 benchmark.";
    case "high_expense_ratio":
      return "Estimated expenses exceed 50% of gross monthly rent.";
    case "low_rent_to_price":
      return "Estimated annual rent is below 6% of purchase price.";
    case "missing_rent_estimate":
      return "Score is unavailable because rent-dependent metrics are missing.";
    case "missing_list_price":
      return "Score is unavailable because price-dependent metrics are missing.";
    case "missing_metrics":
      return "Score is unavailable because required metrics are missing.";
    default:
      return code;
  }
}

function unavailableReasonMessage(code: ScoreReasonCode): string {
  return reasonMessage(code);
}

function unavailableResult(
  linkage: {
    propertyKey: string;
    subjectSource: MetricBundle["subjectSource"];
  },
  unavailableReasonCodes: ScoreReasonCode[],
  warnings: ComputePropertyScoreWarning[],
  components?: ScoreComponent[],
): ComputePropertyScoreResult {
  return {
    score: {
      scoreStatus: "unavailable",
      ...linkage,
      unavailableReasonCodes,
      ...(components && components.length > 0 ? { components } : {}),
      reasons: buildReasons(new Set(unavailableReasonCodes)),
    },
    warnings,
  };
}
