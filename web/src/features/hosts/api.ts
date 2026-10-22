import { apiError } from "@/shared/lib/api-error";

export type HostSite = { name: string; enabled: boolean };

export type HostRecord = {
  id: string;
  label: string;
  collector: string;
  agent_version?: string;
  owner_email: string;
  ingest_secret?: string;
  sites: HostSite[];
};

export type AccountRecord = { id: string; email: string; role: string };

export async function readHosts(): Promise<HostRecord[]> {
  const response = await fetch("/api/v1/hosts", { credentials: "include" });
  if (!response.ok) throw new Error(apiError.unavailable);
  const body = (await response.json()) as { hosts: HostRecord[] };
  return body.hosts;
}

export async function createHost(label: string, collector: string, ownerId = ""): Promise<HostRecord> {
  const response = await fetch("/api/v1/hosts", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label, collector, owner_id: ownerId }),
  });
  if (response.status === 400) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    if (body.error === apiError.unavailable) throw new Error(apiError.unavailable);
    if (body.error === apiError.badOwner) throw new Error(apiError.badOwner);
    throw new Error(apiError.refused);
  }
  if (response.status === 404) throw new Error(apiError.badOwner);
  if (!response.ok) throw new Error(apiError.unavailable);
  return response.json();
}

export async function readAccounts(): Promise<AccountRecord[]> {
  const response = await fetch("/api/v1/users", { credentials: "include" });
  if (!response.ok) throw new Error(apiError.unavailable);
  const body = (await response.json()) as { users: AccountRecord[] };
  return body.users;
}

export async function deleteHost(hostId: string): Promise<void> {
  const response = await fetch(`/api/v1/hosts/${encodeURIComponent(hostId)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) throw new Error(apiError.unavailable);
}

export async function setSiteMonitoring(hostId: string, name: string, enabled: boolean): Promise<void> {
  const response = await fetch("/api/v1/host-sites", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ host_id: hostId, name, enabled }),
  });
  if (!response.ok) throw new Error(apiError.unavailable);
}
