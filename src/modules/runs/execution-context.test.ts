import { describe, expect, it } from "vitest";

import {
  WORKFLOW_COMPILED_PLAN_VERSION,
  type WorkflowCompiledPlan,
} from "@/contracts/workflows/compiled-plan";
import {
  applyWorkingSetPatch,
  buildToolExecutorRunContext,
  createWorkflowExecutionContext,
  DEFAULT_EXECUTION_LIMITS,
  deserializeWorkflowExecutionContext,
  getCurrentExecutionStep,
  recordProviderCalls,
  resetStepUsageCounters,
  serializeWorkflowExecutionContext,
  withCurrentStepIndex,
  withExecutionRunStatus,
} from "@/modules/runs/execution-context";

const runId = "11111111-1111-4111-8111-111111111111";
const workspaceId = "22222222-2222-4222-8222-222222222222";
const workflowId = "33333333-3333-4333-8333-333333333333";
const workflowVersionId = "44444444-4444-4444-8444-444444444444";
const userId = "55555555-5555-4555-8555-555555555555";

const compiledPlan: WorkflowCompiledPlan = {
  planVersion: WORKFLOW_COMPILED_PLAN_VERSION,
  trigger: { type: "manual" },
  runtimeInputs: [
    {
      key: "searchZip",
      label: "Search ZIP",
      type: "text",
      required: true,
    },
  ],
  executionOrder: ["step-search", "step-summary"],
  steps: [
    {
      nodeId: "step-search",
      title: "Listing Search",
      toolKey: "rapidapi.zillow.searchListings@1",
      executorKey: "rapidapi.zillow.searchListings@1",
      config: {
        locationSource: "zip",
        zip: { kind: "workflowInput", inputKey: "searchZip" },
      },
    },
    {
      nodeId: "step-summary",
      title: "Generate Summary",
      toolKey: "ai.generateSummary@1",
      executorKey: "ai.generateSummary@1",
      config: {},
    },
  ],
};

function createTestContext() {
  return createWorkflowExecutionContext({
    run: {
      runId,
      workspaceId,
      workflowId,
      workflowVersionId,
      userId,
      createdAt: "2026-06-14T12:00:00.000Z",
    },
    compiledPlan,
    runtimeInputValues: {
      searchZip: "78701",
    },
  });
}

describe("createWorkflowExecutionContext", () => {
  it("initializes immutable run frame, plan, limits, and mutable state", () => {
    const context = createTestContext();

    expect(context.run).toEqual({
      runId,
      workspaceId,
      workflowId,
      workflowVersionId,
      userId,
      createdAt: "2026-06-14T12:00:00.000Z",
    });
    expect(context.compiledPlan).toEqual(compiledPlan);
    expect(context.runtimeInputValues).toEqual({ searchZip: "78701" });
    expect(context.limits).toEqual(DEFAULT_EXECUTION_LIMITS);
    expect(context.state.status).toBe("pending");
    expect(context.state.currentStepIndex).toBe(0);
    expect(context.state.workingSet.propertyOrder).toEqual([]);
    expect(context.state.usage).toEqual({
      providerCallsRun: 0,
      providerCallsStep: 0,
    });
  });
});

describe("getCurrentExecutionStep", () => {
  it("returns the step at the current index", () => {
    const context = createTestContext();
    const step = getCurrentExecutionStep(context);

    expect(step?.nodeId).toBe("step-search");

    const advanced = withCurrentStepIndex(context, 1);

    expect(getCurrentExecutionStep(advanced)?.nodeId).toBe("step-summary");
    expect(getCurrentExecutionStep(withCurrentStepIndex(advanced, 2))).toBeUndefined();
  });
});

describe("buildToolExecutorRunContext", () => {
  it("projects the per-step executor context from the execution context", () => {
    const context = createTestContext();
    const step = getCurrentExecutionStep(context);

    expect(step).toBeDefined();

    if (!step) {
      throw new Error("Expected a current step.");
    }

    expect(buildToolExecutorRunContext(context, step)).toEqual({
      runId,
      nodeId: "step-search",
      toolKey: "rapidapi.zillow.searchListings@1",
      workflowId,
      workflowVersionId,
      workspaceId,
      userId,
      runtimeInputValues: { searchZip: "78701" },
    });
  });
});

describe("execution context mutations", () => {
  it("updates run status immutably", () => {
    const running = withExecutionRunStatus(createTestContext(), "running");

    expect(running.state.status).toBe("running");
    expect(createTestContext().state.status).toBe("pending");
  });

  it("merges working-set patches through the context helper", () => {
    const updated = applyWorkingSetPatch(createTestContext(), {
      propertyOrder: ["zillow:123"],
    });

    expect(updated.state.workingSet.propertyOrder).toEqual(["zillow:123"]);
    expect(createTestContext().state.workingSet.propertyOrder).toEqual([]);
  });

  it("tracks provider usage counters and resets per-step counts", () => {
    const afterCalls = recordProviderCalls(
      recordProviderCalls(createTestContext(), 2),
      3,
    );

    expect(afterCalls.state.usage).toEqual({
      providerCallsRun: 5,
      providerCallsStep: 5,
    });

    const nextStep = resetStepUsageCounters(afterCalls);

    expect(nextStep.state.usage).toEqual({
      providerCallsRun: 5,
      providerCallsStep: 0,
    });
  });
});

describe("serializeWorkflowExecutionContext", () => {
  it("round-trips a JSON-serializable execution context", () => {
    const context = withExecutionRunStatus(createTestContext(), "running");
    const restored = deserializeWorkflowExecutionContext(
      serializeWorkflowExecutionContext(context),
    );

    expect(restored).toEqual(context);
  });
});
