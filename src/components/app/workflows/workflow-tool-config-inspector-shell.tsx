"use client";

import type { ComponentType } from "react";

import { ListingSearchInspector } from "@/components/app/workflows/listing-search-inspector";
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
