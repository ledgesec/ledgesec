import { Badge } from "@/shared/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import type { AddressRow } from "@/entities/observation/model";
import { requestCount } from "@/widgets/address-panel/actions";
import { AddressActions } from "@/widgets/address-panel/ui/address-actions";

function edges(map: Record<string, number>) {
  return Object.keys(map)
    .sort()
    .map((name) => `${name} ${map[name]}`)
    .join(" · ");
}

export function AddressPanel({
  rows,
  onRequests,
  compact = false,
}: {
  rows: AddressRow[];
  onRequests: (ip: string) => void;
  compact?: boolean;
}) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground">No addresses have been recorded yet.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Address</TableHead>
          <TableHead>Requests</TableHead>
          {compact ? null : <TableHead>Edges</TableHead>}
          <TableHead>Probes</TableHead>
          {compact ? null : <TableHead>Last probe</TableHead>}
          {compact ? null : <TableHead>Sites</TableHead>}
          {compact ? null : <TableHead>Last seen</TableHead>}
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.ip} className={row.probes ? "bg-probe-surface text-probe-foreground" : undefined}>
            <TableCell className="font-mono text-xs">
              {row.ip}
              {row.country ? <span className="text-muted-foreground"> · {row.country}</span> : null}
            </TableCell>
            <TableCell className="font-mono text-cyber-cyan">
              {typeof row.requests === "number" ? row.requests : requestCount(row.edges)}
            </TableCell>
            {compact ? null : <TableCell>{edges(row.edges)}</TableCell>}
            <TableCell>{row.probes}</TableCell>
            {compact ? null : (
              <TableCell>
                {row.probePath ? (
                  <span className="inline-flex items-center gap-2">
                    <Badge variant="destructive">{row.probeLabel}</Badge>
                    <span className="font-mono text-xs">{row.probePath}</span>
                  </span>
                ) : null}
              </TableCell>
            )}
            {compact ? null : <TableCell>{row.sites.join(", ")}</TableCell>}
            {compact ? null : (
              <TableCell className="whitespace-nowrap font-mono text-xs">
                {row.lastTs ? row.lastTs.replace(".000000Z", "Z") : "—"}
              </TableCell>
            )}
            <TableCell className="text-right">
              <AddressActions row={row} onRequests={onRequests} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
