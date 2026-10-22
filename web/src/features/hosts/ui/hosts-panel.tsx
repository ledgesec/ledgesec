"use client";

import { useCallback, useEffect, useState } from "react";
import { readHosts, setSiteMonitoring, type HostRecord } from "@/features/hosts/api";
import { AddHostWizard } from "@/features/hosts/ui/add-host-wizard";
import { Button } from "@/shared/ui/button";

export function HostsPanel() {
  const [hosts, setHosts] = useState<HostRecord[] | null>(null);
  const [error, setError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState("");

  const load = useCallback(() => {
    readHosts()
      .then((rows) => {
        setHosts(rows);
        setError(false);
      })
      .catch(() => {
        setHosts(null);
        setError(true);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (adding) {
    return (
      <div className="mt-6">
        <AddHostWizard
          onDone={() => {
            setAdding(false);
            load();
          }}
        />
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Sites appear when the first request for that name arrives.</p>
        <Button type="button" onClick={() => setAdding(true)}>
          Add host
        </Button>
      </div>
      {error ? <p className="text-cyber-red">The host list did not answer.</p> : null}
      {!hosts && !error ? <p className="text-muted-foreground">Reading hosts.</p> : null}
      {hosts && hosts.length === 0 ? (
        <section className="glass-panel p-6">
          <h2 className="text-xl font-bold">No hosts yet.</h2>
          <p className="mt-2 text-sm text-muted-foreground">Add the server once. Sites on it show up from the requests.</p>
        </section>
      ) : null}
      {hosts?.map((host) => (
        <section key={host.id} className="glass-panel p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">{host.label}</h2>
            <p className="font-mono text-xs text-cyber-cyan">{host.id}</p>
          </div>
          <p className="mt-1 text-xs tracking-[0.08em] text-muted-foreground uppercase">{host.collector}</p>
          {host.sites.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No sites yet.</p> : null}
          <ul className="mt-3 divide-y divide-cyber-cyan/10">
            {host.sites.map((site) => {
              const key = `${host.id}:${site.name}`;
              return (
                <li key={site.name} className="flex items-center justify-between gap-3 py-2">
                  <span className="font-mono text-sm">{site.name}</span>
                  <span className="flex items-center gap-3">
                    <span className={`text-xs ${site.enabled ? "text-cyber-green" : "text-muted-foreground"}`}>
                      {site.enabled ? "Monitoring" : "Off"}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending === key}
                      onClick={() => {
                        setPending(key);
                        setSiteMonitoring(host.id, site.name, !site.enabled)
                          .then(load)
                          .catch(() => setError(true))
                          .finally(() => setPending(""));
                      }}
                    >
                      {site.enabled ? "Turn off" : "Turn on"}
                    </Button>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
