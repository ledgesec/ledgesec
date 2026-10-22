import { Badge } from "@/shared/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import type { Observation } from "@/entities/observation/model";

export function RequestList({ rows, showEdge }: { rows: Observation[]; showEdge: boolean }) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground">No requests have been observed yet.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Time</TableHead>
          <TableHead>Site</TableHead>
          {showEdge ? <TableHead>Edge</TableHead> : null}
          <TableHead>Country</TableHead>
          <TableHead>Path</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={`${row.ts}-${row.path}`} className={row.marker ? "bg-probe-surface text-probe-foreground" : undefined}>
            <TableCell className="whitespace-nowrap font-mono text-xs">{row.ts.replace(".000Z", "Z")}</TableCell>
            <TableCell>{row.siteId}</TableCell>
            {showEdge ? <TableCell>{row.edgeId}</TableCell> : null}
            <TableCell className="font-mono text-xs">{row.country || "—"}</TableCell>
            <TableCell>
              {row.marker ? <Badge variant="destructive" className="mr-2">{row.marker.label}</Badge> : null}
              <span className="font-mono text-xs">{row.path}</span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
