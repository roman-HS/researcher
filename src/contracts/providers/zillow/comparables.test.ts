import { describe, expect, it } from "vitest";

import { comparablesResponseSchema } from "@/contracts/providers/zillow/comparables";

describe("comparablesResponseSchema", () => {
  it("accepts nullable wire values commonly returned by private-Zillow", () => {
    const parsed = comparablesResponseSchema.safeParse({
      comparable_homes: [
        {
          property: {
            zpid: 123456,
            latitude: null,
            longitude: null,
            livingArea: null,
            livingAreaValue: null,
            livingAreaUnits: null,
            price: 500000,
            homeStatus: "RECENTLY_SOLD",
          },
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });
});
