import { Badge } from "@/shared/ui/badge";
import { CountryMark } from "@/shared/ui/country-mark";
import { Skeleton } from "@/shared/ui/skeleton";
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

const SKELETON_ROWS = 6;

export function AddressPanel({
  rows,
  onRequests,
  compact = false,
  empty = "No addresses have been recorded yet.",
  pending = false,
}: {
  rows: AddressRow[];
  onRequests: (ip: string) => void;
  compact?: boolean;
  empty?: string;
  pending?: boolean;
}) {
  if (!pending && rows.length === 0) {
    return <p className="text-muted-foreground">{empty}</p>;
  }
  const widths = ["w-36", "w-10", ...(compact ? [] : ["w-24"]), "w-8", ...(compact ? [] : ["w-32", "w-24", "w-28"]), "w-16"];
  return (
    <div aria-busy={pending ? true : undefined}>
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
        {pending
          ? Array.from({ length: SKELETON_ROWS }, (_, index) => (
              <TableRow key={index}>
                {widths.map((width, column) => (
                  <TableCell key={column}>
                    <Skeleton className={`h-3 ${width}`} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          : rows.map((row) => (
          <TableRow key={row.ip} className={row.probes ? "bg-probe-surface text-probe-foreground" : undefined}>
            <TableCell className="font-mono text-xs">
              {row.ip}
              {row.country ? (
                <span className="ml-2 align-middle">
                  <CountryMark code={row.country} />
                </span>
              ) : null}
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
    </div>
  );
}
