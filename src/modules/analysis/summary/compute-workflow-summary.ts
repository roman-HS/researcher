import type {
  AreaAggregate,
  MetricBundle,
  PropertyScore,
  ScoreReasonCode,
  SummarySection,
  TopPropertySummary,
  WorkflowSummary,
} from "@/contracts/domain/analysis";
import type { PropertyDetail, PropertyListing } from "@/contracts/domain/property";
import type { Address } from "@/contracts/domain/primitives";
import type {
  GenerateSummaryResolvedConfig,
  SummarySectionKey,
} from "@/modules/tools/definitions/generate-summary";

/**
 * Deterministic workflow summary from the execution working set.
 *
 * @see Story 6.4.4 — Implement Summary executor
 */

const AREA_HIGHLIGHT_LIMIT = 5;
const POSITIVE_HIGHLIGHT_LIMIT = 2;

const SECTION_TITLES: Record<SummarySectionKey, string> = {
  overview: "Overview",
  topProperties: "Top properties",
  areaHighlights: "Area highlights",
  warningsAndNotes: "Warnings and missing data",
};

export type ComputeWorkflowSummaryInput = {
  propertyOrder: readonly string[];
  metricsByKey: Readonly<Record<string, MetricBundle>>;
  scoresByKey: Readonly<Record<string, PropertyScore>>;
  areaAggregatesByKey: Readonly<Record<string, AreaAggregate>>;
  detailsByKey: Readonly<Record<string, PropertyDetail>>;
  listingsByKey: Readonly<Record<string, PropertyListing>>;
  config: GenerateSummaryResolvedConfig;
};

export type ComputeWorkflowSummaryWarning = {
  code: string;
  message: string;
};

export type ComputeWorkflowSummaryResult = {
  summary: WorkflowSummary;
  warnings: ComputeWorkflowSummaryWarning[];
};

export function computeWorkflowSummary(
  input: ComputeWorkflowSummaryInput,
): ComputeWorkflowSummaryResult {
  const warnings: ComputeWorkflowSummaryWarning[] = [];
  const topProperties = buildTopProperties(input, warnings);
  const summaryWarnings = collectSummaryWarnings(input, topProperties.excludedCount);
  const missingDataNotes = collectMissingDataNotes(input);
  const sections = buildSections(
    input,
    topProperties.items,
    summaryWarnings,
    missingDataNotes,
    warnings,
  );

  const summary: WorkflowSummary = {
    title: input.config.title,
    sections,
    topProperties: topProperties.items,
    warnings: summaryWarnings,
    missingDataNotes,
    ...(input.config.includeMarkdown
      ? { markdown: renderMarkdown(input.config.title, sections) }
      : {}),
  };

  return { summary, warnings };
}

type TopPropertiesResult = {
  items: TopPropertySummary[];
  excludedCount: number;
};

function buildTopProperties(
  input: ComputeWorkflowSummaryInput,
  warnings: ComputeWorkflowSummaryWarning[],
): TopPropertiesResult {
  const scoredEntries = input.propertyOrder.flatMap((propertyKey, index) => {
    const score = input.scoresByKey[propertyKey];

    if (!score || score.scoreStatus !== "available") {
      return [];
    }

    return [{ propertyKey, score, orderIndex: index }];
  });

  const excludedCount = input.propertyOrder.filter((propertyKey) => {
    const score = input.scoresByKey[propertyKey];
    return score !== undefined && score.scoreStatus === "unavailable";
  }).length;

  const ranked = scoredEntries.sort((left, right) => {
    if (left.score.totalScore !== right.score.totalScore) {
      return right.score.totalScore - left.score.totalScore;
    }

    return left.orderIndex - right.orderIndex;
  });

  const items = ranked.slice(0, input.config.topPropertyCount).map((entry, index) => ({
    propertyKey: entry.propertyKey,
    subjectSource: entry.score.subjectSource,
    rank: index + 1,
    score: entry.score.totalScore,
    highlightReasonCodes: selectPositiveHighlightReasons(entry.score),
  }));

  if (
    input.config.includedSections.includes("topProperties") &&
    items.length === 0
  ) {
    warnings.push({
      code: "no_scored_properties",
      message:
        "Top properties section is enabled, but no scored properties are available.",
    });
  }

  return { items, excludedCount };
}

function selectPositiveHighlightReasons(score: Extract<PropertyScore, { scoreStatus: "available" }>): ScoreReasonCode[] {
  const positiveCodes = score.reasons
    .filter((reason) => reason.severity === "positive")
    .map((reason) => reason.code);

  return [...new Set(positiveCodes)].slice(0, POSITIVE_HIGHLIGHT_LIMIT);
}

