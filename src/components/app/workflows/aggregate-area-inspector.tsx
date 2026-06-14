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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { WorkflowStepConfigValue } from "@/contracts/workflows/bindings";
import {
  getInsufficientUpstreamPropertyCountMessage,
  getMissingUpstreamArtefactMessage,
} from "@/lib/workflows/upstream-artefact-compatibility";
import { patchWorkflowStepConfig } from "@/lib/workflows/patch-workflow-step-config";
import { cn } from "@/lib/utils";
import {
  aggregateAreaConfigSchema,
  type AggregateAreaMetricKey,
} from "@/modules/tools/definitions/aggregate-area";
import { useWorkflowBuilderStore } from "@/stores/workflow-builder-store";

/**
 * Inspector form for the Aggregate Area analysis tool.
 *
 * @see Story 5.3.10 — Build Area Aggregation inspector form
 */

const GROUPING_OPTIONS = [
  { value: "zip" as const, label: "ZIP code" },
  { value: "city" as const, label: "City" },
];

const METRIC_OPTIONS: {
  value: AggregateAreaMetricKey;
  label: string;
}[] = [
  { value: "capRate", label: "Cap rate" },
  { value: "cashOnCashReturn", label: "Cash-on-cash return" },
  { value: "grossRentMultiplier", label: "Gross rent multiplier" },
  { value: "monthlyCashFlow", label: "Monthly cash flow" },
  { value: "estimatedMonthlyIncome", label: "Est. monthly income" },
  { value: "estimatedMonthlyExpenses", label: "Est. monthly expenses" },
  { value: "monthlyMortgagePayment", label: "Monthly mortgage payment" },
];

function schemaErrorsByFieldFromResult(
  parsed: ReturnType<typeof aggregateAreaConfigSchema.safeParse>,
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

function resolveInspectorGroupingLevel(
  parsed: ReturnType<typeof aggregateAreaConfigSchema.safeParse>,
): "zip" | "city" {
  if (!parsed.success) {
    return "zip";
  }

  return parsed.data.groupingLevel === "city" ? "city" : "zip";
}

function resolveSelectedMetrics(
  parsed: ReturnType<typeof aggregateAreaConfigSchema.safeParse>,
): AggregateAreaMetricKey[] {
  if (parsed.success) {
    return parsed.data.aggregateMetrics;
  }

  return aggregateAreaConfigSchema.parse({}).aggregateMetrics;
}

export function AggregateAreaInspector({
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
    () => aggregateAreaConfigSchema.safeParse(nodeConfig),
    [nodeConfig],
  );

  const schemaErrorsByField = useMemo(
    () => schemaErrorsByFieldFromResult(parsedConfig),
    [parsedConfig],
  );

  const groupingLevel = resolveInspectorGroupingLevel(parsedConfig);
  const selectedMetrics = resolveSelectedMetrics(parsedConfig);

  const minimumSampleSize = parsedConfig.success
    ? parsedConfig.data.minimumSampleSize
    : 3;

  const upstreamWarning = useMemo(
    () => getMissingUpstreamArtefactMessage(definition, nodeId),
    [definition, nodeId],
  );

  const insufficientPropertyCountWarning = useMemo(
    () =>
      getInsufficientUpstreamPropertyCountMessage(
        definition,
        nodeId,
        minimumSampleSize,
      ),
    [definition, nodeId, minimumSampleSize],
  );

  const minimumSampleSizeError = useMemo(() => {
    return (
      buildConfigValueFieldError(nodeConfig.minimumSampleSize, {
        fieldType: "number",
        runtimeInputs,
        label: "Minimum sample size",
      }) ?? schemaErrorsByField.minimumSampleSize
    );
  }, [
    nodeConfig.minimumSampleSize,
    runtimeInputs,
    schemaErrorsByField.minimumSampleSize,
  ]);

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

  function toggleAggregateMetric(
    metricKey: AggregateAreaMetricKey,
    checked: boolean,
  ) {
    const nextMetrics = checked
      ? [...new Set([...selectedMetrics, metricKey])]
      : selectedMetrics.filter((item) => item !== metricKey);

    updateConfig({ aggregateMetrics: nextMetrics });
  }

  return (
    <div className="space-y-4">
      <Alert className="border-border/60 bg-muted/30">
        <InfoIcon />
        <AlertTitle>Area aggregation</AlertTitle>
        <AlertDescription>
          Groups properties from the run working set by ZIP or city and rolls up
          selected investment metrics. Sample-size checks and low-confidence
          flags are evaluated per area at run time.
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

      {insufficientPropertyCountWarning ? (
        <Alert className="border-amber-500/40 bg-amber-500/5 text-amber-900 dark:text-amber-200">
          <AlertTriangleIcon />
          <AlertTitle>Sample size may be unreachable</AlertTitle>
          <AlertDescription className="text-amber-800/90 dark:text-amber-300/90">
            {insufficientPropertyCountWarning}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label
          htmlFor={`${nodeId}-grouping-level`}
          className="text-xs font-normal text-muted-foreground"
        >
          Group by
        </Label>
        <Select
          value={groupingLevel}
          onValueChange={(value) =>
            updateConfig({ groupingLevel: value as "zip" | "city" })
          }
        >
          <SelectTrigger id={`${nodeId}-grouping-level`} className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GROUPING_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">
          {groupingLevel === "zip"
            ? "Uses postal code from enriched property addresses."
            : "Uses city from enriched property addresses. Requires address.city on upstream property details."}
        </p>
      </div>

      <Separator />

      <WorkflowConfigValueField
        id={`${nodeId}-minimum-sample-size`}
        label="Minimum sample size"
        value={nodeConfig.minimumSampleSize}
        fieldType="number"
        placeholder="3"
        error={minimumSampleSizeError}
        onChange={(nextValue) => updateConfig({ minimumSampleSize: nextValue })}
      />
      <p className="text-[11px] text-muted-foreground">
        Areas with fewer properties than this threshold are flagged as
        low-confidence at run time.
      </p>

      <Separator />

      <section className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Aggregate metrics
        </h4>
        <div className="space-y-2">
          {METRIC_OPTIONS.map((option) => {
            const checked = selectedMetrics.includes(option.value);

            return (
              <div key={option.value} className="flex items-start gap-3">
                <input
                  id={`${nodeId}-metric-${option.value}`}
                  type="checkbox"
                  checked={checked}
                  onChange={(event) =>
                    toggleAggregateMetric(option.value, event.target.checked)
                  }
                  className={cn(
                    "mt-0.5 size-4 shrink-0 rounded border border-input bg-background",
                    "accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                />
                <Label
                  htmlFor={`${nodeId}-metric-${option.value}`}
                  className="text-sm font-normal leading-snug"
                >
                  {option.label}
                </Label>
              </div>
            );
          })}
        </div>
        {schemaErrorsByField.aggregateMetrics ? (
          <p className="text-xs text-destructive">
            {schemaErrorsByField.aggregateMetrics}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Averages and medians are computed for selected metrics during
            execution.
          </p>
        )}
      </section>
    </div>
  );
}
