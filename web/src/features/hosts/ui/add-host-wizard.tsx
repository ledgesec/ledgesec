"use client";

import { useState } from "react";
import { createHost, type HostRecord } from "@/features/hosts/api";
import { hostCollectorSchema, hostLabelSchema } from "@/features/hosts/schema";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

const steps = [
  { id: "name", label: "Name" },
  { id: "connection", label: "Connection" },
  { id: "install", label: "Install" },
] as const;

const methods = [
  { id: "nginx", title: "Nginx", detail: "OpenResty module on the server.", available: true },
  { id: "dns", title: "DNS", detail: "Send traffic through the edge.", available: false },
  { id: "linux", title: "Linux daemon", detail: "A separate process that already knows where to look.", available: false },
  { id: "apache", title: "Apache", detail: "Apache module on the server.", available: false },
] as const;

type Step = (typeof steps)[number]["id"];

export function AddHostWizard({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>("name");
  const [label, setLabel] = useState("");
  const [labelError, setLabelError] = useState("");
  const [collector, setCollector] = useState("nginx");
  const [collectorError, setCollectorError] = useState("");
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState<HostRecord | null>(null);
  const index = steps.findIndex((item) => item.id === step);

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
            if (!parsed.success) {
              setLabelError(parsed.error.flatten().fieldErrors.label?.[0] ?? "");
              return;
            }
            setLabel(parsed.data.label);
            setLabelError("");
            setStep("connection");
          }}
        >
          <div>
            <h2 className="text-2xl font-bold">Name this host.</h2>
            <p className="mt-2 text-sm text-muted-foreground">One server can carry many sites. Their names show up from the requests.</p>
          </div>
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
            <p className="mt-2 text-sm text-muted-foreground">Nginx is available. The other connections stay in the list until they can be turned on.</p>
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
                createHost(label, parsed.data.collector)
                  .then((host) => {
                    setCreated(host);
                    setStep("install");
                  })
                  .catch((reason: Error) => {
                    setCollectorError(
                      reason.message === "unavailable"
                        ? "That connection is not available yet."
                        : reason.message === "refused"
                          ? "Check the host name."
                          : "The dashboard did not answer.",
                    );
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
          <div>
            <h2 className="text-2xl font-bold">{created.label} is ready.</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Put this host id in the module. Each request’s Host header becomes a site under this host. Turn off any site you do not want to monitor.
            </p>
          </div>
          <pre className="overflow-x-auto rounded-lg border border-cyber-cyan/15 bg-black/40 p-4 font-mono text-xs leading-6 text-cyber-cyan">
            {`LEDGESEC_SITE_ID=${created.id}\nLEDGESEC_INGEST_SECRET=<same secret as the API>`}
          </pre>
          <p className="text-sm text-muted-foreground">
            Country is read on the API from a local database when the batch arrives. The visitor request does not look it up. Without that file the country stays empty.
          </p>
          <Button type="button" onClick={onDone}>
            Done
          </Button>
        </div>
      ) : null}
    </section>
  );
}
