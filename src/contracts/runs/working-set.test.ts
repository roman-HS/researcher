import { describe, expect, it } from "vitest";

import { isoDateTimeSchema } from "@/contracts/domain/primitives";
import {
  createEmptyExecutionWorkingSet,
  mergeExecutionWorkingSet,
  parseExecutionWorkingSetPatch,
} from "@/contracts/runs/working-set";

describe("parseExecutionWorkingSetPatch", () => {
  it("does not inject default fields when only detailsByKey is patched", () => {
    const patch = parseExecutionWorkingSetPatch({
      detailsByKey: {},
    });

    expect(Object.keys(patch)).toEqual(["detailsByKey"]);
    expect("propertyOrder" in patch).toBe(false);
  });

  it("preserves propertyOrder when merging a details-only patch", () => {
    const base = createEmptyExecutionWorkingSet();
    base.propertyOrder = ["rapidapi.zillow:1", "rapidapi.zillow:2"];

    const merged = mergeExecutionWorkingSet(
      base,
      parseExecutionWorkingSetPatch({
        detailsByKey: {
          "rapidapi.zillow:1": {
            source: {
              provider: "rapidapi.zillow",
              externalId: "1",
              retrievedAt: "2026-06-14T12:00:00.000Z",
            },
          },
        },
      }),
    );

    expect(merged.propertyOrder).toEqual([
      "rapidapi.zillow:1",
      "rapidapi.zillow:2",
    ]);
  });
});

describe("isoDateTimeSchema", () => {
  it("accepts canonical UTC offsets used by normalization", () => {
    expect(isoDateTimeSchema.safeParse("2025-01-15T00:00:00.000Z").success).toBe(
      true,
    );
    expect(isoDateTimeSchema.safeParse("2025-01-15T00:00:00+00:00").success).toBe(
      true,
    );
  });

  it("rejects date-only strings", () => {
    expect(isoDateTimeSchema.safeParse("2025-01-15").success).toBe(false);
  });
});
