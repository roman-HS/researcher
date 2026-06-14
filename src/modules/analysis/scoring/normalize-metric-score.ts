/**
 * Linear clamp normalization for scorecard component values.
 *
 * @see Story 6.4.2 — Implement Property Scoring executor
 */

export function normalizeLinearClamp(
  value: number,
  minValue: number,
  maxValue: number,
): number {
  if (maxValue <= minValue) {
    return 0;
  }

  const normalized = ((value - minValue) / (maxValue - minValue)) * 100;

  return roundScore(Math.max(0, Math.min(100, normalized)));
}

export function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}
