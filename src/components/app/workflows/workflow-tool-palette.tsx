"use client";

import { InfoIcon, PlusIcon } from "lucide-react";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ToolCategorySummary } from "@/contracts/tools/categories";
import type {
  ListToolsResponse,
  ToolDiscoveryItem,
} from "@/contracts/tools/responses";
import {
  formatArtefactList,
  toolCategoryAccentClasses,
  toolCategoryDotClasses,
} from "@/lib/workflows/tool-display";
import { ToolIcon } from "@/lib/workflows/tool-icons";
import { useWorkflowBuilderStore } from "@/stores/workflow-builder-store";
import { cn } from "@/lib/utils";

/**
 * Right-side tool palette for the workflow builder.
 *
 * @see Story 5.3.1 — Build tool palette
 */

type ToolCategoryGroup = {
  category: ToolCategorySummary;
  tools: ToolDiscoveryItem[];
};

function groupToolsByCategory(catalog: ListToolsResponse): ToolCategoryGroup[] {
  const toolsByCategory = new Map<string, ToolDiscoveryItem[]>();

  for (const tool of catalog.tools) {
    const categoryTools = toolsByCategory.get(tool.category) ?? [];
    categoryTools.push(tool);
    toolsByCategory.set(tool.category, categoryTools);
  }

  return catalog.categories
    .map((category) => ({
      category,
      tools: toolsByCategory.get(category.key) ?? [],
    }))
    .filter((group) => group.tools.length > 0);
}

type WorkflowToolPaletteProps = {
  toolCatalog: ListToolsResponse;
};

function CategoryInfoButton({ category }: { category: ToolCategorySummary }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 shrink-0 text-muted-foreground/70 hover:text-muted-foreground"
          aria-label={`About ${category.label}`}
        >
          <InfoIcon className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="left" align="start" className="w-64">
        <PopoverHeader>
          <PopoverTitle>{category.label}</PopoverTitle>
          <PopoverDescription>{category.description}</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  );
}

function ToolPaletteItem({ tool }: { tool: ToolDiscoveryItem }) {
  const insertTool = useWorkflowBuilderStore((state) => state.insertTool);
  const accentClass = toolCategoryAccentClasses[tool.category];
  const ioHint =
    tool.accepts.length > 0
      ? `Requires ${formatArtefactList(tool.accepts)}`
      : tool.produces.length > 0
        ? `Produces ${formatArtefactList(tool.produces)}`
        : null;

  return (
    <button
      type="button"
      onClick={() => insertTool(tool)}
      className={cn(
        "group relative w-full rounded-xl border border-transparent bg-background p-3 text-left shadow-sm ring-1 ring-foreground/5",
        "transition-all duration-200 hover:border-border/80 hover:shadow-md hover:ring-foreground/10",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        "active:scale-[0.99]",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            accentClass,
          )}
        >
          <ToolIcon iconKey={tool.iconKey} className="size-4" />
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium leading-snug tracking-tight">
              {tool.name}
            </p>
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-background",
                "opacity-0 transition-opacity duration-200 group-hover:opacity-100",
              )}
              aria-hidden
            >
              <PlusIcon className="size-3.5" />
            </span>
          </div>
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {tool.description}
          </p>
          {ioHint ? (
            <p className="text-[11px] font-medium text-muted-foreground/80">
              {ioHint}
            </p>
          ) : null}
        </div>
      </div>
      <span className="sr-only">Add {tool.name} to workflow</span>
    </button>
  );
}

function CategorySection({ group }: { group: ToolCategoryGroup }) {
  const dotClass = toolCategoryDotClasses[group.category.key];

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5 px-1">
        <div
          className={cn("size-1.5 shrink-0 rounded-full", dotClass)}
          aria-hidden
        />
        <h3 className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {group.category.label}
        </h3>
        <Badge
          variant="secondary"
          className="h-5 rounded-md px-1.5 text-[10px] font-medium tabular-nums"
        >
          {group.tools.length}
        </Badge>
        <CategoryInfoButton category={group.category} />
      </div>
      <div className="space-y-2">
        {group.tools.map((tool) => (
          <ToolPaletteItem key={tool.key} tool={tool} />
        ))}
      </div>
    </section>
  );
}

export function WorkflowToolPalette({ toolCatalog }: WorkflowToolPaletteProps) {
  const categoryGroups = useMemo(
    () => groupToolsByCategory(toolCatalog),
    [toolCatalog],
  );

  return (
    <aside className="flex h-full min-h-0 w-80 shrink-0 flex-col overflow-hidden border-l border-border/80 bg-muted/20">
      <div className="shrink-0 border-b border-border/60 px-5 py-4">
        <h2 className="text-sm font-semibold tracking-tight">Add a step</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Choose a tool to place on the canvas. Connect steps left to right to
          define your pipeline.
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4">
        <div className="space-y-6">
          {categoryGroups.map((group) => (
            <CategorySection key={group.category.key} group={group} />
          ))}
        </div>
      </div>
    </aside>
  );
}
