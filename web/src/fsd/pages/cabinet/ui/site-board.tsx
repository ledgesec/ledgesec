"use client";

import type { Summary } from "@/entities/observation/model";
import { siteLines } from "@/fsd/pages/cabinet/site-lines";
import { Badge } from "@/shared/ui/badge";
import { Skeleton } from "@/shared/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { FIELD_LABEL, FIELD_SITE, LABEL, NO_MATCH, QUERY, SITE, SLOW, choiceList, keepRow } from "@/widgets/table-tools/query";
import { TableTools, useField } from "@/widgets/table-tools/ui/table-tools";
import { formatRps } from "@/widgets/world-map/places";

const SKELETON_ROWS = 4;

function SkeletonRows({ widths }: { widths: string[] }) {
  return Array.from({ length: SKELETON_ROWS }, (_, index) => (
    <TableRow key={index}>
      {widths.map((width, column) => (
        <TableCell key={column}>
          <Skeleton className={`h-3 ${width}`} />
        </TableCell>
      ))}
    </TableRow>
  ));
}

export function SiteBoard({
  summary,
  showEdges,
  onPath,
}: {
  summary: Summary | null;
  showEdges: boolean;
  onPath: (path: string) => void;
}) {
  const lines = summary ? siteLines(summary.by_site ?? [], summary.domains ?? []) : null;
  const [siteQuery, setSiteQuery] = useField(QUERY);
  const [sitePick, setSitePick] = useField(SITE, 0);
  const [slowQuery, setSlowQuery] = useField(SLOW);
  const [slowLabel, setSlowLabel] = useField(LABEL, 0);
  const sites = (lines ?? []).filter((line) => keepRow([line.name], siteQuery, [line.name], [sitePick]));
  const slow = (summary?.slow ?? []).filter((row) => keepRow([row.path, row.label], slowQuery, [row.label], [slowLabel]));
  return (
    <div className="mt-6 space-y-6">
      <section className="glass-panel overflow-x-auto p-4">
        <h2 className="text-sm font-medium">Sites</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          The name is the Host header. Counts are the last 24 hours. The rate is the last minute.
        </p>
        {lines === null ? (
          <div className="mt-4" aria-busy="true">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site</TableHead>
                  <TableHead>Requests</TableHead>
                  <TableHead>Probes</TableHead>
                  <TableHead>RPS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SkeletonRows widths={["w-32", "w-10", "w-8", "w-10"]} />
              </TableBody>
            </Table>
          </div>
        ) : lines.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No sites in this window.</p>
        ) : (
          <div className="mt-4">
          <TableTools
            query={siteQuery}
            onQuery={setSiteQuery}
            filters={[
              {
                id: "site",
                label: FIELD_SITE,
                value: sitePick,
                options: choiceList(lines.map((line) => line.name)),
                onChange: setSitePick,
              },
            ]}
          />
          {sites.length === 0 ? (
            <p className="text-sm text-muted-foreground">{NO_MATCH}</p>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Site</TableHead>
                <TableHead>Requests</TableHead>
                <TableHead>Probes</TableHead>
                <TableHead>RPS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sites.map((line) => (
                <TableRow key={line.name}>
                  <TableCell className="font-mono text-xs">{line.name}</TableCell>
                  <TableCell className="font-mono text-cyber-cyan">{line.requests}</TableCell>
                  <TableCell className="font-mono">{line.probes}</TableCell>
                  <TableCell className="font-mono text-cyber-cyan">{formatRps(line.rps)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
          </div>
        )}
      </section>
      {showEdges ? (
        <section className="glass-panel p-4">
          <h2 className="text-sm font-medium">Edges</h2>
          <p className="mt-1 text-xs text-muted-foreground">Where the batch was accepted. Last 24 hours.</p>
          {summary === null ? (
            <ul className="mt-3 space-y-3" aria-busy="true">
              {Array.from({ length: SKELETON_ROWS }, (_, index) => (
                <li key={index} className="flex items-center justify-between gap-3 py-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-28" />
                </li>
              ))}
            </ul>
          ) : summary.edges.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No edges in this window.</p>
          ) : (
            <ul className="mt-3 divide-y divide-cyber-cyan/10">
              {summary.edges.map((edge) => (
                <li key={edge.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="font-mono text-sm">{edge.id}</span>
                  <span className="font-mono text-sm text-cyber-cyan">
                    {edge.requests}
                    <span className="text-muted-foreground"> · {edge.probes ?? 0} probes</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
      <section className="glass-panel overflow-x-auto p-4">
        <h2 className="text-sm font-medium">Request time</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Average over the last 24 hours. A path with no duration from the collector stays off this list.
        </p>
        {summary === null ? (
          <div className="mt-4" aria-busy="true">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Path</TableHead>
                  <TableHead>Requests</TableHead>
                  <TableHead>Average</TableHead>
                  <TableHead>Max</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SkeletonRows widths={["w-40", "w-8", "w-12", "w-12"]} />
              </TableBody>
            </Table>
          </div>
        ) : (summary.slow ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No request time in this window.</p>
        ) : (
          <div className="mt-4">
          <TableTools
            query={slowQuery}
            onQuery={setSlowQuery}
            filters={[
              {
                id: "label",
                label: FIELD_LABEL,
                value: slowLabel,
                options: choiceList((summary?.slow ?? []).map((row) => row.label)),
                onChange: setSlowLabel,
              },
            ]}
          />
          {slow.length === 0 ? (
            <p className="text-sm text-muted-foreground">{NO_MATCH}</p>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Path</TableHead>
                <TableHead>Requests</TableHead>
                <TableHead>Average</TableHead>
                <TableHead>Max</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slow.map((row) => (
                <TableRow key={row.path}>
                  <TableCell>
                    <button type="button" className="inline-flex items-center gap-2 text-left" onClick={() => onPath(row.path)}>
                      {row.label ? <Badge variant="destructive">{row.label}</Badge> : null}
                      <span className="font-mono text-xs text-cyber-cyan">{row.path}</span>
                    </button>
                  </TableCell>
                  <TableCell className="font-mono">{row.requests}</TableCell>
                  <TableCell className="font-mono">{row.avg_ms} ms</TableCell>
                  <TableCell className="font-mono">{row.max_ms} ms</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
          </div>
        )}
      </section>
    </div>
  );
}
