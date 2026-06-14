"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { createStore, useStore, type StoreApi } from "zustand";

import type { WorkflowDefinition } from "@/contracts/workflows/internal";
import { definitionsEqual } from "@/lib/workflows/definition-equality";

/**
 * Per-builder Zustand store. Instantiate once per workflow builder mount.
 *
 * @see Story 5.2.3 — Implement canvas state synchronization
 */

export type WorkflowBuilderState = {
  definition: WorkflowDefinition;
  initialDefinition: WorkflowDefinition;
  isDirty: boolean;
  setDefinition: (definition: WorkflowDefinition) => void;
  commitDefinition: (definition: WorkflowDefinition) => void;
};

export type WorkflowBuilderStore = StoreApi<WorkflowBuilderState>;

export function createWorkflowBuilderStore(
  initialDefinition: WorkflowDefinition,
): WorkflowBuilderStore {
  return createStore<WorkflowBuilderState>((set, get) => ({
    definition: initialDefinition,
    initialDefinition,
    isDirty: false,
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
      });
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
