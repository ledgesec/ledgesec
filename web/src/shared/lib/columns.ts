export const COLUMNS = "Columns";

export const COLUMN_TIME = "Time";
export const COLUMN_METHOD = "Method";
export const COLUMN_STATUS = "Status";
export const COLUMN_USER_AGENT = "User agent";
export const COLUMN_TOOK = "Took";
export const COLUMN_ADDRESS = "Address";
export const COLUMN_REQUESTS = "Requests";
export const COLUMN_EDGES = "Edges";
export const COLUMN_PROBES = "Probes";
export const COLUMN_LAST_PROBE = "Last probe";
export const COLUMN_SITES = "Sites";
export const COLUMN_LAST_SEEN = "Last seen";
export const COLUMN_ACTIONS = "Actions";
export const COLUMN_RPS = "RPS";
export const COLUMN_AVERAGE = "Average";
export const COLUMN_MAX = "Max";

export const MIN_COLUMN_WIDTH = 72;
export const MAX_COLUMN_WIDTH = 640;

export const TABLE_REQUESTS = "requests";
export const TABLE_ADDRESSES = "addresses";
export const TABLE_SITES = "sites";
export const TABLE_SLOW = "slow";

export type ColumnDefault = { id: string; label: string; width: number };
export type ColumnPref = { id: string; width: number; hidden: boolean };

export function clampWidth(width: number) {
  if (!Number.isFinite(width)) return MIN_COLUMN_WIDTH;
  return Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, Math.round(width)));
}

export function columnPrefs(defaults: ColumnDefault[], saved: ColumnPref[] | null): ColumnPref[] {
  const columns = defaults.map((column) => {
    const known = saved?.find((item) => item.id === column.id);
    return {
      id: column.id,
      width: clampWidth(known?.width ?? column.width),
      hidden: known?.hidden === true,
    };
  });
  if (columns.length > 0 && columns.every((column) => column.hidden)) columns[0] = { ...columns[0], hidden: false };
  return columns;
}

export function visibleColumns(columns: ColumnPref[]) {
  const shown = columns.filter((column) => !column.hidden);
  return shown.length > 0 ? shown : columns.slice(0, 1);
}

export function toggleColumn(columns: ColumnPref[], id: string) {
  const target = columns.find((column) => column.id === id);
  if (!target) return columns;
  if (!target.hidden && visibleColumns(columns).length <= 1) return columns;
  return columns.map((column) => (column.id === id ? { ...column, hidden: !column.hidden } : column));
}

export function resizeColumn(columns: ColumnPref[], id: string, width: number) {
  return columns.map((column) => (column.id === id ? { ...column, width: clampWidth(width) } : column));
}

export function tableWidth(columns: ColumnPref[]) {
  return visibleColumns(columns).reduce((sum, column) => sum + column.width, 0);
}

export function resizeColumnLabel(name: string) {
  return `Resize ${name}`;
}

export function columnBox(width: number) {
  return { width, maxWidth: width };
}

export function columnTableStyle(width: number) {
  return { width, minWidth: width, tableLayout: "fixed" as const };
}
