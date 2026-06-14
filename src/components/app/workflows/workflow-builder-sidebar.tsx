"use client";

import { AnimatePresence, motion } from "motion/react";

import { WorkflowStepInspector } from "@/components/app/workflows/workflow-step-inspector";
import { WorkflowToolPalette } from "@/components/app/workflows/workflow-tool-palette";
import type { ListToolsResponse } from "@/contracts/tools/responses";
import type { WorkflowBuilderToolMetadata } from "@/lib/workflows/builder-tool-metadata";
import { useWorkflowBuilderStore } from "@/stores/workflow-builder-store";

/**
 * Animated right rail that switches between the tool palette and step inspector.
 *
 * @see Story 5.3.3 — Build selected-step inspector shell
 */

type WorkflowBuilderSidebarProps = {
  toolCatalog: ListToolsResponse;
  toolMetadataByKey: Record<string, WorkflowBuilderToolMetadata>;
};

const SIDEBAR_TRANSITION = {
  type: "spring" as const,
  stiffness: 420,
  damping: 34,
  mass: 0.85,
};

const panelVariants = {
  enter: {
    x: 24,
    opacity: 0,
    scale: 0.985,
    filter: "blur(6px)",
  },
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
  },
  exit: {
    x: -18,
    opacity: 0,
    scale: 0.985,
    filter: "blur(4px)",
  },
};

export function WorkflowBuilderSidebar({
  toolCatalog,
  toolMetadataByKey,
}: WorkflowBuilderSidebarProps) {
  const selectedNodeId = useWorkflowBuilderStore((state) => state.selectedNodeId);
  const showInspector = selectedNodeId !== null;

  return (
    <aside className="relative h-full min-h-0 w-80 shrink-0 overflow-hidden border-l border-border/80 bg-muted/20">
      <AnimatePresence mode="wait" initial={false}>
        {showInspector ? (
          <motion.div
            key="inspector"
            variants={panelVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={SIDEBAR_TRANSITION}
            className="absolute inset-0 flex min-h-0 flex-col bg-background/95 backdrop-blur-sm"
          >
            <WorkflowStepInspector toolMetadataByKey={toolMetadataByKey} />
          </motion.div>
        ) : (
          <motion.div
            key="palette"
            variants={panelVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={SIDEBAR_TRANSITION}
            className="absolute inset-0 flex min-h-0 flex-col"
          >
            <WorkflowToolPalette toolCatalog={toolCatalog} />
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
