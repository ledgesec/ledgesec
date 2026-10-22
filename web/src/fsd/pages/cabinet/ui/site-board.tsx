"use client";

import type { ReactNode } from "react";
import type { Summary } from "@/entities/observation/model";
import { siteLines } from "@/fsd/pages/cabinet/site-lines";
import {
  COLUMN_AVERAGE,
  COLUMN_MAX,
  COLUMN_PROBES,
  COLUMN_REQUESTS,
  COLUMN_RPS,
  TABLE_SITES,
  TABLE_SLOW,
  type ColumnDefault,
} from "@/shared/lib/columns";
import { covered } from "@/shared/lib/mask";
import { Badge } from "@/shared/ui/badge";
import { ColumnEye, useColumnMask } from "@/shared/ui/column-eye";
import { ColumnCell, ColumnHead, ColumnSettings, ColumnSkeleton, ColumnTable, useColumnLayout } from "@/shared/ui/columns";
import { Skeleton } from "@/shared/ui/skeleton";
import { TableBody, TableHeader, TableRow } from "@/shared/ui/table";
import { FIELD_LABEL, FIELD_PATH, FIELD_SITE, LABEL, NO_MATCH, QUERY, SITE, SLOW, choiceList, keepRow } from "@/widgets/table-tools/query";
import { HoldRegion, TableTools, useField } from "@/widgets/table-tools/ui/table-tools";
import { formatRps } from "@/widgets/world-map/places";

const SKELETON_ROWS = 4;

const SITE_COLUMNS: ColumnDefault[] = [
  { id: "site", label: FIELD_SITE, width: 220 },
  { id: "requests", label: COLUMN_REQUESTS, width: 104 },
  { id: "probes", label: COLUMN_PROBES, width: 88 },
  { id: "rps", label: COLUMN_RPS, width: 80 },
];

const SLOW_COLUMNS: ColumnDefault[] = [
  { id: "path", label: FIELD_PATH, width: 280 },
  { id: "requests", label: COLUMN_REQUESTS, width: 104 },
  { id: "average", label: COLUMN_AVERAGE, width: 104 },
  { id: "max", label: COLUMN_MAX, width: 96 },
];

function basisOf(specs: ColumnDefault[], id: string) {
  return specs.find((column) => column.id === id)?.width ?? 0;
}

