import type { Summary } from "@/entities/observation/model";
import { Badge } from "@/shared/ui/badge";
import { HourChart } from "@/widgets/hour-chart/ui/hour-chart";

export function ProbeBoard({ summary, onPath }: { summary: Summary; onPath: (path: string) => void }) {
  const share = summary.requests === 0 ? "0%" : `${Math.round((summary.probes / summary.requests) * 100)}%`;
  const cards = [
    { label: "Probes", value: String(summary.probes) },
    { label: "Paths", value: String(summary.markers.length) },
    { label: "Share of requests", value: share },
  ];
  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <article key={card.label} className="glass-panel p-4">
            <p className="text-xs tracking-[0.08em] text-muted-foreground uppercase">{card.label}</p>
            <p className="mt-2 font-mono text-3xl text-cyber-cyan">{card.value}</p>
          </article>
        ))}
      </div>
      <section className="glass-panel p-4">
        <h2 className="text-sm font-medium">Probes by hour</h2>
        <p className="mt-1 text-xs text-muted-foreground">Last 24 hours. The request still went through.</p>
        <div className="mt-4">
          <HourChart hours={summary.hours} series="probes" />
        </div>
      </section>
      <section className="glass-panel p-4">
        <h2 className="text-sm font-medium">Probe paths</h2>
        {summary.markers.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No probes in this window.</p>
        ) : (
          <ul className="mt-3 divide-y divide-cyber-cyan/10">
            {summary.markers.map((marker) => (
              <li key={marker.path}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 py-2 text-left"
                  onClick={() => onPath(marker.path)}
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <Badge variant="destructive">{marker.label}</Badge>
                    <span className="truncate font-mono text-xs">{marker.path}</span>
                  </span>
                  <span className="font-mono text-sm text-cyber-cyan">{marker.count}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
