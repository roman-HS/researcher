/**
 * Topology-only workflow graph validation rules.
 *
 * @see Story 4.2.4 — Define graph validation rules
 */

export const workflowGraphValidationProfiles = ["draft", "publish"] as const;

export type WorkflowGraphValidationProfile =
  (typeof workflowGraphValidationProfiles)[number];

export type WorkflowGraphDefinition = {
  nodes: ReadonlyArray<{ id: string }>;
  edges: ReadonlyArray<{ source: string; target: string }>;
};

export type WorkflowGraphIssueCode =
  | "insufficient_nodes"
  | "unknown_edge_source"
  | "unknown_edge_target"
  | "cycle_detected"
  | "branching_not_allowed"
  | "disconnected_node"
  | "invalid_edge_count"
  | "multiple_roots"
  | "no_root"
  | "multiple_terminals"
  | "no_terminal"
  | "invalid_linear_path";

export type WorkflowGraphIssue = {
  code: WorkflowGraphIssueCode;
  message: string;
  nodeId?: string;
  edgeSource?: string;
  edgeTarget?: string;
};

export type WorkflowGraphIssueLike = {
  code: string;
  message: string;
  nodeId?: string;
  edgeSource?: string;
  edgeTarget?: string;
};

type GraphIndexes = {
  nodeIds: Set<string>;
  inDegree: Map<string, number>;
  outDegree: Map<string, number>;
  outgoingBySource: Map<string, string>;
};

function buildGraphIndexes(definition: WorkflowGraphDefinition): GraphIndexes {
  const nodeIds = new Set(definition.nodes.map((node) => node.id));
  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();
  const outgoingBySource = new Map<string, string>();

  for (const node of definition.nodes) {
    inDegree.set(node.id, 0);
    outDegree.set(node.id, 0);
  }

  for (const edge of definition.edges) {
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    outDegree.set(edge.source, (outDegree.get(edge.source) ?? 0) + 1);
    outgoingBySource.set(edge.source, edge.target);
  }

  return { nodeIds, inDegree, outDegree, outgoingBySource };
}

function findUnknownEdgeReferenceIssues(
  definition: WorkflowGraphDefinition,
  nodeIds: Set<string>
): WorkflowGraphIssue[] {
  const issues: WorkflowGraphIssue[] = [];

  for (const edge of definition.edges) {
    if (!nodeIds.has(edge.source)) {
      issues.push({
        code: "unknown_edge_source",
        message: `Edge source "${edge.source}" does not match any workflow node.`,
        edgeSource: edge.source,
        edgeTarget: edge.target,
      });
    }

    if (!nodeIds.has(edge.target)) {
      issues.push({
        code: "unknown_edge_target",
        message: `Edge target "${edge.target}" does not match any workflow node.`,
        edgeSource: edge.source,
        edgeTarget: edge.target,
      });
    }
  }

  return issues;
}

function findBranchingIssues(
  definition: WorkflowGraphDefinition,
  inDegree: Map<string, number>,
  outDegree: Map<string, number>
): WorkflowGraphIssue[] {
  const issues: WorkflowGraphIssue[] = [];

  for (const node of definition.nodes) {
    const incoming = inDegree.get(node.id) ?? 0;
    const outgoing = outDegree.get(node.id) ?? 0;

    if (incoming > 1) {
      issues.push({
        code: "branching_not_allowed",
        message: `Node "${node.id}" has ${incoming} incoming edges; V1 workflows must follow a single linear path.`,
        nodeId: node.id,
      });
    }

    if (outgoing > 1) {
      issues.push({
        code: "branching_not_allowed",
        message: `Node "${node.id}" has ${outgoing} outgoing edges; V1 workflows must follow a single linear path.`,
        nodeId: node.id,
      });
    }
  }

  return issues;
}

