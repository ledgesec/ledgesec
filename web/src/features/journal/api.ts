import type { AddressRow, Observation, Summary } from "@/entities/observation/model";
import { apiError } from "@/shared/lib/api-error";

type ApiObservation = {
  ts: string;
  site_id: string;
  edge_id: string;
  path: string;
  ip?: string;
  country?: string;
  marker: { code: string; label: string } | null;
};

type ApiAddress = {
  ip: string;
  edges: Record<string, number>;
  probes: number;
  probe_path: string;
  probe_label: string;
  sites: string[];
};

export async function readObservations(): Promise<Observation[]> {
  const response = await fetch("/api/v1/observations", { credentials: "include" });
  if (!response.ok) throw new Error(apiError.journal);
  const body = (await response.json()) as { observations: ApiObservation[] };
  return body.observations.map((row) => ({
    ts: row.ts,
    siteId: row.site_id,
    edgeId: row.edge_id,
    path: row.path,
    ip: row.ip ?? "",
    country: row.country ?? "",
    marker: row.marker,
  }));
}

export async function readSummary(): Promise<Summary> {
  const response = await fetch("/api/v1/summary", { credentials: "include" });
  if (!response.ok) throw new Error(apiError.journal);
  return response.json();
}

export async function readAddresses(): Promise<AddressRow[]> {
  const response = await fetch("/api/v1/addresses", { credentials: "include" });
  if (response.status === 401) return [];
  if (!response.ok) throw new Error(apiError.journal);
  const body = (await response.json()) as { addresses: ApiAddress[] };
  return body.addresses.map((row) => ({
    ip: row.ip,
    edges: row.edges,
    probes: row.probes,
    probePath: row.probe_path,
    probeLabel: row.probe_label,
    sites: row.sites,
  }));
}
