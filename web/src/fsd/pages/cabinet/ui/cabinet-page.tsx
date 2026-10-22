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
import { ProbeBoard } from "@/fsd/pages/cabinet/ui/probe-board";
import { SiteBoard } from "@/fsd/pages/cabinet/ui/site-board";
import { readAddresses, readObservations, readSummary } from "@/features/journal/api";
import { readSession, signOut, type SessionUser } from "@/features/sign-in/api";
import { SignInForm } from "@/features/sign-in/ui/sign-in-form";
import { adminHref, dashboardHref } from "@/shared/lib/hosts";
import { ADMIN, USER, type CabinetMode } from "@/shared/lib/role";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { TablePager } from "@/shared/ui/table-pager";
import { AddressPanel } from "@/widgets/address-panel/ui/address-panel";
import { SECTION_LOADER_MS, sectionIsLoading } from "@/widgets/cabinet-shell/section-loader";
import { CabinetShell, type CabinetSection } from "@/widgets/cabinet-shell/ui/cabinet-shell";
import { SectionLoader } from "@/widgets/cabinet-shell/ui/section-loader";
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

export function CabinetPage({ host, mode }: { host: string; mode: CabinetMode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [phase, setPhase] = useState<"checking" | "out" | "ready">("checking");
  const [section, setSection] = useState<CabinetSection>("overview");
  const [journal, setJournal] = useState<Journal | null>(null);
  const [journalError, setJournalError] = useState(false);
  const [addressFilter, setAddressFilter] = useState<string | null>(null);
  const [pathFilter, setPathFilter] = useState<string | null>(null);
  const [refreshSeconds, setRefreshSeconds] = useState<RefreshSeconds>(DEFAULT_REFRESH_SECONDS);
  const [freshRequests, setFreshRequests] = useState<string[]>([]);
  const [hold, setHold] = useState(false);
  const seenRequests = useRef<string[] | null>(null);
  const addressOnFirstPage = useRef(true);
  const observationOnFirstPage = useRef(true);

  const accepts = useCallback(
    (next: SessionUser) => (mode === ADMIN ? next.role === ADMIN : next.role === USER),
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
      setPathFilter(null);
      if (!accepts(next)) return;
      const addresses = mode === ADMIN ? readAddresses() : Promise.resolve(emptyAddressPage);
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
    observationOnFirstPage.current = !journal?.observationPrev;
  }, [journal?.observationPrev]);

  useEffect(() => {
    if (phase !== "ready" || refreshSeconds === 0 || section === "hosts") return;
    const timer = window.setInterval(() => {
      const onRequests = section === "requests";
      const refreshObservations = section === "overview" || (onRequests && observationOnFirstPage.current);
      const refreshAddresses =
        mode === ADMIN && addressOnFirstPage.current && (section === "overview" || section === "addresses");
      const observations = refreshObservations
        ? readObservations(null, "next", onRequests ? (addressFilter ?? "") : "", onRequests ? (pathFilter ?? "") : "")
        : Promise.resolve(null);
      const addresses = refreshAddresses ? readAddresses() : Promise.resolve(null);
      Promise.all([readSummary(), observations, addresses])
        .then(([summary, observationPage, addressPage]) => {
          if (observationPage) {
            const keys = observationPage.rows.map(observationKey);
            const arrived = arrivedKeys(seenRequests.current, keys);
            seenRequests.current = keys;
            if (arrived.length > 0) {
              setFreshRequests((current) => [...new Set([...current, ...arrived])]);
              window.setTimeout(() => {
                setFreshRequests((current) => current.filter((key) => !arrived.includes(key)));
              }, 1400);
            }
          }
          setJournal((current) => {
            if (!current) return current;
            return {
              ...current,
              summary,
              ...(observationPage
                ? {
                    observations: observationPage.rows,
                    observationNext: observationPage.next,
                    observationPrev: observationPage.prev,
                  }
                : {}),
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
  }, [phase, mode, section, refreshSeconds, addressFilter, pathFilter]);

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

  useEffect(() => {
    if (!hold) return;
    const timer = window.setTimeout(() => setHold(false), SECTION_LOADER_MS);
    return () => window.clearTimeout(timer);
  }, [hold, section]);

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
            {mode === ADMIN ? "Admin cabinet" : "Site cabinet"}
          </p>
          {phase === "checking" ? <p className="mt-4 text-muted-foreground">Reading the session.</p> : null}
          {phase === "out" ? (
            <>
              <h1 className="mt-3 text-3xl font-bold">Sign in.</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {mode === ADMIN
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
    const other = mode === ADMIN ? dashboardHref(host) : adminHref(host);
    return (
      <div className="cabinet flex min-h-screen w-full flex-1 items-center justify-center px-5">
        <div className="glass-panel w-full max-w-md p-8">
          <h1 className="text-3xl font-bold">{mode === ADMIN ? "Admin cabinet" : "Site cabinet"}</h1>
          <p className="mt-3 text-muted-foreground">
            {mode === ADMIN
              ? "This host is for the admin. Your site’s requests are on the site cabinet."
              : "This host is for a site user. Addresses across edges are on the admin cabinet."}
          </p>
          <a href={other} className="mt-6 inline-block text-sm text-cyber-cyan">
            {mode === ADMIN ? "Open the site cabinet" : "Open the admin cabinet"}
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
    setPathFilter(null);
    setAddressFilter(ip);
    enter("requests");
    readObservations(null, "next", ip)
      .then(keepObservations)
      .catch(() => setJournalError(true));
  }

  function openPath(path: string) {
    setAddressFilter(null);
    setPathFilter(path);
    enter("requests");
    readObservations(null, "next", "", path)
      .then(keepObservations)
      .catch(() => setJournalError(true));
  }

  function clearAddress() {
    setAddressFilter(null);
    readObservations(null, "next", "", pathFilter ?? "")
      .then(keepObservations)
      .catch(() => setJournalError(true));
  }

  function clearPath() {
    setPathFilter(null);
    readObservations(null, "next", addressFilter ?? "")
      .then(keepObservations)
      .catch(() => setJournalError(true));
  }

  function enter(next: CabinetSection) {
    if (next !== section) setHold(true);
    setSection(next);
  }

  function chooseSection(next: CabinetSection) {
    if (next !== "requests" && (addressFilter || pathFilter)) {
      setAddressFilter(null);
      setPathFilter(null);
      seenRequests.current = null;
      readObservations()
        .then(keepObservations)
        .catch(() => setJournalError(true));
    }
    enter(next);
  }

  function turnObservations(direction: "next" | "prev") {
    const cursor = direction === "next" ? journal?.observationNext : journal?.observationPrev;
    if (!cursor) return;
    readObservations(cursor, direction, addressFilter ?? "", pathFilter ?? "")
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
    <CabinetShell
      mode={mode}
      email={user.email}
      section={section}
      pulse={journal ? { requests: journal.summary.requests, probes: journal.summary.probes, rps: journal.summary.rps } : null}
      onSection={chooseSection}
      onSignOut={leave}
    >
      {sectionIsLoading(hold, journal !== null, journalError, section === "hosts") ? (
        <SectionLoader />
      ) : (
        <>
      <h1 className="text-3xl font-bold">{titleOf(section)}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{blurbOf(section)}</p>
      {section !== "hosts" ? (
        <div className="mt-6">
          <RefreshPicker value={refreshSeconds} onChange={setRefreshSeconds} />
        </div>
      ) : null}
      {section === "hosts" ? <HostsPanel mode={mode} /> : null}
      {journalError && section !== "hosts" ? <p className="mt-8 text-cyber-red">The journal did not answer.</p> : null}
      {journal && section === "overview" ? (
        <Overview
          summary={journal.summary}
          addresses={journal.addresses}
          mode={mode}
          onRequests={openAddress}
          onPath={openPath}
          onAllAddresses={() => chooseSection("addresses")}
          onAllProbes={() => chooseSection("probes")}
          addressPrev={journal.addressPrev}
          addressNext={journal.addressNext}
          onAddressPage={turnAddresses}
          observations={journal.observations}
          freshRequests={freshRequests}
        />
      ) : null}
      {journal && section === "probes" ? <ProbeBoard summary={journal.summary} onPath={openPath} /> : null}
      {journal && section === "sites" ? (
        <SiteBoard summary={journal.summary} showEdges={mode === ADMIN} onPath={openPath} />
      ) : null}
      {journal && section === "requests" ? (
        <div className="glass-panel mt-6 overflow-x-auto p-4">
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
          {pathFilter ? (
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Latest requests for <span className="font-mono text-foreground">{pathFilter}</span>
              </p>
              <button type="button" className="text-sm text-cyber-cyan" onClick={clearPath}>
                Clear
              </button>
            </div>
          ) : null}
          <RequestList
            rows={journal.observations}
            showEdge={mode === ADMIN}
            showAddress={mode === ADMIN}
            onAddress={openAddress}
            fresh={freshRequests}
            empty={
              addressFilter
                ? "This address is not in the latest requests."
                : pathFilter
                  ? "This path is not in the latest requests."
                  : undefined
            }
          />
          <TablePager
            prev={journal.observationPrev}
            next={journal.observationNext}
            onPrev={() => turnObservations("prev")}
            onNext={() => turnObservations("next")}
          />
        </div>
      ) : null}
      {journal && section === "addresses" && mode === ADMIN ? (
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
        </>
      )}
    </CabinetShell>
  );
}

function titleOf(section: CabinetSection) {
  if (section === "addresses") return "Addresses";
  if (section === "requests") return "Requests";
  if (section === "probes") return "Probes";
  if (section === "sites") return "Sites";
  if (section === "hosts") return "Hosts";
  return "Overview";
}

function blurbOf(section: CabinetSection) {
  if (section === "hosts") return "Add a host once. Sites on it appear from the requests, and you can turn one off.";
  if (section === "probes") return "Paths the marker calls a probe. Open a path to see those requests.";
  if (section === "sites") return "Each site is a Host header. Counts are the last 24 hours. The rate is the last minute.";
  if (section === "addresses") return "Addresses in the journal. The request still goes through.";
  if (section === "requests") return "Newest first. A new row starts green, then settles.";
  return "Observation records the request and lets it through. The last 24 hours.";
}

function RefreshPicker({ value, onChange }: { value: RefreshSeconds; onChange: (seconds: RefreshSeconds) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="text-xs tracking-[0.08em] text-muted-foreground uppercase">Refresh</p>
      {REFRESH_SECONDS.map((seconds) => (
        <Button
          key={seconds}
          type="button"
          size="sm"
          variant={seconds === value ? "default" : "outline"}
          aria-pressed={seconds === value}
          onClick={() => onChange(seconds)}
        >
          {refreshLabel(seconds)}
        </Button>
      ))}
    </div>
  );
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
  onPath,
  onAllProbes,
}: {
  summary: Summary;
  addresses: AddressRow[];
  mode: CabinetMode;
  onRequests: (ip: string) => void;
  onPath: (path: string) => void;
  onAllAddresses: () => void;
  onAllProbes: () => void;
  addressPrev: string | null;
  addressNext: string | null;
  onAddressPage: (direction: "next" | "prev") => void;
  observations: Observation[];
  freshRequests: string[];
}) {
  const cards = [
    { label: "Requests", value: String(summary.requests) },
    { label: "Probes", value: String(summary.probes) },
    ...(mode === ADMIN
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
      {mode === ADMIN ? (
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
      {mode === ADMIN ? (
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
          <RequestList
            rows={observations}
            showEdge={mode === ADMIN}
            showAddress={mode === ADMIN}
            onAddress={onRequests}
            fresh={freshRequests}
          />
        </div>
      </section>
      <section className="glass-panel p-4">
        <h2 className="text-sm font-medium">Requests by hour</h2>
        <div className="mt-4">
          <HourChart hours={summary.hours} />
        </div>
      </section>
      <section className="glass-panel p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium">Probes</h2>
          {summary.markers.length > 0 ? (
            <button type="button" className="text-sm text-cyber-cyan" onClick={onAllProbes}>
              All probes
            </button>
          ) : null}
        </div>
        {summary.markers.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No probes in this window.</p>
        ) : (
          <ul className="mt-3 divide-y divide-cyber-cyan/10">
            {summary.markers.slice(0, 8).map((marker) => (
              <li key={marker.path}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 py-2 text-left"
                  onClick={() => onPath(marker.path)}
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <Badge variant="destructive">{marker.label}</Badge>
                    <span className="truncate font-mono text-xs">{marker.path}</span>
                  </span>
                  <span className="font-mono text-sm text-cyber-cyan">{marker.count}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
