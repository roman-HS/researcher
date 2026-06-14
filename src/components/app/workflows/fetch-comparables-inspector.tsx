"use client";

import { useMemo } from "react";
import { AlertTriangleIcon, InfoIcon } from "lucide-react";

import {
  buildConfigValueFieldError,
  WorkflowConfigValueField,
} from "@/components/app/workflows/workflow-config-value-field";
import type { WorkflowToolConfigInspectorProps } from "@/components/app/workflows/workflow-tool-config-inspector-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { WorkflowStepConfigValue } from "@/contracts/workflows/bindings";
import { getMissingUpstreamArtefactMessage } from "@/lib/workflows/upstream-artefact-compatibility";
import { patchWorkflowStepConfig } from "@/lib/workflows/patch-workflow-step-config";
import { fetchComparablesConfigSchema } from "@/modules/tools/definitions/fetch-comparables";
import { useWorkflowBuilderStore } from "@/stores/workflow-builder-store";

/**
 * Inspector form for the Fetch Comparables enrichment tool.
 *
 * @see Story 5.3.6 — Build Comparables inspector form
 */

export function FetchComparablesInspector({
  nodeId,
}: WorkflowToolConfigInspectorProps) {
  const definition = useWorkflowBuilderStore((state) => state.definition);
  const updateWorkflowNode = useWorkflowBuilderStore(
    (state) => state.updateWorkflowNode,
  );

  const node = definition.nodes.find((item) => item.id === nodeId);
  const nodeConfig = useMemo(() => node?.config ?? {}, [node?.config]);
  const runtimeInputs = definition.runtimeInputs;

  const parsedConfig = useMemo(
    () => fetchComparablesConfigSchema.safeParse(nodeConfig),
    [nodeConfig],
  );

  const schemaErrorsByField = useMemo(() => {
    if (parsedConfig.success) {
      return {} as Record<string, string>;
    }

    const byField: Record<string, string> = {};

    for (const issue of parsedConfig.error.issues) {
      const field = issue.path[0];

      if (typeof field === "string" && !byField[field]) {
        byField[field] = issue.message;
      }
    }

    return byField;
  }, [parsedConfig]);

  const maxComparablesError = useMemo(() => {
    return (
      buildConfigValueFieldError(nodeConfig.maxComparables, {
        fieldType: "number",
        runtimeInputs,
        label: "Max comparables",
      }) ?? schemaErrorsByField.maxComparables
    );
  }, [nodeConfig.maxComparables, runtimeInputs, schemaErrorsByField.maxComparables]);

  const upstreamWarning = useMemo(
    () => getMissingUpstreamArtefactMessage(definition, nodeId),
    [definition, nodeId],
  );

  if (!node) {
    return null;
  }

  function updateConfig(
    patch: Record<string, WorkflowStepConfigValue | undefined>,
  ) {
    updateWorkflowNode(nodeId, {
      config: patchWorkflowStepConfig(nodeConfig, patch),
    });
  }

  return (
    <div className="space-y-4">
      {upstreamWarning ? (
        <Alert className="border-amber-500/40 bg-amber-500/5 text-amber-900 dark:text-amber-200">
          <AlertTriangleIcon />
          <AlertTitle>Missing upstream step</AlertTitle>
          <AlertDescription className="text-amber-800/90 dark:text-amber-300/90">
            {upstreamWarning}
          </AlertDescription>
        </Alert>
      ) : null}

      <Alert className="border-border/60 bg-muted/30">
        <InfoIcon />
        <AlertTitle>Provider capabilities unconfirmed</AlertTitle>
        <AlertDescription>
          Sale vs rent comparable modes and radius or distance filters depend on
          the private-Zillow endpoint and will be confirmed in a later release.
          Only the comparable count is configurable for now.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label className="text-xs font-normal text-muted-foreground">Source</Label>
        <p className="text-sm leading-relaxed text-foreground">
          Fetches comparable properties for each property enriched by an
          upstream Property Detail step.
        </p>
      </div>

      <Separator />

      <WorkflowConfigValueField
        id={`${nodeId}-max-comparables`}
        label="Max comparables"
        value={nodeConfig.maxComparables}
        fieldType="number"
        placeholder="10"
        error={maxComparablesError}
        onChange={(nextValue) => updateConfig({ maxComparables: nextValue })}
      />
      <p className="text-[11px] text-muted-foreground">
        Limits how many comparables are fetched per property. Defaults to 10.
      </p>
    </div>
  );
}
