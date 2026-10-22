export const REFRESH_SECONDS = [1, 5, 10, 30, 60, 0] as const;

export type RefreshSeconds = (typeof REFRESH_SECONDS)[number];

export const DEFAULT_REFRESH_SECONDS: RefreshSeconds = 1;

export const LATEST_REQUESTS = 30;

export function latestRequests<T>(rows: T[]) {
  return rows.slice(0, LATEST_REQUESTS);
}

export function refreshLabel(seconds: RefreshSeconds) {
  return seconds === 0 ? "Never" : `${seconds}s`;
}

export function observationKey(row: { ts: string; edgeId: string; siteId: string; path: string }) {
  return `${row.ts}\n${row.edgeId}\n${row.siteId}\n${row.path}`;
}

export function arrivedKeys(previous: string[] | null, next: string[]) {
  if (previous === null) return [];
  const seen = new Set(previous);
  return next.filter((key) => !seen.has(key));
}
