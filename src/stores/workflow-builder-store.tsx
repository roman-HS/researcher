"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { createStore, useStore, type StoreApi } from "zustand";

import type { ToolDiscoveryItem } from "@/contracts/tools/responses";
import type { WorkflowDefinition } from "@/contracts/workflows/internal";
import type { WorkflowRuntimeInput } from "@/contracts/workflows/runtime-inputs";
import { definitionsEqual } from "@/lib/workflows/definition-equality";
import { addRuntimeInputToDefinition } from "@/lib/workflows/add-runtime-input";
import { insertToolNodeIntoDefinition } from "@/lib/workflows/insert-tool-node";
import {
  updateWorkflowNodeInDefinition,
  type WorkflowNodeCommonPatch,
} from "@/lib/workflows/update-workflow-node";

/**
 * Per-builder Zustand store. Instantiate once per workflow builder mount.
 *
 * @see Story 5.2.3 — Implement canvas state synchronization
 * @see Story 5.3.2 — Implement step insertion behavior
 * @see Story 5.3.3 — Build selected-step inspector shell
 */

export type WorkflowBuilderState = {
  definition: WorkflowDefinition;
  initialDefinition: WorkflowDefinition;
  isDirty: boolean;
  selectedNodeId: string | null;
  pendingSelectNodeId: string | null;
  pendingFocusNodeId: string | null;
  addRuntimeInput: (input: WorkflowRuntimeInput) => void;
  setDefinition: (definition: WorkflowDefinition) => void;
  commitDefinition: (definition: WorkflowDefinition) => void;
  insertTool: (tool: ToolDiscoveryItem) => void;
  setSelectedNodeId: (nodeId: string | null) => void;
  updateWorkflowNode: (nodeId: string, patch: WorkflowNodeCommonPatch) => void;
  clearPendingSelectNodeId: () => void;
  clearPendingFocusNodeId: () => void;
};

export type WorkflowBuilderStore = StoreApi<WorkflowBuilderState>;

export function createWorkflowBuilderStore(
  initialDefinition: WorkflowDefinition,
): WorkflowBuilderStore {
  return createStore<WorkflowBuilderState>((set, get) => ({
    definition: initialDefinition,
    initialDefinition,
    isDirty: false,
    selectedNodeId: null,
    pendingSelectNodeId: null,
    pendingFocusNodeId: null,
    setDefinition: (definition) => {
      set({
        definition,
        isDirty: !definitionsEqual(definition, get().initialDefinition),
      });
    },
    commitDefinition: (definition) => {
      set({
        definition,
        initialDefinition: definition,
        isDirty: false,
        selectedNodeId: null,
        pendingSelectNodeId: null,
        pendingFocusNodeId: null,
      });
    },
    insertTool: (tool) => {
      const { definition, nodeId } = insertToolNodeIntoDefinition(
        get().definition,
        tool,
      );

      set({
        definition,
        isDirty: !definitionsEqual(definition, get().initialDefinition),
        selectedNodeId: nodeId,
        pendingSelectNodeId: nodeId,
        pendingFocusNodeId: nodeId,
      });
    },
    addRuntimeInput: (input) => {
      const definition = addRuntimeInputToDefinition(get().definition, input);

      set({
        definition,
        isDirty: !definitionsEqual(definition, get().initialDefinition),
      });
    },
    setSelectedNodeId: (nodeId) => {
      set({ selectedNodeId: nodeId });
    },
    updateWorkflowNode: (nodeId, patch) => {
      const definition = updateWorkflowNodeInDefinition(
        get().definition,
        nodeId,
        patch,
      );

      set({
        definition,
        isDirty: !definitionsEqual(definition, get().initialDefinition),
      });
    },
    clearPendingSelectNodeId: () => {
      set({ pendingSelectNodeId: null });
    },
    clearPendingFocusNodeId: () => {
      set({ pendingFocusNodeId: null });
    },
  }));
}

const WorkflowBuilderStoreContext = createContext<WorkflowBuilderStore | null>(
  null,
);

type WorkflowBuilderStoreProviderProps = {
  children: ReactNode;
  initialDefinition: WorkflowDefinition;
};

export function WorkflowBuilderStoreProvider({
  children,
  initialDefinition,
}: WorkflowBuilderStoreProviderProps) {
  const [store] = useState(() =>
    createWorkflowBuilderStore(initialDefinition),
  );

  return (
    <WorkflowBuilderStoreContext.Provider value={store}>
      {children}
    </WorkflowBuilderStoreContext.Provider>
  );
}

function useWorkflowBuilderStoreApi(): WorkflowBuilderStore {
  const store = useContext(WorkflowBuilderStoreContext);

  if (!store) {
    throw new Error(
      "useWorkflowBuilderStore must be used within WorkflowBuilderStoreProvider.",
    );
  }

  return store;
}

export function useWorkflowBuilderStore<T>(
  selector: (state: WorkflowBuilderState) => T,
): T {
  const store = useWorkflowBuilderStoreApi();
  return useStore(store, selector);
}
