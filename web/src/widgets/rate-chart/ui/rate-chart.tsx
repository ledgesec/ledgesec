"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import type { RateSeries } from "@/entities/observation/model";
import { readRates } from "@/features/journal/api";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { RateLine } from "@/widgets/rate-chart/ui/rate-line";
import {
  CHART_HEIGHT,
  DEFAULT_RATE_WINDOW,
  NO_REQUESTS,
  PERIOD,
  RATE_WINDOWS,
  RPS,
  pointLabel,
  stepCaption,
  type RateWindow,
} from "@/widgets/rate-chart/windows";

const RATE_ERROR = "The journal did not answer.";

export function RateChart({ refreshSeconds }: { refreshSeconds: number }) {
  const [picked, setPicked] = useState<RateWindow>(DEFAULT_RATE_WINDOW);
  const [series, setSeries] = useState<RateSeries | null>(null);
  const [failed, setFailed] = useState(false);
  const current = series?.window === picked ? series : null;

  useEffect(() => {
    let stop = false;
    const load = () => {
      readRates(picked)
        .then((body) => {
          if (stop || body.window !== picked) return;
          setSeries(body);
          setFailed(false);
        })
        .catch(() => {
          if (stop) return;
          setFailed(true);
        });
    };
    load();
    if (refreshSeconds <= 0) return () => { stop = true; };
    const timer = window.setInterval(load, refreshSeconds * 1000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [picked, refreshSeconds]);

  const quiet = current !== null && current.points.every((point) => point.requests === 0);
  return (
    <section className="glass-panel p-4" aria-busy={current ? undefined : true}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <Activity className="size-4 text-cyber-cyan" />
            {RPS}
          </h2>
          {current ? (
            <p className="mt-1 text-xs text-muted-foreground">{stepCaption(current.step)}</p>
          ) : (
            <Skeleton className="mt-2 h-3 w-40" />
          )}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label={PERIOD}>
          {RATE_WINDOWS.map((window) => (
            <Button
              key={window}
              type="button"
              size="sm"
              variant={window === picked ? "default" : "outline"}
              aria-pressed={window === picked}
              onClick={() => setPicked(window)}
            >
              {window}
            </Button>
          ))}
        </div>
      </div>
      <div className="mt-4">
        {current && !quiet ? (
          <RateLine
            points={current.points.map((point) => ({ label: pointLabel(point.at), rps: point.rps }))}
          />
        ) : current && quiet ? (
          <p className="text-sm text-muted-foreground">{NO_REQUESTS}</p>
        ) : failed ? (
          <p className="text-sm text-cyber-red">{RATE_ERROR}</p>
        ) : (
          <Skeleton className="w-full" style={{ height: CHART_HEIGHT }} />
        )}
      </div>
    </section>
  );
}
