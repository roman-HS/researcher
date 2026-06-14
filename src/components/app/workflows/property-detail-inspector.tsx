"use client";

import { useMemo } from "react";
import { AlertTriangleIcon } from "lucide-react";

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
import { propertyDetailConfigSchema } from "@/modules/tools/definitions/property-detail";
import { useWorkflowBuilderStore } from "@/stores/workflow-builder-store";

/**
 * Inspector form for the Property Detail enrichment tool.
 *
 * @see Story 5.3.5 — Build Property Detail inspector form
 */

export function PropertyDetailInspector({ nodeId }: WorkflowToolConfigInspectorProps) {
  const definition = useWorkflowBuilderStore((state) => state.definition);
  const updateWorkflowNode = useWorkflowBuilderStore(
    (state) => state.updateWorkflowNode,
  );

  const node = definition.nodes.find((item) => item.id === nodeId);
  const nodeConfig = useMemo(() => node?.config ?? {}, [node?.config]);
  const runtimeInputs = definition.runtimeInputs;

  const parsedConfig = useMemo(
    () => propertyDetailConfigSchema.safeParse(nodeConfig),
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

  const maxPropertiesError = useMemo(() => {
    return (
      buildConfigValueFieldError(nodeConfig.maxProperties, {
        fieldType: "number",
        runtimeInputs,
        label: "Max properties",
      }) ?? schemaErrorsByField.maxProperties
    );
  }, [nodeConfig.maxProperties, runtimeInputs, schemaErrorsByField.maxProperties]);

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

      <div className="space-y-2">
        <Label className="text-xs font-normal text-muted-foreground">Source</Label>
        <p className="text-sm leading-relaxed text-foreground">
          Enriches listings from an upstream Listing Search step with detailed
          property data.
        </p>
      </div>

      <Separator />

      <WorkflowConfigValueField
        id={`${nodeId}-max-properties`}
        label="Max properties"
        value={nodeConfig.maxProperties}
        fieldType="number"
        placeholder="50"
        error={maxPropertiesError}
        onChange={(nextValue) => updateConfig({ maxProperties: nextValue })}
      />
      <p className="text-[11px] text-muted-foreground">
        Limits how many listings are enriched in a single run. Defaults to 50.
      </p>
    </div>
  );
}
