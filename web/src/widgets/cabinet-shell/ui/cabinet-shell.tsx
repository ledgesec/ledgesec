"use client";

import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Globe, LayoutDashboard, LogOut, Radio, ScanSearch, ScrollText, Server, ShieldAlert } from "lucide-react";
import { Button } from "@/shared/ui/button";

export type CabinetSection = "overview" | "probes" | "requests" | "addresses" | "sites" | "hosts";

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
  onSection,
  onSignOut,
  children,
}: {
  mode: "client" | "admin";
  email: string;
  section: CabinetSection;
  onSection: (section: CabinetSection) => void;
  onSignOut: () => void;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const nav = items.filter((item) => mode === "admin" || !item.admin);
  const width = collapsed ? "lg:w-20" : "lg:w-[280px]";
  const pad = collapsed ? "lg:pl-20" : "lg:pl-[280px]";

  return (
    <div className="cabinet flex min-h-screen w-full flex-1">
      <aside className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-cyber-cyan/10 bg-cyber-black lg:flex ${width}`}>
        <div className="flex items-center justify-between gap-2 border-b border-cyber-cyan/10 p-4">
          <div className={`flex items-center gap-3 ${collapsed ? "w-full justify-center" : ""}`}>
            <ShieldAlert className="size-8 shrink-0 text-cyber-cyan" />
            {collapsed ? null : (
              <span className="min-w-0">
                <span className="block text-xl font-bold">Ledgesec</span>
                <VersionMark />
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </Button>
        </div>
        <Nav nav={nav} section={section} onSection={onSection} collapsed={collapsed} />
        <SignOut onSignOut={onSignOut} collapsed={collapsed} />
      </aside>
      <div className={`flex min-w-0 flex-1 flex-col ${pad}`}>
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-cyber-cyan/10 bg-cyber-black/80 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <ShieldAlert className="size-5 text-cyber-cyan" />
            <span className="font-bold">Ledgesec</span>
            <VersionMark />
          </div>
          <p className="hidden text-sm text-muted-foreground lg:block">{mode === "admin" ? "Admin cabinet" : "Site cabinet"}</p>
          <p className="truncate font-mono text-xs text-cyber-cyan">{email}</p>
        </header>
        <nav className="flex gap-2 overflow-x-auto border-b border-cyber-cyan/10 px-4 py-3 lg:hidden">
          {nav.map((item) => (
            <SectionButton key={item.id} item={item} active={section === item.id} onSection={onSection} />
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
  onSection,
  collapsed,
}: {
  nav: typeof items;
  section: CabinetSection;
  onSection: (section: CabinetSection) => void;
  collapsed: boolean;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      <div className={`mb-4 rounded-xl border border-cyber-green/20 bg-cyber-green/10 p-3 ${collapsed ? "px-2" : ""}`}>
        <div className="flex items-center gap-2">
          <span className="size-2 animate-pulse rounded-full bg-cyber-green shadow-[0_0_12px_rgb(0_255_136/0.8)]" />
          {collapsed ? null : <span className="text-xs font-semibold text-cyber-green">OBSERVE</span>}
        </div>
      </div>
      {nav.map((item) => (
        <SectionButton key={item.id} item={item} active={section === item.id} onSection={onSection} collapsed={collapsed} />
      ))}
    </nav>
  );
}

function SectionButton({
  item,
  active,
  onSection,
  collapsed = false,
}: {
  item: (typeof items)[number];
  active: boolean;
  onSection: (section: CabinetSection) => void;
  collapsed?: boolean;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={() => onSection(item.id)}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
        active
          ? "border border-cyber-cyan/20 bg-cyber-cyan/10 text-cyber-cyan"
          : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
      }`}
    >
      <Icon className="size-5 shrink-0" />
      {collapsed ? null : item.label}
    </button>
  );
}

function VersionMark({ className = "" }: { className?: string }) {
  const version = process.env.NEXT_PUBLIC_LEDGESEC_VERSION ?? "";
  if (version === "") return null;
  return <p className={`font-mono text-xs text-muted-foreground ${className}`}>v{version}</p>;
}

function SignOut({ onSignOut, collapsed }: { onSignOut: () => void; collapsed: boolean }) {
  return (
    <div className="border-t border-cyber-dark/50 p-3">
      {collapsed ? <VersionMark className="mb-2 text-center" /> : null}
      <button
        type="button"
        onClick={onSignOut}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-cyber-red/10 hover:text-cyber-red"
      >
        <LogOut className="size-5" />
        {collapsed ? null : "Sign out"}
      </button>
    </div>
  );
}