function findDisconnectedNodeIssues(
  definition: WorkflowGraphDefinition
): WorkflowGraphIssue[] {
  if (definition.nodes.length <= 1) {
    return [];
  }

  if (definition.edges.length === 0) {
    return definition.nodes.slice(1).map((node) => ({
      code: "disconnected_node",
      message: `Node "${node.id}" is not connected to the workflow graph.`,
      nodeId: node.id,
    }));
  }

  const adjacency = new Map<string, Set<string>>();

  for (const node of definition.nodes) {
    adjacency.set(node.id, new Set());
  }

  for (const edge of definition.edges) {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  }

  const startNodeId = definition.nodes[0]?.id;

  if (!startNodeId) {
    return [];
  }

  const visited = new Set<string>();
  const stack = [startNodeId];

  while (stack.length > 0) {
    const current = stack.pop();

    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);

    for (const neighbor of adjacency.get(current) ?? []) {
      if (!visited.has(neighbor)) {
        stack.push(neighbor);
      }
    }
  }

  return definition.nodes
    .filter((node) => !visited.has(node.id))
    .map((node) => ({
      code: "disconnected_node",
      message: `Node "${node.id}" is not connected to the main workflow graph.`,
      nodeId: node.id,
    }));
}

function findCycleIssue(
  definition: WorkflowGraphDefinition,
  indexes: GraphIndexes
): WorkflowGraphIssue | null {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(nodeId: string): boolean {
    if (visiting.has(nodeId)) {
      return true;
    }

    if (visited.has(nodeId)) {
      return false;
    }

    visiting.add(nodeId);

    const nextNodeId = indexes.outgoingBySource.get(nodeId);
    if (nextNodeId && visit(nextNodeId)) {
      return true;
    }

    visiting.delete(nodeId);
    visited.add(nodeId);
    return false;
  }

  for (const node of definition.nodes) {
    if (visit(node.id)) {
      return {
        code: "cycle_detected",
        message:
          "Workflow graph contains a cycle; V1 workflows must be acyclic.",
        nodeId: node.id,
      };
    }
  }

  return null;
}

function findPublishLinearPathIssues(
  definition: WorkflowGraphDefinition,
  indexes: GraphIndexes
): WorkflowGraphIssue[] {
  const issues: WorkflowGraphIssue[] = [];

  if (definition.nodes.length < 2) {
    issues.push({
      code: "insufficient_nodes",
      message:
        "Published workflows must include at least a root acquisition step and one downstream result-producing step.",
    });
    return issues;
  }

  if (definition.edges.length !== definition.nodes.length - 1) {
    issues.push({
      code: "invalid_edge_count",
      message: `Published linear workflows must have ${definition.nodes.length - 1} edges for ${definition.nodes.length} nodes.`,
    });
  }

  const roots = definition.nodes.filter(
    (node) => (indexes.inDegree.get(node.id) ?? 0) === 0
  );
  const terminals = definition.nodes.filter(
    (node) => (indexes.outDegree.get(node.id) ?? 0) === 0
  );

  if (roots.length === 0) {
    issues.push({
      code: "no_root",
      message:
        "Published workflows must have exactly one root step with no incoming edges.",
    });
  } else if (roots.length > 1) {
    for (const root of roots) {
      issues.push({
        code: "multiple_roots",
        message: `Node "${root.id}" is a root step, but published workflows may have only one root.`,
        nodeId: root.id,
      });
    }
  }

  if (terminals.length === 0) {
    issues.push({
      code: "no_terminal",
      message:
        "Published workflows must have exactly one terminal step with no outgoing edges.",
    });
  } else if (terminals.length > 1) {
    for (const terminal of terminals) {
      issues.push({
        code: "multiple_terminals",
        message: `Node "${terminal.id}" is a terminal step, but published workflows may have only one terminal.`,
        nodeId: terminal.id,
      });
    }
  }

  for (const node of definition.nodes) {
    const incoming = indexes.inDegree.get(node.id) ?? 0;
    const outgoing = indexes.outDegree.get(node.id) ?? 0;
    const isRoot = incoming === 0;
    const isTerminal = outgoing === 0;

    if (isRoot && isTerminal) {
      continue;
    }

    if (isRoot && outgoing !== 1) {
      issues.push({
        code: "invalid_linear_path",
        message: `Root node "${node.id}" must have exactly one outgoing edge.`,
        nodeId: node.id,
      });
    } else if (isTerminal && incoming !== 1) {
      issues.push({
        code: "invalid_linear_path",
        message: `Terminal node "${node.id}" must have exactly one incoming edge.`,
        nodeId: node.id,
      });
    } else if (!isRoot && !isTerminal && (incoming !== 1 || outgoing !== 1)) {
      issues.push({
        code: "invalid_linear_path",
        message: `Node "${node.id}" must have exactly one incoming and one outgoing edge.`,
        nodeId: node.id,
      });
    }
  }

  try {
    const order = resolveWorkflowExecutionOrder(definition);
    if (order.length !== definition.nodes.length) {
      issues.push({
        code: "invalid_linear_path",
        message:
          "Published workflow graph must form one continuous path from root to terminal.",
      });
    }
  } catch {
    issues.push({
      code: "invalid_linear_path",
      message:
        "Published workflow graph must form one continuous path from root to terminal.",
    });
  }

  return issues;
}

