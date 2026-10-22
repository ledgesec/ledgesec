export const FIND_LIMIT = 200;
export const FIND_WAIT_MS = 300;

export const SEARCH = "Search";
export const FILTERS = "Filters";
export const ALL = "All";
export const NO_MATCH = "Nothing matches.";
export const FIELD_SITE = "Site";
export const FIELD_COUNTRY = "Country";
export const FIELD_EDGE = "Edge";
export const FIELD_LABEL = "Label";

export const QUERY = "q";
export const SITE = "site";
export const COUNTRY = "country";
export const EDGE = "edge";

export type JournalFields = { q: string; site: string; country: string; edge: string };

export const BLANK_FIELDS: JournalFields = { q: "", site: "", country: "", edge: "" };

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
