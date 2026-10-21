"use client";

import { useCallback, useEffect, useState } from "react";
import type { AddressRow, Observation, Summary } from "@/entities/observation/model";
import { readAddresses, readObservations, readSummary } from "@/features/journal/api";
import { readSession, signOut, type SessionUser } from "@/features/sign-in/api";
import { SignInForm } from "@/features/sign-in/ui/sign-in-form";
import { adminHref, dashboardHref } from "@/shared/lib/hosts";
import { Badge } from "@/shared/ui/badge";
import { AddressPanel } from "@/widgets/address-panel/ui/address-panel";
import { CabinetShell, type CabinetSection } from "@/widgets/cabinet-shell/ui/cabinet-shell";
import { HourChart } from "@/widgets/hour-chart/ui/hour-chart";
import { RequestList } from "@/widgets/request-list/ui/request-list";

type Journal = { summary: Summary; observations: Observation[]; addresses: AddressRow[] };

export function CabinetPage({ host, mode }: { host: string; mode: "client" | "admin" }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [phase, setPhase] = useState<"checking" | "out" | "ready">("checking");
  const [section, setSection] = useState<CabinetSection>("overview");
  const [journal, setJournal] = useState<Journal | null>(null);
  const [journalError, setJournalError] = useState(false);

  const accepts = useCallback(
    (next: SessionUser) => (mode === "admin" ? next.role === "admin" : next.role === "user"),
    [mode],
  );

  const load = useCallback(
    (next: SessionUser) => {
      setUser(next);
      setPhase("ready");
      setSection("overview");
      setJournal(null);
      setJournalError(false);
      if (!accepts(next)) return;
      const addresses = mode === "admin" ? readAddresses() : Promise.resolve([]);
      Promise.all([readSummary(), readObservations(), addresses])
        .then(([summary, observations, rows]) => setJournal({ summary, observations, addresses: rows }))
        .catch(() => setJournalError(true));
    },
    [accepts, mode],
  );

  useEffect(() => {
    let cancelled = false;
    readSession()
      .then((session) => {
        if (cancelled) return;
        if (session) load(session);
        else setPhase("out");
      })
      .catch(() => {
        if (!cancelled) setPhase("out");
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  function leave() {
    signOut().finally(() => {
      setUser(null);
      setJournal(null);
      setPhase("out");
    });
  }

  if (phase !== "ready" || !user) {
    return (
      <div className="cabinet flex min-h-screen w-full flex-1 items-center justify-center px-5">
        <div className="glass-panel w-full max-w-md p-8">
          <p className="text-xs tracking-[0.08em] text-cyber-cyan uppercase">
            {mode === "admin" ? "Admin cabinet" : "Site cabinet"}
          </p>
          {phase === "checking" ? <p className="mt-4 text-muted-foreground">Reading the session.</p> : null}
          {phase === "out" ? (
            <>
              <h1 className="mt-3 text-3xl font-bold">Sign in.</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {mode === "admin"
                  ? "Addresses across every edge. A site user signs in on dash."
                  : "Requests for your site. Addresses stay on the admin cabinet."}
              </p>
              <div className="mt-6">
                <SignInForm onSignIn={load} />
              </div>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  if (!accepts(user)) {
    const other = mode === "admin" ? dashboardHref(host) : adminHref(host);
    return (
      <div className="cabinet flex min-h-screen w-full flex-1 items-center justify-center px-5">
        <div className="glass-panel w-full max-w-md p-8">
          <h1 className="text-3xl font-bold">{mode === "admin" ? "Admin cabinet" : "Site cabinet"}</h1>
          <p className="mt-3 text-muted-foreground">
            {mode === "admin"
              ? "This host is for the admin. Your site’s requests are on the site cabinet."
              : "This host is for a site user. Addresses across edges are on the admin cabinet."}
          </p>
          <a href={other} className="mt-6 inline-block text-sm text-cyber-cyan">
            {mode === "admin" ? "Open the site cabinet" : "Open the admin cabinet"}
          </a>
          <button type="button" onClick={leave} className="mt-4 block text-sm text-muted-foreground">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <CabinetShell mode={mode} email={user.email} section={section} onSection={setSection} onSignOut={leave}>
      <h1 className="text-3xl font-bold">{section === "addresses" ? "Addresses" : section === "requests" ? "Requests" : "Overview"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Observation records the request and lets it through. The last 24 hours.
      </p>
      {journalError ? <p className="mt-8 text-cyber-red">The journal did not answer.</p> : null}
      {!journal && !journalError ? <p className="mt-8 text-muted-foreground">Reading the journal.</p> : null}
      {journal && section === "overview" ? <Overview summary={journal.summary} mode={mode} /> : null}
      {journal && section === "requests" ? (
        <div className="glass-panel mt-6 p-4">
          <RequestList rows={journal.observations} showEdge={mode === "admin"} />
        </div>
      ) : null}
      {journal && section === "addresses" && mode === "admin" ? (
        <div className="glass-panel mt-6 p-4">
          <AddressPanel rows={journal.addresses} />
        </div>
      ) : null}
    </CabinetShell>
  );
}

function Overview({ summary, mode }: { summary: Summary; mode: "client" | "admin" }) {
  const cards = [
    { label: "Requests", value: String(summary.requests) },
    { label: "Probes", value: String(summary.probes) },
    ...(mode === "admin"
      ? [
          { label: "Sites", value: String(summary.sites) },
          { label: "Edges", value: String(summary.edges.length) },
        ]
      : []),
  ];
  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="glass-panel p-4">
            <p className="text-xs tracking-[0.08em] text-muted-foreground uppercase">{card.label}</p>
            <p className="mt-2 font-mono text-3xl text-cyber-cyan">{card.value}</p>
          </article>
        ))}
      </div>
      <section className="glass-panel p-4">
        <h2 className="text-sm font-medium">Requests by hour</h2>
        <div className="mt-4">
          <HourChart hours={summary.hours} />
        </div>
      </section>
      <section className="glass-panel p-4">
        <h2 className="text-sm font-medium">Probes</h2>
        {summary.markers.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No probes in this window.</p>
        ) : (
          <ul className="mt-3 divide-y divide-cyber-cyan/10">
            {summary.markers.map((marker) => (
              <li key={marker.path} className="flex items-center justify-between gap-3 py-2">
                <span className="inline-flex items-center gap-2">
                  <Badge variant="destructive">{marker.label}</Badge>
                  <span className="font-mono text-xs">{marker.path}</span>
                </span>
                <span className="font-mono text-sm text-cyber-cyan">{marker.count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