export function findWorkflowGraphIssues(
  definition: WorkflowGraphDefinition,
  profile: WorkflowGraphValidationProfile
): WorkflowGraphIssue[] {
  if (definition.nodes.length === 0) {
    if (profile === "publish") {
      return [
        {
          code: "insufficient_nodes",
          message:
            "Published workflows must include at least a root acquisition step and one downstream result-producing step.",
        },
      ];
    }

    return [];
  }

  const indexes = buildGraphIndexes(definition);
  const issues = [
    ...findUnknownEdgeReferenceIssues(definition, indexes.nodeIds),
    ...findBranchingIssues(definition, indexes.inDegree, indexes.outDegree),
    ...findDisconnectedNodeIssues(definition),
  ];

  const cycleIssue = findCycleIssue(definition, indexes);
  if (cycleIssue) {
    issues.push(cycleIssue);
  }

  if (profile === "publish") {
    issues.push(...findPublishLinearPathIssues(definition, indexes));
  }

  return issues;
}

export class WorkflowGraphExecutionOrderError extends Error {
  override readonly name = "WorkflowGraphExecutionOrderError";

  constructor(message: string) {
    super(message);
  }
}

export function resolveWorkflowExecutionOrder(
  definition: WorkflowGraphDefinition
): string[] {
  if (definition.nodes.length === 0) {
    throw new WorkflowGraphExecutionOrderError(
      "Cannot resolve execution order for an empty workflow graph."
    );
  }

  const indexes: GraphIndexes = buildGraphIndexes(definition);
  const roots = definition.nodes.filter(
    (node) => (indexes.inDegree.get(node.id) ?? 0) === 0
  );

  if (roots.length !== 1) {
    throw new WorkflowGraphExecutionOrderError(
      "Cannot resolve execution order without exactly one root node."
    );
  }

  const root = roots[0];

  if (!root) {
    throw new WorkflowGraphExecutionOrderError(
      "Cannot resolve execution order without exactly one root node."
    );
  }

  const order: string[] = [];
  let currentNodeId: string | undefined = root.id;

  while (currentNodeId) {
    if (order.includes(currentNodeId)) {
      throw new WorkflowGraphExecutionOrderError(
        `Cannot resolve execution order because node "${currentNodeId}" appears in a cycle.`
      );
    }

    order.push(currentNodeId);
    currentNodeId = indexes.outgoingBySource.get(currentNodeId);
  }

  if (order.length !== definition.nodes.length) {
    throw new WorkflowGraphExecutionOrderError(
      "Cannot resolve execution order because the graph is disconnected."
    );
  }

  return order;
}

export class WorkflowGraphValidationError extends Error {
  override readonly name = "WorkflowGraphValidationError";

  readonly issues: readonly WorkflowGraphIssueLike[];

  constructor(issues: readonly WorkflowGraphIssueLike[]) {
    const summary = issues.map((issue) => issue.message).join("; ");

    super(
      issues.length === 1
        ? `Invalid workflow graph: ${summary}`
        : `Invalid workflow graph: ${summary}`
    );

    this.issues = issues;
  }
}

export function validateWorkflowGraphTopology(
  definition: WorkflowGraphDefinition,
  profile: WorkflowGraphValidationProfile
): void {
  const issues = findWorkflowGraphIssues(definition, profile);

  if (issues.length > 0) {
    throw new WorkflowGraphValidationError(issues);
  }
}
