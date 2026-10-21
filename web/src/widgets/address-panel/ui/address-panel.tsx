import { Badge } from "@/shared/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import type { AddressRow } from "@/entities/observation/model";

function edges(map: Record<string, number>) {
  return Object.keys(map)
    .sort()
    .map((name) => `${name} ${map[name]}`)
    .join(" · ");
}

export function AddressPanel({ rows }: { rows: AddressRow[] }) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground">No addresses have been recorded yet.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Address</TableHead>
          <TableHead>Edges</TableHead>
          <TableHead>Probes</TableHead>
          <TableHead>Last probe</TableHead>
          <TableHead>Sites</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.ip} className={row.probes ? "bg-probe-surface text-probe-foreground" : undefined}>
            <TableCell className="font-mono text-xs">{row.ip}</TableCell>
            <TableCell>{edges(row.edges)}</TableCell>
            <TableCell>{row.probes}</TableCell>
            <TableCell>
              {row.probePath ? (
                <span className="inline-flex items-center gap-2">
                  <Badge variant="destructive">{row.probeLabel}</Badge>
                  <span className="font-mono text-xs">{row.probePath}</span>
                </span>
              ) : null}
            </TableCell>
            <TableCell>{row.sites.join(", ")}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
