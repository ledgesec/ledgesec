import type { Summary } from "@/entities/observation/model";
import { siteLines } from "@/fsd/pages/cabinet/site-lines";
import { Badge } from "@/shared/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { formatRps } from "@/widgets/world-map/places";

export function SiteBoard({
  summary,
  showEdges,
  onPath,
}: {
  summary: Summary;
  showEdges: boolean;
  onPath: (path: string) => void;
}) {
  const lines = siteLines(summary.by_site ?? [], summary.domains ?? []);
  return (
    <div className="mt-6 space-y-6">
      <section className="glass-panel overflow-x-auto p-4">
        <h2 className="text-sm font-medium">Sites</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          The name is the Host header. Counts are the last 24 hours. The rate is the last minute.
        </p>
        {lines.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No sites in this window.</p>
        ) : (
          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Site</TableHead>
                <TableHead>Requests</TableHead>
                <TableHead>Probes</TableHead>
                <TableHead>RPS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
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
      </section>
      {showEdges ? (
        <section className="glass-panel p-4">
          <h2 className="text-sm font-medium">Edges</h2>
          <p className="mt-1 text-xs text-muted-foreground">Where the batch was accepted. Last 24 hours.</p>
          {summary.edges.length === 0 ? (
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
        {(summary.slow ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No request time in this window.</p>
        ) : (
          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Path</TableHead>
                <TableHead>Requests</TableHead>
                <TableHead>Average</TableHead>
                <TableHead>Max</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.slow.map((row) => (
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
      </section>
    </div>
  );
}
