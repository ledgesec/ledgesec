import { adminHref, dashboardHref, type Surface } from "./hosts.ts";
import { ADMIN, CLIENT, type CabinetMode } from "./role.ts";

export const OVERVIEW = "overview";
export const PROBES = "probes";
export const REQUESTS = "requests";
export const ADDRESSES = "addresses";
export const SITES = "sites";
export const HOSTS = "hosts";

export const REQUEST_IP = "ip";
export const REQUEST_PATH = "path";

const CLIENT_TABS = [PROBES, REQUESTS, SITES, HOSTS] as const;
const ADMIN_TABS = [PROBES, REQUESTS, ADDRESSES, SITES, HOSTS] as const;

export const CABINET_SECTIONS = [OVERVIEW, PROBES, REQUESTS, ADDRESSES, SITES, HOSTS] as const;
export type CabinetSection = (typeof CABINET_SECTIONS)[number];

export function cabinetRoot(mode: CabinetMode): string {
  return mode === ADMIN ? "/admin" : "/dashboard";
}

export function tabsFor(mode: CabinetMode): readonly CabinetSection[] {
  return mode === ADMIN ? ADMIN_TABS : CLIENT_TABS;
}

export function sectionFromParts(parts: string[] | undefined, mode: CabinetMode): CabinetSection | null {
  if (!parts || parts.length === 0) return OVERVIEW;
  if (parts.length !== 1) return null;
  const name = parts[0];
  if (!tabsFor(mode).includes(name as CabinetSection)) return null;
  return name as CabinetSection;
}

export function sectionOfPath(pathname: string, mode: CabinetMode): CabinetSection {
  const parts = pathname.split("/").filter(Boolean);
  const root = cabinetRoot(mode).slice(1);
  if (parts[0] === root) parts.shift();
  return sectionFromParts(parts, mode) ?? OVERVIEW;
}

export function sectionHref(host: string, mode: CabinetMode, section: CabinetSection): string {
  const home = mode === ADMIN ? adminHref(host) : dashboardHref(host);
  if (section === OVERVIEW) return home;
  if (home === "/") return `/${section}`;
  return `${home}/${section}`;
}

export function requestHref(host: string, mode: CabinetMode, ip: string, path: string): string {
  const params = new URLSearchParams();
  if (ip) params.set(REQUEST_IP, ip);
  if (path) params.set(REQUEST_PATH, path);
  const base = sectionHref(host, mode, REQUESTS);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export function cabinetRewrite(surface: Surface, pathname: string): string | null {
  if (surface === "site" || pathname.startsWith("/_next") || pathname.startsWith("/api")) return null;
  const mode = surface === ADMIN ? ADMIN : CLIENT;
  const root = cabinetRoot(mode);
  if (pathname === root || pathname.startsWith(`${root}/`)) return null;
  const section = sectionFromParts(pathname.split("/").filter(Boolean), mode);
  if (section && section !== OVERVIEW) return `${root}/${section}`;
  return root;
}
