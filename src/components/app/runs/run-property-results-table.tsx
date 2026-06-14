"use client";

import { useMemo, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";

import { EmptyState } from "@/components/app/empty-state";
import { RunPropertyResultDrawer } from "@/components/app/runs/run-property-result-drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { WorkflowRunStatus } from "@/contracts/runs/lifecycle";
import { isTerminalRunStatus } from "@/contracts/runs/lifecycle";
import type { RunDetailAreaResult, RunDetailPropertyResult } from "@/contracts/runs/responses";
import {
  formatNullableCents,
  formatNullableCurrencyAmount,
} from "@/lib/format/money";
import { formatNullableRatioAsPercent } from "@/lib/format/percent";
import {
  filterPropertyResultsByArea,
  formatAreaKeyDisplay,
} from "@/lib/runs/area-results-panel";
import {
  DEFAULT_PROPERTY_RESULT_SORT,
  filterPropertyResults,
  formatPropertyAddressDisplay,
  getEstimatedMonthlyRent,
  sortPropertyResults,
  type PropertyResultFilter,
  type PropertyResultSortDirection,
  type PropertyResultSortKey,
} from "@/lib/runs/property-results-table";
import { cn } from "@/lib/utils";

/**
 * @see Story 8.3.1 — Build property results table
 * @see Story 8.3.2 — Build property detail drawer
 * @see Story 8.3.3 — Build area results panel
 */

type RunPropertyResultsTableProps = {
  propertyResults: RunDetailPropertyResult[];
  runStatus: WorkflowRunStatus;
  selectedAreaFilter?: RunDetailAreaResult | null;
  onClearAreaFilter?: () => void;
};

type SortableColumn = {
  key: PropertyResultSortKey;
  label: string;
  className?: string;
};

const SORTABLE_COLUMNS: SortableColumn[] = [
  { key: "listPrice", label: "List price", className: "hidden sm:table-cell" },
  {
    key: "estimatedRent",
    label: "Est. rent",
    className: "hidden md:table-cell",
  },
  { key: "capRate", label: "Cap rate", className: "hidden lg:table-cell" },
  {
    key: "monthlyCashFlow",
    label: "Cash flow",
    className: "hidden lg:table-cell",
  },
  { key: "score", label: "Score", className: "text-right" },
];

const FILTER_LABELS: Record<PropertyResultFilter, string> = {
  all: "All properties",
  warnings: "Has warnings",
  failed: "Failed",
};

function formatNullableScore(score: number | null): string {
  if (score === null) {
    return "—";
  }

  return Number.isInteger(score) ? String(score) : score.toFixed(2);
}

function PropertyResultWarningsCell({
  propertyResult,
}: {
  propertyResult: RunDetailPropertyResult;
}) {
  if (propertyResult.errors.length > 0) {
    return <Badge variant="destructive">Failed</Badge>;
  }

  if (propertyResult.warnings.length > 0) {
    return (
      <Badge
        variant="outline"
        className="border-amber-500/40 text-amber-800 dark:text-amber-300"
      >
        {propertyResult.warnings.length}{" "}
        {propertyResult.warnings.length === 1 ? "warning" : "warnings"}
      </Badge>
    );
  }

  return <span className="text-muted-foreground">—</span>;
}

type SortableHeaderProps = {
  label: string;
  sortKey: PropertyResultSortKey;
  activeSortKey: PropertyResultSortKey;
  sortDirection: PropertyResultSortDirection;
  onSort: (sortKey: PropertyResultSortKey) => void;
  className?: string;
};

function SortableHeader({
  label,
  sortKey,
  activeSortKey,
  sortDirection,
  onSort,
  className,
}: SortableHeaderProps) {
  const isActive = activeSortKey === sortKey;

  return (
    <TableHead className={className}>
      <div
        className={cn(
          className?.includes("text-right") && "flex justify-end",
        )}
      >
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 font-medium transition-colors hover:text-foreground",
            isActive ? "text-foreground" : "text-muted-foreground",
          )}
          onClick={() => {
            onSort(sortKey);
          }}
        >
          {label}
          {isActive ? (
            sortDirection === "asc" ? (
              <ArrowUpIcon className="size-3.5" />
            ) : (
              <ArrowDownIcon className="size-3.5" />
            )
          ) : null}
        </button>
      </div>
    </TableHead>
  );
}

