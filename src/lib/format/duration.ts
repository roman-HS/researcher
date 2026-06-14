export function formatDurationMs(durationMs: number | null): string {
  if (durationMs === null) {
    return "—";
  }

  if (durationMs < 1_000) {
    return `${durationMs} ms`;
  }

  const seconds = durationMs / 1_000;

  if (seconds < 60) {
    return `${seconds.toFixed(1)} s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  return `${minutes}m ${remainingSeconds}s`;
}
