"use client";

import { useState } from "react";
import { AlertTriangleIcon, CopyIcon } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { WorkflowSummary } from "@/contracts/domain/analysis";
import type { RunDetailPropertyResult } from "@/contracts/runs/responses";
import {
  buildTopPropertyDisplayItems,
  buildWorkflowSummaryCopyText,
  formatNullableSummaryScore,
  formatScoreReasonCode,
  getDisplaySummarySections,
  shouldShowTopPropertiesBlock,
} from "@/lib/runs/workflow-summary-panel";

/**
 * @see Story 8.3.4 — Build final summary panel
 */

type RunWorkflowSummaryPanelProps = {
  summary: WorkflowSummary | null;
  propertyResults: readonly RunDetailPropertyResult[];
};

function SummarySectionBlock({
  title,
  bullets,
}: {
  title: string;
  bullets: readonly string[];
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      {bullets.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {bullets.map((bullet, index) => (
            <li key={`${title}-${index}`}>{bullet}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No items.</p>
      )}
    </section>
  );
}

function StructuredSummaryContent({
  summary,
  propertyResults,
}: {
  summary: WorkflowSummary;
  propertyResults: readonly RunDetailPropertyResult[];
}) {
  const displaySections = getDisplaySummarySections(summary);
  const topPropertyItems = buildTopPropertyDisplayItems(
    summary.topProperties,
    propertyResults,
  );
  const showTopProperties = shouldShowTopPropertiesBlock(summary);

  return (
    <div className="space-y-6">
      {summary.warnings.length > 0 ? (
        <Alert className="border-amber-500/40 bg-amber-500/5">
          <AlertTriangleIcon className="text-amber-800 dark:text-amber-300" />
          <AlertTitle className="text-amber-900 dark:text-amber-200">
            Warnings
          </AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-950 dark:text-amber-100">
              {summary.warnings.map((warning, index) => (
                <li key={`warning-${index}`}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      {summary.missingDataNotes.length > 0 ? (
        <Alert>
          <AlertTitle>Limitations and missing data</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {summary.missingDataNotes.map((note, index) => (
                <li key={`missing-data-${index}`}>{note}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      {showTopProperties ? (
        <section className="space-y-3">
          <h3 className="text-sm font-medium">Top properties</h3>
          {topPropertyItems.length > 0 ? (
            <ul className="space-y-3">
              {topPropertyItems.map((item) => (
                <li
                  key={`${item.rank}-${item.propertyKey}`}
                  className="rounded-lg border px-3 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Rank {item.rank}
                      </p>
                      <p className="mt-1 text-sm font-medium">{item.label}</p>
                      {item.secondaryLabel ? (
                        <p className="text-sm text-muted-foreground">
                          {item.secondaryLabel}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Score</p>
                      <p className="mt-1 text-lg font-semibold tabular-nums">
                        {formatNullableSummaryScore(item.score)}
                      </p>
                    </div>
                  </div>
                  {item.highlightReasonCodes.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.highlightReasonCodes.map((reasonCode) => (
                        <Badge key={reasonCode} variant="outline">
                          {formatScoreReasonCode(reasonCode)}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No scored properties available.
            </p>
          )}
        </section>
      ) : null}

      {displaySections.map((section) => (
        <SummarySectionBlock
          key={section.id}
          title={section.title}
          bullets={section.bullets}
        />
      ))}
    </div>
  );
}

export function RunWorkflowSummaryPanel({
  summary,
  propertyResults,
}: RunWorkflowSummaryPanelProps) {
  const [isCopying, setIsCopying] = useState(false);

  if (!summary) {
    return null;
  }

  const workflowSummary = summary;
  const hasMarkdown = Boolean(workflowSummary.markdown);

  async function handleCopySummary() {
    if (isCopying) {
      return;
    }

    setIsCopying(true);

    try {
      await navigator.clipboard.writeText(
        buildWorkflowSummaryCopyText(workflowSummary),
      );
      toast.success("Summary copied to clipboard");
    } catch {
      toast.error("Could not copy summary to clipboard");
    } finally {
      setIsCopying(false);
    }
  }

  return (
    <section className="space-y-4 border-t pt-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">{workflowSummary.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Deterministic workflow summary with key findings, ranked properties,
            and data-quality notes.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isCopying}
          onClick={() => {
            void handleCopySummary();
          }}
        >
          <CopyIcon data-icon="inline-start" />
          Copy summary
        </Button>
      </div>

      {hasMarkdown ? (
        <Tabs defaultValue="summary">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="markdown">Markdown</TabsTrigger>
          </TabsList>
          <TabsContent value="summary" className="mt-4">
            <StructuredSummaryContent
              summary={workflowSummary}
              propertyResults={propertyResults}
            />
          </TabsContent>
          <TabsContent value="markdown" className="mt-4">
            <pre className="max-h-[32rem] overflow-auto rounded-lg border bg-muted/30 p-4 text-xs leading-relaxed whitespace-pre-wrap">
              {workflowSummary.markdown}
            </pre>
          </TabsContent>
        </Tabs>
      ) : (
        <StructuredSummaryContent
          summary={workflowSummary}
          propertyResults={propertyResults}
        />
      )}
    </section>
  );
}