function buildSections(
  input: ComputeWorkflowSummaryInput,
  topProperties: TopPropertySummary[],
  summaryWarnings: string[],
  missingDataNotes: string[],
  executorWarnings: ComputeWorkflowSummaryWarning[],
): SummarySection[] {
  return input.config.includedSections.map((sectionKey) => ({
    id: sectionKey,
    title: SECTION_TITLES[sectionKey],
    bullets: buildSectionBullets(
      sectionKey,
      input,
      topProperties,
      summaryWarnings,
      missingDataNotes,
      executorWarnings,
    ),
  }));
}

function buildSectionBullets(
  sectionKey: SummarySectionKey,
  input: ComputeWorkflowSummaryInput,
  topProperties: TopPropertySummary[],
  summaryWarnings: string[],
  missingDataNotes: string[],
  executorWarnings: ComputeWorkflowSummaryWarning[],
): string[] {
  switch (sectionKey) {
    case "overview":
      return buildOverviewBullets(input);
    case "topProperties":
      return buildTopPropertyBullets(input, topProperties);
    case "areaHighlights":
      return buildAreaHighlightBullets(input, executorWarnings);
    case "warningsAndNotes":
      return [...summaryWarnings, ...missingDataNotes];
  }
}

function buildOverviewBullets(input: ComputeWorkflowSummaryInput): string[] {
  const totalProperties = input.propertyOrder.length;
  const propertiesWithMetrics = input.propertyOrder.filter(
    (propertyKey) => input.metricsByKey[propertyKey] !== undefined,
  ).length;
  const propertiesWithScores = input.propertyOrder.filter((propertyKey) => {
    const score = input.scoresByKey[propertyKey];
    return score?.scoreStatus === "available";
  }).length;
  const areaCount = Object.keys(input.areaAggregatesByKey).length;
  const warningCount = countEntitiesWithWarnings(input);

  return [
    `${totalProperties} ${pluralize(totalProperties, "property", "properties")} in the run.`,
    `${propertiesWithMetrics} ${pluralize(propertiesWithMetrics, "property has", "properties have")} calculated metrics.`,
    `${propertiesWithScores} ${pluralize(propertiesWithScores, "property has", "properties have")} an available score.`,
    `${areaCount} ${pluralize(areaCount, "area aggregate", "area aggregates")} available.`,
    `${warningCount} ${pluralize(warningCount, "property or area has", "properties or areas have")} data-quality warnings.`,
  ];
}

function buildTopPropertyBullets(
  input: ComputeWorkflowSummaryInput,
  topProperties: TopPropertySummary[],
): string[] {
  if (topProperties.length === 0) {
    return ["No scored properties available."];
  }

  return topProperties.map((entry) => {
    const propertyKey = entry.propertyKey ?? "unknown";
    const label = formatPropertyLabel(
      propertyKey,
      input.detailsByKey[propertyKey],
      input.listingsByKey[propertyKey],
    );
    const score = entry.score ?? 0;
    const highlights = entry.highlightReasonCodes
      .map((code) => formatScoreReasonCode(code))
      .join("; ");

    return highlights.length > 0
      ? `${label} — score ${score.toFixed(1)} (${highlights})`
      : `${label} — score ${score.toFixed(1)}`;
  });
}

function buildAreaHighlightBullets(
  input: ComputeWorkflowSummaryInput,
  executorWarnings: ComputeWorkflowSummaryWarning[],
): string[] {
  const aggregates = Object.values(input.areaAggregatesByKey).sort((left, right) => {
    const leftRank = left.rank ?? Number.MAX_SAFE_INTEGER;
    const rightRank = right.rank ?? Number.MAX_SAFE_INTEGER;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return left.areaKey.localeCompare(right.areaKey);
  });

  if (aggregates.length === 0) {
    executorWarnings.push({
      code: "no_area_aggregates",
      message:
        "Area highlights section is enabled, but no area aggregates are available.",
    });
    return ["No area aggregates available."];
  }

  return aggregates.slice(0, AREA_HIGHLIGHT_LIMIT).map((aggregate) => {
    const prefix = aggregate.meetsMinimumSample
      ? ""
      : `[Low sample: ${aggregate.propertyCount}/${aggregate.minimumSampleSize}] `;
    const capRate = formatMetricValue(aggregate.capRate, "cap rate");
    const cashFlow = formatMetricValue(aggregate.monthlyCashFlow, "monthly cash flow");

    return `${prefix}${aggregate.areaKey} — ${aggregate.propertyCount} ${pluralize(aggregate.propertyCount, "property", "properties")}; ${capRate}; ${cashFlow}`;
  });
}