function ColumnFrame({
  specs,
  layout,
  heads,
  children,
}: {
  specs: ColumnDefault[];
  layout: ReturnType<typeof useColumnLayout>;
  heads: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mt-4">
      <ColumnSettings columns={layout.columns} labels={specs} onToggle={layout.toggle} />
      <ColumnTable width={layout.width}>
        <TableHeader>
          <TableRow>{heads}</TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </ColumnTable>
    </div>
  );
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
  const mask = useColumnMask();
  const sitesLayout = useColumnLayout(TABLE_SITES, SITE_COLUMNS);
  const slowLayout = useColumnLayout(TABLE_SLOW, SLOW_COLUMNS);
  const lines = summary ? siteLines(summary.by_site ?? [], summary.domains ?? []) : null;
  const [siteQuery, setSiteQuery, appliedSiteQuery, siteHeld] = useField(QUERY);
  const [sitePick, setSitePick] = useField(SITE, 0);
  const [slowQuery, setSlowQuery, appliedSlowQuery, slowHeld] = useField(SLOW);
  const [slowLabel, setSlowLabel] = useField(LABEL, 0);
  const sites = (lines ?? []).filter((line) => keepRow([line.name], appliedSiteQuery, [line.name], [sitePick]));
  const slow = (summary?.slow ?? []).filter((row) => keepRow([row.path, row.label], appliedSlowQuery, [row.label], [slowLabel]));
  const siteHeads = (
    <>
      {sitesLayout.open("site") ? (
        <ColumnHead
          label={FIELD_SITE}
          width={sitesLayout.size("site")}
          basis={basisOf(SITE_COLUMNS, "site")}
          onResize={(width) => sitesLayout.resize("site", width)}
        >
          <span className="inline-flex items-center gap-1">
            {FIELD_SITE}
            <ColumnEye column={FIELD_SITE} hidden={mask.isHidden(FIELD_SITE)} onToggle={() => mask.toggle(FIELD_SITE)} />
          </span>
        </ColumnHead>
      ) : null}
      {sitesLayout.open("requests") ? (
        <ColumnHead
          label={COLUMN_REQUESTS}
          width={sitesLayout.size("requests")}
          basis={basisOf(SITE_COLUMNS, "requests")}
          onResize={(width) => sitesLayout.resize("requests", width)}
        />
      ) : null}
      {sitesLayout.open("probes") ? (
        <ColumnHead
          label={COLUMN_PROBES}
          width={sitesLayout.size("probes")}
          basis={basisOf(SITE_COLUMNS, "probes")}
          onResize={(width) => sitesLayout.resize("probes", width)}
        />
      ) : null}
      {sitesLayout.open("rps") ? (
        <ColumnHead
          label={COLUMN_RPS}
          width={sitesLayout.size("rps")}
          basis={basisOf(SITE_COLUMNS, "rps")}
          onResize={(width) => sitesLayout.resize("rps", width)}
        />
      ) : null}
    </>
  );
  const slowHeads = (
    <>
      {slowLayout.open("path") ? (
        <ColumnHead
          label={FIELD_PATH}
          width={slowLayout.size("path")}
          basis={basisOf(SLOW_COLUMNS, "path")}
          onResize={(width) => slowLayout.resize("path", width)}
        >
          <span className="inline-flex items-center gap-1">
            {FIELD_PATH}
            <ColumnEye column={FIELD_PATH} hidden={mask.isHidden(FIELD_PATH)} onToggle={() => mask.toggle(FIELD_PATH)} />
          </span>
        </ColumnHead>
      ) : null}
      {slowLayout.open("requests") ? (
        <ColumnHead
          label={COLUMN_REQUESTS}
          width={slowLayout.size("requests")}
          basis={basisOf(SLOW_COLUMNS, "requests")}
          onResize={(width) => slowLayout.resize("requests", width)}
        />
      ) : null}
      {slowLayout.open("average") ? (
        <ColumnHead
          label={COLUMN_AVERAGE}
          width={slowLayout.size("average")}
          basis={basisOf(SLOW_COLUMNS, "average")}
          onResize={(width) => slowLayout.resize("average", width)}
        />
      ) : null}
      {slowLayout.open("max") ? (
        <ColumnHead
          label={COLUMN_MAX}
          width={slowLayout.size("max")}
          basis={basisOf(SLOW_COLUMNS, "max")}
          onResize={(width) => slowLayout.resize("max", width)}
        />
      ) : null}
    </>
  );
  return (
    <div className="mt-6 space-y-6">
      <section className="glass-panel overflow-x-auto p-4">
        <h2 className="text-sm font-medium">Sites</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          The name is the Host header. Counts are the last 24 hours. The rate is the last minute.
        </p>
        {lines === null ? (
          <div aria-busy="true">
            <ColumnFrame specs={SITE_COLUMNS} layout={sitesLayout} heads={siteHeads}>
              <ColumnSkeleton columns={sitesLayout.columns} rows={SKELETON_ROWS} />
            </ColumnFrame>
          </div>
        ) : lines.length === 0 ? (
          <div className="mt-4">
            <ColumnSettings columns={sitesLayout.columns} labels={SITE_COLUMNS} onToggle={sitesLayout.toggle} />
            <p className="text-sm text-muted-foreground">No sites in this window.</p>
          </div>
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
            <HoldRegion held={siteHeld}>
            {sites.length === 0 ? (
              <>
                <ColumnSettings columns={sitesLayout.columns} labels={SITE_COLUMNS} onToggle={sitesLayout.toggle} />
                <p className="text-sm text-muted-foreground">{NO_MATCH}</p>
              </>
            ) : (
              <ColumnFrame specs={SITE_COLUMNS} layout={sitesLayout} heads={siteHeads}>
                {sites.map((line) => (
                  <TableRow key={line.name}>
                    {sitesLayout.open("site") ? (
                      <ColumnCell width={sitesLayout.size("site")} className="font-mono text-xs">
                        {covered(line.name, mask.isHidden(FIELD_SITE))}
                      </ColumnCell>
                    ) : null}
                    {sitesLayout.open("requests") ? (
                      <ColumnCell width={sitesLayout.size("requests")} className="font-mono text-cyber-cyan">
                        {line.requests}
                      </ColumnCell>
                    ) : null}
                    {sitesLayout.open("probes") ? (
                      <ColumnCell width={sitesLayout.size("probes")} className="font-mono">
                        {line.probes}
                      </ColumnCell>
                    ) : null}
                    {sitesLayout.open("rps") ? (
                      <ColumnCell width={sitesLayout.size("rps")} className="font-mono text-cyber-cyan">
                        {formatRps(line.rps)}
                      </ColumnCell>
                    ) : null}
                  </TableRow>
                ))}
              </ColumnFrame>
            )}
            </HoldRegion>
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
          <div aria-busy="true">
            <ColumnFrame specs={SLOW_COLUMNS} layout={slowLayout} heads={slowHeads}>
              <ColumnSkeleton columns={slowLayout.columns} rows={SKELETON_ROWS} />
            </ColumnFrame>
          </div>
        ) : (summary.slow ?? []).length === 0 ? (
          <div className="mt-4">
            <ColumnSettings columns={slowLayout.columns} labels={SLOW_COLUMNS} onToggle={slowLayout.toggle} />
            <p className="text-sm text-muted-foreground">No request time in this window.</p>
          </div>
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
            <HoldRegion held={slowHeld}>
            {slow.length === 0 ? (
              <>
                <ColumnSettings columns={slowLayout.columns} labels={SLOW_COLUMNS} onToggle={slowLayout.toggle} />
                <p className="text-sm text-muted-foreground">{NO_MATCH}</p>
              </>
            ) : (
              <ColumnFrame specs={SLOW_COLUMNS} layout={slowLayout} heads={slowHeads}>
                {slow.map((row) => (
                  <TableRow key={row.path}>
                    {slowLayout.open("path") ? (
                      <ColumnCell width={slowLayout.size("path")}>
                        <button type="button" className="inline-flex max-w-full items-center gap-2 text-left" onClick={() => onPath(row.path)}>
                          {row.label ? <Badge variant="destructive">{row.label}</Badge> : null}
                          <span className="truncate font-mono text-xs text-cyber-cyan">{covered(row.path, mask.isHidden(FIELD_PATH))}</span>
                        </button>
                      </ColumnCell>
                    ) : null}
                    {slowLayout.open("requests") ? (
                      <ColumnCell width={slowLayout.size("requests")} className="font-mono">
                        {row.requests}
                      </ColumnCell>
                    ) : null}
                    {slowLayout.open("average") ? (
                      <ColumnCell width={slowLayout.size("average")} className="font-mono">
                        {row.avg_ms} ms
                      </ColumnCell>
                    ) : null}
                    {slowLayout.open("max") ? (
                      <ColumnCell width={slowLayout.size("max")} className="font-mono">
                        {row.max_ms} ms
                      </ColumnCell>
                    ) : null}
                  </TableRow>
                ))}
              </ColumnFrame>
            )}
            </HoldRegion>
          </div>
        )}
      </section>
    </div>
  );
}
