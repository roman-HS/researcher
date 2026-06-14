import type {
  SummarySection,
  TopPropertySummary,
  WorkflowSummary,
} from "@/contracts/domain/analysis";
import type { RunDetailPropertyResult } from "@/contracts/runs/responses";

import { formatPropertyAddressDisplay } from "@/lib/runs/property-results-table";

/**
 * Display and export helpers for the run workflow summary panel.
 *
 * @see Story 8.3.4 — Build final summary panel
 */

const HIDDEN_SECTION_IDS = new Set(["warningsAndNotes", "topProperties"]);

export type TopPropertyDisplayItem = {
  rank: number;
  propertyKey: string;
  label: string;
  secondaryLabel: string | null;
  score: number | null;
  highlightReasonCodes: TopPropertySummary["highlightReasonCodes"];
};

export function getDisplaySummarySections(
  summary: WorkflowSummary,
): SummarySection[] {
  return summary.sections.filter(
    (section) => !HIDDEN_SECTION_IDS.has(section.id),
  );
}

export function shouldShowTopPropertiesBlock(summary: WorkflowSummary): boolean {
  return (
    summary.topProperties.length > 0 ||
    summary.sections.some((section) => section.id === "topProperties")
  );
}

export function buildTopPropertyDisplayItems(
  topProperties: readonly TopPropertySummary[],
  propertyResults: readonly RunDetailPropertyResult[],
): TopPropertyDisplayItem[] {
  const propertyResultsByKey = new Map(
    propertyResults.map((propertyResult) => [
      propertyResult.propertyKey,
      propertyResult,
    ]),
  );

  return topProperties.map((entry) => {
    const propertyKey = entry.propertyKey ?? "unknown";
    const propertyResult = propertyResultsByKey.get(propertyKey);
    const address = propertyResult
      ? formatPropertyAddressDisplay(
          propertyResult.addressSummary,
          propertyKey,
        )
      : {
          primary: propertyKey,
          secondary: null,
        };

    return {
      rank: entry.rank,
      propertyKey,
      label: address.primary,
      secondaryLabel: address.secondary,
      score: entry.score ?? null,
      highlightReasonCodes: entry.highlightReasonCodes,
    };
  });
}

export function formatScoreReasonCode(code: string): string {
  return code.replaceAll("_", " ");
}

export function formatNullableSummaryScore(score: number | null): string {
  if (score === null) {
    return "—";
  }

  return score.toFixed(1);
}

export function renderWorkflowSummaryMarkdown(
  title: string,
  sections: readonly SummarySection[],
): string {
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

export function buildWorkflowSummaryCopyText(summary: WorkflowSummary): string {
  if (summary.markdown) {
    return summary.markdown;
  }

  return renderWorkflowSummaryMarkdown(summary.title, summary.sections);
}
