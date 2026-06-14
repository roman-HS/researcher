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
import { definitionsEqual } from "@/lib/workflows/definition-equality";
import { insertToolNodeIntoDefinition } from "@/lib/workflows/insert-tool-node";

/**
 * Per-builder Zustand store. Instantiate once per workflow builder mount.
 *
 * @see Story 5.2.3 — Implement canvas state synchronization
 * @see Story 5.3.2 — Implement step insertion behavior
 */

export type WorkflowBuilderState = {
  definition: WorkflowDefinition;
  initialDefinition: WorkflowDefinition;
  isDirty: boolean;
  pendingSelectNodeId: string | null;
  pendingFocusNodeId: string | null;
  setDefinition: (definition: WorkflowDefinition) => void;
  commitDefinition: (definition: WorkflowDefinition) => void;
  insertTool: (tool: ToolDiscoveryItem) => void;
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
        pendingSelectNodeId: nodeId,
        pendingFocusNodeId: nodeId,
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
