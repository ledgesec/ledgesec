import type { HourCount } from "@/entities/observation/model";
import { Skeleton } from "@/shared/ui/skeleton";
import { hourParts } from "@/widgets/hour-chart/parts";

const PROBE_SHARE = "Red is the probe share of the hour.";

export function HourChart({
  hours,
  series = "requests",
  pending = false,
}: {
  hours: HourCount[];
  series?: "requests" | "probes";
  pending?: boolean;
}) {
  if (pending) return <Skeleton className="h-48 w-full" />;
  const valueOf = (row: HourCount) => (series === "probes" ? row.probes : row.requests);
  const peak = Math.max(1, ...hours.map(valueOf));
  const total = hours.reduce((sum, row) => sum + valueOf(row), 0);
  if (total === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {series === "probes" ? "No probes in the last 24 hours." : "No requests in the last 24 hours."}
      </p>
    );
  }
  return (
    <div>
      <div className="flex h-48 items-end gap-1" aria-label={series === "probes" ? "Probes by hour" : "Requests by hour"}>
        {hours.map((row) => {
          const value = valueOf(row);
          const height = value === 0 && series === "probes" ? 0 : Math.max(4, Math.round((value / peak) * 100));
          const label = row.hour.slice(11, 16);
          const parts = hourParts(row.requests, row.probes);
          const split = series === "requests" && value > 0;
          return (
            <div key={row.hour} className="flex h-full min-w-0 flex-1 flex-col justify-end">
              <div
                className={`flex w-full flex-col overflow-hidden rounded-sm ${split ? "" : series === "probes" ? "bg-cyber-red/80" : "bg-cyber-cyan/80"}`}
                style={{ height: `${height}%` }}
                title={`${label} ${row.requests} requests, ${row.probes} probes`}
              >
                {split && parts.probes > 0 ? (
                  <div className="min-h-0 bg-cyber-red/80" style={{ flexGrow: parts.probes, flexBasis: 0 }} />
                ) : null}
                {split && parts.ordinary > 0 ? (
                  <div className="min-h-0 bg-cyber-cyan/80" style={{ flexGrow: parts.ordinary, flexBasis: 0 }} />
                ) : null}
              </div>
              <span className="sr-only">
                {label}: {row.requests} requests, {row.probes} probes
              </span>
            </div>
          );
        })}
      </div>
      {series === "requests" ? <p className="mt-2 text-xs text-muted-foreground">{PROBE_SHARE}</p> : null}
    </div>
  );
}
