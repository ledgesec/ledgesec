"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import { useState } from "react";
import type { AddressRow } from "@/entities/observation/model";
import { Badge } from "@/shared/ui/badge";
import { CountryMark } from "@/shared/ui/country-mark";
import { Button } from "@/shared/ui/button";
import { ADDRESS_ACTIONS, requestCount } from "@/widgets/address-panel/actions";

const itemClass =
  "block w-full rounded-md px-2 py-1.5 text-left outline-none data-highlighted:bg-cyber-cyan/10 data-disabled:cursor-not-allowed data-disabled:opacity-60";

export function AddressActions({ row, onRequests }: { row: AddressRow; onRequests: (ip: string) => void }) {
  const [details, setDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const look = ADDRESS_ACTIONS.filter((action) => action.group === "look");
  const keep = ADDRESS_ACTIONS.filter((action) => action.group === "keep");
  const decide = ADDRESS_ACTIONS.filter((action) => action.group === "decide");

  function choose(id: (typeof ADDRESS_ACTIONS)[number]["id"]) {
    if (id === "details") setDetails(true);
    if (id === "requests") onRequests(row.ip);
    if (id === "copy") {
      navigator.clipboard.writeText(row.ip).then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      });
    }
  }

  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          render={<Button variant="outline" size="sm" />}
          aria-label={`Actions for ${row.ip}`}
        >
          {copied ? "Copied" : "Actions"}
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side="left" align="start" sideOffset={8} className="z-50">
            <Menu.Popup className="min-w-64 rounded-lg border border-cyber-cyan/20 bg-cyber-navy p-1 text-sm text-foreground shadow-xl outline-none">
              <Menu.Group>
                <Menu.GroupLabel className="px-2 pt-2 pb-1 text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
                  Look
                </Menu.GroupLabel>
                {look.map((action) => (
                  <Menu.Item key={action.id} className={itemClass} onClick={() => choose(action.id)}>
                    <span className="block">{action.label}</span>
                    <span className="block text-xs text-muted-foreground">{action.hint}</span>
                  </Menu.Item>
                ))}
              </Menu.Group>
              <Menu.Separator className="my-1 h-px bg-cyber-cyan/15" />
              {keep.map((action) => (
                <Menu.Item key={action.id} className={itemClass} onClick={() => choose(action.id)}>
                  <span className="block">{action.label}</span>
                  <span className="block text-xs text-muted-foreground">{action.hint}</span>
                </Menu.Item>
              ))}
              <Menu.Separator className="my-1 h-px bg-cyber-cyan/15" />
              <Menu.Group>
                <Menu.GroupLabel className="px-2 pt-2 pb-1 text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
                  Decide
                </Menu.GroupLabel>
                {decide.map((action) => (
                  <Menu.Item key={action.id} className={itemClass} disabled>
                    <span className="block">{action.label}</span>
                    <span className="block text-xs text-muted-foreground">{action.hint}</span>
                  </Menu.Item>
                ))}
              </Menu.Group>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      <AddressDetails row={row} open={details} onOpenChange={setDetails} />
    </>
  );
}

function AddressDetails({
  row,
  open,
  onOpenChange,
}: {
  row: AddressRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const edges = Object.keys(row.edges)
    .sort()
    .map((name) => `${name} ${row.edges[name]}`)
    .join(" · ");
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/70" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-cyber-cyan/20 bg-cyber-navy p-6 text-foreground shadow-2xl outline-none">
          <p className="text-xs tracking-[0.08em] text-cyber-cyan uppercase">Address</p>
          <Dialog.Title className="mt-2 font-mono text-2xl text-foreground">{row.ip}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">
            Recorded in the journal. The request went through to the site.
          </Dialog.Description>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground uppercase">Requests</dt>
              <dd className="mt-1 font-mono text-cyber-cyan">{requestCount(row.edges)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase">Probes</dt>
              <dd className="mt-1 font-mono text-cyber-cyan">{row.probes}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase">Country</dt>
              <dd className="mt-1">{row.country ? <CountryMark code={row.country} /> : "—"}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-muted-foreground uppercase">User agent</dt>
              <dd className="mt-1 font-mono text-xs break-all">{row.ua || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase">Last seen</dt>
              <dd className="mt-1 font-mono text-xs">{row.lastTs ? row.lastTs.replace(".000000Z", "Z") : "—"}</dd>
            </div>
          </dl>
          <p className="mt-5 text-xs text-muted-foreground uppercase">Edges</p>
          <p className="mt-1 text-sm">{edges || "—"}</p>
          <p className="mt-4 text-xs text-muted-foreground uppercase">Sites</p>
          <p className="mt-1 text-sm">{row.sites.join(", ") || "—"}</p>
          {row.probePath ? (
            <p className="mt-4 inline-flex items-center gap-2">
              <Badge variant="destructive">{row.probeLabel}</Badge>
              <span className="font-mono text-xs">{row.probePath}</span>
            </p>
          ) : null}
          {row.paths.length > 0 ? (
            <>
              <p className="mt-4 text-xs text-muted-foreground uppercase">Paths</p>
              <ul className="mt-1 space-y-1">
                {row.paths.map((path) => (
                  <li key={path} className="font-mono text-xs">
                    {path}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <Dialog.Close className="mt-6 text-sm text-cyber-cyan">Close</Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
