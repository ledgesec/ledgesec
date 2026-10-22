"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_REFRESH_SECONDS,
  REFRESH_SECONDS,
  arrivedKeys,
  observationKey,
  refreshLabel,
  type RefreshSeconds,
} from "@/entities/observation/arrive";
import type { AddressRow, Observation, Summary } from "@/entities/observation/model";
import { HostsPanel } from "@/features/hosts/ui/hosts-panel";
import { readAddresses, readObservations, readSummary } from "@/features/journal/api";
import { readSession, signOut, type SessionUser } from "@/features/sign-in/api";
import { SignInForm } from "@/features/sign-in/ui/sign-in-form";
import { adminHref, dashboardHref } from "@/shared/lib/hosts";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { TablePager } from "@/shared/ui/table-pager";
import { AddressPanel } from "@/widgets/address-panel/ui/address-panel";
import { CabinetShell, type CabinetSection } from "@/widgets/cabinet-shell/ui/cabinet-shell";
import { HourChart } from "@/widgets/hour-chart/ui/hour-chart";
import { RequestList } from "@/widgets/request-list/ui/request-list";
import { DomainRates, WorldMap } from "@/widgets/world-map/ui/world-map";

type Journal = {
  summary: Summary;
  observations: Observation[];
  observationNext: string | null;
  observationPrev: string | null;
  addresses: AddressRow[];
  addressNext: string | null;
  addressPrev: string | null;
};

const emptyAddressPage = { rows: [] as AddressRow[], next: null, prev: null };

