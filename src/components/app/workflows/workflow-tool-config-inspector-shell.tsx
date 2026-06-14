"use client";

import type { ComponentType } from "react";

import { AggregateAreaInspector } from "@/components/app/workflows/aggregate-area-inspector";
import { CalculateMetricsInspector } from "@/components/app/workflows/calculate-metrics-inspector";
import { EstimateRentInspector } from "@/components/app/workflows/estimate-rent-inspector";
import { FetchComparablesInspector } from "@/components/app/workflows/fetch-comparables-inspector";
import { ListingSearchInspector } from "@/components/app/workflows/listing-search-inspector";
import { PropertyDetailInspector } from "@/components/app/workflows/property-detail-inspector";
import { ScorePropertiesInspector } from "@/components/app/workflows/score-properties-inspector";
import { WorkflowToolConfigPlaceholder } from "@/components/app/workflows/workflow-tool-config-placeholder";
import type { InspectorComponentKey } from "@/contracts/tools/internal";

/**
 * Registry for tool-specific inspector forms. Stories 5.3.4+ register components here.
 *
 * @see Story 5.3.3 — Build selected-step inspector shell
 */

export type WorkflowToolConfigInspectorProps = {
  nodeId: string;
};

const toolConfigInspectors: Partial<
  Record<
    InspectorComponentKey,
    ComponentType<WorkflowToolConfigInspectorProps>
  >
> = {
  listingSearch: ListingSearchInspector,
  propertyDetail: PropertyDetailInspector,
  fetchComparables: FetchComparablesInspector,
  estimateRent: EstimateRentInspector,
  calculateMetrics: CalculateMetricsInspector,
  scoreProperties: ScorePropertiesInspector,
  aggregateArea: AggregateAreaInspector,
};

type WorkflowToolConfigInspectorShellProps = {
  nodeId: string;
  inspectorComponentKey: InspectorComponentKey;
};

export function WorkflowToolConfigInspectorShell({
  nodeId,
  inspectorComponentKey,
}: WorkflowToolConfigInspectorShellProps) {
  const InspectorComponent = toolConfigInspectors[inspectorComponentKey];

  if (InspectorComponent) {
    return <InspectorComponent nodeId={nodeId} />;
  }

  return (
    <WorkflowToolConfigPlaceholder inspectorComponentKey={inspectorComponentKey} />
  );
}
