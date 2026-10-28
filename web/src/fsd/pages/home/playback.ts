export const PROBE_BATCH_SIZE = 50;
export const PROBE_OPENING = 5;
export const PROBE_ADD_MIN = 1;
export const PROBE_ADD_MAX = 3;
export const PROBE_GAP_MIN_MS = 2000;
export const PROBE_GAP_MAX_MS = 3000;

const PATHS = [
  "/.env",
  "/.git/config",
  "/wp-login.php",
  "/storage/.env",
  "/backup.sql",
  "/.htaccess",
  "/xmlrpc.php",
  "/dump.sql.gz",
  "/app/.env",
  "/.git/HEAD",
] as const;

const COUNTRIES = ["US", "DE", "NL", "BR", "FR", "GB", "CA", "JP", "IN", "AU", "SE", "PL", "ES", "IT", "KR", "TR", "MX", "ZA", "CN", "RU"] as const;

const AGENTS = [
  "curl/8.7.1",
  "python-requests/2.32",
  "Go-http-client/1.1",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) Firefox/128",
  "sqlmap/1.8",
] as const;

const STATUSES = [404, 403, 404, 401] as const;

export type ProbePlay = {
  key: string;
  ts: string;
  country: string;
  ua: string;
  path: string;
  method: string;
  status: number;
};

function stamp(index: number) {
  const at = new Date(Date.UTC(2026, 9, 28, 0, 0, 0) + index * 7 * 60 * 1000);
  return at.toISOString().replace(".000Z", "Z");
}

function buildBatch(): ProbePlay[] {
  return Array.from({ length: PROBE_BATCH_SIZE }, (_, index) => {
    const path = PATHS[index % PATHS.length] ?? "/.env";
    return {
      key: `probe-${index}`,
      ts: stamp(index),
      country: COUNTRIES[index % COUNTRIES.length] ?? "US",
      ua: AGENTS[index % AGENTS.length] ?? "curl/8.7.1",
      path,
      method: path.endsWith("/wp-login.php") ? "POST" : "GET",
      status: STATUSES[index % STATUSES.length] ?? 404,
    };
  });
}

export const PROBE_BATCH = buildBatch();

export function visibleProbes(rows: readonly ProbePlay[], shown: number): ProbePlay[] {
  const count = Math.min(Math.max(shown, 0), rows.length);
  return [...rows].sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0)).slice(rows.length - count);
}

export function nextShown(shown: number, total: number, roll: number): number {
  if (shown >= total) return PROBE_OPENING;
  const span = PROBE_ADD_MAX - PROBE_ADD_MIN + 1;
  const add = Math.min(total - shown, PROBE_ADD_MIN + (Math.abs(roll) % span));
  return shown + add;
}

export function probeGap(roll: number): number {
  const span = PROBE_GAP_MAX_MS - PROBE_GAP_MIN_MS + 1;
  return PROBE_GAP_MIN_MS + (Math.abs(roll) % span);
}

export function freshKeys(before: number, after: number, rows: readonly ProbePlay[]): string[] {
  if (after <= before) return [];
  const kept = new Set(visibleProbes(rows, before).map((row) => row.key));
  return visibleProbes(rows, after)
    .filter((row) => !kept.has(row.key))
    .map((row) => row.key);
}

export function countryCounts(rows: readonly ProbePlay[]): { code: string; requests: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const code = row.country.trim().toUpperCase();
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  return [...counts.entries()].map(([code, requests]) => ({ code, requests }));
}
