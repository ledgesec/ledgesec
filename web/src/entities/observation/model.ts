export type Marker = { code: string; label: string };

export type Observation = {
  ts: string;
  siteId: string;
  edgeId: string;
  path: string;
  ip: string;
  country: string;
  marker: Marker | null;
};

export type HourCount = { hour: string; requests: number; probes: number };

export type Summary = {
  window: "24h";
  requests: number;
  probes: number;
  sites: number;
  edges: { id: string; requests: number }[];
  hours: HourCount[];
  markers: { path: string; label: string; count: number }[];
};

export type AddressRow = {
  ip: string;
  edges: Record<string, number>;
  probes: number;
  probePath: string;
  probeLabel: string;
  sites: string[];
};

export function pathMarker(path: string): Marker | null {
  const value = path.toLowerCase();
  if (value === "/.env" || value.startsWith("/.env.") || value.startsWith("/.env/")) {
    return { code: "env", label: "Secret file" };
  }
  if (value.startsWith("/.htaccess") || value.startsWith("/.htpasswd")) {
    return { code: "htaccess", label: "Server file" };
  }
  if (value === "/.git" || value.startsWith("/.git/")) {
    return { code: "git", label: "Source checkout" };
  }
  if (value.endsWith("/wp-login.php") || value.endsWith("/xmlrpc.php")) {
    return { code: "wp-login", label: "Login probe" };
  }
  if (value.endsWith(".sql") || value.endsWith(".sql.gz")) {
    return { code: "sql", label: "Database dump" };
  }
  return null;
}

export const sampleObservations: Observation[] = [
  { ts: "2026-10-21T16:40:02.000Z", siteId: "demo", edgeId: "eu", path: "/.env", ip: "203.0.113.10", country: "US", marker: pathMarker("/.env") },
  { ts: "2026-10-21T16:40:08.000Z", siteId: "demo", edgeId: "us", path: "/.htaccess", ip: "203.0.113.10", country: "US", marker: pathMarker("/.htaccess") },
  { ts: "2026-10-21T16:41:14.000Z", siteId: "demo", edgeId: "module", path: "/pricing", ip: "203.0.113.10", country: "", marker: pathMarker("/pricing") },
  { ts: "2026-10-21T16:42:33.000Z", siteId: "demo", edgeId: "eu", path: "/wp-login.php", ip: "198.51.100.24", country: "DE", marker: pathMarker("/wp-login.php") },
  { ts: "2026-10-21T16:43:01.000Z", siteId: "demo", edgeId: "eu", path: "/app.js", ip: "192.0.2.8", country: "", marker: pathMarker("/app.js") },
];

export function addressesFrom(rows: Observation[]): AddressRow[] {
  const grouped = new Map<string, AddressRow>();
  for (const row of rows) {
    const item = grouped.get(row.ip) ?? {
      ip: row.ip,
      edges: {},
      probes: 0,
      probePath: "",
      probeLabel: "",
      sites: [],
    };
    item.edges[row.edgeId] = (item.edges[row.edgeId] ?? 0) + 1;
    if (!item.sites.includes(row.siteId)) item.sites.push(row.siteId);
    if (row.marker) {
      item.probes += 1;
      if (!item.probePath) {
        item.probePath = row.path;
        item.probeLabel = row.marker.label;
      }
    }
    grouped.set(row.ip, item);
  }
  return [...grouped.values()].sort((a, b) => b.probes - a.probes || Object.values(b.edges).reduce((s, n) => s + n, 0) - Object.values(a.edges).reduce((s, n) => s + n, 0));
}