export function RunPropertyResultsTable({
  propertyResults,
  runStatus,
  selectedAreaFilter = null,
  onClearAreaFilter,
}: RunPropertyResultsTableProps) {
  const [filter, setFilter] = useState<PropertyResultFilter>("all");
  const [sortKey, setSortKey] = useState<PropertyResultSortKey>(
    DEFAULT_PROPERTY_RESULT_SORT.key,
  );
  const [sortDirection, setSortDirection] =
    useState<PropertyResultSortDirection>(DEFAULT_PROPERTY_RESULT_SORT.direction);
  const [selectedPropertyResultId, setSelectedPropertyResultId] = useState<
    string | null
  >(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const visibleRows = useMemo(() => {
    const filtered = filterPropertyResults(propertyResults, filter);
    const areaFiltered = filterPropertyResultsByArea(
      filtered,
      selectedAreaFilter,
    );
    return sortPropertyResults(areaFiltered, sortKey, sortDirection);
  }, [filter, propertyResults, selectedAreaFilter, sortDirection, sortKey]);

  const selectedPropertyResult = useMemo(() => {
    if (!selectedPropertyResultId) {
      return null;
    }

    return (
      propertyResults.find(
        (propertyResult) =>
          propertyResult.propertyResultId === selectedPropertyResultId,
      ) ?? null
    );
  }, [propertyResults, selectedPropertyResultId]);

  function handleSort(nextSortKey: PropertyResultSortKey) {
    if (nextSortKey === sortKey) {
      setSortDirection((currentDirection) =>
        currentDirection === "asc" ? "desc" : "asc",
      );
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection(
      nextSortKey === DEFAULT_PROPERTY_RESULT_SORT.key ? "desc" : "asc",
    );
  }

  function handleRowClick(propertyResult: RunDetailPropertyResult) {
    setSelectedPropertyResultId(propertyResult.propertyResultId);
    setIsDrawerOpen(true);
  }

  function handleDrawerOpenChange(open: boolean) {
    setIsDrawerOpen(open);

    if (!open) {
      setSelectedPropertyResultId(null);
    }
  }

  const isActiveRun = !isTerminalRunStatus(runStatus);

  return (
    <>
      <section className="space-y-4 border-t pt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-medium">Property results</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Compare analyzed properties from this run.
          </p>
        </div>

        {propertyResults.length > 0 ? (
          <div className="flex w-full flex-col gap-1.5 sm:w-56">
            <label
              htmlFor="property-results-filter"
              className="text-sm font-medium"
            >
              Filter
            </label>
            <Select
              value={filter}
              onValueChange={(value) => {
                setFilter(value as PropertyResultFilter);
              }}
            >
              <SelectTrigger id="property-results-filter" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FILTER_LABELS) as PropertyResultFilter[]).map(
                  (filterKey) => (
                    <SelectItem key={filterKey} value={filterKey}>
                      {FILTER_LABELS[filterKey]}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      {selectedAreaFilter ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            Area:{" "}
            {formatAreaKeyDisplay(
              selectedAreaFilter.areaKey,
              selectedAreaFilter.groupingLevel,
            )}
          </Badge>
          {onClearAreaFilter ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={onClearAreaFilter}
            >
              Clear area filter
            </Button>
          ) : null}
        </div>
      ) : null}

      {propertyResults.length === 0 ? (
        <EmptyState
          title={
            isActiveRun ? "Results pending" : "No property results for this run"
          }
          description={
            isActiveRun
              ? "Results will appear when the run completes."
              : "This run did not produce any property-level outputs."
          }
          className="py-8"
        />
      ) : visibleRows.length === 0 ? (
        <EmptyState
          title="No matching properties"
          description={
            selectedAreaFilter
              ? "No properties match the selected area. Clear the area filter or choose a different filter."
              : "Try a different filter to see property results from this run."
          }
          className="py-8"
        />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Address</TableHead>
                {SORTABLE_COLUMNS.map((column) => (
                  <SortableHeader
                    key={column.key}
                    label={column.label}
                    sortKey={column.key}
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className={column.className}
                  />
                ))}
                <TableHead className="hidden md:table-cell">Warnings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((propertyResult) => {
                const address = formatPropertyAddressDisplay(
                  propertyResult.addressSummary,
                  propertyResult.propertyKey,
                );
                const estimatedRent = getEstimatedMonthlyRent(propertyResult);

                return (
                  <TableRow
                    key={propertyResult.propertyResultId}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      handleRowClick(propertyResult);
                    }}
                  >
                    <TableCell className="min-w-48 max-w-64">
                      <div className="space-y-0.5">
                        <p className="font-medium leading-snug">
                          {address.primary}
                        </p>
                        {address.secondary ? (
                          <p className="text-sm text-muted-foreground">
                            {address.secondary}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {formatNullableCents(propertyResult.listPriceCents)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {formatNullableCurrencyAmount(estimatedRent)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {formatNullableRatioAsPercent(propertyResult.capRate)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {formatNullableCurrencyAmount(
                        propertyResult.monthlyCashFlow,
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatNullableScore(propertyResult.totalScore)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <PropertyResultWarningsCell
                        propertyResult={propertyResult}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      </section>

      <RunPropertyResultDrawer
        propertyResult={selectedPropertyResult}
        open={isDrawerOpen}
        onOpenChange={handleDrawerOpenChange}
      />
    </>
  );
}
