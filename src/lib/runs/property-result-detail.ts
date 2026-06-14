import type { MetricBundle, MetricValue } from "@/contracts/domain/analysis";
import type {
  ComparableProperty,
  ComparableSet,
  PropertyListing,
  RentEstimate,
} from "@/contracts/domain/property";
import type { Money } from "@/contracts/domain/primitives";
import type { RunDetailPropertyResult } from "@/contracts/runs/responses";
import { formatMoney, formatNullableCurrencyAmount } from "@/lib/format/money";
import { formatRatioAsPercent } from "@/lib/format/percent";

/**
 * Display helpers for the run property result detail drawer.
 *
 * @see Story 8.3.2 — Build property detail drawer
 */

export const PROPERTY_RESULT_COMPARABLES_PREVIEW_LIMIT = 5;

export type PropertyResultMetricFieldKey = keyof Pick<
  MetricBundle,
  | "capRate"
  | "cashOnCashReturn"
  | "grossRentMultiplier"
  | "monthlyCashFlow"
  | "estimatedMonthlyIncome"
  | "estimatedMonthlyExpenses"
  | "monthlyMortgagePayment"
>;

export type PropertyResultMetricFieldDefinition = {
  key: PropertyResultMetricFieldKey;
  label: string;
  format: "percent" | "currency" | "ratio";
};

export const PROPERTY_RESULT_METRIC_FIELDS: PropertyResultMetricFieldDefinition[] =
  [
    { key: "capRate", label: "Cap rate", format: "percent" },
    {
      key: "cashOnCashReturn",
      label: "Cash-on-cash return",
      format: "percent",
    },
    {
      key: "grossRentMultiplier",
      label: "Gross rent multiplier",
      format: "ratio",
    },
    { key: "monthlyCashFlow", label: "Monthly cash flow", format: "currency" },
    {
      key: "estimatedMonthlyIncome",
      label: "Estimated monthly income",
      format: "currency",
    },
    {
      key: "estimatedMonthlyExpenses",
      label: "Estimated monthly expenses",
      format: "currency",
    },
    {
      key: "monthlyMortgagePayment",
      label: "Monthly mortgage payment",
      format: "currency",
    },
  ];

export type PropertyFactDisplayItem = {
  label: string;
  value: string;
};

export type MetricDisplayItem = {
  label: string;
  value: string;
  detail: string | null;
};

export function formatPropertyFactValue(value: string | number): string {
  return typeof value === "number" ? value.toLocaleString() : value;
}

export function formatNullableMoney(money: Money | undefined): string {
  return money ? formatMoney(money) : "Not available";
}

export function formatComparableAddress(comparable: ComparableProperty): string {
  return comparable.address?.line1 ?? comparable.propertyKey ?? "Unknown property";
}

export function formatComparablePrice(comparable: ComparableProperty): string {
  if (comparable.soldPrice) {
    return formatMoney(comparable.soldPrice);
  }

  if (comparable.rentPrice) {
    return `${formatMoney(comparable.rentPrice)}/mo`;
  }

  return "—";
}

export function formatNullableDistanceMiles(
  distanceMiles: number | undefined,
): string {
  if (distanceMiles === undefined) {
    return "—";
  }

  return `${distanceMiles.toFixed(2)} mi`;
}

