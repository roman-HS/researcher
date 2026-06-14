"use client";

import { useMemo } from "react";
import { AlertTriangleIcon, InfoIcon, RotateCcwIcon } from "lucide-react";

import {
  buildConfigValueFieldError,
  WorkflowConfigValueField,
} from "@/components/app/workflows/workflow-config-value-field";
import type { WorkflowToolConfigInspectorProps } from "@/components/app/workflows/workflow-tool-config-inspector-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type {
  WorkflowStepConfig,
  WorkflowStepConfigValue,
} from "@/contracts/workflows/bindings";
import { getMissingUpstreamArtefactMessage } from "@/lib/workflows/upstream-artefact-compatibility";
import { patchWorkflowStepConfig } from "@/lib/workflows/patch-workflow-step-config";
import { scorePropertiesConfigSchema } from "@/modules/tools/definitions/score-properties";
import { useWorkflowBuilderStore } from "@/stores/workflow-builder-store";

/**
 * Inspector form for the Score Properties analysis tool.
 *
 * @see Story 5.3.9 — Build Scoring inspector form
 */

function schemaErrorsByFieldFromResult(
  parsed: ReturnType<typeof scorePropertiesConfigSchema.safeParse>,
): Record<string, string> {
  if (parsed.success) {
    return {};
  }

  const byField: Record<string, string> = {};

  for (const issue of parsed.error.issues) {
    const field = issue.path[0];

    if (typeof field === "string" && !byField[field]) {
      byField[field] = issue.message;
    }
  }

  return byField;
}

function formatNormalizedWeightShares(
  capRateWeight: number,
  cashOnCashReturnWeight: number,
  monthlyCashFlowWeight: number,
): string | null {
  const totalWeight =
    capRateWeight + cashOnCashReturnWeight + monthlyCashFlowWeight;

  if (totalWeight <= 0) {
    return null;
  }

  const toShare = (weight: number) =>
    Math.round((weight / totalWeight) * 100);

  return `Cap rate ${toShare(capRateWeight)}%, Cash-on-cash ${toShare(cashOnCashReturnWeight)}%, Cash flow ${toShare(monthlyCashFlowWeight)}%`;
}

export function ScorePropertiesInspector({
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
    () => scorePropertiesConfigSchema.safeParse(nodeConfig),
    [nodeConfig],
  );

  const schemaErrorsByField = useMemo(
    () => schemaErrorsByFieldFromResult(parsedConfig),
    [parsedConfig],
  );

  const upstreamWarning = useMemo(
    () => getMissingUpstreamArtefactMessage(definition, nodeId),
    [definition, nodeId],
  );

  const normalizedWeightShares = useMemo(() => {
    if (!parsedConfig.success) {
      return null;
    }

    return formatNormalizedWeightShares(
      parsedConfig.data.capRateWeight,
      parsedConfig.data.cashOnCashReturnWeight,
      parsedConfig.data.monthlyCashFlowWeight,
    );
  }, [parsedConfig]);

  const fieldErrors = useMemo(() => {
    const numberField = (key: keyof typeof nodeConfig, label: string) =>
      buildConfigValueFieldError(nodeConfig[key], {
        fieldType: "number",
        runtimeInputs,
        label,
      }) ?? schemaErrorsByField[key as string];

    return {
      capRateWeight: numberField("capRateWeight", "Cap rate weight"),
      cashOnCashReturnWeight: numberField(
        "cashOnCashReturnWeight",
        "Cash-on-cash weight",
      ),
      monthlyCashFlowWeight: numberField(
        "monthlyCashFlowWeight",
        "Cash flow weight",
      ),
      minimumScore: numberField("minimumScore", "Minimum score"),
    };
  }, [nodeConfig, runtimeInputs, schemaErrorsByField]);

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

  function resetToDefaults() {
    updateWorkflowNode(nodeId, {
      config: scorePropertiesConfigSchema.parse({}) as WorkflowStepConfig,
    });
  }

  return (
    <div className="space-y-4">
      <Alert className="border-border/60 bg-muted/30">
        <InfoIcon />
        <AlertTitle>Scoring configuration</AlertTitle>
        <AlertDescription>
          Each property receives a 0–100 score from weighted investment metrics
          produced upstream. Weights are normalized automatically at run time;
          raw values do not need to sum to 100. Properties below the minimum
          score threshold are still scored but may be filtered in later steps.
        </AlertDescription>
      </Alert>

      {upstreamWarning ? (
        <Alert className="border-amber-500/40 bg-amber-500/5 text-amber-900 dark:text-amber-200">
          <AlertTriangleIcon />
          <AlertTitle>Missing upstream step</AlertTitle>
          <AlertDescription className="text-amber-800/90 dark:text-amber-300/90">
            {upstreamWarning}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Default scorecard: cap rate, cash-on-cash, and monthly cash flow.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={resetToDefaults}
        >
          <RotateCcwIcon />
          Reset to defaults
        </Button>
      </div>

      <Separator />

      <section className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Component weights
        </h4>
        <WorkflowConfigValueField
          id={`${nodeId}-cap-rate-weight`}
          label="Cap rate weight"
          value={nodeConfig.capRateWeight}
          fieldType="number"
          placeholder="40"
          error={fieldErrors.capRateWeight}
          onChange={(nextValue) => updateConfig({ capRateWeight: nextValue })}
        />
        <WorkflowConfigValueField
          id={`${nodeId}-cash-on-cash-weight`}
          label="Cash-on-cash return weight"
          value={nodeConfig.cashOnCashReturnWeight}
          fieldType="number"
          placeholder="35"
          error={fieldErrors.cashOnCashReturnWeight}
          onChange={(nextValue) =>
            updateConfig({ cashOnCashReturnWeight: nextValue })
          }
        />
        <WorkflowConfigValueField
          id={`${nodeId}-cash-flow-weight`}
          label="Monthly cash flow weight"
          value={nodeConfig.monthlyCashFlowWeight}
          fieldType="number"
          placeholder="25"
          error={fieldErrors.monthlyCashFlowWeight}
          onChange={(nextValue) =>
            updateConfig({ monthlyCashFlowWeight: nextValue })
          }
        />
        {normalizedWeightShares ? (
          <p className="text-[11px] text-muted-foreground">
            Normalized share at run time: {normalizedWeightShares}.
          </p>
        ) : (
          <p className="text-[11px] text-destructive">
            At least one component weight must be greater than zero.
          </p>
        )}
      </section>

      <Separator />

      <section className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Thresholds
        </h4>
        <WorkflowConfigValueField
          id={`${nodeId}-minimum-score`}
          label="Minimum score (0–100)"
          value={nodeConfig.minimumScore}
          fieldType="number"
          placeholder="0"
          error={fieldErrors.minimumScore}
          onChange={(nextValue) => updateConfig({ minimumScore: nextValue })}
        />
        <p className="text-[11px] text-muted-foreground">
          Used to flag or filter low-scoring properties. Defaults to 0 (no
          cutoff).
        </p>
      </section>
    </div>
  );
}
