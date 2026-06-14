"use client";

import { ExternalLinkIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ScoreReasonSeverity } from "@/contracts/domain/analysis";
import type { RunDetailPropertyResult } from "@/contracts/runs/responses";
import { formatPropertyAddressDisplay } from "@/lib/runs/property-results-table";
import {
  formatComparableAddress,
  formatComparablePrice,
  formatNullableDistanceMiles,
  formatNullableMoney,
  formatNullableScore,
  getComparablesPreview,
  getMetricDisplayItems,
  getPropertyFactItems,
  hasComparablesSection,
  hasMetricsSection,
  hasPropertyFactsSection,
  hasRentEstimateSection,
  hasScoreSection,
} from "@/lib/runs/property-result-detail";
import { cn } from "@/lib/utils";

/**
 * @see Story 8.3.2 — Build property detail drawer
 */

type RunPropertyResultDrawerProps = {
  propertyResult: RunDetailPropertyResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type DetailSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

function DetailSection({ title, description, children }: DetailSectionProps) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function FactGrid({ items }: { items: ReturnType<typeof getPropertyFactItems> }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border px-3 py-2.5">
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="mt-1 text-sm font-medium">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ScoreReasonBadge({ severity }: { severity: ScoreReasonSeverity }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-normal",
        severity === "positive" &&
          "border-emerald-500/40 text-emerald-800 dark:text-emerald-300",
        severity === "negative" &&
          "border-destructive/40 text-destructive",
        severity === "neutral" && "text-muted-foreground",
      )}
    >
      {severity}
    </Badge>
  );
}

