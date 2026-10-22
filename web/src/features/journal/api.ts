import type { AddressRow, Observation, Summary } from "@/entities/observation/model";
import { apiError } from "@/shared/lib/api-error";

type ApiObservation = {
  ts: string;
  site_id: string;
  edge_id: string;
  path: string;
  ip?: string;
  country?: string;
  request_time_ms?: number;
  marker: { code: string; label: string } | null;
};

type ApiAddress = {
  ip: string;
  edges: Record<string, number>;
  probes: number;
  probe_path: string;
  probe_label: string;
  sites: string[];
  country?: string;
  paths?: string[];
  last_ts?: string;
  requests?: number;
};

export type CursorPage<T> = { rows: T[]; next: string | null; prev: string | null };

function cursorQuery(cursor: string | null, direction: "next" | "prev", extra: Record<string, string> = {}) {
  const params = new URLSearchParams();
  if (cursor) {
    params.set("cursor", cursor);
    params.set("direction", direction);
  }
  for (const [key, value] of Object.entries(extra)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function readObservations(
  cursor: string | null = null,
  direction: "next" | "prev" = "next",
  ip = "",
  path = "",
): Promise<CursorPage<Observation>> {
  const extra: Record<string, string> = {};
  if (ip) extra.ip = ip;
  if (path) extra.path = path;
  const response = await fetch(`/api/v1/observations${cursorQuery(cursor, direction, extra)}`, {
    credentials: "include",
  });
  if (!response.ok) throw new Error(apiError.journal);
  const body = (await response.json()) as { observations: ApiObservation[]; next?: string | null; prev?: string | null };
  return {
    rows: body.observations.map((row) => ({
      ts: row.ts,
      siteId: row.site_id,
      edgeId: row.edge_id,
      path: row.path,
      ip: row.ip ?? "",
      country: row.country ?? "",
      tookMs: row.request_time_ms ?? 0,
      marker: row.marker,
    })),
    next: body.next ?? null,
    prev: body.prev ?? null,
  };
}

export async function readSummary(): Promise<Summary> {
  const response = await fetch("/api/v1/summary", { credentials: "include" });
  if (!response.ok) throw new Error(apiError.journal);
  const body = (await response.json()) as Summary;
  return {
    ...body,
    rps: body.rps ?? 0,
    domains: body.domains ?? [],
    countries: body.countries ?? [],
    by_site: body.by_site ?? [],
    slow: body.slow ?? [],
  };
}

export async function readAddresses(
  cursor: string | null = null,
  direction: "next" | "prev" = "next",
): Promise<CursorPage<AddressRow>> {
  const response = await fetch(`/api/v1/addresses${cursorQuery(cursor, direction)}`, { credentials: "include" });
  if (response.status === 401) return { rows: [], next: null, prev: null };
  if (!response.ok) throw new Error(apiError.journal);
  const body = (await response.json()) as { addresses: ApiAddress[]; next?: string | null; prev?: string | null };
  return {
    rows: body.addresses.map((row) => ({
      ip: row.ip,
      edges: row.edges,
      probes: row.probes,
      probePath: row.probe_path,
      probeLabel: row.probe_label,
      sites: row.sites,
      country: row.country ?? "",
      paths: row.paths ?? [],
      lastTs: row.last_ts ?? "",
      requests: row.requests,
    })),
    next: body.next ?? null,
    prev: body.prev ?? null,
  };
}
