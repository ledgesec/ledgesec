export function hourParts(requests: number, probes: number) {
  const total = Number.isFinite(requests) && requests > 0 ? requests : 0;
  const marked = Number.isFinite(probes) && probes > 0 ? Math.min(probes, total) : 0;
  return { ordinary: total - marked, probes: marked };
}
