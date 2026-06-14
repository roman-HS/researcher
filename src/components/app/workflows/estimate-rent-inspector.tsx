"use client";

import { useMemo } from "react";
import { AlertTriangleIcon, InfoIcon } from "lucide-react";

import type { WorkflowToolConfigInspectorProps } from "@/components/app/workflows/workflow-tool-config-inspector-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { getMissingUpstreamArtefactMessage } from "@/lib/workflows/upstream-artefact-compatibility";
import { estimateRentConfigSchema } from "@/modules/tools/definitions/estimate-rent";
import { useWorkflowBuilderStore } from "@/stores/workflow-builder-store";
import { cn } from "@/lib/utils";

/**
 * Inspector form for the Estimate Rent enrichment tool.
 *
 * @see Story 5.3.7 — Build Rent Estimate inspector form
 * @see Story 6.1.4 — Confirm private-Zillow rent estimate contract
 */

export function EstimateRentInspector({ nodeId }: WorkflowToolConfigInspectorProps) {
  const definition = useWorkflowBuilderStore((state) => state.definition);

  const node = definition.nodes.find((item) => item.id === nodeId);
  const nodeConfig = useMemo(() => node?.config ?? {}, [node?.config]);

  const parsedConfig = useMemo(
    () => estimateRentConfigSchema.safeParse(nodeConfig),
    [nodeConfig],
  );

  const includeRange = parsedConfig.success ? parsedConfig.data.includeRange : true;

  const includeRangeError = useMemo(() => {
    if (parsedConfig.success) {
      return undefined;
    }

    for (const issue of parsedConfig.error.issues) {
      if (issue.path[0] === "includeRange") {
        return issue.message;
      }
    }

    return undefined;
  }, [parsedConfig]);

  const upstreamWarning = useMemo(
    () => getMissingUpstreamArtefactMessage(definition, nodeId),
    [definition, nodeId],
  );

  if (!node) {
    return null;
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
        <AlertTitle>Point estimate only</AlertTitle>
        <AlertDescription>
          The provider returns a monthly rent Zestimate (`rentZestimate`) via
          `pro/byzpid`. Rent ranges and confidence metadata are not available.
          Missing estimates produce a per-property warning; rent-dependent metrics
          are marked unavailable.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label className="text-xs font-normal text-muted-foreground">Source</Label>
        <p className="text-sm leading-relaxed text-foreground">
          Fetches rent estimates for properties enriched by an upstream Property
          Detail step.
        </p>
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <input
            id={`${nodeId}-include-range`}
            type="checkbox"
            checked={includeRange}
            disabled
            aria-disabled
            className={cn(
              "mt-0.5 size-4 shrink-0 rounded border border-input bg-background",
              "accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          />
          <div className="space-y-1">
            <Label
              htmlFor={`${nodeId}-include-range`}
              className="text-sm font-normal leading-snug text-muted-foreground"
            >
              Include rent range when the provider returns one
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Not available on this endpoint. The config field is kept for saved
              drafts until the provider exposes rent bounds.
            </p>
          </div>
        </div>
        {includeRangeError ? (
          <p className="text-xs text-destructive">{includeRangeError}</p>
        ) : null}
      </div>
    </div>
  );
}
