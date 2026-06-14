import type { ToolArtefactType, ToolCategory } from "@/contracts/tools/internal";
import type { WorkflowNodeHandleRole } from "@/lib/workflows/react-flow";

/**
 * Shared display helpers for tool palette and canvas nodes.
 */

const artefactTypeLabels: Record<ToolArtefactType, string> = {
  listings: "Listings",
  propertyDetails: "Property details",
  comparables: "Comparables",
  rentEstimates: "Rent estimates",
  metrics: "Metrics",
  scores: "Scores",
  areaAggregates: "Area aggregates",
  summary: "Summary",
};

export function formatArtefactType(type: ToolArtefactType): string {
  return artefactTypeLabels[type];
}

export function formatArtefactList(types: readonly ToolArtefactType[]): string {
  return types.map(formatArtefactType).join(", ");
}

export const toolCategoryDotClasses: Record<ToolCategory, string> = {
  search: "bg-sky-500",
  enrich: "bg-violet-500",
  analyze: "bg-amber-500",
  summarize: "bg-emerald-500",
};

export const toolCategoryAccentClasses: Record<ToolCategory, string> = {
  search: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  enrich: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  analyze: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  summarize: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

const handleRoleLabels: Record<WorkflowNodeHandleRole, string | null> = {
  root: "Entry step",
  terminal: "Final step",
  middle: null,
  disconnected: "Not connected",
};

export function getHandleRoleLabel(role: WorkflowNodeHandleRole): string | null {
  return handleRoleLabels[role];
}
