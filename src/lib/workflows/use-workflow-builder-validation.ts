"use client";

import { useEffect, useMemo, useState } from "react";

import type { WorkflowDefinitionValidationResult } from "@/contracts/workflows/validation";
import { buildNodeValidationStatusByNodeId } from "@/lib/workflows/node-validation-status";
import {
  getWorkflowPublishEligibility,
  type WorkflowPublishEligibility,
} from "@/lib/workflows/validation-display";
import { validateWorkflowDefinition } from "@/lib/workflows/validate-definition";
import { useWorkflowBuilderStore } from "@/stores/workflow-builder-store";

const VALIDATION_DEBOUNCE_MS = 200;

/**
 * Debounced publish-profile validation for the workflow builder UI.
 *
 * @see Story 5.4.1 — Add builder validation panel
 */

export type WorkflowBuilderValidationState = {
  validation: WorkflowDefinitionValidationResult;
  nodeValidationStatusByNodeId: ReturnType<
    typeof buildNodeValidationStatusByNodeId
  >;
  eligibility: WorkflowPublishEligibility;
};

export function useWorkflowBuilderValidation(): WorkflowBuilderValidationState {
  const definition = useWorkflowBuilderStore((state) => state.definition);
  const [validation, setValidation] = useState<WorkflowDefinitionValidationResult>(
    () => validateWorkflowDefinition(definition, "publish"),
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setValidation(validateWorkflowDefinition(definition, "publish"));
    }, VALIDATION_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [definition]);

  const nodeValidationStatusByNodeId = useMemo(
    () =>
      buildNodeValidationStatusByNodeId([
        ...validation.errors,
        ...validation.warnings,
      ]),
    [validation.errors, validation.warnings],
  );

  const eligibility = useMemo(
    () => getWorkflowPublishEligibility(validation.errors, validation.warnings),
    [validation.errors, validation.warnings],
  );

  return {
    validation,
    nodeValidationStatusByNodeId,
    eligibility,
  };
}