export function getPropertyFactItems(
  propertyResult: RunDetailPropertyResult,
): PropertyFactDisplayItem[] {
  const detail = propertyResult.detail;
  const listing = propertyResult.listing;
  const items: PropertyFactDisplayItem[] = [];

  const propertyType = detail?.propertyType ?? listing?.propertyType;
  if (propertyType) {
    items.push({ label: "Property type", value: propertyType });
  }

  if (detail?.bedrooms !== undefined) {
    items.push({
      label: "Bedrooms",
      value: formatPropertyFactValue(detail.bedrooms),
    });
  }

  if (detail?.bathrooms !== undefined) {
    items.push({
      label: "Bathrooms",
      value: formatPropertyFactValue(detail.bathrooms),
    });
  }

  if (detail?.livingAreaSqft !== undefined) {
    items.push({
      label: "Living area",
      value: `${formatPropertyFactValue(detail.livingAreaSqft)} sq ft`,
    });
  }

  if (detail?.lotSizeSqft !== undefined) {
    items.push({
      label: "Lot size",
      value: `${formatPropertyFactValue(detail.lotSizeSqft)} sq ft`,
    });
  }

  if (detail?.yearBuilt !== undefined) {
    items.push({
      label: "Year built",
      value: formatPropertyFactValue(detail.yearBuilt),
    });
  }

  if (listing?.listPrice) {
    items.push({
      label: "List price",
      value: formatMoney(listing.listPrice),
    });
  }

  if (listing?.listingStatus) {
    items.push({
      label: "Listing status",
      value: formatListingStatus(listing.listingStatus),
    });
  }

  if (detail?.lastSalePrice) {
    items.push({
      label: "Last sale price",
      value: formatMoney(detail.lastSalePrice),
    });
  }

  if (detail?.taxAssessedValue) {
    items.push({
      label: "Tax assessed value",
      value: formatMoney(detail.taxAssessedValue),
    });
  }

  if (detail?.hoaFee) {
    items.push({
      label: "HOA fee",
      value: `${formatMoney(detail.hoaFee)}/mo`,
    });
  }

  return items;
}

export function getMetricDisplayItems(
  metrics: MetricBundle | null,
): MetricDisplayItem[] {
  if (!metrics) {
    return [];
  }

  return PROPERTY_RESULT_METRIC_FIELDS.map((field) => {
    const metric = metrics[field.key];
    return {
      label: field.label,
      ...formatMetricValue(metric, field.format),
    };
  });
}

export function getComparablesPreview(
  comparables: ComparableSet | null,
): ComparableProperty[] {
  if (!comparables) {
    return [];
  }

  return comparables.comparables.slice(
    0,
    PROPERTY_RESULT_COMPARABLES_PREVIEW_LIMIT,
  );
}

export function hasRentEstimateSection(
  rentEstimate: RentEstimate | null,
): rentEstimate is RentEstimate {
  return rentEstimate !== null;
}

export function hasComparablesSection(
  comparables: ComparableSet | null,
): comparables is ComparableSet {
  return comparables !== null;
}

export function hasPropertyFactsSection(
  propertyResult: RunDetailPropertyResult,
): boolean {
  return getPropertyFactItems(propertyResult).length > 0;
}

export function hasMetricsSection(propertyResult: RunDetailPropertyResult): boolean {
  return propertyResult.metrics !== null;
}

export function hasScoreSection(propertyResult: RunDetailPropertyResult): boolean {
  return propertyResult.score !== null || propertyResult.totalScore !== null;
}

function formatMetricValue(
  metric: MetricValue | undefined,
  format: PropertyResultMetricFieldDefinition["format"],
): { value: string; detail: string | null } {
  if (!metric) {
    return { value: "—", detail: null };
  }

  if (metric.status !== "available") {
    return {
      value: "—",
      detail: formatMetricReasonCode(metric.reasonCode),
    };
  }

  switch (format) {
    case "percent":
      return { value: formatRatioAsPercent(metric.value), detail: null };
    case "currency":
      return {
        value: formatNullableCurrencyAmount(metric.value),
        detail: null,
      };
    case "ratio":
      return { value: metric.value.toFixed(2), detail: null };
  }
}

function formatMetricReasonCode(reasonCode: string): string {
  return reasonCode.replaceAll("_", " ");
}

function formatListingStatus(
  status: NonNullable<PropertyListing["listingStatus"]>,
): string {
  switch (status) {
    case "for_sale":
      return "For sale";
    case "pending":
      return "Pending";
    case "sold":
      return "Sold";
    case "off_market":
      return "Off market";
    case "other":
      return "Other";
  }
}

export function formatNullableScore(score: number | null): string {
  if (score === null) {
    return "—";
  }

  return Number.isInteger(score) ? String(score) : score.toFixed(2);
}
