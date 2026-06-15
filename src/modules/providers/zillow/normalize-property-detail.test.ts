import { describe, expect, it } from "vitest";

import type { PropertyListing } from "@/contracts/domain";
import type { PropertyKey } from "@/contracts/runs";
import { normalizePropertyDetailResponse } from "@/modules/providers/zillow/normalize-property-detail";

const listing: PropertyListing = {
  source: {
    provider: "rapidapi.zillow",
    externalId: "43855545",
    retrievedAt: "2026-06-14T12:00:00.000Z",
  },
  address: {
    line1: "123 Example St",
    city: "Miami",
    state: "FL",
    postalCode: "33133",
    country: "US",
  },
};

const context = {
  propertyKey: "rapidapi.zillow:43855545" as PropertyKey,
  listing,
  retrievedAt: "2026-06-14T12:00:00.000Z",
  zpid: "43855545",
};

describe("normalizePropertyDetailResponse", () => {
  it("normalizes sparse provider payloads without failing on nullable fields", () => {
    const result = normalizePropertyDetailResponse(
      {
        propertyDetails: {
          zpid: 43855545,
          bedrooms: 3,
          zestimate: null,
          rentZestimate: null,
          lastSoldPrice: null,
          priceHistory: [
            {
              event: "Sold",
              date: "2025-01-15",
              price: 1_650_000,
              pricePerSquareFoot: null,
            },
          ],
          resoFacts: {
            taxAssessedValue: null,
            associationFee: "125",
          },
        },
      },
      context,
    );

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error("Expected normalization to succeed.");
    }

    expect(result.detail.lastSaleDate).toBe("2025-01-15T00:00:00.000Z");
    expect(result.detail.hoaFee).toEqual({
      amount: "125",
      currency: "USD",
    });
    expect(result.detail.taxAssessedValue).toBeUndefined();
  });

  it("drops invalid last sale dates instead of failing normalization", () => {
    const result = normalizePropertyDetailResponse(
      {
        propertyDetails: {
          zpid: 43855545,
          priceHistory: [
            {
              event: "Sold",
              time: 9_999_999_999_999_999,
            },
          ],
        },
      },
      context,
    );

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error("Expected normalization to succeed.");
    }

    expect(result.detail.lastSaleDate).toBeUndefined();
  });
});
