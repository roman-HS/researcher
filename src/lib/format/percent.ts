const ratioPercentFormatter = new Intl.NumberFormat(undefined, {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatRatioAsPercent(ratio: number): string {
  return ratioPercentFormatter.format(ratio);
}

export function formatNullableRatioAsPercent(ratio: number | null): string {
  return ratio === null ? "—" : formatRatioAsPercent(ratio);
}
