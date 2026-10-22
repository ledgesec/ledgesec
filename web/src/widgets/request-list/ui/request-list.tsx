"use client";

import { Badge } from "@/shared/ui/badge";
import { ColumnEye, useColumnMask } from "@/shared/ui/column-eye";
import { CountryMark } from "@/shared/ui/country-mark";
import { Skeleton } from "@/shared/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { covered } from "@/shared/lib/mask";
import { observationKey } from "@/entities/observation/arrive";
import type { Observation } from "@/entities/observation/model";
import { clientStack } from "@/widgets/request-list/client";
import { FIELD_EDGE, FIELD_PATH, FIELD_SITE } from "@/widgets/table-tools/query";

const SKELETON_ROWS = 6;

export function RequestList({
  rows,
  showEdge,
  showAddress = false,
  onAddress,
  empty = "No requests have been observed yet.",
  fresh = [],
  pending = false,
}: {
  rows: Observation[];
  showEdge: boolean;
  showAddress?: boolean;
  onAddress?: (ip: string) => void;
  empty?: string;
  fresh?: string[];
  pending?: boolean;
}) {
  const mask = useColumnMask();
  if (!pending && rows.length === 0) {
    return <p className="text-muted-foreground">{empty}</p>;
  }
  const widths = [
    "w-24",
    "w-28",
    ...(showEdge ? ["w-16"] : []),
    "w-8",
    ...(showAddress ? ["w-28"] : []),
    "w-12",
    "w-10",
    "w-40",
    "w-40",
    "w-12",
  ];
  return (
    <div aria-busy={pending ? true : undefined}>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Time</TableHead>
          <TableHead>
            <span className="inline-flex items-center gap-1">
              {FIELD_SITE}
              <ColumnEye column={FIELD_SITE} hidden={mask.isHidden(FIELD_SITE)} onToggle={() => mask.toggle(FIELD_SITE)} />
            </span>
          </TableHead>
          {showEdge ? (
            <TableHead>
              <span className="inline-flex items-center gap-1">
                {FIELD_EDGE}
                <ColumnEye column={FIELD_EDGE} hidden={mask.isHidden(FIELD_EDGE)} onToggle={() => mask.toggle(FIELD_EDGE)} />
              </span>
            </TableHead>
          ) : null}
          <TableHead>Country</TableHead>
          {showAddress ? <TableHead>Address</TableHead> : null}
          <TableHead>Method</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>User agent</TableHead>
          <TableHead>
            <span className="inline-flex items-center gap-1">
              {FIELD_PATH}
              <ColumnEye column={FIELD_PATH} hidden={mask.isHidden(FIELD_PATH)} onToggle={() => mask.toggle(FIELD_PATH)} />
            </span>
          </TableHead>
          <TableHead>Took</TableHead>
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
          : null}
        {pending
          ? null
          : rows.map((row) => {
          const arrived = fresh.includes(observationKey(row));
          const stack = clientStack(row);
          const tone = [row.marker ? "bg-probe-surface text-probe-foreground" : "", arrived ? "[&>td]:animate-request-arrive" : ""]
            .filter(Boolean)
            .join(" ");
          return (
          <TableRow key={observationKey(row)} className={tone || undefined}>
            <TableCell className="whitespace-nowrap font-mono text-xs">{row.ts.replace(".000Z", "Z")}</TableCell>
            <TableCell>{covered(row.siteId, mask.isHidden(FIELD_SITE))}</TableCell>
            {showEdge ? <TableCell>{covered(row.edgeId, mask.isHidden(FIELD_EDGE))}</TableCell> : null}
            <TableCell>{row.country ? <CountryMark code={row.country} /> : "—"}</TableCell>
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
            <TableCell className="font-mono text-xs">{row.method || "—"}</TableCell>
            <TableCell className="font-mono text-xs">{row.status || "—"}</TableCell>
            <TableCell className="max-w-[18rem]">
              <p className="truncate font-mono text-xs" title={row.ua || undefined}>
                {row.ua || "—"}
              </p>
              {stack ? <p className="truncate text-[10px] text-muted-foreground">{stack}</p> : null}
            </TableCell>
            <TableCell>
              {row.marker ? <Badge variant="destructive" className="mr-2">{row.marker.label}</Badge> : null}
              <span className="font-mono text-xs">{covered(row.path, mask.isHidden(FIELD_PATH))}</span>
            </TableCell>
            <TableCell className="font-mono text-xs">{row.tookMs ? `${row.tookMs} ms` : "—"}</TableCell>
          </TableRow>
          );
        })}
      </TableBody>
    </Table>
    </div>
  );
}
