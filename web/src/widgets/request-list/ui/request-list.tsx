import { Badge } from "@/shared/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { observationKey } from "@/entities/observation/arrive";
import type { Observation } from "@/entities/observation/model";

export function RequestList({
  rows,
  showEdge,
  showAddress = false,
  onAddress,
  empty = "No requests have been observed yet.",
  fresh = [],
}: {
  rows: Observation[];
  showEdge: boolean;
  showAddress?: boolean;
  onAddress?: (ip: string) => void;
  empty?: string;
  fresh?: string[];
}) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground">{empty}</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Time</TableHead>
          <TableHead>Site</TableHead>
          {showEdge ? <TableHead>Edge</TableHead> : null}
          <TableHead>Country</TableHead>
          {showAddress ? <TableHead>Address</TableHead> : null}
          <TableHead>Path</TableHead>
          <TableHead>Took</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const arrived = fresh.includes(observationKey(row));
          const tone = [row.marker ? "bg-probe-surface text-probe-foreground" : "", arrived ? "request-arrive" : ""]
            .filter(Boolean)
            .join(" ");
          return (
          <TableRow key={observationKey(row)} className={tone || undefined}>
            <TableCell className="whitespace-nowrap font-mono text-xs">{row.ts.replace(".000Z", "Z")}</TableCell>
            <TableCell>{row.siteId}</TableCell>
            {showEdge ? <TableCell>{row.edgeId}</TableCell> : null}
            <TableCell className="font-mono text-xs">{row.country || "—"}</TableCell>
            {showAddress ? (
              <TableCell className="font-mono text-xs">
                {row.ip ? (
                  <button type="button" className="text-cyber-cyan" onClick={() => onAddress?.(row.ip)}>
                    {row.ip}
                  </button>
                ) : (
                  "—"
                )}
              </TableCell>
            ) : null}
            <TableCell>
              {row.marker ? <Badge variant="destructive" className="mr-2">{row.marker.label}</Badge> : null}
              <span className="font-mono text-xs">{row.path}</span>
            </TableCell>
            <TableCell className="font-mono text-xs">{row.tookMs ? `${row.tookMs} ms` : "—"}</TableCell>
          </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
