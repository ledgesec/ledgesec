export type HostSite = { name: string; enabled: boolean };

export type HostRecord = {
  id: string;
  label: string;
  collector: string;
  sites: HostSite[];
};

export async function readHosts(): Promise<HostRecord[]> {
  const response = await fetch("/api/v1/hosts", { credentials: "include" });
  if (!response.ok) throw new Error("unavailable");
  const body = (await response.json()) as { hosts: HostRecord[] };
  return body.hosts;
}

export async function createHost(label: string, collector: string): Promise<HostRecord> {
  const response = await fetch("/api/v1/hosts", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label, collector }),
  });
  if (response.status === 400) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error === "unavailable" ? "unavailable" : "refused");
  }
  if (!response.ok) throw new Error("unavailable");
  return response.json();
}

export async function setSiteMonitoring(hostId: string, name: string, enabled: boolean): Promise<void> {
  const response = await fetch("/api/v1/host-sites", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ host_id: hostId, name, enabled }),
  });
  if (!response.ok) throw new Error("unavailable");
}
