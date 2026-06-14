import type { WorkflowDefinitionValidationIssue } from "@/contracts/workflows/validation";

/**
 * Builder-facing validation labels and publish eligibility helpers.
 *
 * @see Story 5.4.1 — Add builder validation panel
 */

export type WorkflowPublishEligibility = "ready" | "blocked" | "warnings";

export function getValidationIssueImpactLabel(
  issue: WorkflowDefinitionValidationIssue,
): string {
  if (issue.code === "definition_parse_error") {
    return "Blocks save and publish";
  }

  if (issue.severity === "warning") {
    return "Can publish with warnings";
  }

  return "Blocks publish";
}

export function getWorkflowPublishEligibility(
  errors: readonly WorkflowDefinitionValidationIssue[],
  warnings: readonly WorkflowDefinitionValidationIssue[],
): WorkflowPublishEligibility {
  if (errors.length > 0) {
    return "blocked";
  }

  if (warnings.length > 0) {
    return "warnings";
  }

  return "ready";
}

export function validationIssueKey(issue: WorkflowDefinitionValidationIssue): string {
  return [
    issue.severity,
    issue.code,
    issue.nodeId ?? "",
    issue.path ?? "",
    issue.message,
  ].join("|");
}

export function mergeValidationIssues(
  primary: readonly WorkflowDefinitionValidationIssue[],
  additional: readonly WorkflowDefinitionValidationIssue[],
): WorkflowDefinitionValidationIssue[] {
  const seen = new Set<string>();
  const merged: WorkflowDefinitionValidationIssue[] = [];

  for (const issue of [...additional, ...primary]) {
    const key = validationIssueKey(issue);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(issue);
  }

  return merged;
}
