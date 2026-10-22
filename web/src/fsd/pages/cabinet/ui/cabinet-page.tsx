"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BLANK_FIELDS,
  COUNTRY,
  EDGE,
  FIELD_COUNTRY,
  FIELD_EDGE,
  FIELD_SITE,
  CLEAR,
  NO_MATCH,
  QUERY,
  SITE,
  choiceList,
  fieldsFrom,
  keepRow,
} from "@/widgets/table-tools/query";
import { HoldRegion, TableTools, useField } from "@/widgets/table-tools/ui/table-tools";
import {
  DEFAULT_REFRESH_SECONDS,
  REFRESH_SECONDS,
  arrivedKeys,
  latestRequests,
  observationKey,
  refreshLabel,
  type RefreshSeconds,
} from "@/entities/observation/arrive";
import type { AddressRow, Observation, Summary } from "@/entities/observation/model";
import { HostsPanel } from "@/features/hosts/ui/hosts-panel";
import { CountryMark } from "@/shared/ui/country-mark";
import { ProbeBoard } from "@/fsd/pages/cabinet/ui/probe-board";
import { SiteBoard } from "@/fsd/pages/cabinet/ui/site-board";
import { readAddresses, readObservations, readSummary } from "@/features/journal/api";
import { readSession, signOut, type SessionUser } from "@/features/sign-in/api";
import { SignInForm } from "@/features/sign-in/ui/sign-in-form";
import {
  ADDRESSES,
  HOSTS,
  OVERVIEW,
  PROBES,
  REQUEST_IP,
  REQUEST_PATH,
  REQUESTS,
  SITES,
  requestHref,
  sectionHref,
  sectionOfPath,
  type CabinetSection,
} from "@/shared/lib/cabinet-section";
import { adminHref, dashboardHref } from "@/shared/lib/hosts";
import { ADMIN, USER, type CabinetMode } from "@/shared/lib/role";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { TablePager } from "@/shared/ui/table-pager";
import { AddressPanel } from "@/widgets/address-panel/ui/address-panel";
import { CabinetShell } from "@/widgets/cabinet-shell/ui/cabinet-shell";
import { HourChart } from "@/widgets/hour-chart/ui/hour-chart";
import { RequestList } from "@/widgets/request-list/ui/request-list";
import { countryFlashes } from "@/widgets/world-map/flashes";
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
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const section = sectionOfPath(pathname, mode);
  const addressFilter = section === REQUESTS ? params.get(REQUEST_IP) || null : null;
  const pathFilter = section === REQUESTS ? params.get(REQUEST_PATH) || null : null;
  const [user, setUser] = useState<SessionUser | null>(null);
  const [phase, setPhase] = useState<"checking" | "out" | "ready">("checking");
  const [journal, setJournal] = useState<Journal | null>(null);
  const [journalError, setJournalError] = useState(false);
  const tableFields = fieldsFrom(params, mode === ADMIN);
  const lookupKey = `${tableFields.q}\n${tableFields.site}\n${tableFields.country}\n${tableFields.edge}\n${addressFilter ?? ""}\n${pathFilter ?? ""}`;
  const [seenLookup, setSeenLookup] = useState(lookupKey);
  const [searchHeld, setSearchHeld] = useState(false);
  const [lookupHeld, setLookupHeld] = useState(false);
  const [refreshSeconds, setRefreshSeconds] = useState<RefreshSeconds>(DEFAULT_REFRESH_SECONDS);
  const [freshRequests, setFreshRequests] = useState<string[]>([]);
  if (seenLookup !== lookupKey) {
    setSeenLookup(lookupKey);
    if (journal && (section === REQUESTS || (section === ADDRESSES && mode === ADMIN))) setLookupHeld(true);
  }
  const seenRequests = useRef<string[] | null>(null);
  const addressOnFirstPage = useRef(true);
  const observationOnFirstPage = useRef(true);
  const scoped = useRef(false);
  const tableLookup = useMemo(
    () => ({ q: tableFields.q, site: tableFields.site, country: tableFields.country, edge: tableFields.edge }),
    [tableFields.q, tableFields.site, tableFields.country, tableFields.edge],
  );
  const filterRef = useRef({ section, addressFilter, pathFilter, fields: tableLookup });

  useEffect(() => {
    filterRef.current = { section, addressFilter, pathFilter, fields: tableLookup };
  }, [section, addressFilter, pathFilter, tableLookup]);

  const accepts = useCallback(
    (next: SessionUser) => (mode === ADMIN ? next.role === ADMIN : next.role === USER),
    [mode],
  );

  const load = useCallback(
    (next: SessionUser) => {
      setUser(next);
      setPhase("ready");
      setJournal(null);
      setJournalError(false);
      if (!accepts(next)) return;
      const view = filterRef.current;
      const ip = view.section === REQUESTS ? (view.addressFilter ?? "") : "";
      const path = view.section === REQUESTS ? (view.pathFilter ?? "") : "";
      const fields = view.section === REQUESTS ? view.fields : BLANK_FIELDS;
      const addresses = mode === ADMIN ? readAddresses() : Promise.resolve(emptyAddressPage);
      Promise.all([readSummary(), readObservations(null, "next", ip, path, fields, mode === ADMIN), addresses])
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
    if (phase !== "ready" || refreshSeconds === 0 || section === HOSTS) return;
    const timer = window.setInterval(() => {
      const onRequests = section === REQUESTS;
      const refreshObservations = section === OVERVIEW || (onRequests && observationOnFirstPage.current);
      const refreshAddresses =
        mode === ADMIN && addressOnFirstPage.current && section === ADDRESSES;
      const observations = refreshObservations
        ? readObservations(
            null,
            "next",
            onRequests ? (addressFilter ?? "") : "",
            onRequests ? (pathFilter ?? "") : "",
            onRequests ? tableLookup : BLANK_FIELDS,
            mode === ADMIN,
          )
        : Promise.resolve(null);
      const addresses = refreshAddresses ? readAddresses(null, "next", tableLookup) : Promise.resolve(null);
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
  }, [
    phase,
    mode,
    section,
    refreshSeconds,
    addressFilter,
    pathFilter,
    tableLookup,
  ]);

  useEffect(() => {
    if (phase !== "ready") return;
    if (section === REQUESTS && (addressFilter || pathFilter)) {
      scoped.current = true;
      return;
    }
    if (section === REQUESTS || !scoped.current) return;
    scoped.current = false;
    seenRequests.current = null;
    readObservations(null, "next", "", "", BLANK_FIELDS, mode === ADMIN)
      .then((page) => {
        seenRequests.current = page.rows.map(observationKey);
        setFreshRequests([]);
        setJournal((current) =>
          current
            ? { ...current, observations: page.rows, observationNext: page.next, observationPrev: page.prev }
            : current,
        );
      })
      .catch(() => setJournalError(true));
  }, [phase, section, mode, addressFilter, pathFilter]);

  useEffect(() => {
    if (phase !== "ready" || section !== REQUESTS) return;
    let cancelled = false;
    readObservations(null, "next", addressFilter ?? "", pathFilter ?? "", tableLookup, mode === ADMIN)
      .then((page) => {
        if (cancelled) return;
        seenRequests.current = page.rows.map(observationKey);
        setFreshRequests([]);
        setJournal((current) =>
          current
            ? { ...current, observations: page.rows, observationNext: page.next, observationPrev: page.prev }
            : current,
        );
      })
      .catch(() => {
        if (!cancelled) setJournalError(true);
      })
      .finally(() => {
        if (!cancelled) setLookupHeld(false);
      });
    return () => {
      cancelled = true;
    };
  }, [phase, section, mode, addressFilter, pathFilter, tableLookup]);

  useEffect(() => {
    if (phase !== "ready" || section !== ADDRESSES || mode !== ADMIN) return;
    let cancelled = false;
    readAddresses(null, "next", tableLookup)
      .then((page) => {
        if (cancelled) return;
        setJournal((current) =>
          current ? { ...current, addresses: page.rows, addressNext: page.next, addressPrev: page.prev } : current,
        );
      })
      .catch(() => {
        if (!cancelled) setJournalError(true);
      })
      .finally(() => {
        if (!cancelled) setLookupHeld(false);
      });
    return () => {
      cancelled = true;
    };
  }, [phase, section, mode, tableLookup]);

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
            {mode === ADMIN ? "Admin cabinet" : "Site cabinet"}
          </p>
          {phase === "checking" ? (
            <div className="mt-4 space-y-3" aria-busy="true">
              <Skeleton className="h-9 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ) : null}
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

  function requestsHref(ip: string, path: string) {
    return requestHref(host, mode, ip, path, section === REQUESTS ? params : undefined);
  }

  function openAddress(ip: string) {
    router.push(requestsHref(ip, ""));
  }

  function openPath(path: string) {
    router.push(requestsHref("", path));
  }

  function clearAddress() {
    router.push(requestsHref("", pathFilter ?? ""));
  }

  function clearPath() {
    router.push(requestsHref(addressFilter ?? "", ""));
  }

  function turnObservations(direction: "next" | "prev") {
    const cursor = direction === "next" ? journal?.observationNext : journal?.observationPrev;
    if (!cursor) return;
    readObservations(cursor, direction, addressFilter ?? "", pathFilter ?? "", tableLookup, mode === ADMIN)
      .then(keepObservations)
      .catch(() => setJournalError(true));
  }

  function turnAddresses(direction: "next" | "prev") {
    const cursor = direction === "next" ? journal?.addressNext : journal?.addressPrev;
    if (!cursor) return;
    readAddresses(cursor, direction, tableLookup)
      .then(keepAddresses)
      .catch(() => setJournalError(true));
  }

  return (
    <CabinetShell
      host={host}
      mode={mode}
      email={user.email}
      section={section}
      pulse={journal ? { requests: journal.summary.requests, probes: journal.summary.probes, rps: journal.summary.rps } : null}
      onSignOut={leave}
    >
      <h1 className="text-3xl font-bold">{titleOf(section)}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{blurbOf(section)}</p>
      {section !== HOSTS ? (
        <div className="mt-6">
          <RefreshPicker value={refreshSeconds} onChange={setRefreshSeconds} />
        </div>
      ) : null}
      {section === HOSTS ? <HostsPanel mode={mode} /> : null}
      {journalError && section !== HOSTS ? <p className="mt-8 text-cyber-red">The journal did not answer.</p> : null}
      {(journal || !journalError) && section === OVERVIEW ? (
        <Overview
          summary={journal?.summary ?? null}
          mode={mode}
          onRequests={openAddress}
          onPath={openPath}
          probesHref={sectionHref(host, mode, PROBES)}
          observations={journal?.observations ?? []}
          freshRequests={freshRequests}
        />
      ) : null}
      {(journal || !journalError) && section === PROBES ? <ProbeBoard summary={journal?.summary ?? null} onPath={openPath} admin={mode === ADMIN} /> : null}
      {(journal || !journalError) && section === SITES ? (
        <SiteBoard summary={journal?.summary ?? null} showEdges={mode === ADMIN} onPath={openPath} />
      ) : null}
      {(journal || !journalError) && section === REQUESTS ? (
        <div className="glass-panel mt-6 overflow-x-auto p-4">
          {addressFilter ? (
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Latest requests from <span className="font-mono text-foreground">{addressFilter}</span>
              </p>
              <button type="button" className="text-sm text-cyber-cyan" onClick={clearAddress}>
                {CLEAR}
              </button>
            </div>
          ) : null}
          {pathFilter ? (
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Latest requests for <span className="font-mono text-foreground">{pathFilter}</span>
              </p>
              <button type="button" className="text-sm text-cyber-cyan" onClick={clearPath}>
                {CLEAR}
              </button>
            </div>
          ) : null}
          <JournalTools
            admin={mode === ADMIN}
            sites={siteNames(journal)}
            countries={(journal?.summary.countries ?? []).map((country) => country.code)}
            edges={(journal?.summary.edges ?? []).map((edge) => edge.id)}
            onHold={setSearchHeld}
          />
          <HoldRegion held={searchHeld || lookupHeld}>
          <RequestList
            rows={journal?.observations ?? []}
            pending={!journal}
            showEdge={mode === ADMIN}
            showAddress={mode === ADMIN}
            onAddress={openAddress}
            fresh={freshRequests}
            empty={
              tableFields.q !== "" || tableFields.site !== "" || tableFields.country !== "" || tableFields.edge !== ""
                ? NO_MATCH
                : addressFilter
                  ? "This address is not in the latest requests."
                  : pathFilter
                    ? "This path is not in the latest requests."
                    : undefined
            }
          />
          <TablePager
            prev={journal?.observationPrev ?? null}
            next={journal?.observationNext ?? null}
            onPrev={() => turnObservations("prev")}
            onNext={() => turnObservations("next")}
          />
          </HoldRegion>
        </div>
      ) : null}
      {(journal || !journalError) && section === ADDRESSES && mode === ADMIN ? (
        <div className="glass-panel mt-6 overflow-x-auto p-4">
          <JournalTools
            admin
            sites={siteNames(journal)}
            countries={(journal?.summary.countries ?? []).map((country) => country.code)}
            edges={(journal?.summary.edges ?? []).map((edge) => edge.id)}
            onHold={setSearchHeld}
          />
          <HoldRegion held={searchHeld || lookupHeld}>
          <AddressPanel
            rows={journal?.addresses ?? []}
            pending={!journal}
            onRequests={openAddress}
            empty={
              tableFields.q !== "" || tableFields.site !== "" || tableFields.country !== "" || tableFields.edge !== ""
                ? NO_MATCH
                : undefined
            }
          />
          <TablePager
            prev={journal?.addressPrev ?? null}
            next={journal?.addressNext ?? null}
            onPrev={() => turnAddresses("prev")}
            onNext={() => turnAddresses("next")}
          />
          </HoldRegion>
        </div>
      ) : null}
    </CabinetShell>
  );
}

function siteNames(journal: Journal | null) {
  return [
    ...(journal?.summary.by_site ?? []).map((site) => site.name),
    ...(journal?.summary.domains ?? []).map((domain) => domain.name),
  ];
}

function JournalTools({
  sites,
  countries,
  edges,
  admin,
  onHold,
}: {
  sites: string[];
  countries: string[];
  edges: string[];
  admin: boolean;
  onHold: (held: boolean) => void;
}) {
  const [query, setQuery, , queryHeld] = useField(QUERY);
  useEffect(() => {
    onHold(queryHeld);
    return () => onHold(false);
  }, [onHold, queryHeld]);
  const [site, setSite] = useField(SITE, 0);
  const [country, setCountry] = useField(COUNTRY, 0);
  const [edge, setEdge] = useField(EDGE, 0);
  return (
    <TableTools
      query={query}
      onQuery={setQuery}
      filters={[
        { id: SITE, label: FIELD_SITE, value: site, options: choiceList(sites), onChange: setSite },
        { id: COUNTRY, label: FIELD_COUNTRY, value: country, options: choiceList(countries), onChange: setCountry },
        ...(admin
          ? [{ id: EDGE, label: FIELD_EDGE, value: edge, options: choiceList(edges), onChange: setEdge }]
          : []),
      ]}
    />
  );
}

function titleOf(section: CabinetSection) {
  if (section === ADDRESSES) return "Addresses";
  if (section === REQUESTS) return "Requests";
  if (section === PROBES) return "Probes";
  if (section === SITES) return "Sites";
  if (section === HOSTS) return "Hosts";
  return "Overview";
}

function blurbOf(section: CabinetSection) {
  if (section === HOSTS) return "Add a host once. Sites on it appear from the requests, and you can turn one off.";
  if (section === PROBES) return "Paths the marker calls a probe. Open a path to see those requests.";
  if (section === SITES) return "Each site is a Host header. Counts are the last 24 hours. The rate is the last minute.";
  if (section === ADDRESSES) return "Addresses in the journal. The request still goes through.";
  if (section === REQUESTS) return "Newest first. A new row starts green, then settles.";
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

const SKELETON_COUNTRIES = 6;
const SKELETON_PROBES = 4;

function Overview({
  summary,
  mode,
  onRequests,
  observations,
  freshRequests,
  onPath,
  probesHref,
}: {
  summary: Summary | null;
  mode: CabinetMode;
  onRequests: (ip: string) => void;
  onPath: (path: string) => void;
  probesHref: string;
  observations: Observation[];
  freshRequests: string[];
}) {
  const [query, setQuery, appliedQuery, queryHeld] = useField(QUERY);
  const [site, setSite] = useField(SITE, 0);
  const [country, setCountry] = useField(COUNTRY, 0);
  const [edge, setEdge] = useField(EDGE, 0);
  const pickedEdge = mode === ADMIN ? edge : "";
  const latest = latestRequests(observations);
  const flashes = countryFlashes(
    latest.map((row) => ({ key: observationKey(row), country: row.country, marked: row.marker !== null })),
    freshRequests,
  );
  const admin = mode === ADMIN;
  const rows = latest.filter((row) =>
    keepRow(
      [row.siteId, row.path, row.country, row.marker?.label ?? "", ...(admin ? [row.edgeId, row.ip] : [])],
      appliedQuery,
      [row.siteId, row.country, ...(admin ? [row.edgeId] : [])],
      [site, country, ...(admin ? [pickedEdge] : [])],
    ),
  );
  const cards = [
    { label: "Requests", value: summary ? String(summary.requests) : null },
    { label: "Probes", value: summary ? String(summary.probes) : null },
    ...(mode === ADMIN
      ? [
          { label: "Sites", value: summary ? String(summary.sites) : null },
          { label: "Edges", value: summary ? String(summary.edges.length) : null },
        ]
      : []),
  ];
  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy={summary ? undefined : true}>
        {cards.map((card) => (
          <article key={card.label} className="glass-panel p-4">
            <p className="text-xs tracking-[0.08em] text-muted-foreground uppercase">{card.label}</p>
            {card.value === null ? (
              <Skeleton className="mt-2 h-9 w-16" />
            ) : (
              <p className="mt-2 font-mono text-3xl text-cyber-cyan">{card.value}</p>
            )}
          </article>
        ))}
      </div>
      {mode === ADMIN ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(16rem,0.8fr)]">
          <section className="glass-panel p-4" aria-busy={summary ? undefined : true}>
            <h2 className="text-sm font-medium">Countries</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Last 24 hours. A brighter mark has more requests. A new one pulses green. A probe pulses red.
            </p>
            <div className="mt-4 overflow-hidden rounded-lg border border-cyber-cyan/15">
              {summary ? (
                <WorldMap countries={summary.countries ?? []} flashes={flashes} />
              ) : (
                <Skeleton className="aspect-[2/1] w-full rounded-none" />
              )}
            </div>
            {!summary ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {Array.from({ length: SKELETON_COUNTRIES }, (_, index) => (
                  <li key={index}>
                    <Skeleton className="h-3 w-12" />
                  </li>
                ))}
              </ul>
            ) : (summary.countries ?? []).length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">No country code in the last 24 hours.</p>
            ) : (
              <ul className="mt-3 flex flex-wrap gap-2">
                {(summary.countries ?? []).map((country) => (
                  <li key={country.code} className="inline-flex items-center gap-2 text-xs text-cyber-cyan">
                    <CountryMark code={country.code} />
                    <span className="font-mono">{country.requests}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="glass-panel p-4">
            <DomainRates pending={!summary} rps={summary?.rps ?? 0} domains={summary?.domains ?? []} />
          </section>
        </div>
      ) : null}
      <section className="glass-panel overflow-x-auto p-4">
        <h2 className="text-sm font-medium">Latest requests</h2>
        <p className="mt-1 text-xs text-muted-foreground">The latest 30. A new request starts green, then settles.</p>
        <div className="mt-4">
          <TableTools
            query={query}
            onQuery={setQuery}
            filters={[
              {
                id: "site",
                label: FIELD_SITE,
                value: site,
                options: choiceList(latest.map((row) => row.siteId)),
                onChange: setSite,
              },
              {
                id: "country",
                label: FIELD_COUNTRY,
                value: country,
                options: choiceList(latest.map((row) => row.country)),
                onChange: setCountry,
              },
              ...(admin
                ? [
                    {
                      id: "edge",
                      label: FIELD_EDGE,
                      value: pickedEdge,
                      options: choiceList(latest.map((row) => row.edgeId)),
                      onChange: setEdge,
                    },
                  ]
                : []),
            ]}
          />
          <HoldRegion held={queryHeld}>
            <RequestList
              rows={rows}
              pending={!summary}
              showEdge={admin}
              showAddress={admin}
              onAddress={onRequests}
              fresh={freshRequests}
              empty={appliedQuery !== "" || site !== "" || country !== "" || pickedEdge !== "" ? NO_MATCH : undefined}
            />
          </HoldRegion>
        </div>
      </section>
      <section className="glass-panel p-4" aria-busy={summary ? undefined : true}>
        <h2 className="text-sm font-medium">Requests by hour</h2>
        <div className="mt-4">
          <HourChart hours={summary?.hours ?? []} pending={!summary} />
        </div>
      </section>
      <section className="glass-panel p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium">Probes</h2>
          {summary && summary.markers.length > 0 ? (
            <Link href={probesHref} className="text-sm text-cyber-cyan">
              All probes
            </Link>
          ) : null}
        </div>
        {!summary ? (
          <ul className="mt-3 divide-y divide-cyber-cyan/10" aria-busy="true">
            {Array.from({ length: SKELETON_PROBES }, (_, index) => (
              <li key={index} className="flex items-center justify-between gap-3 py-2">
                <span className="inline-flex items-center gap-2">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-3 w-40" />
                </span>
                <Skeleton className="h-4 w-8" />
              </li>
            ))}
          </ul>
        ) : summary.markers.length === 0 ? (
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