function PropertyResultIssuesSection({
  propertyResult,
}: {
  propertyResult: RunDetailPropertyResult;
}) {
  if (
    propertyResult.errors.length === 0 &&
    propertyResult.warnings.length === 0
  ) {
    return null;
  }

  return (
    <DetailSection title="Warnings and errors">
      {propertyResult.errors.length > 0 ? (
        <ul className="space-y-2">
          {propertyResult.errors.map((error, index) => (
            <li
              key={`${error.code}-${index}`}
              className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5"
            >
              <p className="text-sm">{error.userMessage}</p>
              <Badge variant="destructive" className="mt-2 font-normal">
                {error.code}
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}

      {propertyResult.warnings.length > 0 ? (
        <ul
          className={cn(
            "space-y-2",
            propertyResult.errors.length > 0 && "mt-3",
          )}
        >
          {propertyResult.warnings.map((warning, index) => (
            <li
              key={`${warning}-${index}`}
              className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-sm"
            >
              {warning}
            </li>
          ))}
        </ul>
      ) : null}
    </DetailSection>
  );
}

export function RunPropertyResultDrawer({
  propertyResult,
  open,
  onOpenChange,
}: RunPropertyResultDrawerProps) {
  if (!propertyResult) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl" />
      </Sheet>
    );
  }

  const address = formatPropertyAddressDisplay(
    propertyResult.addressSummary,
    propertyResult.propertyKey,
  );
  const propertyFacts = getPropertyFactItems(propertyResult);
  const metricItems = getMetricDisplayItems(propertyResult.metrics);
  const comparablesPreview = getComparablesPreview(propertyResult.comparables);
  const score = propertyResult.score;
  const listingUrl = propertyResult.listing?.listingUrl;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="pr-8 text-left leading-snug">
            {address.primary}
          </SheetTitle>
          {address.secondary ? (
            <SheetDescription className="text-left">
              {address.secondary}
            </SheetDescription>
          ) : null}
          {listingUrl ? (
            <a
              href={listingUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              View listing
              <ExternalLinkIcon className="size-3.5" />
            </a>
          ) : null}
        </SheetHeader>

        <div className="space-y-6 py-4">
          {hasPropertyFactsSection(propertyResult) ? (
            <>
              <DetailSection title="Property facts">
                <FactGrid items={propertyFacts} />
              </DetailSection>
              <Separator />
            </>
          ) : null}

          {hasRentEstimateSection(propertyResult.rentEstimate) ? (
            <>
              <DetailSection title="Rent estimate">
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border px-3 py-2.5">
                    <dt className="text-xs text-muted-foreground">
                      Estimated rent
                    </dt>
                    <dd className="mt-1 text-sm font-medium">
                      {formatNullableMoney(
                        propertyResult.rentEstimate.estimatedRent,
                      )}
                    </dd>
                  </div>
                  <div className="rounded-lg border px-3 py-2.5">
                    <dt className="text-xs text-muted-foreground">Rent range</dt>
                    <dd className="mt-1 text-sm font-medium">
                      {propertyResult.rentEstimate.rentRangeLow &&
                      propertyResult.rentEstimate.rentRangeHigh
                        ? `${formatNullableMoney(propertyResult.rentEstimate.rentRangeLow)} – ${formatNullableMoney(propertyResult.rentEstimate.rentRangeHigh)}`
                        : "Not available"}
                    </dd>
                  </div>
                  {propertyResult.rentEstimate.confidenceLabel ? (
                    <div className="rounded-lg border px-3 py-2.5 sm:col-span-2">
                      <dt className="text-xs text-muted-foreground">
                        Confidence
                      </dt>
                      <dd className="mt-1 text-sm font-medium">
                        {propertyResult.rentEstimate.confidenceLabel}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </DetailSection>
              <Separator />
            </>
          ) : null}

          {hasComparablesSection(propertyResult.comparables) ? (
            <>
              <DetailSection
                title="Comparables"
                description={`Showing ${comparablesPreview.length} of ${propertyResult.comparables.comparables.length} comparables.`}
              >
                {propertyResult.comparables.warnings &&
                propertyResult.comparables.warnings.length > 0 ? (
                  <ul className="space-y-2">
                    {propertyResult.comparables.warnings.map((warning, index) => (
                      <li
                        key={`${warning}-${index}`}
                        className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-sm"
                      >
                        {warning}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {comparablesPreview.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Property</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead className="text-right">Distance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparablesPreview.map((comparable, index) => (
                        <TableRow
                          key={
                            comparable.propertyKey ??
                            comparable.address?.line1 ??
                            String(index)
                          }
                        >
                          <TableCell className="max-w-48">
                            {formatComparableAddress(comparable)}
                          </TableCell>
                          <TableCell>
                            {formatComparablePrice(comparable)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatNullableDistanceMiles(comparable.distanceMiles)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No comparables were returned for this property.
                  </p>
                )}
              </DetailSection>
              <Separator />
            </>
          ) : null}

          {hasMetricsSection(propertyResult) ? (
            <>
              <DetailSection title="Metrics">
                <dl className="space-y-2">
                  {metricItems.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-start justify-between gap-4 rounded-lg border px-3 py-2.5"
                    >
                      <dt className="text-sm text-muted-foreground">
                        {item.label}
                      </dt>
                      <dd className="text-right">
                        <span className="text-sm font-medium tabular-nums">
                          {item.value}
                        </span>
                        {item.detail ? (
                          <span className="mt-0.5 block text-xs capitalize text-muted-foreground">
                            {item.detail}
                          </span>
                        ) : null}
                      </dd>
                    </div>
                  ))}
                </dl>
              </DetailSection>
              <Separator />
            </>
          ) : null}

          {hasScoreSection(propertyResult) ? (
            <>
              <DetailSection title="Score">
                <div className="rounded-lg border px-4 py-3">
                  <p className="text-xs text-muted-foreground">Total score</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                    {formatNullableScore(propertyResult.totalScore)}
                  </p>
                </div>

                {score?.scoreStatus === "unavailable" ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Score unavailable for this property.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {score.unavailableReasonCodes.map((reasonCode) => (
                        <Badge key={reasonCode} variant="outline">
                          {reasonCode.replaceAll("_", " ")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}

                {score?.reasons && score.reasons.length > 0 ? (
                  <ul className="mt-4 space-y-2">
                    {score.reasons.map((reason) => (
                      <li
                        key={reason.code}
                        className="rounded-lg border px-3 py-2.5"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <ScoreReasonBadge severity={reason.severity} />
                          <Badge variant="outline" className="font-normal">
                            {reason.code.replaceAll("_", " ")}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm">{reason.message}</p>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {score?.scoreStatus === "available" &&
                score.components.length > 0 ? (
                  <div className="mt-4 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Metric</TableHead>
                          <TableHead className="text-right">Weight</TableHead>
                          <TableHead className="text-right">
                            Contribution
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {score.components.map((component) => (
                          <TableRow key={component.metricKey}>
                            <TableCell>{component.metricKey}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {component.weight.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {component.contribution.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : null}
              </DetailSection>
              <Separator />
            </>
          ) : null}

          <PropertyResultIssuesSection propertyResult={propertyResult} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
