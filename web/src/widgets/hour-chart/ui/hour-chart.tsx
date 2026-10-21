import type { HourCount } from "@/entities/observation/model";

export function HourChart({ hours }: { hours: HourCount[] }) {
  const peak = Math.max(1, ...hours.map((row) => row.requests));
  const total = hours.reduce((sum, row) => sum + row.requests, 0);
  if (total === 0) {
    return <p className="text-sm text-muted-foreground">No requests in the last 24 hours.</p>;
  }
  return (
    <div className="flex h-48 items-end gap-1" aria-label="Requests by hour">
      {hours.map((row) => {
        const height = Math.max(4, Math.round((row.requests / peak) * 100));
        const label = row.hour.slice(11, 16);
        return (
          <div key={row.hour} className="flex h-full min-w-0 flex-1 flex-col justify-end">
            <div
              className="w-full rounded-sm bg-cyber-cyan/80"
              style={{ height: `${height}%` }}
              title={`${label} ${row.requests} requests, ${row.probes} probes`}
            />
            <span className="sr-only">
              {label}: {row.requests} requests, {row.probes} probes
            </span>
          </div>
        );
      })}
    </div>
  );
}
