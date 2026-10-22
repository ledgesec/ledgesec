"use client";

import { useEffect, useState } from "react";
import { arrivingSites } from "@/features/hosts/arrival";
import { createHost, readAccounts, readHosts, type AccountRecord, type HostRecord, type HostSite } from "@/features/hosts/api";
import { hostCollectorSchema, hostLabelSchema, hostOwnerSchema } from "@/features/hosts/schema";
import { HostInstall } from "@/features/hosts/ui/host-install";
import { apiError } from "@/shared/lib/api-error";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

const steps = [
  { id: "name", label: "Name" },
  { id: "connection", label: "Connection" },
  { id: "install", label: "Install" },
  { id: "check", label: "Check" },
] as const;

const methods = [
  { id: "nginx", title: "Nginx", detail: "OpenResty module on the server.", available: true },
  { id: "dns", title: "DNS", detail: "Send traffic through the edge.", available: false },
  { id: "linux", title: "Linux daemon", detail: "A process reads the whole nginx log. Nginx itself stays as it is.", available: true },
  { id: "coolify", title: "Coolify", detail: "One process reads the whole proxy log. A missing name is kept.", available: true },
  { id: "apache", title: "Apache", detail: "Apache module on the server.", available: false },
] as const;

type Step = (typeof steps)[number]["id"];

