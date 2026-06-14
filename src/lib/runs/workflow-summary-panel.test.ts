import { describe, expect, it } from "vitest";

import type { WorkflowSummary } from "@/contracts/domain/analysis";
import type { RunDetailPropertyResult } from "@/contracts/runs/responses";

import {
  buildTopPropertyDisplayItems,
  buildWorkflowSummaryCopyText,
  formatScoreReasonCode,
  getDisplaySummarySections,
  renderWorkflowSummaryMarkdown,
  shouldShowTopPropertiesBlock,
} from "./workflow-summary-panel";

function createSummary(
  overrides: Partial<WorkflowSummary> = {},
): WorkflowSummary {
  return {
    title: "Investment analysis summary",
    sections: [
      {
        id: "overview",
        title: "Overview",
        bullets: ["3 properties in the run."],
      },
      {
        id: "topProperties",
        title: "Top properties",
        bullets: ["123 Main St — score 82.0"],
      },
      {
        id: "warningsAndNotes",
        title: "Warnings and missing data",
        bullets: ["Area 78701 has low sample size."],
      },
    ],
    topProperties: [
      {
        propertyKey: "prop-1",
        rank: 1,
        score: 82,
        highlightReasonCodes: ["strong_cap_rate"],
      },
    ],
    warnings: ["Rent estimate was imputed."],
    missingDataNotes: ["Missing rent estimate for one property."],
    ...overrides,
  };
}

function createPropertyResult(
  overrides: Partial<RunDetailPropertyResult> = {},
): RunDetailPropertyResult {
  return {
    propertyResultId: "00000000-0000-4000-8000-000000000001",
    propertyKey: "prop-1",
    displayOrder: 0,
    totalScore: 82,
    listPriceCents: null,
    capRate: null,
    monthlyCashFlow: null,
    addressSummary: {
      line1: "123 Main St",
      city: "Austin",
      state: "TX",
      postalCode: "78701",
    },
    listing: null,
    detail: null,
    rentEstimate: null,
    comparables: null,
    metrics: null,
    score: null,
    warnings: [],
    errors: [],
    ...overrides,
  };
}

describe("getDisplaySummarySections", () => {
  it("omits warnings and top property sections rendered elsewhere", () => {
    expect(getDisplaySummarySections(createSummary())).toEqual([
      {
        id: "overview",
        title: "Overview",
        bullets: ["3 properties in the run."],
      },
    ]);
  });
});

describe("shouldShowTopPropertiesBlock", () => {
  it("shows when top properties exist or the section is configured", () => {
    expect(shouldShowTopPropertiesBlock(createSummary())).toBe(true);
    expect(
      shouldShowTopPropertiesBlock(
        createSummary({
          topProperties: [],
          sections: [
            {
              id: "overview",
              title: "Overview",
              bullets: ["3 properties in the run."],
            },
            {
              id: "topProperties",
              title: "Top properties",
              bullets: ["No scored properties available."],
            },
          ],
        }),
      ),
    ).toBe(true);
    expect(
      shouldShowTopPropertiesBlock(
        createSummary({
          topProperties: [],
          sections: [
            {
              id: "overview",
              title: "Overview",
              bullets: ["3 properties in the run."],
            },
          ],
        }),
      ),
    ).toBe(false);
  });
});

describe("buildTopPropertyDisplayItems", () => {
  it("joins top properties with run property results for address labels", () => {
    expect(
      buildTopPropertyDisplayItems(
        createSummary().topProperties,
        [createPropertyResult()],
      ),
    ).toEqual([
      {
        rank: 1,
        propertyKey: "prop-1",
        label: "123 Main St",
        secondaryLabel: "Austin, TX 78701",
        score: 82,
        highlightReasonCodes: ["strong_cap_rate"],
      },
    ]);
  });
});

describe("buildWorkflowSummaryCopyText", () => {
  it("copies persisted markdown when present", () => {
    expect(
      buildWorkflowSummaryCopyText(
        createSummary({ markdown: "# Saved markdown\n\n- item" }),
      ),
    ).toBe("# Saved markdown\n\n- item");
  });

  it("synthesizes markdown from structured sections when markdown is absent", () => {
    expect(buildWorkflowSummaryCopyText(createSummary())).toBe(
      renderWorkflowSummaryMarkdown(
        "Investment analysis summary",
        createSummary().sections,
      ),
    );
  });
});

describe("formatScoreReasonCode", () => {
  it("formats enum codes for display", () => {
    expect(formatScoreReasonCode("strong_cap_rate")).toBe("strong cap rate");
  });
});
