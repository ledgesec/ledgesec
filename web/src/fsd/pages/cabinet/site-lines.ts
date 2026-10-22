export type SiteActivity = { name: string; requests: number; probes: number };
export type DomainRate = { name: string; requests: number; rps: number };
export type SiteLine = { name: string; requests: number; probes: number; rps: number };

export function siteLines(activity: SiteActivity[], domains: DomainRate[]): SiteLine[] {
  const rates = new Map(domains.map((domain) => [domain.name, domain]));
  const seen = new Set<string>();
  const lines: SiteLine[] = [];
  for (const site of activity) {
    if (!site.name || seen.has(site.name)) continue;
    seen.add(site.name);
    lines.push({
      name: site.name,
      requests: site.requests,
      probes: site.probes,
      rps: rates.get(site.name)?.rps ?? 0,
    });
  }
  for (const domain of domains) {
    if (!domain.name || seen.has(domain.name)) continue;
    seen.add(domain.name);
    lines.push({ name: domain.name, requests: domain.requests, probes: 0, rps: domain.rps });
  }
  lines.sort((a, b) => b.requests - a.requests || b.rps - a.rps || a.name.localeCompare(b.name));
  return lines;
}
