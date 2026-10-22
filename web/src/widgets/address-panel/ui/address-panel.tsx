"use client";

import { Badge } from "@/shared/ui/badge";
import { ColumnCell, ColumnHead, ColumnSettings, ColumnSkeleton, ColumnTable, useColumnLayout } from "@/shared/ui/columns";
import { CountryMark } from "@/shared/ui/country-mark";
import { TableBody, TableHeader, TableRow } from "@/shared/ui/table";
import {
  COLUMN_ADDRESS,
  COLUMN_EDGES,
  COLUMN_LAST_PROBE,
  COLUMN_LAST_SEEN,
  COLUMN_PROBES,
  COLUMN_REQUESTS,
  COLUMN_SITES,
  TABLE_ADDRESSES,
  type ColumnDefault,
} from "@/shared/lib/columns";
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
  const specs: ColumnDefault[] = [
    { id: "address", label: COLUMN_ADDRESS, width: 220 },
    { id: "requests", label: COLUMN_REQUESTS, width: 96 },
    ...(compact ? [] : [{ id: "edges", label: COLUMN_EDGES, width: 180 }]),
    { id: "probes", label: COLUMN_PROBES, width: 80 },
    ...(compact
      ? []
      : [
          { id: "probe", label: COLUMN_LAST_PROBE, width: 220 },
          { id: "sites", label: COLUMN_SITES, width: 180 },
          { id: "seen", label: COLUMN_LAST_SEEN, width: 168 },
        ]),
  ];
  const layout = useColumnLayout(TABLE_ADDRESSES, specs);
  const basis = (id: string) => specs.find((column) => column.id === id)?.width ?? 0;
  return (
    <div aria-busy={pending ? true : undefined}>
      <ColumnSettings columns={layout.columns} labels={specs} onToggle={layout.toggle} />
      {!pending && rows.length === 0 ? (
        <p className="text-muted-foreground">{empty}</p>
      ) : (
        <ColumnTable width={layout.width}>
          <TableHeader>
            <TableRow>
              {layout.open("address") ? (
                <ColumnHead label={COLUMN_ADDRESS} width={layout.size("address")} basis={basis("address")} onResize={(width) => layout.resize("address", width)} />
              ) : null}
              {layout.open("requests") ? (
                <ColumnHead label={COLUMN_REQUESTS} width={layout.size("requests")} basis={basis("requests")} onResize={(width) => layout.resize("requests", width)} />
              ) : null}
              {layout.open("edges") ? (
                <ColumnHead label={COLUMN_EDGES} width={layout.size("edges")} basis={basis("edges")} onResize={(width) => layout.resize("edges", width)} />
              ) : null}
              {layout.open("probes") ? (
                <ColumnHead label={COLUMN_PROBES} width={layout.size("probes")} basis={basis("probes")} onResize={(width) => layout.resize("probes", width)} />
              ) : null}
              {layout.open("probe") ? (
                <ColumnHead label={COLUMN_LAST_PROBE} width={layout.size("probe")} basis={basis("probe")} onResize={(width) => layout.resize("probe", width)} />
              ) : null}
              {layout.open("sites") ? (
                <ColumnHead label={COLUMN_SITES} width={layout.size("sites")} basis={basis("sites")} onResize={(width) => layout.resize("sites", width)} />
              ) : null}
              {layout.open("seen") ? (
                <ColumnHead label={COLUMN_LAST_SEEN} width={layout.size("seen")} basis={basis("seen")} onResize={(width) => layout.resize("seen", width)} />
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pending ? <ColumnSkeleton columns={layout.columns} rows={SKELETON_ROWS} /> : null}
            {pending
              ? null
              : rows.map((row) => (
                  <TableRow key={row.ip} className={row.probes ? "bg-probe-surface text-probe-foreground" : undefined}>
                    {layout.open("address") ? (
                      <ColumnCell width={layout.size("address")} className="font-mono text-xs">
                        <AddressActions row={row} onRequests={onRequests} />
                        <div className="mt-1">
                          {row.ip}
                          {row.country ? (
                            <span className="ml-2 align-middle">
                              <CountryMark code={row.country} />
                            </span>
                          ) : null}
                        </div>
                      </ColumnCell>
                    ) : null}
                    {layout.open("requests") ? (
                      <ColumnCell width={layout.size("requests")} className="font-mono text-cyber-cyan">
                        {typeof row.requests === "number" ? row.requests : requestCount(row.edges)}
                      </ColumnCell>
                    ) : null}
                    {layout.open("edges") ? <ColumnCell width={layout.size("edges")}>{edges(row.edges)}</ColumnCell> : null}
                    {layout.open("probes") ? <ColumnCell width={layout.size("probes")}>{row.probes}</ColumnCell> : null}
                    {layout.open("probe") ? (
                      <ColumnCell width={layout.size("probe")}>
                        {row.probePath ? (
                          <span className="inline-flex max-w-full items-center gap-2">
                            <Badge variant="destructive">{row.probeLabel}</Badge>
                            <span className="truncate font-mono text-xs">{row.probePath}</span>
                          </span>
                        ) : null}
                      </ColumnCell>
                    ) : null}
                    {layout.open("sites") ? <ColumnCell width={layout.size("sites")}>{row.sites.join(", ")}</ColumnCell> : null}
                    {layout.open("seen") ? (
                      <ColumnCell width={layout.size("seen")} className="font-mono text-xs">
                        {row.lastTs ? row.lastTs.replace(".000000Z", "Z") : "—"}
                      </ColumnCell>
                    ) : null}
                  </TableRow>
                ))}
          </TableBody>
        </ColumnTable>
      )}
    </div>
  );
}
