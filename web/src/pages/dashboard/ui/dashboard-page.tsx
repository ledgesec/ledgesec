"use client";

import { useState } from "react";
import { addressesFrom, sampleObservations } from "@/entities/observation/model";
import { SignInForm, type Role } from "@/features/sign-in/ui/sign-in-form";
import { Button } from "@/shared/ui/button";
import { AddressPanel } from "@/widgets/address-panel/ui/address-panel";
import { RequestList } from "@/widgets/request-list/ui/request-list";
import { SiteHeader } from "@/widgets/site-header/ui/site-header";

export function DashboardPage({ host }: { host: string }) {
  const [role, setRole] = useState<Role | null>(null);
  const rows = role === "user" ? sampleObservations.filter((row) => row.siteId === "demo") : sampleObservations;

  return (
    <>
      <SiteHeader
        host={host}
        trailing={
          role ? (
            <Button variant="outline" size="sm" onClick={() => setRole(null)}>
              Sign out
            </Button>
          ) : (
            <span className="text-sm text-muted-foreground">Dashboard</span>
          )
        }
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 pt-12 pb-20">
        <p className="text-xs tracking-[0.08em] text-muted-foreground uppercase">Dashboard</p>
        {role === null ? (
          <>
            <h1 className="mt-4 font-serif text-4xl font-medium tracking-tight">Sign in.</h1>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Admins see addresses across edges. A site user sees that site&apos;s requests. A path such as /.env is marked in rust on both.
            </p>
            <div className="mt-8">
              <SignInForm onSignIn={setRole} />
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-4 font-serif text-4xl font-medium tracking-tight">
              {role === "admin" ? "Addresses across edges." : "Observed requests."}
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              {role === "admin"
                ? "An address is marked when it asked for a file the site should not serve. Sample lines, not a live journal."
                : "Paths for demo. Addresses stay on the admin view. Sample lines, not a live journal."}
            </p>
            {role === "admin" ? (
              <section className="mt-10">
                <h2 className="font-serif text-2xl font-medium">Addresses</h2>
                <div className="mt-4">
                  <AddressPanel rows={addressesFrom(sampleObservations)} />
                </div>
              </section>
            ) : null}
            <section className="mt-10">
              <h2 className="font-serif text-2xl font-medium">Requests</h2>
              <div className="mt-4">
                <RequestList rows={rows} showEdge={role === "admin"} />
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
