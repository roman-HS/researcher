import { describe, expect, it } from "vitest";

import { propertyDetailResponseSchema } from "@/contracts/providers/zillow/property-detail";

describe("propertyDetailResponseSchema", () => {
  it("accepts nullable wire values commonly returned by private-Zillow", () => {
    const parsed = propertyDetailResponseSchema.safeParse({
      propertyDetails: {
        zpid: 2098418308,
        zestimate: null,
        rentZestimate: null,
        lastSoldPrice: null,
        lotSize: null,
        lotAreaValue: null,
        priceHistory: [
          {
            event: "Sold",
            date: "2025-01-15",
            pricePerSquareFoot: null,
            buyerAgent: null,
            sellerAgent: null,
          },
        ],
        resoFacts: {
          taxAssessedValue: null,
          lotSize: null,
          associationFee: "125",
        },
      },
    });

    expect(parsed.success).toBe(true);
  });
});