function collectSummaryWarnings(
  input: ComputeWorkflowSummaryInput,
  excludedScoreCount: number,
): string[] {
  const warnings = new Set<string>();

  for (const propertyKey of input.propertyOrder) {
    const metrics = input.metricsByKey[propertyKey];

    for (const warning of metrics?.warnings ?? []) {
      warnings.add(formatPropertyScopedMessage(propertyKey, warning, input));
    }
  }

  for (const aggregate of Object.values(input.areaAggregatesByKey)) {
    for (const warning of aggregate.warnings ?? []) {
      warnings.add(`Area ${aggregate.areaKey}: ${warning}`);
    }

    if (!aggregate.meetsMinimumSample) {
      warnings.add(
        `Area ${aggregate.areaKey} has ${aggregate.propertyCount} properties, below the minimum sample size of ${aggregate.minimumSampleSize}.`,
      );
    }
  }

  if (excludedScoreCount > 0) {
    warnings.add(
      `${excludedScoreCount} ${pluralize(excludedScoreCount, "property was", "properties were")} excluded from top-property ranking because scores were unavailable.`,
    );
  }

  return [...warnings];
}

function collectMissingDataNotes(input: ComputeWorkflowSummaryInput): string[] {
  const notes = new Set<string>();

  for (const propertyKey of input.propertyOrder) {
    const metrics = input.metricsByKey[propertyKey];
    const score = input.scoresByKey[propertyKey];

    for (const code of metrics?.missingMetricCodes ?? []) {
      notes.add(
        `${formatPropertyLabel(propertyKey, input.detailsByKey[propertyKey], input.listingsByKey[propertyKey])}: missing ${code.replaceAll("_", " ")}.`,
      );
    }

    if (score?.scoreStatus === "unavailable") {
      for (const reason of score.reasons ?? []) {
        notes.add(
          `${formatPropertyLabel(propertyKey, input.detailsByKey[propertyKey], input.listingsByKey[propertyKey])}: ${reason.message}`,
        );
      }
    }
  }

  return [...notes];
}

function countEntitiesWithWarnings(input: ComputeWorkflowSummaryInput): number {
  let count = 0;

  for (const propertyKey of input.propertyOrder) {
    const metrics = input.metricsByKey[propertyKey];

    if ((metrics?.warnings?.length ?? 0) > 0) {
      count += 1;
    }
  }

  for (const aggregate of Object.values(input.areaAggregatesByKey)) {
    if ((aggregate.warnings?.length ?? 0) > 0 || !aggregate.meetsMinimumSample) {
      count += 1;
    }
  }

  return count;
}

function formatPropertyScopedMessage(
  propertyKey: string,
  warning: string,
  input: ComputeWorkflowSummaryInput,
): string {
  const label = formatPropertyLabel(
    propertyKey,
    input.detailsByKey[propertyKey],
    input.listingsByKey[propertyKey],
  );

  return `${label}: ${warning}`;
}

export function formatPropertyLabel(
  propertyKey: string,
  detail: PropertyDetail | undefined,
  listing: PropertyListing | undefined,
): string {
  const address = detail?.address ?? listing?.address;

  if (!address) {
    return propertyKey;
  }

  const formatted = formatAddress(address);

  return formatted.length > 0 ? formatted : propertyKey;
}

function formatAddress(address: Address): string {
  const locality = [address.city, address.state, address.postalCode]
    .filter(Boolean)
    .join(", ");

  if (address.line1 && locality) {
    return `${address.line1}, ${locality}`;
  }

  if (address.line1) {
    return address.line1;
  }

  return locality;
}

function formatMetricValue(
  metric: MetricBundle["capRate"],
  label: string,
): string {
  if (metric?.status === "available") {
    return `${label} ${formatMetricNumber(metric.value, label)}`;
  }

  return `${label} unavailable`;
}

function formatMetricNumber(value: number, label: string): string {
  if (label.includes("rate")) {
    return `${(value * 100).toFixed(1)}%`;
  }

  return value.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  });
}

function formatScoreReasonCode(code: ScoreReasonCode): string {
  return code.replaceAll("_", " ");
}

function renderMarkdown(title: string, sections: SummarySection[]): string {
  const lines = [`# ${title}`, ""];

  for (const section of sections) {
    lines.push(`## ${section.title}`, "");

    if (section.bullets.length === 0) {
      lines.push("_No items._", "");
      continue;
    }

    for (const bullet of section.bullets) {
      lines.push(`- ${bullet}`);
    }

    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}
