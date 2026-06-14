import type { Address } from "@/contracts/domain/primitives";
import type { AreaGroupingLevel } from "@/contracts/domain/analysis";

/**
 * Resolve a stable area key from property address data.
 *
 * @see Story 6.4.3 — Implement Area Aggregation executor
 */

export type ResolveAreaKeyResult =
  | {
      status: "resolved";
      areaKey: string;
      groupingLevel: "zip" | "city";
      warnings: string[];
    }
  | {
      status: "missing";
      warnings: string[];
    };

export function resolveAreaKey(
  groupingLevel: AreaGroupingLevel,
  address: Address | undefined,
): ResolveAreaKeyResult {
  const effectiveGroupingLevel = groupingLevel === "city" ? "city" : "zip";

  if (effectiveGroupingLevel === "zip") {
    const postalCode = address?.postalCode?.trim();

    if (!postalCode) {
      return {
        status: "missing",
        warnings: ["Property is missing postalCode required for ZIP grouping."],
      };
    }

    return {
      status: "resolved",
      areaKey: postalCode,
      groupingLevel: "zip",
      warnings: [],
    };
  }

  const city = address?.city?.trim();

  if (!city) {
    return {
      status: "missing",
      warnings: ["Property is missing city required for city grouping."],
    };
  }

  const state = address?.state?.trim().toUpperCase();
  const warnings: string[] = [];

  if (!state) {
    warnings.push(
      "Property city grouping key omits state; the area key may be ambiguous.",
    );
  }

  return {
    status: "resolved",
    areaKey: state ? `${city}|${state}` : city,
    groupingLevel: "city",
    warnings,
  };
}
