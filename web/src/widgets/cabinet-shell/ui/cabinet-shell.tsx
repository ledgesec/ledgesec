"use client";

import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Globe, LayoutDashboard, LogOut, Radio, ScanSearch, ScrollText, Server, ShieldAlert } from "lucide-react";
import { ADMIN, type CabinetMode } from "@/shared/lib/role";
import { Button } from "@/shared/ui/button";
import { LIVE, RECORDING, pulseCells } from "@/widgets/cabinet-shell/pulse";
import { formatRps } from "@/widgets/world-map/places";

export type CabinetSection = "overview" | "probes" | "requests" | "addresses" | "sites" | "hosts";

export type CabinetPulse = { requests: number; probes: number; rps: number };

const items: { id: CabinetSection; label: string; icon: typeof LayoutDashboard; admin?: boolean }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "probes", label: "Probes", icon: ScanSearch },
  { id: "requests", label: "Requests", icon: ScrollText },
  { id: "addresses", label: "Addresses", icon: Radio, admin: true },
  { id: "sites", label: "Sites", icon: Globe },
  { id: "hosts", label: "Hosts", icon: Server },
];

export function CabinetShell({
  mode,
  email,
  section,
  pulse,
  onSection,
  onSignOut,
  children,
}: {
  mode: CabinetMode;
  email: string;
  section: CabinetSection;
  pulse: CabinetPulse | null;
  onSection: (section: CabinetSection) => void;
  onSignOut: () => void;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const nav = items.filter((item) => mode === ADMIN || !item.admin);
  const width = collapsed ? "lg:w-20" : "lg:w-[280px]";
  const pad = collapsed ? "lg:pl-20" : "lg:pl-[280px]";

  return (
    <div className="cabinet flex min-h-screen w-full flex-1">
      <aside className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-white/5 bg-[#070b14] lg:flex ${width}`}>
        <div className={collapsed ? "flex flex-col items-center gap-2 px-2 py-4" : "flex items-center gap-3 px-4 py-5"}>
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-cyber-cyan/50 bg-cyber-cyan/10 text-cyber-cyan shadow-[0_0_18px_rgb(0_240_255/0.28)]">
            <ShieldAlert className="size-5" />
          </span>
          {collapsed ? null : (
            <span className="min-w-0 flex-1">
              <span className="block text-lg leading-none font-bold">Ledgesec</span>
              <VersionMark />
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-white/40 hover:text-white"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </Button>
        </div>
        <Nav nav={nav} section={section} pulse={pulse} onSection={onSection} collapsed={collapsed} />
        <SignOut onSignOut={onSignOut} collapsed={collapsed} />
      </aside>
      <div className={`flex min-w-0 flex-1 flex-col ${pad}`}>
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-cyber-cyan/10 bg-cyber-black/80 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <ShieldAlert className="size-5 text-cyber-cyan" />
            <span className="font-bold">Ledgesec</span>
            <VersionMark />
          </div>
          <p className="hidden text-sm text-muted-foreground lg:block">{mode === ADMIN ? "Admin cabinet" : "Site cabinet"}</p>
          <p className="truncate font-mono text-xs text-cyber-cyan">{email}</p>
        </header>
        <nav className="flex gap-2 overflow-x-auto border-b border-cyber-cyan/10 px-4 py-3 lg:hidden">
          {nav.map((item) => (
            <SectionButton key={item.id} item={item} active={section === item.id} pulse={pulse} onSection={onSection} />
          ))}
          <Button variant="ghost" size="sm" onClick={onSignOut}>
            Sign out
          </Button>
        </nav>
        <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

function Nav({
  nav,
  section,
  pulse,
  onSection,
  collapsed,
}: {
  nav: typeof items;
  section: CabinetSection;
  pulse: CabinetPulse | null;
  onSection: (section: CabinetSection) => void;
  collapsed: boolean;
}) {
  const cells = pulse ? pulseCells(pulse.requests, pulse.probes, formatRps(pulse.rps)) : null;
  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4">
      <div className={`mb-3 rounded-2xl border border-cyber-green/25 bg-gradient-to-b from-cyber-green/15 to-transparent p-3 ${collapsed ? "px-2" : ""}`}>
        <div className="flex items-center gap-2">
          <span className="size-2 shrink-0 animate-pulse rounded-full bg-cyber-green shadow-[0_0_12px_rgb(0_255_136/0.9)]" />
          {collapsed ? null : <span className="text-xs font-semibold tracking-[0.16em] text-cyber-green uppercase">{RECORDING}</span>}
        </div>
        {cells && !collapsed ? (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {cells.map((cell) => (
              <div key={cell.label} className="rounded-lg bg-black/40 px-1 py-2 text-center">
                <p className="font-mono text-sm font-semibold text-white">{cell.value}</p>
                <p className="mt-0.5 text-[10px] tracking-wide text-white/45 uppercase">{cell.label}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {nav.map((item) => (
        <SectionButton key={item.id} item={item} active={section === item.id} pulse={pulse} onSection={onSection} collapsed={collapsed} />
      ))}
    </nav>
  );
}

function SectionButton({
  item,
  active,
  pulse,
  onSection,
  collapsed = false,
}: {
  item: (typeof items)[number];
  active: boolean;
  pulse: CabinetPulse | null;
  onSection: (section: CabinetSection) => void;
  collapsed?: boolean;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={() => onSection(item.id)}
      className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
        active
          ? "border border-cyber-cyan/50 bg-cyber-cyan/10 text-white"
          : "border border-transparent text-white/70 hover:bg-white/5 hover:text-white"
      }`}
    >
      {active ? <span className="absolute top-2 bottom-2 left-0 w-1 rounded-full bg-cyber-cyan" /> : null}
      <Icon className={`size-5 shrink-0 ${active ? "text-cyber-cyan" : "text-white/45"}`} />
      {collapsed ? null : <span className="flex-1 text-left">{item.label}</span>}
      {collapsed ? null : <ItemMark item={item} active={active} pulse={pulse} />}
    </button>
  );
}

function ItemMark({
  item,
  active,
  pulse,
}: {
  item: (typeof items)[number];
  active: boolean;
  pulse: CabinetPulse | null;
}) {
  if (item.id === "overview") {
    return <span className="rounded-full bg-cyber-red px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">{LIVE}</span>;
  }
  if (item.id === "probes" && pulse && pulse.probes > 0) {
    const count = pulse.probes > 99 ? "99+" : String(pulse.probes);
    return <span className="grid h-5 min-w-5 place-items-center rounded-full bg-cyber-red px-1 text-[10px] font-bold text-white">{count}</span>;
  }
  if (active) return <span className="size-2 rounded-full bg-cyber-cyan" />;
  return null;
}

function VersionMark({ className = "" }: { className?: string }) {
  const version = process.env.NEXT_PUBLIC_LEDGESEC_VERSION ?? "";
  if (version === "") return null;
  return <p className={`font-mono text-xs text-white/35 ${className}`}>v{version}</p>;
}

function SignOut({ onSignOut, collapsed }: { onSignOut: () => void; collapsed: boolean }) {
  return (
    <div className="border-t border-white/5 p-3">
      {collapsed ? <VersionMark className="mb-2 text-center" /> : null}
      <button
        type="button"
        onClick={onSignOut}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/50 hover:bg-cyber-red/10 hover:text-cyber-red"
      >
        <LogOut className="size-5" />
        {collapsed ? null : "Sign out"}
      </button>
    </div>
  );
}
