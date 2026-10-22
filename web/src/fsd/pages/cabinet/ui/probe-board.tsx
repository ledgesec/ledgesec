"use client";

import type { Summary } from "@/entities/observation/model";
import { Badge } from "@/shared/ui/badge";
import { Skeleton } from "@/shared/ui/skeleton";
import { HourChart } from "@/widgets/hour-chart/ui/hour-chart";
import { FIELD_LABEL, LABEL, NO_MATCH, QUERY, choiceList, keepRow } from "@/widgets/table-tools/query";
import { HoldRegion, TableTools, useField } from "@/widgets/table-tools/ui/table-tools";

const SKELETON_PATHS = 4;

export function ProbeBoard({ summary, onPath }: { summary: Summary | null; onPath: (path: string) => void }) {
  const share = summary ? (summary.requests === 0 ? "0%" : `${Math.round((summary.probes / summary.requests) * 100)}%`) : null;
  const [query, setQuery, appliedQuery, queryHeld] = useField(QUERY);
  const [label, setLabel] = useField(LABEL, 0);
  const markers = (summary?.markers ?? []).filter((marker) =>
    keepRow([marker.path, marker.label], appliedQuery, [marker.label], [label]),
  );
  const cards = [
    { label: "Probes", value: summary ? String(summary.probes) : null },
    { label: "Paths", value: summary ? String(summary.markers.length) : null },
    { label: "Share of requests", value: share },
  ];
  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-4 sm:grid-cols-3" aria-busy={summary ? undefined : true}>
        {cards.map((card) => (
          <article key={card.label} className="glass-panel p-4">
            <p className="text-xs tracking-[0.08em] text-muted-foreground uppercase">{card.label}</p>
            {card.value === null ? (
              <Skeleton className="mt-2 h-9 w-16" />
            ) : (
              <p className="mt-2 font-mono text-3xl text-cyber-cyan">{card.value}</p>
            )}
          </article>
        ))}
      </div>
      <section className="glass-panel p-4" aria-busy={summary ? undefined : true}>
        <h2 className="text-sm font-medium">Probes by hour</h2>
        <p className="mt-1 text-xs text-muted-foreground">Last 24 hours. The request still went through.</p>
        <div className="mt-4">
          <HourChart hours={summary?.hours ?? []} series="probes" pending={!summary} />
        </div>
      </section>
      <section className="glass-panel p-4">
        <h2 className="text-sm font-medium">Probe paths</h2>
        <TableTools
          query={query}
          onQuery={setQuery}
          filters={[
            {
              id: LABEL,
              label: FIELD_LABEL,
              value: label,
              options: choiceList((summary?.markers ?? []).map((marker) => marker.label)),
              onChange: setLabel,
            },
          ]}
        />
        {!summary ? (
          <ul className="mt-3 divide-y divide-cyber-cyan/10" aria-busy="true">
            {Array.from({ length: SKELETON_PATHS }, (_, index) => (
              <li key={index} className="flex items-center justify-between gap-3 py-2">
                <span className="inline-flex items-center gap-2">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-3 w-40" />
                </span>
                <Skeleton className="h-4 w-8" />
              </li>
            ))}
          </ul>
        ) : (
          <HoldRegion held={queryHeld}>
            {summary.markers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No probes in this window.</p>
            ) : markers.length === 0 ? (
              <p className="text-sm text-muted-foreground">{NO_MATCH}</p>
            ) : (
              <ul className="mt-3 divide-y divide-cyber-cyan/10">
                {markers.map((marker) => (
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
          </HoldRegion>
        )}
      </section>
    </div>
  );
}
