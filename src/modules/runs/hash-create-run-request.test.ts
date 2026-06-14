import { describe, expect, it } from "vitest";

import { hashCreateRunRequest } from "@/modules/runs/hash-create-run-request";

const workflowId = "11111111-1111-4111-8111-111111111111";

describe("hashCreateRunRequest", () => {
  it("returns a stable hash for the same workflow and inputs", () => {
    const inputs = { searchZip: "90210", maxPrice: 500000 };

    expect(hashCreateRunRequest(workflowId, inputs)).toBe(
      hashCreateRunRequest(workflowId, inputs),
    );
  });

  it("normalizes input key order before hashing", () => {
    expect(
      hashCreateRunRequest(workflowId, {
        b: 2,
        a: 1,
      }),
    ).toBe(
      hashCreateRunRequest(workflowId, {
        a: 1,
        b: 2,
      }),
    );
  });

  it("changes the hash when workflow or inputs differ", () => {
    const baseHash = hashCreateRunRequest(workflowId, { searchZip: "90210" });
    const otherWorkflowHash = hashCreateRunRequest(
      "22222222-2222-4222-8222-222222222222",
      { searchZip: "90210" },
    );
    const otherInputsHash = hashCreateRunRequest(workflowId, {
      searchZip: "10001",
    });

    expect(otherWorkflowHash).not.toBe(baseHash);
    expect(otherInputsHash).not.toBe(baseHash);
  });
});
