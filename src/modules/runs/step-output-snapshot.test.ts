import { describe, expect, it } from "vitest";

import { buildRunStepOutputSnapshot } from "@/modules/runs/step-output-snapshot";

describe("buildRunStepOutputSnapshot", () => {
  it("includes property count and optional patch and item errors", () => {
    expect(
      buildRunStepOutputSnapshot({
        propertyCount: 3,
        workingSetPatch: {
          propertyOrder: ["provider:1", "provider:2", "provider:3"],
        },
        itemErrors: [
          {
            code: "missing_zpid",
            userMessage: "Missing provider id.",
            propertyKey: "provider:1",
          },
        ],
      }),
    ).toEqual({
      summary: { propertyCount: 3 },
      workingSetPatch: {
        propertyOrder: ["provider:1", "provider:2", "provider:3"],
      },
      itemErrors: [
        {
          code: "missing_zpid",
          userMessage: "Missing provider id.",
          propertyKey: "provider:1",
        },
      ],
    });
  });

  it("omits empty optional fields", () => {
    expect(
      buildRunStepOutputSnapshot({
        propertyCount: 0,
      }),
    ).toEqual({
      summary: { propertyCount: 0 },
    });
  });
});
