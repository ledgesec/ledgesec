"use client";

import { Badge } from "@/shared/ui/badge";
import { ColumnEye, useColumnMask } from "@/shared/ui/column-eye";
import { ColumnCell, ColumnHead, ColumnSettings, ColumnSkeleton, ColumnTable, useColumnLayout } from "@/shared/ui/columns";
import { CountryMark } from "@/shared/ui/country-mark";
import { TableBody, TableHeader, TableRow } from "@/shared/ui/table";
import {
  COLUMN_ADDRESS,
  COLUMN_METHOD,
  COLUMN_STATUS,
  COLUMN_TIME,
  COLUMN_TOOK,
  COLUMN_USER_AGENT,
  TABLE_REQUESTS,
  type ColumnDefault,
} from "@/shared/lib/columns";
import { covered } from "@/shared/lib/mask";
import { observationKey } from "@/entities/observation/arrive";
import type { Observation } from "@/entities/observation/model";
import { clientStack } from "@/widgets/request-list/client";
import { FIELD_COUNTRY, FIELD_EDGE, FIELD_PATH, FIELD_SITE } from "@/widgets/table-tools/query";

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
  const specs: ColumnDefault[] = [
    { id: "time", label: COLUMN_TIME, width: 176 },
    { id: "site", label: FIELD_SITE, width: 160 },
    ...(showEdge ? [{ id: "edge", label: FIELD_EDGE, width: 96 }] : []),
    { id: "country", label: FIELD_COUNTRY, width: 120 },
    ...(showAddress ? [{ id: "address", label: COLUMN_ADDRESS, width: 148 }] : []),
    { id: "method", label: COLUMN_METHOD, width: 88 },
    { id: "status", label: COLUMN_STATUS, width: 80 },
    { id: "ua", label: COLUMN_USER_AGENT, width: 240 },
    { id: "path", label: FIELD_PATH, width: 240 },
    { id: "took", label: COLUMN_TOOK, width: 88 },
  ];
  const layout = useColumnLayout(TABLE_REQUESTS, specs);
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
              {layout.open("time") ? (
                <ColumnHead label={COLUMN_TIME} width={layout.size("time")} basis={basis("time")} onResize={(width) => layout.resize("time", width)} />
              ) : null}
              {layout.open("site") ? (
                <ColumnHead label={FIELD_SITE} width={layout.size("site")} basis={basis("site")} onResize={(width) => layout.resize("site", width)}>
                  <span className="inline-flex items-center gap-1">
                    {FIELD_SITE}
                    <ColumnEye column={FIELD_SITE} hidden={mask.isHidden(FIELD_SITE)} onToggle={() => mask.toggle(FIELD_SITE)} />
                  </span>
                </ColumnHead>
              ) : null}
              {layout.open("edge") ? (
                <ColumnHead label={FIELD_EDGE} width={layout.size("edge")} basis={basis("edge")} onResize={(width) => layout.resize("edge", width)}>
                  <span className="inline-flex items-center gap-1">
                    {FIELD_EDGE}
                    <ColumnEye column={FIELD_EDGE} hidden={mask.isHidden(FIELD_EDGE)} onToggle={() => mask.toggle(FIELD_EDGE)} />
                  </span>
                </ColumnHead>
              ) : null}
              {layout.open("country") ? (
                <ColumnHead label={FIELD_COUNTRY} width={layout.size("country")} basis={basis("country")} onResize={(width) => layout.resize("country", width)} />
              ) : null}
              {layout.open("address") ? (
                <ColumnHead label={COLUMN_ADDRESS} width={layout.size("address")} basis={basis("address")} onResize={(width) => layout.resize("address", width)} />
              ) : null}
              {layout.open("method") ? (
                <ColumnHead label={COLUMN_METHOD} width={layout.size("method")} basis={basis("method")} onResize={(width) => layout.resize("method", width)} />
              ) : null}
              {layout.open("status") ? (
                <ColumnHead label={COLUMN_STATUS} width={layout.size("status")} basis={basis("status")} onResize={(width) => layout.resize("status", width)} />
              ) : null}
              {layout.open("ua") ? (
                <ColumnHead label={COLUMN_USER_AGENT} width={layout.size("ua")} basis={basis("ua")} onResize={(width) => layout.resize("ua", width)} />
              ) : null}
              {layout.open("path") ? (
                <ColumnHead label={FIELD_PATH} width={layout.size("path")} basis={basis("path")} onResize={(width) => layout.resize("path", width)}>
                  <span className="inline-flex items-center gap-1">
                    {FIELD_PATH}
                    <ColumnEye column={FIELD_PATH} hidden={mask.isHidden(FIELD_PATH)} onToggle={() => mask.toggle(FIELD_PATH)} />
                  </span>
                </ColumnHead>
              ) : null}
              {layout.open("took") ? (
                <ColumnHead label={COLUMN_TOOK} width={layout.size("took")} basis={basis("took")} onResize={(width) => layout.resize("took", width)} />
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pending ? <ColumnSkeleton columns={layout.columns} rows={SKELETON_ROWS} /> : null}
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
                      {layout.open("time") ? (
                        <ColumnCell width={layout.size("time")} className="font-mono text-xs">
                          {row.ts.replace(".000Z", "Z")}
                        </ColumnCell>
                      ) : null}
                      {layout.open("site") ? <ColumnCell width={layout.size("site")}>{covered(row.siteId, mask.isHidden(FIELD_SITE))}</ColumnCell> : null}
                      {layout.open("edge") ? <ColumnCell width={layout.size("edge")}>{covered(row.edgeId, mask.isHidden(FIELD_EDGE))}</ColumnCell> : null}
                      {layout.open("country") ? (
                        <ColumnCell width={layout.size("country")}>{row.country ? <CountryMark code={row.country} /> : "—"}</ColumnCell>
                      ) : null}
                      {layout.open("address") ? (
                        <ColumnCell width={layout.size("address")} className="font-mono text-xs">
                          {row.ip ? (
                            <button type="button" className="text-cyber-cyan" onClick={() => onAddress?.(row.ip)}>
                              {row.ip}
                            </button>
                          ) : (
                            "—"
                          )}
                        </ColumnCell>
                      ) : null}
                      {layout.open("method") ? (
                        <ColumnCell width={layout.size("method")} className="font-mono text-xs">
                          {row.method || "—"}
                        </ColumnCell>
                      ) : null}
                      {layout.open("status") ? (
                        <ColumnCell width={layout.size("status")} className="font-mono text-xs">
                          {row.status || "—"}
                        </ColumnCell>
                      ) : null}
                      {layout.open("ua") ? (
                        <ColumnCell width={layout.size("ua")}>
                          <p className="truncate font-mono text-xs" title={row.ua || undefined}>
                            {row.ua || "—"}
                          </p>
                          {stack ? <p className="truncate text-[10px] text-muted-foreground">{stack}</p> : null}
                        </ColumnCell>
                      ) : null}
                      {layout.open("path") ? (
                        <ColumnCell width={layout.size("path")}>
                          {row.marker ? (
                            <Badge variant="destructive" className="mr-2">
                              {row.marker.label}
                            </Badge>
                          ) : null}
                          <span className="font-mono text-xs">{covered(row.path, mask.isHidden(FIELD_PATH))}</span>
                        </ColumnCell>
                      ) : null}
                      {layout.open("took") ? (
                        <ColumnCell width={layout.size("took")} className="font-mono text-xs">
                          {row.tookMs ? `${row.tookMs} ms` : "—"}
                        </ColumnCell>
                      ) : null}
                    </TableRow>
                  );
                })}
          </TableBody>
        </ColumnTable>
      )}
    </div>
  );
}
