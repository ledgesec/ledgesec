"use client";

import { pathMarker } from "@/entities/observation/model";
import {
  PROBE_BATCH,
  PROBE_BATCH_SIZE,
  PROBE_GAP_MAX_MS,
  PROBE_OPENING,
  countryCounts,
  freshKeys,
  nextShown,
  probeGap,
  visibleProbes,
} from "@/fsd/pages/home/playback";
import { EXAMPLE_SITE } from "@/fsd/pages/home/examples";
import { COLUMN_METHOD, COLUMN_STATUS, COLUMN_TIME, COLUMN_USER_AGENT } from "@/shared/lib/columns";
import { Badge } from "@/shared/ui/badge";
import { CountryMark } from "@/shared/ui/country-mark";
import { FIELD_COUNTRY, FIELD_PATH } from "@/widgets/table-tools/query";
import { countryFlashes } from "@/widgets/world-map/flashes";
import { WorldMap } from "@/widgets/world-map/ui/world-map";
import { useEffect, useState, useSyncExternalStore } from "react";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeMotion(onChange: () => void) {
  const media = window.matchMedia(REDUCED_MOTION);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function motionNow() {
  return window.matchMedia(REDUCED_MOTION).matches;
}

export function ProbeHistory() {
  const reduced = useSyncExternalStore(subscribeMotion, motionNow, () => false);
  const [shown, setShown] = useState(PROBE_OPENING);
  const [fresh, setFresh] = useState<string[]>([]);
  const visibleCount = reduced ? PROBE_BATCH_SIZE : shown;

  useEffect(() => {
    if (reduced) return;
    let current = PROBE_OPENING;
    let timer = 0;
    const tick = () => {
      const wait = probeGap(Math.floor(Math.random() * (PROBE_GAP_MAX_MS + 1)));
      timer = window.setTimeout(() => {
        const next = nextShown(current, PROBE_BATCH_SIZE, Math.floor(Math.random() * (PROBE_GAP_MAX_MS + 1)));
        setFresh(current >= PROBE_BATCH_SIZE ? [] : freshKeys(current, next, PROBE_BATCH));
        current = next;
        setShown(next);
        tick();
      }, wait);
    };
    tick();
    return () => window.clearTimeout(timer);
  }, [reduced]);

  const rows = visibleProbes(PROBE_BATCH, visibleCount);
  const flashes = countryFlashes(
    rows.map((row) => ({ key: row.key, country: row.country, marked: true })),
    reduced ? [] : fresh,
  );

  return (
    <div>
      <WorldMap countries={countryCounts(rows)} flashes={flashes} />
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <caption className="sr-only">Example probe requests for {EXAMPLE_SITE}</caption>
          <thead>
            <tr className="border-b border-border text-xs tracking-[0.14em] text-muted-foreground uppercase">
              <th className="py-2 pr-4 font-medium">{COLUMN_TIME}</th>
              <th className="py-2 pr-4 font-medium">{FIELD_COUNTRY}</th>
              <th className="py-2 pr-4 font-medium">{COLUMN_USER_AGENT}</th>
              <th className="py-2 pr-4 font-medium">{COLUMN_METHOD}</th>
              <th className="py-2 pr-4 font-medium">{COLUMN_STATUS}</th>
              <th className="py-2 font-medium">{FIELD_PATH}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const marker = pathMarker(row.path);
              const arrived = !reduced && fresh.includes(row.key);
              return (
                <tr key={row.key} className="border-b border-border align-top">
                  <td className={`py-3 pr-4 font-mono text-xs whitespace-nowrap ${arrived ? "animate-probe-arrive" : ""}`}>{row.ts}</td>
                  <td className={`py-3 pr-4 ${arrived ? "animate-probe-arrive" : ""}`}>
                    <CountryMark code={row.country} />
                  </td>
                  <td className={`max-w-xs py-3 pr-4 font-mono text-xs ${arrived ? "animate-probe-arrive" : ""}`}>{row.ua}</td>
                  <td className={`py-3 pr-4 font-mono text-xs ${arrived ? "animate-probe-arrive" : ""}`}>{row.method}</td>
                  <td className={`py-3 pr-4 font-mono text-xs ${arrived ? "animate-probe-arrive" : ""}`}>{row.status}</td>
                  <td className={`py-3 ${arrived ? "animate-probe-arrive" : ""}`}>
                    {marker ? (
                      <Badge variant="destructive" className="mr-2">
                        {marker.label}
                      </Badge>
                    ) : null}
                    <span className="font-mono text-xs">{row.path}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
