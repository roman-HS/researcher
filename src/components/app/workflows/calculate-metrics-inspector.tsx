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
import {
  getMissingRentEstimatesUpstreamMessage,
  getMissingUpstreamArtefactMessage,
} from "@/lib/workflows/upstream-artefact-compatibility";
import { patchWorkflowStepConfig } from "@/lib/workflows/patch-workflow-step-config";
import { calculateMetricsConfigSchema } from "@/modules/tools/definitions/calculate-metrics";
import { useWorkflowBuilderStore } from "@/stores/workflow-builder-store";
import { cn } from "@/lib/utils";

/**
 * Inspector form for the Calculate Metrics analysis tool.
 *
 * @see Story 5.3.8 — Build Metrics inspector form
 */

function schemaErrorsByFieldFromResult(
  parsed: ReturnType<typeof calculateMetricsConfigSchema.safeParse>,
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

export function CalculateMetricsInspector({
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
    () => calculateMetricsConfigSchema.safeParse(nodeConfig),
    [nodeConfig],
  );

  const schemaErrorsByField = useMemo(
    () => schemaErrorsByFieldFromResult(parsedConfig),
    [parsedConfig],
  );

  const includeCashFlow = parsedConfig.success
    ? parsedConfig.data.includeCashFlow
    : true;

  const upstreamWarning = useMemo(
    () => getMissingUpstreamArtefactMessage(definition, nodeId),
    [definition, nodeId],
  );

  const rentEstimatesWarning = useMemo(
    () => getMissingRentEstimatesUpstreamMessage(definition, nodeId),
    [definition, nodeId],
  );

  const fieldErrors = useMemo(() => {
    const numberField = (key: keyof typeof nodeConfig, label: string) =>
      buildConfigValueFieldError(nodeConfig[key], {
        fieldType: "number",
        runtimeInputs,
        label,
      }) ?? schemaErrorsByField[key as string];

    return {
      downPaymentPercent: numberField("downPaymentPercent", "Down payment"),
      interestRateAnnual: numberField("interestRateAnnual", "Interest rate"),
      loanTermYears: numberField("loanTermYears", "Loan term"),
      vacancyRate: numberField("vacancyRate", "Vacancy rate"),
      repairsRate: numberField("repairsRate", "Repairs rate"),
      propertyManagementRate: numberField(
        "propertyManagementRate",
        "Property management rate",
      ),
      monthlyInsurance: numberField("monthlyInsurance", "Monthly insurance"),
      monthlyHoa: numberField("monthlyHoa", "Monthly HOA"),
      propertyTaxRate: numberField("propertyTaxRate", "Property tax rate"),
      closingCostsRate: numberField("closingCostsRate", "Closing costs rate"),
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

  return (
    <div className="space-y-4">
      <Alert className="border-border/60 bg-muted/30">
        <InfoIcon />
        <AlertTitle>Underwriting assumptions</AlertTitle>
        <AlertDescription>
          These values are author-defined assumptions used for deterministic
          calculations. They are not sourced from Zillow or other data providers.
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

      {rentEstimatesWarning ? (
        <Alert className="border-border/60 bg-muted/30">
          <InfoIcon />
          <AlertTitle>Rent estimates not found upstream</AlertTitle>
          <AlertDescription>{rentEstimatesWarning}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <input
            id={`${nodeId}-include-cash-flow`}
            type="checkbox"
            checked={includeCashFlow}
            onChange={(event) =>
              updateConfig({ includeCashFlow: event.target.checked })
            }
            className={cn(
              "mt-0.5 size-4 shrink-0 rounded border border-input bg-background",
              "accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          />
          <div className="space-y-1">
            <Label
              htmlFor={`${nodeId}-include-cash-flow`}
              className="text-sm font-normal leading-snug"
            >
              Include cash flow metrics
            </Label>
            <p className="text-[11px] text-muted-foreground">
              When enabled, monthly cash flow and cash-on-cash return are
              calculated when enough inputs are available.
            </p>
          </div>
        </div>
      </div>

      <Separator />

      <section className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Financing
        </h4>
        <WorkflowConfigValueField
          id={`${nodeId}-down-payment`}
          label="Down payment (%)"
          value={nodeConfig.downPaymentPercent}
          fieldType="number"
          placeholder="20"
          error={fieldErrors.downPaymentPercent}
          onChange={(nextValue) => updateConfig({ downPaymentPercent: nextValue })}
        />
        <WorkflowConfigValueField
          id={`${nodeId}-interest-rate`}
          label="Interest rate (% annual)"
          value={nodeConfig.interestRateAnnual}
          fieldType="number"
          placeholder="7"
          error={fieldErrors.interestRateAnnual}
          onChange={(nextValue) => updateConfig({ interestRateAnnual: nextValue })}
        />
        <WorkflowConfigValueField
          id={`${nodeId}-loan-term`}
          label="Loan term (years)"
          value={nodeConfig.loanTermYears}
          fieldType="number"
          placeholder="30"
          error={fieldErrors.loanTermYears}
          onChange={(nextValue) => updateConfig({ loanTermYears: nextValue })}
        />
      </section>

      <Separator />

      <section className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Operating expenses
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <WorkflowConfigValueField
            id={`${nodeId}-vacancy-rate`}
            label="Vacancy (%)"
            value={nodeConfig.vacancyRate}
            fieldType="number"
            placeholder="5"
            error={fieldErrors.vacancyRate}
            onChange={(nextValue) => updateConfig({ vacancyRate: nextValue })}
          />
          <WorkflowConfigValueField
            id={`${nodeId}-repairs-rate`}
            label="Repairs (%)"
            value={nodeConfig.repairsRate}
            fieldType="number"
            placeholder="5"
            error={fieldErrors.repairsRate}
            onChange={(nextValue) => updateConfig({ repairsRate: nextValue })}
          />
          <WorkflowConfigValueField
            id={`${nodeId}-property-management-rate`}
            label="Property mgmt (%)"
            value={nodeConfig.propertyManagementRate}
            fieldType="number"
            placeholder="8"
            error={fieldErrors.propertyManagementRate}
            onChange={(nextValue) =>
              updateConfig({ propertyManagementRate: nextValue })
            }
          />
          <WorkflowConfigValueField
            id={`${nodeId}-property-tax-rate`}
            label="Property tax (%)"
            value={nodeConfig.propertyTaxRate}
            fieldType="number"
            placeholder="1.2"
            error={fieldErrors.propertyTaxRate}
            onChange={(nextValue) => updateConfig({ propertyTaxRate: nextValue })}
          />
          <WorkflowConfigValueField
            id={`${nodeId}-closing-costs-rate`}
            label="Closing costs (%)"
            value={nodeConfig.closingCostsRate}
            fieldType="number"
            placeholder="3"
            error={fieldErrors.closingCostsRate}
            onChange={(nextValue) => updateConfig({ closingCostsRate: nextValue })}
          />
          <WorkflowConfigValueField
            id={`${nodeId}-monthly-insurance`}
            label="Insurance ($/mo)"
            value={nodeConfig.monthlyInsurance}
            fieldType="number"
            placeholder="150"
            error={fieldErrors.monthlyInsurance}
            onChange={(nextValue) => updateConfig({ monthlyInsurance: nextValue })}
          />
          <WorkflowConfigValueField
            id={`${nodeId}-monthly-hoa`}
            label="HOA ($/mo)"
            value={nodeConfig.monthlyHoa}
            fieldType="number"
            placeholder="0"
            error={fieldErrors.monthlyHoa}
            onChange={(nextValue) => updateConfig({ monthlyHoa: nextValue })}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Percentages apply to gross rent or purchase price as appropriate.
          Property tax rate is used when provider tax data is unavailable.
        </p>
      </section>
    </div>
  );
}
