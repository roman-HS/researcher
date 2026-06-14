import { describe, expect, it } from "vitest";

import {
  amendStepOutputSnapshotForPartialResult,
  annotateSummaryForPartialResult,
  buildPartialDataQualitySummaryNote,
  isRootAcquisitionStep,
  RunPartialResultTracker,
} from "@/modules/runs/partial-result-handling";

const enrichmentStep = {
  nodeId: "step-detail",
  title: "Property Detail",
  toolKey: "rapidapi.zillow.propertyDetail@1",
  executorKey: "rapidapi.zillow.propertyDetail@1",
  config: {},
};

const rootStep = {
  nodeId: "step-search",
  title: "Listing Search",
  toolKey: "rapidapi.zillow.searchListings@1",
  executorKey: "rapidapi.zillow.searchListings@1",
  config: {},
};

describe("RunPartialResultTracker", () => {
  it("ignores root acquisition item errors", () => {
    const tracker = new RunPartialResultTracker();

    tracker.recordSucceededStep(rootStep, [
      {
        code: "listing_normalization_failed",
        userMessage: "Could not normalize listing.",
      },
    ]);

    expect(tracker.shouldMarkRunPartial()).toBe(false);
  });

  it("marks partial when a post-acquisition step reports item errors", () => {
    const tracker = new RunPartialResultTracker();

    tracker.recordSucceededStep(enrichmentStep, [
      {
        code: "provider_error",
        userMessage: "Provider failed.",
        propertyKey: "provider:1",
      },
      {
        code: "provider_error",
        userMessage: "Provider failed.",
        propertyKey: "provider:2",
      },
    ]);

    expect(tracker.shouldMarkRunPartial()).toBe(true);
    expect(tracker.getStats()).toEqual({
      itemErrorCount: 2,
      stepsWithItemErrors: 1,
    });
  });
});

describe("partial summary annotation", () => {
  it("adds partial data-quality notes to the workflow summary", () => {
    const summary = annotateSummaryForPartialResult(
      {
        title: "Summary",
        sections: [],
        topProperties: [],
        warnings: [],
        missingDataNotes: [],
      },
      { itemErrorCount: 2, stepsWithItemErrors: 1 },
    );

    expect(summary.missingDataNotes).toContain(
      buildPartialDataQualitySummaryNote({
        itemErrorCount: 2,
        stepsWithItemErrors: 1,
      }),
    );
    expect(summary.warnings).toContain(
      "Some property enrichments failed; results may be incomplete.",
    );
  });

  it("amends a succeeded step snapshot when it contains a summary patch", () => {
    const amended = amendStepOutputSnapshotForPartialResult(
      {
        workingSetPatch: {
          summary: {
            title: "Summary",
            sections: [],
            topProperties: [],
            warnings: [],
            missingDataNotes: [],
          },
        },
        summary: { propertyCount: 3 },
      },
      { itemErrorCount: 1, stepsWithItemErrors: 1 },
    );

    expect(amended?.workingSetPatch?.summary?.missingDataNotes).toHaveLength(1);
    expect(amended?.workingSetPatch?.summary?.warnings).toHaveLength(1);
  });
});

describe("isRootAcquisitionStep", () => {
  it("identifies listing search as the root acquisition step", () => {
    expect(isRootAcquisitionStep(rootStep)).toBe(true);
    expect(isRootAcquisitionStep(enrichmentStep)).toBe(false);
  });
});
