"use client";

import { useEffect, useState } from "react";
import type { AddressRow, Observation } from "@/entities/observation/model";
import { readAddresses, readObservations } from "@/features/journal/api";
import { readSession, signOut, type SessionUser } from "@/features/sign-in/api";
import { SignInForm } from "@/features/sign-in/ui/sign-in-form";
import { Button } from "@/shared/ui/button";
import { AddressPanel } from "@/widgets/address-panel/ui/address-panel";
import { RequestList } from "@/widgets/request-list/ui/request-list";
import { SiteHeader } from "@/widgets/site-header/ui/site-header";

type Journal = { observations: Observation[]; addresses: AddressRow[] };

export function DashboardPage({ host }: { host: string }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [phase, setPhase] = useState<"checking" | "out" | "ready">("checking");
  const [journal, setJournal] = useState<Journal | null>(null);
  const [journalError, setJournalError] = useState(false);

  function load(next: SessionUser) {
    setUser(next);
    setPhase("ready");
    setJournal(null);
    setJournalError(false);
    const addresses = next.role === "admin" ? readAddresses() : Promise.resolve([]);
    Promise.all([readObservations(), addresses])
      .then(([observations, rows]) => setJournal({ observations, addresses: rows }))
      .catch(() => setJournalError(true));
  }

  useEffect(() => {
    readSession()
      .then((session) => {
        if (session) load(session);
        else setPhase("out");
      })
      .catch(() => setPhase("out"));
  }, []);

  return (
    <>
      <SiteHeader
        host={host}
        trailing={
          user ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                signOut().finally(() => {
                  setUser(null);
                  setJournal(null);
                  setPhase("out");
                });
              }}
            >
              Sign out
            </Button>
          ) : (
            <span className="text-sm text-muted-foreground">Dashboard</span>
          )
        }
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 pt-12 pb-20">
        <p className="text-xs tracking-[0.08em] text-muted-foreground uppercase">Dashboard</p>
        {phase === "checking" ? <p className="mt-4 text-muted-foreground">Reading the session.</p> : null}
        {phase === "out" ? (
          <>
            <h1 className="mt-4 font-serif text-4xl font-medium tracking-tight">Sign in.</h1>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Admins see addresses across edges. A site user sees that site&apos;s requests. A path such as /.env is marked in rust on both.
            </p>
            <div className="mt-8">
              <SignInForm onSignIn={load} />
            </div>
          </>
        ) : null}
        {phase === "ready" && user ? (
          <>
            <h1 className="mt-4 font-serif text-4xl font-medium tracking-tight">
              {user.role === "admin" ? "Addresses across edges." : "Observed requests."}
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              {user.role === "admin"
                ? "An address is marked when it asked for a file the site should not serve."
                : "Paths for this site. Addresses stay on the admin view."}
            </p>
            {journalError ? <p className="mt-8 text-destructive">The journal did not answer.</p> : null}
            {!journal && !journalError ? <p className="mt-8 text-muted-foreground">Reading the journal.</p> : null}
            {journal && user.role === "admin" ? (
              <section className="mt-10">
                <h2 className="font-serif text-2xl font-medium">Addresses</h2>
                <div className="mt-4">
                  <AddressPanel rows={journal.addresses} />
                </div>
              </section>
            ) : null}
            {journal ? (
              <section className="mt-10">
                <h2 className="font-serif text-2xl font-medium">Requests</h2>
                <div className="mt-4">
                  <RequestList rows={journal.observations} showEdge={user.role === "admin"} />
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </main>
    </>
  );
}
