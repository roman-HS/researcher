"use client";

import type { InspectorComponentKey } from "@/contracts/tools/internal";

/**
 * Placeholder shown until tool-specific inspector forms land in Stories 5.3.4+.
 *
 * @see Story 5.3.3 — Build selected-step inspector shell
 */

type WorkflowToolConfigPlaceholderProps = {
  inspectorComponentKey: InspectorComponentKey;
};

export function WorkflowToolConfigPlaceholder({
  inspectorComponentKey,
}: WorkflowToolConfigPlaceholderProps) {
  return (
    <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-5 text-center">
      <p className="text-sm font-medium text-foreground">Tool configuration</p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        Settings for this step will appear here soon. The{" "}
        <span className="font-mono text-[11px] text-foreground/80">
          {inspectorComponentKey}
        </span>{" "}
        form is coming in a follow-up story.
      </p>
    </div>
  );
}
