import { describe, expect, it } from "vitest";

import {
  isSuccessfulRunStatus,
  isTerminalRunStatus,
  isTerminalStepStatus,
} from "@/contracts/runs/lifecycle";
import { RunLifecycleError } from "@/modules/runs/errors";
import {
  assertRunStatusTransition,
  assertRunStepStatusTransition,
  createRunStatusPatch,
  createRunStepStatusPatch,
  planRunStatusTransition,
} from "@/modules/runs/lifecycle";

describe("run lifecycle status helpers", () => {
  it("identifies terminal and successful run statuses", () => {
    expect(isTerminalRunStatus("succeeded")).toBe(true);
    expect(isTerminalRunStatus("partial")).toBe(true);
    expect(isTerminalRunStatus("failed")).toBe(true);
    expect(isTerminalRunStatus("canceled")).toBe(true);
    expect(isTerminalRunStatus("running")).toBe(false);

    expect(isSuccessfulRunStatus("succeeded")).toBe(true);
    expect(isSuccessfulRunStatus("partial")).toBe(true);
    expect(isSuccessfulRunStatus("failed")).toBe(false);
  });

  it("identifies terminal step statuses", () => {
    expect(isTerminalStepStatus("succeeded")).toBe(true);
    expect(isTerminalStepStatus("failed")).toBe(true);
    expect(isTerminalStepStatus("skipped")).toBe(true);
    expect(isTerminalStepStatus("running")).toBe(false);
  });
});

describe("assertRunStatusTransition", () => {
  it("allows valid run transitions", () => {
    expect(() => assertRunStatusTransition("pending", "running")).not.toThrow();
    expect(() => assertRunStatusTransition("pending", "failed")).not.toThrow();
    expect(() =>
      assertRunStatusTransition("running", "succeeded"),
    ).not.toThrow();
    expect(() => assertRunStatusTransition("running", "partial")).not.toThrow();
    expect(() => assertRunStatusTransition("running", "failed")).not.toThrow();
    expect(() =>
      assertRunStatusTransition("running", "canceled"),
    ).not.toThrow();
  });

  it("treats same-state transitions as no-ops", () => {
    expect(() => assertRunStatusTransition("running", "running")).not.toThrow();
  });

  it("rejects invalid run transitions", () => {
    expect(() => assertRunStatusTransition("pending", "succeeded")).toThrow(
      RunLifecycleError,
    );
    expect(() => assertRunStatusTransition("succeeded", "running")).toThrow(
      RunLifecycleError,
    );
    expect(() => assertRunStatusTransition("failed", "running")).toThrow(
      RunLifecycleError,
    );
  });
});

describe("assertRunStepStatusTransition", () => {
  it("allows valid step transitions", () => {
    expect(() =>
      assertRunStepStatusTransition("pending", "running"),
    ).not.toThrow();
    expect(() =>
      assertRunStepStatusTransition("pending", "skipped"),
    ).not.toThrow();
    expect(() =>
      assertRunStepStatusTransition("running", "succeeded"),
    ).not.toThrow();
    expect(() =>
      assertRunStepStatusTransition("running", "failed"),
    ).not.toThrow();
  });

  it("rejects invalid step transitions", () => {
    expect(() =>
      assertRunStepStatusTransition("pending", "succeeded"),
    ).toThrow(RunLifecycleError);
    expect(() =>
      assertRunStepStatusTransition("succeeded", "running"),
    ).toThrow(RunLifecycleError);
  });
});

describe("planRunStatusTransition", () => {
  const now = new Date("2026-06-14T12:00:00.000Z");

  it("returns null for idempotent same-state updates", () => {
    expect(planRunStatusTransition("running", "running", { now })).toBeNull();
  });

  it("sets startedAt on first transition to running", () => {
    expect(
      planRunStatusTransition("pending", "running", { now }),
    ).toEqual({
      status: "running",
      startedAt: now,
    });
  });

  it("does not overwrite an existing startedAt", () => {
    const startedAt = new Date("2026-06-14T11:00:00.000Z");

    expect(
      planRunStatusTransition("pending", "running", { now, startedAt }),
    ).toEqual({
      status: "running",
    });
  });

  it("sets completedAt and errorJson on terminal transitions", () => {
    expect(
      planRunStatusTransition("running", "failed", {
        now,
        error: {
          code: "transport_start_failed",
          userMessage: "Could not start the run.",
        },
      }),
    ).toEqual({
      status: "failed",
      completedAt: now,
      errorJson: {
        code: "transport_start_failed",
        userMessage: "Could not start the run.",
      },
    });
  });

  it("sets completedAt for successful terminal transitions", () => {
    expect(
      planRunStatusTransition("running", "partial", { now }),
    ).toEqual({
      status: "partial",
      completedAt: now,
    });

    expect(
      planRunStatusTransition("running", "canceled", { now }),
    ).toEqual({
      status: "canceled",
      completedAt: now,
    });
  });
});

describe("createRunStepStatusPatch", () => {
  const now = new Date("2026-06-14T12:00:00.000Z");

  it("sets timestamps consistently for step transitions", () => {
    expect(
      createRunStepStatusPatch("pending", "running", { now }),
    ).toEqual({
      status: "running",
      startedAt: now,
    });

    expect(
      createRunStepStatusPatch("running", "failed", {
        now,
        error: {
          code: "executor_failed",
          userMessage: "Step failed.",
        },
      }),
    ).toEqual({
      status: "failed",
      completedAt: now,
      errorJson: {
        code: "executor_failed",
        userMessage: "Step failed.",
      },
    });
  });
});