export function CabinetPage({ host, mode }: { host: string; mode: "client" | "admin" }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [phase, setPhase] = useState<"checking" | "out" | "ready">("checking");
  const [section, setSection] = useState<CabinetSection>("overview");
  const [journal, setJournal] = useState<Journal | null>(null);
  const [journalError, setJournalError] = useState(false);
  const [addressFilter, setAddressFilter] = useState<string | null>(null);
  const [refreshSeconds, setRefreshSeconds] = useState<RefreshSeconds>(DEFAULT_REFRESH_SECONDS);
  const [freshRequests, setFreshRequests] = useState<string[]>([]);
  const seenRequests = useRef<string[] | null>(null);
  const addressOnFirstPage = useRef(true);

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
      setAddressFilter(null);
      if (!accepts(next)) return;
      const addresses = mode === "admin" ? readAddresses() : Promise.resolve(emptyAddressPage);
      Promise.all([readSummary(), readObservations(), addresses])
        .then(([summary, observations, addressPage]) => {
          seenRequests.current = observations.rows.map(observationKey);
          setFreshRequests([]);
          setJournal({
            summary,
            observations: observations.rows,
            observationNext: observations.next,
            observationPrev: observations.prev,
            addresses: addressPage.rows,
            addressNext: addressPage.next,
            addressPrev: addressPage.prev,
          });
        })
        .catch(() => setJournalError(true));
    },
    [accepts, mode],
  );

  useEffect(() => {
    addressOnFirstPage.current = !journal?.addressPrev;
  }, [journal?.addressPrev]);

  useEffect(() => {
    if (phase !== "ready" || section !== "overview" || refreshSeconds === 0) return;
    const timer = window.setInterval(() => {
      const addresses =
        mode === "admin" && addressOnFirstPage.current ? readAddresses() : Promise.resolve(null);
      Promise.all([readSummary(), readObservations(null, "next", addressFilter ?? ""), addresses])
        .then(([summary, observations, addressPage]) => {
          const keys = observations.rows.map(observationKey);
          const arrived = arrivedKeys(seenRequests.current, keys);
          seenRequests.current = keys;
          if (arrived.length > 0) {
            setFreshRequests((current) => [...new Set([...current, ...arrived])]);
            window.setTimeout(() => {
              setFreshRequests((current) => current.filter((key) => !arrived.includes(key)));
            }, 1400);
          }
          setJournal((current) => {
            if (!current) return current;
            return {
              ...current,
              summary,
              observations: observations.rows,
              observationNext: observations.next,
              observationPrev: observations.prev,
              ...(addressPage && !current.addressPrev
                ? {
                    addresses: addressPage.rows,
                    addressNext: addressPage.next,
                    addressPrev: addressPage.prev,
                  }
                : {}),
            };
          });
        })
        .catch(() => setJournalError(true));
    }, refreshSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [phase, mode, section, refreshSeconds, addressFilter]);

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

  function keepObservations(page: { rows: Observation[]; next: string | null; prev: string | null }) {
    seenRequests.current = page.rows.map(observationKey);
    setFreshRequests([]);
    setJournal((current) =>
      current
        ? {
            ...current,
            observations: page.rows,
            observationNext: page.next,
            observationPrev: page.prev,
          }
        : current,
    );
  }

  function keepAddresses(page: { rows: AddressRow[]; next: string | null; prev: string | null }) {
    setJournal((current) =>
      current
        ? { ...current, addresses: page.rows, addressNext: page.next, addressPrev: page.prev }
        : current,
    );
  }

  function openAddress(ip: string) {
    setAddressFilter(ip);
    setSection("requests");
    readObservations(null, "next", ip)
      .then(keepObservations)
      .catch(() => setJournalError(true));
  }

  function clearAddress() {
    setAddressFilter(null);
    readObservations()
      .then(keepObservations)
      .catch(() => setJournalError(true));
  }

  function turnObservations(direction: "next" | "prev") {
    const cursor = direction === "next" ? journal?.observationNext : journal?.observationPrev;
    if (!cursor) return;
    readObservations(cursor, direction, addressFilter ?? "")
      .then(keepObservations)
      .catch(() => setJournalError(true));
  }

  function turnAddresses(direction: "next" | "prev") {
    const cursor = direction === "next" ? journal?.addressNext : journal?.addressPrev;
    if (!cursor) return;
    readAddresses(cursor, direction)
      .then(keepAddresses)
      .catch(() => setJournalError(true));
  }

  return (
    <CabinetShell mode={mode} email={user.email} section={section} onSection={setSection} onSignOut={leave}>
      <h1 className="text-3xl font-bold">{titleOf(section)}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {section === "hosts"
          ? "Add a host once. Sites on it appear from the requests, and you can turn one off."
          : "Observation records the request and lets it through. The last 24 hours."}
      </p>
      {section === "hosts" ? <HostsPanel mode={mode} /> : null}
      {journalError && section !== "hosts" ? <p className="mt-8 text-cyber-red">The journal did not answer.</p> : null}
      {!journal && !journalError && section !== "hosts" ? <p className="mt-8 text-muted-foreground">Reading the journal.</p> : null}
      {journal && section === "overview" ? (
        <Overview
          summary={journal.summary}
          addresses={journal.addresses}
          mode={mode}
          onRequests={openAddress}
          onAllAddresses={() => setSection("addresses")}
          addressPrev={journal.addressPrev}
          addressNext={journal.addressNext}
          onAddressPage={turnAddresses}
          observations={journal.observations}
          freshRequests={freshRequests}
          refreshSeconds={refreshSeconds}
          onRefresh={setRefreshSeconds}
        />
      ) : null}
      {journal && section === "requests" ? (
        <div className="glass-panel mt-6 p-4">
          {addressFilter ? (
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Latest requests from <span className="font-mono text-foreground">{addressFilter}</span>
              </p>
              <button type="button" className="text-sm text-cyber-cyan" onClick={clearAddress}>
                Clear
              </button>
            </div>
          ) : null}
          <RequestList
            rows={journal.observations}
            showEdge={mode === "admin"}
            empty={addressFilter ? "This address is not in the latest requests." : undefined}
          />
          <TablePager
            prev={journal.observationPrev}
            next={journal.observationNext}
            onPrev={() => turnObservations("prev")}
            onNext={() => turnObservations("next")}
          />
        </div>
      ) : null}
      {journal && section === "addresses" && mode === "admin" ? (
        <div className="glass-panel mt-6 overflow-x-auto p-4">
          <AddressPanel rows={journal.addresses} onRequests={openAddress} />
          <TablePager
            prev={journal.addressPrev}
            next={journal.addressNext}
            onPrev={() => turnAddresses("prev")}
            onNext={() => turnAddresses("next")}
          />
        </div>
      ) : null}
    </CabinetShell>
  );
}

function titleOf(section: CabinetSection) {
  if (section === "addresses") return "Addresses";
  if (section === "requests") return "Requests";
  if (section === "hosts") return "Hosts";
  return "Overview";
}

function Overview({
  summary,
  addresses,
  mode,
  onRequests,
  onAllAddresses,
  addressPrev,
  addressNext,
  onAddressPage,
  observations,
  freshRequests,
  refreshSeconds,
  onRefresh,
}: {
  summary: Summary;
  addresses: AddressRow[];
  mode: "client" | "admin";
  onRequests: (ip: string) => void;
  onAllAddresses: () => void;
  addressPrev: string | null;
  addressNext: string | null;
  onAddressPage: (direction: "next" | "prev") => void;
  observations: Observation[];
  freshRequests: string[];
  refreshSeconds: RefreshSeconds;
  onRefresh: (seconds: RefreshSeconds) => void;
}) {
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
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs tracking-[0.08em] text-muted-foreground uppercase">Refresh</p>
        {REFRESH_SECONDS.map((seconds) => (
          <Button
            key={seconds}
            type="button"
            size="sm"
            variant={seconds === refreshSeconds ? "default" : "outline"}
            aria-pressed={seconds === refreshSeconds}
            onClick={() => onRefresh(seconds)}
          >
            {refreshLabel(seconds)}
          </Button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="glass-panel p-4">
            <p className="text-xs tracking-[0.08em] text-muted-foreground uppercase">{card.label}</p>
            <p className="mt-2 font-mono text-3xl text-cyber-cyan">{card.value}</p>
          </article>
        ))}
      </div>
      {mode === "admin" ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(16rem,0.8fr)]">
          <section className="glass-panel p-4">
            <h2 className="text-sm font-medium">Countries</h2>
            <p className="mt-1 text-xs text-muted-foreground">Last 24 hours. A brighter mark has more requests.</p>
            <div className="mt-4 overflow-hidden rounded-lg border border-cyber-cyan/15">
              <WorldMap countries={summary.countries ?? []} />
            </div>
          </section>
          <section className="glass-panel p-4">
            <DomainRates rps={summary.rps ?? 0} domains={summary.domains ?? []} />
          </section>
        </div>
      ) : null}
      {mode === "admin" ? (
        <section className="glass-panel overflow-x-auto p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium">Who is knocking</h2>
            <button type="button" className="text-sm text-cyber-cyan" onClick={onAllAddresses}>
              All addresses
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Addresses in the latest journal. The request still goes through.
          </p>
          <div className="mt-4">
            <AddressPanel rows={addresses} onRequests={onRequests} compact />
            <TablePager
              prev={addressPrev}
              next={addressNext}
              onPrev={() => onAddressPage("prev")}
              onNext={() => onAddressPage("next")}
            />
          </div>
        </section>
      ) : null}
      <section className="glass-panel overflow-x-auto p-4">
        <h2 className="text-sm font-medium">Latest requests</h2>
        <p className="mt-1 text-xs text-muted-foreground">A new request starts green, then settles.</p>
        <div className="mt-4">
          <RequestList rows={observations} showEdge={mode === "admin"} fresh={freshRequests} />
        </div>
      </section>
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
