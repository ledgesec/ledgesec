"use client";

import { Menu } from "@base-ui/react/menu";
import { Check, Columns3 } from "lucide-react";
import { useRef, useSyncExternalStore, type ReactNode } from "react";
import {
  COLUMNS,
  type ColumnDefault,
  type ColumnPref,
  columnBox,
  columnPrefs,
  columnTableStyle,
  resizeColumn,
  resizeColumnLabel,
  tableWidth,
  toggleColumn,
  visibleColumns,
} from "@/shared/lib/columns";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { Table, TableCell, TableHead, TableRow } from "@/shared/ui/table";

const STORAGE = "ledgesec.columns";
const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; prefs: ColumnPref[] | null }>();

function parsePrefs(raw: string | null): ColumnPref[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as { id?: unknown; width?: unknown; hidden?: unknown };
      if (typeof row.id !== "string" || typeof row.width !== "number") return [];
      return [{ id: row.id, width: row.width, hidden: row.hidden === true }];
    });
  } catch {
    return null;
  }
}

function readSnapshot(tableId: string) {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(`${STORAGE}.${tableId}`);
  } catch {
    raw = null;
  }
  const known = cache.get(tableId);
  if (known && known.raw === raw) return known.prefs;
  const prefs = parsePrefs(raw);
  cache.set(tableId, { raw, prefs });
  return prefs;
}

function writePrefs(tableId: string, columns: ColumnPref[]) {
  const raw = JSON.stringify(columns);
  try {
    window.localStorage.setItem(`${STORAGE}.${tableId}`, raw);
  } catch {
    // The browser refused storage. The table still keeps this width until reload.
  }
  cache.set(tableId, { raw, prefs: columns });
  listeners.forEach((listener) => listener());
}

function subscribeColumns(listener: () => void) {
  listeners.add(listener);
  const onStorage = () => {
    cache.clear();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useColumnLayout(tableId: string, defaults: ColumnDefault[]) {
  const saved = useSyncExternalStore(subscribeColumns, () => readSnapshot(tableId), () => null);
  const columns = columnPrefs(defaults, saved);
  function commit(next: ColumnPref[]) {
    writePrefs(tableId, next);
  }
  return {
    columns,
    width: tableWidth(columns),
    open(id: string) {
      return visibleColumns(columns).some((column) => column.id === id);
    },
    size(id: string) {
      return columns.find((column) => column.id === id)?.width ?? defaults.find((column) => column.id === id)?.width ?? 0;
    },
    toggle(id: string) {
      commit(toggleColumn(columns, id));
    },
    resize(id: string, width: number) {
      commit(resizeColumn(columns, id, width));
    },
  };
}

export function ColumnSettings({
  columns,
  labels,
  onToggle,
}: {
  columns: ColumnPref[];
  labels: ColumnDefault[];
  onToggle: (id: string) => void;
}) {
  const shown = visibleColumns(columns);
  const locked = shown.length <= 1 ? shown[0]?.id : "";
  return (
    <div className="mb-3 flex justify-end">
      <Menu.Root>
        <Menu.Trigger render={<Button variant="outline" size="sm" />}>
          <Columns3 className="size-4" />
          {COLUMNS}
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="end" sideOffset={6} className="z-50">
            <Menu.Popup className="min-w-48 rounded-lg border border-cyber-cyan/20 bg-cyber-navy p-1 text-sm text-slate-50 shadow-xl outline-none">
              {labels.map((column) => {
                const pref = columns.find((item) => item.id === column.id);
                const hidden = pref?.hidden === true;
                return (
                  <Menu.Item
                    key={column.id}
                    closeOnClick={false}
                    disabled={locked === column.id}
                    label={column.label}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-slate-50 outline-none data-disabled:opacity-50 data-highlighted:bg-cyber-cyan/15"
                    onClick={() => onToggle(column.id)}
                  >
                    <span className="flex size-4 items-center justify-center text-cyber-cyan">
                      {hidden ? null : <Check className="size-3.5" />}
                    </span>
                    {column.label}
                  </Menu.Item>
                );
              })}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}

export function ColumnHead({
  label,
  width,
  basis,
  onResize,
  className,
  children,
}: {
  label: string;
  width: number;
  basis: number;
  onResize: (width: number) => void;
  className?: string;
  children?: ReactNode;
}) {
  const drag = useRef<{ x: number; width: number } | null>(null);
  return (
    <TableHead className={`relative ${className ?? ""}`} style={columnBox(width)}>
      <span className="inline-flex max-w-full min-w-0 items-center gap-1 overflow-hidden">{children ?? label}</span>
      <span
        role="separator"
        aria-orientation="vertical"
        aria-label={resizeColumnLabel(label)}
        tabIndex={0}
        className="absolute top-0 right-0 z-20 h-full w-2 cursor-col-resize touch-none hover:bg-cyber-cyan/70"
        onPointerDown={(event) => {
          event.preventDefault();
          drag.current = { x: event.clientX, width };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          onResize(drag.current.width + event.clientX - drag.current.x);
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onDoubleClick={() => onResize(basis)}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") onResize(width + 16);
          if (event.key === "ArrowLeft") onResize(width - 16);
        }}
      />
    </TableHead>
  );
}

export function ColumnCell({ width, className, children }: { width: number; className?: string; children?: ReactNode }) {
  return (
    <TableCell className={`overflow-hidden ${className ?? ""}`} style={columnBox(width)}>
      {children}
    </TableCell>
  );
}

export function ColumnTable({ width, children }: { width: number; children: ReactNode }) {
  return (
    <Table className="table-fixed" style={columnTableStyle(width)}>
      {children}
    </Table>
  );
}

export function ColumnSkeleton({ columns, rows }: { columns: ColumnPref[]; rows: number }) {
  const shown = visibleColumns(columns);
  return Array.from({ length: rows }, (_, index) => (
    <TableRow key={index}>
      {shown.map((column) => (
        <TableCell key={column.id} style={columnBox(column.width)}>
          <Skeleton className="h-3 w-full" />
        </TableCell>
      ))}
    </TableRow>
  ));
}
