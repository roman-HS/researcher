"use client";

import { AlertCircleIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  RunDetailCounts,
  RunDetailPropertyResult,
} from "@/contracts/runs/responses";
import {
  buildFailedPropertyDisplayItems,
  formatFailedPropertyPrimaryError,
  shouldShowFailedItemsSection,
} from "@/lib/runs/partial-run-visibility";

/**
 * @see Story 8.3.5 — Add partial and failed item visibility
 */

type RunFailedItemsSectionProps = {
  counts: RunDetailCounts;
  propertyResults: readonly RunDetailPropertyResult[];
  onShowFailedInTable?: () => void;
  onSelectPropertyResult?: (propertyResultId: string) => void;
};

export function RunFailedItemsSection({
  counts,
  propertyResults,
  onShowFailedInTable,
  onSelectPropertyResult,
}: RunFailedItemsSectionProps) {
  if (!shouldShowFailedItemsSection(counts)) {
    return null;
  }

  const failedItems = buildFailedPropertyDisplayItems(propertyResults);

  return (
    <section className="space-y-4 border-t pt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-medium">Failed properties</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These properties encountered errors during analysis. Successful
            property results remain visible in the table below.
          </p>
        </div>

        {onShowFailedInTable ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onShowFailedInTable}
          >
            Show failed in table
          </Button>
        ) : null}
      </div>

      <ul className="space-y-3">
        {failedItems.map((item) => {
          const primaryError = formatFailedPropertyPrimaryError(item.errors);

          return (
            <li
              key={item.propertyResultId}
              className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <AlertCircleIcon className="size-4 text-destructive" />
                    <p className="text-sm font-medium">{item.label}</p>
                  </div>
                  {item.secondaryLabel ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.secondaryLabel}
                    </p>
                  ) : null}
                </div>

                {onSelectPropertyResult ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => {
                      onSelectPropertyResult(item.propertyResultId);
                    }}
                  >
                    View details
                  </Button>
                ) : null}
              </div>

              {primaryError ? (
                <p className="mt-3 text-sm">{primaryError}</p>
              ) : null}

              {item.errors.length > 1 ? (
                <ul className="mt-3 space-y-2">
                  {item.errors.slice(1).map((error, index) => (
                    <li key={`${error.code}-${index}`} className="text-sm">
                      {error.userMessage}
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                {item.errors.map((error, index) => (
                  <Badge
                    key={`${error.code}-${index}`}
                    variant="destructive"
                    className="font-normal"
                  >
                    {error.code}
                  </Badge>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
