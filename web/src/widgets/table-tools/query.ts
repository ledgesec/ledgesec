import { REQUEST_FIND } from "../../shared/lib/cabinet-section.ts";

export const FIND_LIMIT = 200;
export const FIND_WAIT_MS = 300;

export function searchHeld(draft: string, stored: string, wait: number) {
  return wait > 0 && draft !== stored;
}

export const SEARCH = "Search";
export const CLEAR = "Clear";
export const FILTERS = "Filters";
export const ALL = "All";
export const NO_MATCH = "Nothing matches.";
export const MATCHES_FOR = "Showing matches for";
export const FIELD_SITE = "Site";
export const FIELD_COUNTRY = "Country";
export const FIELD_EDGE = "Edge";
export const FIELD_PATH = "Path";
export const FIELD_LABEL = "Label";

export const QUERY = REQUEST_FIND;
export const SITE = "site";
export const COUNTRY = "country";
export const EDGE = "edge";
export const LABEL = "label";
export const SLOW = "slow";

export function hrefWithParams(pathname: string, current: { toString(): string }, patch: Record<string, string>) {
  const next = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(patch)) {
    const text = value.slice(0, FIND_LIMIT);
    if (text.trim() === "") next.delete(key);
    else next.set(key, text);
  }
  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function fieldsFrom(params: { get(name: string): string | null }, admin: boolean): JournalFields {
  return {
    q: (params.get(QUERY) ?? "").slice(0, FIND_LIMIT),
    site: (params.get(SITE) ?? "").slice(0, FIND_LIMIT),
    country: (params.get(COUNTRY) ?? "").slice(0, FIND_LIMIT),
    edge: admin ? (params.get(EDGE) ?? "").slice(0, FIND_LIMIT) : "",
  };
}

export type JournalFields = { q: string; site: string; country: string; edge: string };

export const BLANK_FIELDS: JournalFields = { q: "", site: "", country: "", edge: "" };

export function requestsAreNarrowed(fields: JournalFields, ip: string, path: string) {
  return fields.q !== "" || fields.site !== "" || fields.country !== "" || fields.edge !== "" || ip !== "" || path !== "";
}

export function journalViewKey(section: string, fields: JournalFields, ip: string, path: string) {
  return [section, fields.q, fields.site, fields.country, fields.edge, ip, path].join("\n");
}

export function keepRow(needles: string[], query: string, picked: string[], selected: string[]) {
  const needle = query.trim().toLowerCase();
  if (needle !== "" && !needles.some((field) => field.toLowerCase().includes(needle))) return false;
  return selected.every((value, index) => value === "" || picked[index] === value);
}

export function choiceList(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value !== ""))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function fieldParams(fields: JournalFields, admin: boolean) {
  const extra: Record<string, string> = {};
  const query = fields.q.trim().slice(0, FIND_LIMIT);
  if (query !== "") extra[QUERY] = query;
  if (fields.site !== "") extra[SITE] = fields.site;
  if (fields.country !== "") extra[COUNTRY] = fields.country;
  if (admin && fields.edge !== "") extra[EDGE] = fields.edge;
  return extra;
}
