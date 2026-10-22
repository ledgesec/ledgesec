export function arrivingSites<T extends { id: string; sites: { name: string }[] }>(hosts: T[], hostId: string): T["sites"] {
  return hosts.find((host) => host.id === hostId)?.sites ?? [];
}
