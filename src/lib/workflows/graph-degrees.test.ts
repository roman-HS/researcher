import { describe, expect, it } from "vitest";

import type { WorkflowDefinition } from "@/contracts/workflows/internal";

import {
  buildWorkflowGraphDegrees,
  findChainAppendSourceNodeId,
} from "@/lib/workflows/graph-degrees";
import { insertToolNodeIntoDefinition } from "@/lib/workflows/insert-tool-node";

const listingTool = {
  key: "rapidapi.zillow.searchListings@1",
  name: "Listing Search",
  defaultConfig: {},
} as const;

const detailTool = {
  key: "rapidapi.zillow.propertyDetail@1",
  name: "Property Detail",
  defaultConfig: {},
} as const;

const metricsTool = {
  key: "analysis.calculateMetrics@1",
  name: "Calculate Metrics",
  defaultConfig: {},
} as const;

function node(
  id: string,
  x: number,
  toolKey: string = listingTool.key,
  title = id,
): WorkflowDefinition["nodes"][number] {
  return {
    id,
    kind: "tool",
    toolKey,
    title,
    config: {},
    position: { x, y: 80 },
  };
}

describe("findChainAppendSourceNodeId", () => {
  it("returns null for an empty workflow", () => {
    expect(findChainAppendSourceNodeId({ nodes: [], edges: [] })).toBeNull();
  });

  it("returns the only node when the workflow has a single step", () => {
    expect(
      findChainAppendSourceNodeId({
        nodes: [node("search", 60)],
        edges: [],
      }),
    ).toBe("search");
  });

  it("returns the rightmost disconnected node when no edges exist", () => {
    expect(
      findChainAppendSourceNodeId({
        nodes: [node("search", 60), node("detail", 300)],
        edges: [],
      }),
    ).toBe("detail");
  });

  it("returns the terminal of an existing linear chain", () => {
    expect(
      findChainAppendSourceNodeId({
        nodes: [node("search", 60), node("detail", 300, detailTool.key)],
        edges: [{ source: "search", target: "detail" }],
      }),
    ).toBe("detail");
  });

  it("returns null when multiple connected terminals exist", () => {
    expect(
      findChainAppendSourceNodeId({
        nodes: [
          node("search", 60),
          node("detail", 300, detailTool.key),
          node("metrics", 540, metricsTool.key),
          node("score", 780, "analysis.scoreProperties@1"),
        ],
        edges: [
          { source: "search", target: "detail" },
          { source: "metrics", target: "score" },
        ],
      }),
    ).toBeNull();
  });
});

describe("insertToolNodeIntoDefinition", () => {
  it("auto-connects the second inserted tool to the first", () => {
    const first = insertToolNodeIntoDefinition(
      { definitionVersion: 1, trigger: { type: "manual" }, runtimeInputs: [], nodes: [], edges: [] },
      listingTool,
    );

    const second = insertToolNodeIntoDefinition(first.definition, detailTool);

    expect(second.definition.edges).toEqual([
      { source: first.nodeId, target: second.nodeId },
    ]);
  });

  it("appends a third tool to the end of an existing chain", () => {
    let definition = insertToolNodeIntoDefinition(
      { definitionVersion: 1, trigger: { type: "manual" }, runtimeInputs: [], nodes: [], edges: [] },
      listingTool,
    ).definition;

    definition = insertToolNodeIntoDefinition(definition, detailTool).definition;
    const third = insertToolNodeIntoDefinition(definition, metricsTool);

    expect(third.definition.edges).toHaveLength(2);
    expect(third.definition.edges.at(-1)).toEqual({
      source: expect.any(String),
      target: third.nodeId,
    });
  });
});

describe("buildWorkflowGraphDegrees", () => {
  it("tracks incoming and outgoing edge counts", () => {
    const degrees = buildWorkflowGraphDegrees({
      nodes: [node("a", 0), node("b", 100)],
      edges: [{ source: "a", target: "b" }],
    });

    expect(degrees.inDegree.get("a")).toBe(0);
    expect(degrees.outDegree.get("a")).toBe(1);
    expect(degrees.inDegree.get("b")).toBe(1);
    expect(degrees.outDegree.get("b")).toBe(0);
  });
});
