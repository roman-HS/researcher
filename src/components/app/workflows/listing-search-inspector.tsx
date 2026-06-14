"use client";

import { useMemo } from "react";

import {
  buildConfigValueFieldError,
  WorkflowConfigValueField,
} from "@/components/app/workflows/workflow-config-value-field";
import type { WorkflowToolConfigInspectorProps } from "@/components/app/workflows/workflow-tool-config-inspector-shell";
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
import { resolveNumericConfigValue } from "@/lib/workflows/bindable-config-value";
import { patchWorkflowStepConfig } from "@/lib/workflows/patch-workflow-step-config";
import {
  listingSearchConfigSchema,
  listingSearchConfigStrictSchema,
  type ListingSearchLocationSource,
} from "@/modules/tools/definitions/listing-search";
import { useWorkflowBuilderStore } from "@/stores/workflow-builder-store";

/**
 * Inspector form for the Listing Search root tool.
 *
 * @see Story 5.3.4 — Build Listing Search inspector form
 */

const LOCATION_OPTIONS: {
  value: ListingSearchLocationSource;
  label: string;
}[] = [
  { value: "zip", label: "ZIP code" },
  { value: "cityState", label: "City & state" },
];

export function ListingSearchInspector({ nodeId }: WorkflowToolConfigInspectorProps) {
  const definition = useWorkflowBuilderStore((state) => state.definition);
  const updateWorkflowNode = useWorkflowBuilderStore(
    (state) => state.updateWorkflowNode,
  );

  const node = definition.nodes.find((item) => item.id === nodeId);
  const nodeConfig = useMemo(() => node?.config ?? {}, [node?.config]);
  const runtimeInputs = definition.runtimeInputs;

  const parsedConfig = useMemo(
    () => listingSearchConfigSchema.safeParse(nodeConfig),
    [nodeConfig],
  );

  const strictConfigResult = useMemo(
    () => listingSearchConfigStrictSchema.safeParse(nodeConfig),
    [nodeConfig],
  );

  const locationSource = parsedConfig.success
    ? parsedConfig.data.locationSource
    : "zip";

  const schemaErrorsByField = useMemo(() => {
    if (strictConfigResult.success) {
      return {} as Record<string, string>;
    }

    const byField: Record<string, string> = {};

    for (const issue of strictConfigResult.error.issues) {
      const field = issue.path[0];

      if (typeof field === "string" && !byField[field]) {
        byField[field] = issue.message;
      }
    }

    return byField;
  }, [strictConfigResult]);

  const fieldErrors = useMemo(() => {
    const zipRequired = locationSource === "zip";
    const cityRequired = locationSource === "cityState";
    const stateRequired = locationSource === "cityState";

    const errors: Record<string, string | undefined> = {
      zip:
        buildConfigValueFieldError(nodeConfig.zip, {
          required: zipRequired,
          fieldType: "text",
          runtimeInputs,
          label: "ZIP",
        }) ?? schemaErrorsByField.zip,
      city:
        buildConfigValueFieldError(nodeConfig.city, {
          required: cityRequired,
          fieldType: "text",
          runtimeInputs,
          label: "City",
        }) ?? schemaErrorsByField.city,
      state:
        buildConfigValueFieldError(nodeConfig.state, {
          required: stateRequired,
          fieldType: "text",
          runtimeInputs,
          label: "State",
        }) ?? schemaErrorsByField.state,
      minPrice:
        buildConfigValueFieldError(nodeConfig.minPrice, {
          fieldType: "number",
          runtimeInputs,
          label: "Min price",
        }) ?? schemaErrorsByField.minPrice,
      maxPrice:
        buildConfigValueFieldError(nodeConfig.maxPrice, {
          fieldType: "number",
          runtimeInputs,
          label: "Max price",
        }) ?? schemaErrorsByField.maxPrice,
    };

    const minNumeric = resolveNumericConfigValue(nodeConfig.minPrice);
    const maxNumeric = resolveNumericConfigValue(nodeConfig.maxPrice);

    if (
      minNumeric !== null &&
      maxNumeric !== null &&
      minNumeric > maxNumeric &&
      !errors.minPrice &&
      !errors.maxPrice
    ) {
      errors.maxPrice = "Max must be ≥ min.";
    }

    return errors;
  }, [locationSource, nodeConfig, runtimeInputs, schemaErrorsByField]);

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

  function handleLocationSourceChange(nextSource: ListingSearchLocationSource) {
    if (nextSource === "zip") {
      updateConfig({
        locationSource: nextSource,
        city: undefined,
        state: undefined,
      });
      return;
    }

    updateConfig({
      locationSource: nextSource,
      zip: undefined,
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label
          htmlFor={`${nodeId}-location-source`}
          className="text-xs font-normal text-muted-foreground"
        >
          Search by
        </Label>
        <Select
          value={locationSource}
          onValueChange={(value) =>
            handleLocationSourceChange(value as ListingSearchLocationSource)
          }
        >
          <SelectTrigger id={`${nodeId}-location-source`} className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOCATION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {locationSource === "zip" ? (
        <WorkflowConfigValueField
          id={`${nodeId}-zip`}
          label="ZIP"
          value={nodeConfig.zip}
          fieldType="text"
          placeholder="33139"
          error={fieldErrors.zip}
          onChange={(nextValue) => updateConfig({ zip: nextValue })}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <WorkflowConfigValueField
            id={`${nodeId}-city`}
            label="City"
            value={nodeConfig.city}
            fieldType="text"
            placeholder="Miami"
            error={fieldErrors.city}
            onChange={(nextValue) => updateConfig({ city: nextValue })}
          />
          <WorkflowConfigValueField
            id={`${nodeId}-state`}
            label="State"
            value={nodeConfig.state}
            fieldType="text"
            placeholder="FL"
            error={fieldErrors.state}
            onChange={(nextValue) => updateConfig({ state: nextValue })}
          />
        </div>
      )}

      <Separator />

      <div className="grid grid-cols-2 gap-3">
        <WorkflowConfigValueField
          id={`${nodeId}-min-price`}
          label="Min price"
          value={nodeConfig.minPrice}
          fieldType="number"
          placeholder="250000"
          error={fieldErrors.minPrice}
          onChange={(nextValue) => updateConfig({ minPrice: nextValue })}
        />
        <WorkflowConfigValueField
          id={`${nodeId}-max-price`}
          label="Max price"
          value={nodeConfig.maxPrice}
          fieldType="number"
          placeholder="650000"
          error={fieldErrors.maxPrice}
          onChange={(nextValue) => updateConfig({ maxPrice: nextValue })}
        />
      </div>
    </div>
  );
}
