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
  getMissingAreaAggregatesUpstreamMessage,
  getMissingUpstreamArtefactMessage,
} from "@/lib/workflows/upstream-artefact-compatibility";
import { patchWorkflowStepConfig } from "@/lib/workflows/patch-workflow-step-config";
import { cn } from "@/lib/utils";
import {
  generateSummaryConfigSchema,
  type SummarySectionKey,
} from "@/modules/tools/definitions/generate-summary";
import { useWorkflowBuilderStore } from "@/stores/workflow-builder-store";

/**
 * Inspector form for the Generate Summary tool.
 *
 * @see Story 5.3.11 — Build Summary inspector form
 */

const SECTION_OPTIONS: {
  value: SummarySectionKey;
  label: string;
  description: string;
}[] = [
  {
    value: "overview",
    label: "Overview",
    description: "Run counts and high-level workflow context.",
  },
  {
    value: "topProperties",
    label: "Top properties",
    description: "Highest-scoring properties from upstream scoring.",
  },
  {
    value: "areaHighlights",
    label: "Area highlights",
    description: "Area-level rollups when an Aggregate Area step ran upstream.",
  },
  {
    value: "warningsAndNotes",
    label: "Warnings and missing data",
    description: "Run warnings and notes about incomplete inputs.",
  },
];

function schemaErrorsByFieldFromResult(
  parsed: ReturnType<typeof generateSummaryConfigSchema.safeParse>,
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

function resolveSelectedSections(
  parsed: ReturnType<typeof generateSummaryConfigSchema.safeParse>,
): SummarySectionKey[] {
  if (parsed.success) {
    return [...parsed.data.includedSections];
  }

  return [...generateSummaryConfigSchema.parse({}).includedSections];
}

export function GenerateSummaryInspector({
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
    () => generateSummaryConfigSchema.safeParse(nodeConfig),
    [nodeConfig],
  );

  const schemaErrorsByField = useMemo(
    () => schemaErrorsByFieldFromResult(parsedConfig),
    [parsedConfig],
  );

  const selectedSections = resolveSelectedSections(parsedConfig);
  const includeMarkdown = parsedConfig.success
    ? parsedConfig.data.includeMarkdown
    : true;

  const upstreamWarning = useMemo(
    () => getMissingUpstreamArtefactMessage(definition, nodeId),
    [definition, nodeId],
  );

  const areaAggregatesWarning = selectedSections.includes("areaHighlights")
    ? getMissingAreaAggregatesUpstreamMessage(definition, nodeId)
    : null;

  const fieldErrors = useMemo(() => {
    return {
      title:
        buildConfigValueFieldError(nodeConfig.title, {
          fieldType: "text",
          runtimeInputs,
          label: "Summary title",
        }) ?? schemaErrorsByField.title,
      topPropertyCount:
        buildConfigValueFieldError(nodeConfig.topPropertyCount, {
          fieldType: "number",
          runtimeInputs,
          label: "Top property count",
        }) ?? schemaErrorsByField.topPropertyCount,
    };
  }, [nodeConfig.title, nodeConfig.topPropertyCount, runtimeInputs, schemaErrorsByField]);

  const includeMarkdownError = schemaErrorsByField.includeMarkdown;

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

  function toggleSection(sectionKey: SummarySectionKey, checked: boolean) {
    const nextSections = checked
      ? [...new Set([...selectedSections, sectionKey])]
      : selectedSections.filter((item) => item !== sectionKey);

    updateConfig({ includedSections: nextSections });
  }

  return (
    <div className="space-y-4">
      <Alert className="border-border/60 bg-muted/30">
        <InfoIcon />
        <AlertTitle>Deterministic summary</AlertTitle>
        <AlertDescription>
          V1 summaries are generated from structured workflow results using fixed
          templates — not an LLM. Output includes structured sections and,
          when enabled, Markdown text for display and copy/export.
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

      {areaAggregatesWarning ? (
        <Alert className="border-amber-500/40 bg-amber-500/5 text-amber-900 dark:text-amber-200">
          <AlertTriangleIcon />
          <AlertTitle>Area data not found upstream</AlertTitle>
          <AlertDescription className="text-amber-800/90 dark:text-amber-300/90">
            {areaAggregatesWarning}
          </AlertDescription>
        </Alert>
      ) : null}

      <WorkflowConfigValueField
        id={`${nodeId}-summary-title`}
        label="Summary title"
        value={nodeConfig.title}
        fieldType="text"
        placeholder="Investment analysis summary"
        error={fieldErrors.title}
        onChange={(nextValue) => updateConfig({ title: nextValue })}
      />

      <Separator />

      <WorkflowConfigValueField
        id={`${nodeId}-top-property-count`}
        label="Top property count"
        value={nodeConfig.topPropertyCount}
        fieldType="number"
        placeholder="5"
        error={fieldErrors.topPropertyCount}
        onChange={(nextValue) => updateConfig({ topPropertyCount: nextValue })}
      />
      <p className="text-[11px] text-muted-foreground">
        Properties are ranked by score from the upstream scoring step. Maximum
        25.
      </p>

      <Separator />

      <section className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Included sections
        </h4>
        <div className="space-y-3">
          {SECTION_OPTIONS.map((option) => {
            const checked = selectedSections.includes(option.value);

            return (
              <div key={option.value} className="flex items-start gap-3">
                <input
                  id={`${nodeId}-section-${option.value}`}
                  type="checkbox"
                  checked={checked}
                  onChange={(event) =>
                    toggleSection(option.value, event.target.checked)
                  }
                  className={cn(
                    "mt-0.5 size-4 shrink-0 rounded border border-input bg-background",
                    "accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                />
                <div className="space-y-1">
                  <Label
                    htmlFor={`${nodeId}-section-${option.value}`}
                    className="text-sm font-normal leading-snug"
                  >
                    {option.label}
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        {schemaErrorsByField.includedSections ? (
          <p className="text-xs text-destructive">
            {schemaErrorsByField.includedSections}
          </p>
        ) : null}
      </section>

      <Separator />

      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <input
            id={`${nodeId}-include-markdown`}
            type="checkbox"
            checked={includeMarkdown}
            onChange={(event) =>
              updateConfig({ includeMarkdown: event.target.checked })
            }
            className={cn(
              "mt-0.5 size-4 shrink-0 rounded border border-input bg-background",
              "accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          />
          <div className="space-y-1">
            <Label
              htmlFor={`${nodeId}-include-markdown`}
              className="text-sm font-normal leading-snug"
            >
              Include Markdown output
            </Label>
            <p className="text-[11px] text-muted-foreground">
              When enabled, a Markdown version of the summary is attached for
              rendering and copy/export in the results UI.
            </p>
          </div>
        </div>
        {includeMarkdownError ? (
          <p className="text-xs text-destructive">{includeMarkdownError}</p>
        ) : null}
      </div>
    </div>
  );
}