export function AddHostWizard({ mode, onDone }: { mode: "client" | "admin"; onDone: () => void }) {
  const [step, setStep] = useState<Step>("name");
  const [label, setLabel] = useState("");
  const [labelError, setLabelError] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [ownerError, setOwnerError] = useState("");
  const [accounts, setAccounts] = useState<AccountRecord[] | null>(null);
  const [accountsError, setAccountsError] = useState(false);
  const [collector, setCollector] = useState("nginx");
  const [collectorError, setCollectorError] = useState("");
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState<HostRecord | null>(null);
  const [arrived, setArrived] = useState<HostSite[] | null>(null);
  const [checkError, setCheckError] = useState(false);
  const index = steps.findIndex((item) => item.id === step);
  const ownerEmail = accounts?.find((account) => account.id === ownerId)?.email ?? "";

  useEffect(() => {
    if (mode !== "admin") return;
    let cancelled = false;
    readAccounts()
      .then((rows) => {
        if (!cancelled) setAccounts(rows);
      })
      .catch(() => {
        if (!cancelled) setAccountsError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  useEffect(() => {
    if (step !== "check" || !created) return;
    let cancelled = false;
    let timer = 0;
    const look = () => {
      readHosts()
        .then((rows) => {
          if (cancelled) return;
          const sites = arrivingSites(rows, created.id);
          setArrived(sites);
          setCheckError(false);
          if (sites.length > 0) window.clearInterval(timer);
        })
        .catch(() => {
          if (!cancelled) setCheckError(true);
        });
    };
    timer = window.setInterval(look, 5000);
    look();
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [step, created]);

  return (
    <section className="glass-panel mx-auto w-full max-w-2xl p-6 sm:p-8">
      <ol className="flex items-center gap-2">
        {steps.map((item, itemIndex) => (
          <li key={item.id} className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                itemIndex <= index ? "border-cyber-cyan bg-cyber-cyan/15 text-cyber-cyan" : "border-cyber-cyan/20 text-muted-foreground"
              }`}
            >
              {itemIndex + 1}
            </span>
            <span className={`truncate text-sm ${itemIndex === index ? "text-foreground" : "text-muted-foreground"}`}>{item.label}</span>
            {itemIndex < steps.length - 1 ? <span className="hidden h-px flex-1 bg-cyber-cyan/20 sm:block" /> : null}
          </li>
        ))}
      </ol>

      {step === "name" ? (
        <form
          className="relative mt-8 grid gap-6"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const parsed = hostLabelSchema.safeParse({ label: String(data.get("label") ?? "") });
            const owner = mode === "admin" ? hostOwnerSchema.safeParse({ ownerId: String(data.get("owner_id") ?? "") }) : null;
            setLabelError(parsed.success ? "" : (parsed.error.flatten().fieldErrors.label?.[0] ?? ""));
            setOwnerError(owner && !owner.success ? (owner.error.flatten().fieldErrors.ownerId?.[0] ?? "") : "");
            if (!parsed.success || (owner && !owner.success)) return;
            setLabel(parsed.data.label);
            if (owner?.success) setOwnerId(owner.data.ownerId);
            setStep("connection");
          }}
        >
          <div>
            <h2 className="text-2xl font-bold">Name this host.</h2>
            <p className="mt-2 text-sm text-muted-foreground">One server can carry many sites. Their names show up from the requests.</p>
          </div>
          {mode === "admin" ? (
            <label className="relative grid gap-1 text-sm text-muted-foreground">
              Account
              <select
                name="owner_id"
                value={ownerId}
                onChange={(event) => setOwnerId(event.target.value)}
                disabled={accounts === null}
                aria-invalid={ownerError !== "" || accountsError}
                aria-describedby="host-owner-error"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
              >
                <option value="">{accounts === null ? "Reading accounts." : "Choose an account"}</option>
                {accounts?.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.email}
                  </option>
                ))}
              </select>
              <span id="host-owner-error" className="absolute top-full left-0 z-10 mt-0.5 text-xs leading-none text-destructive">
                {accountsError ? "The account list did not answer." : ownerError}
              </span>
            </label>
          ) : null}
          <Label className="relative grid gap-1 text-muted-foreground">
            Host name
            <Input
              name="label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              autoComplete="off"
              aria-invalid={labelError !== ""}
              aria-describedby="host-label-error"
            />
            <span id="host-label-error" className="absolute top-full left-0 z-10 mt-0.5 text-xs leading-none text-destructive">
              {labelError}
            </span>
          </Label>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onDone}>
              Cancel
            </Button>
            <Button type="submit">Continue</Button>
          </div>
        </form>
      ) : null}

      {step === "connection" ? (
        <div className="relative mt-8 grid gap-6">
          <div>
            <h2 className="text-2xl font-bold">How should it report?</h2>
            <p className="mt-2 text-sm text-muted-foreground">Nginx, the Linux daemon, and Coolify are available. DNS and Apache stay in the list until they can be turned on.</p>
          </div>
          <fieldset>
            <legend className="sr-only">Connection</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {methods.map((method) => {
                const selected = method.available && collector === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    disabled={!method.available || pending}
                    aria-pressed={selected}
                    onClick={() => {
                      if (method.available) setCollector(method.id);
                    }}
                    className={`rounded-xl border p-4 text-left ${
                      selected ? "border-cyber-cyan bg-cyber-cyan/10" : "border-cyber-cyan/15 bg-white/5"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <span className="block font-medium">{method.title}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{method.detail}</span>
                    <span className={`mt-3 block text-xs tracking-[0.08em] uppercase ${method.available ? "text-cyber-green" : "text-muted-foreground"}`}>
                      {method.available ? "Available" : "Not available yet"}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
          <p className="absolute top-full left-0 text-sm text-destructive">{collectorError}</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={pending} onClick={() => setStep("name")}>
              Back
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => {
                const parsed = hostCollectorSchema.safeParse({ collector });
                if (!parsed.success) {
                  setCollectorError(parsed.error.flatten().fieldErrors.collector?.[0] ?? "");
                  return;
                }
                setCollectorError("");
                setPending(true);
                createHost(label, parsed.data.collector, mode === "admin" ? ownerId : "")
                  .then((host) => {
                    setCreated(host);
                    setStep("install");
                  })
                  .catch((reason: Error) => {
                    const hostFailure: Record<string, string> = {
                      [apiError.unavailable]: "That connection is not available yet.",
                      [apiError.badOwner]: "Choose an account that exists.",
                      [apiError.refused]: "Check the host name.",
                    };
                    setCollectorError(hostFailure[reason.message] ?? "The dashboard did not answer.");
                  })
                  .finally(() => setPending(false));
              }}
            >
              {pending ? "Adding host" : "Continue"}
            </Button>
          </div>
        </div>
      ) : null}

      {step === "install" && created ? (
        <div className="mt-8 grid gap-6">
          {mode === "admin" ? (
            <div>
              <h2 className="text-2xl font-bold">{created.label} is on {ownerEmail || "the account"}.</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {ownerEmail || "That account"} opens Hosts and copies the install lines onto the server.
              </p>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold">{created.label} is ready.</h2>
              <HostInstall hostId={created.id} secret={created.ingest_secret ?? ""} collector={created.collector} />
            </div>
          )}
          <Button
            type="button"
            onClick={() => {
              setArrived(null);
              setCheckError(false);
              setStep("check");
            }}
          >
            Check
          </Button>
        </div>
      ) : null}

      {step === "check" && created ? (
        <div className="mt-8 grid gap-6">
          <div>
            <h2 className="text-2xl font-bold">{arrived && arrived.length > 0 ? "Requests are arriving." : "Waiting for the first request."}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Open the site. This step finishes when its name arrives from the Host header. A missing file or an error is sent at once. Ordinary pages are a sample.
            </p>
          </div>
          <div className="min-h-5">
            {checkError ? <p className="text-sm text-destructive">The host list did not answer.</p> : null}
            {!checkError && arrived === null ? <p className="text-sm text-muted-foreground">Reading the host.</p> : null}
            {!checkError && arrived && arrived.length === 0 ? <p className="text-sm text-muted-foreground">No request yet.</p> : null}
            {!checkError && arrived && arrived.length > 0 ? (
              <ul className="grid gap-1">
                {arrived.map((site) => (
                  <li key={site.name} className="font-mono text-sm text-cyber-green">
                    {site.name}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep("install")}>
              Back
            </Button>
            <Button type="button" disabled={!arrived || arrived.length === 0} onClick={onDone}>
              Done
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
