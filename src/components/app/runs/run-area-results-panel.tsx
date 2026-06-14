"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RunDetailAreaResult } from "@/contracts/runs/responses";
import {
  formatAreaAggregateMetricDisplay,
  formatAreaGroupingLevelLabel,
  formatAreaKeyDisplay,
  formatAreaWarningsSummary,
  getVisibleAreaMetricFields,
  hasAreaRankColumn,
} from "@/lib/runs/area-results-panel";
import { cn } from "@/lib/utils";

/**
 * @see Story 8.3.3 — Build area results panel
 */

type RunAreaResultsPanelProps = {
  areaResults: RunDetailAreaResult[];
  selectedAreaFilter: RunDetailAreaResult | null;
  onAreaSelect: (areaResult: RunDetailAreaResult | null) => void;
};

function AreaSampleSizeCell({
  areaResult,
}: {
  areaResult: RunDetailAreaResult;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-medium tabular-nums">{areaResult.propertyCount}</span>
      {!areaResult.meetsMinimumSample ? (
        <Badge
          variant="outline"
          className="border-amber-500/40 text-amber-800 dark:text-amber-300"
        >
          Low sample
        </Badge>
      ) : null}
    </div>
  );
}

function AreaWarningsCell({ warnings }: { warnings: readonly string[] }) {
  const summary = formatAreaWarningsSummary(warnings);

  if (summary.display === "—") {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <span className="line-clamp-2 text-sm" title={summary.title ?? undefined}>
      {summary.display}
    </span>
  );
}

export function RunAreaResultsPanel({
  areaResults,
  selectedAreaFilter,
  onAreaSelect,
}: RunAreaResultsPanelProps) {
  const metricFields = useMemo(
    () => getVisibleAreaMetricFields(areaResults),
    [areaResults],
  );
  const showRankColumn = useMemo(
    () => hasAreaRankColumn(areaResults),
    [areaResults],
  );

  if (areaResults.length === 0) {
    return null;
  }

  function handleAreaRowClick(areaResult: RunDetailAreaResult) {
    onAreaSelect(
      selectedAreaFilter?.areaResultId === areaResult.areaResultId
        ? null
        : areaResult,
    );
  }

  return (
    <section className="space-y-4 border-t pt-6">
      <div>
        <h2 className="text-sm font-medium">Area results</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Compare ZIP or city-level aggregates from this run. Select an area to
          filter property results.
        </p>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {showRankColumn ? (
                <TableHead className="w-16">Rank</TableHead>
              ) : null}
              <TableHead>Area</TableHead>
              <TableHead className="hidden sm:table-cell">Grouping</TableHead>
              <TableHead>Sample size</TableHead>
              {metricFields.map((field) => (
                <TableHead key={field.key} className="hidden md:table-cell">
                  {field.label}
                </TableHead>
              ))}
              <TableHead className="hidden lg:table-cell">Warnings</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {areaResults.map((areaResult) => {
              const isSelected =
                selectedAreaFilter?.areaResultId === areaResult.areaResultId;

              return (
                <TableRow
                  key={areaResult.areaResultId}
                  className={cn(
                    "cursor-pointer hover:bg-muted/50",
                    isSelected && "bg-muted/50",
                  )}
                  onClick={() => {
                    handleAreaRowClick(areaResult);
                  }}
                >
                  {showRankColumn ? (
                    <TableCell className="font-medium tabular-nums">
                      {areaResult.rank ?? "—"}
                    </TableCell>
                  ) : null}
                  <TableCell className="min-w-40 font-medium">
                    {formatAreaKeyDisplay(
                      areaResult.areaKey,
                      areaResult.groupingLevel,
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {formatAreaGroupingLevelLabel(areaResult.groupingLevel)}
                  </TableCell>
                  <TableCell>
                    <AreaSampleSizeCell areaResult={areaResult} />
                  </TableCell>
                  {metricFields.map((field) => {
                    const metricDisplay = formatAreaAggregateMetricDisplay(
                      areaResult,
                      field,
                    );

                    return (
                      <TableCell
                        key={field.key}
                        className="hidden md:table-cell min-w-32"
                      >
                        <div className="space-y-0.5">
                          <p className="tabular-nums">{metricDisplay.primary}</p>
                          {metricDisplay.secondary ? (
                            <p className="text-xs text-muted-foreground">
                              {metricDisplay.secondary}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                    );
                  })}
                  <TableCell className="hidden lg:table-cell max-w-64">
                    <AreaWarningsCell warnings={areaResult.warnings} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
