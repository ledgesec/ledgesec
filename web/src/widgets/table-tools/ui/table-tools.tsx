"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter, Search, X } from "lucide-react";
import { CountryMark } from "@/shared/ui/country-mark";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { SelectField } from "@/shared/ui/select";
import { ALL, CLEAR, COUNTRY, FILTERS, FIND_LIMIT, FIND_WAIT_MS, SEARCH, hrefWithParams, searchHeld } from "@/widgets/table-tools/query";

export const TABLE_HOLD = "pointer-events-none opacity-60 transition-opacity";

export function HoldRegion({ held, children }: { held: boolean; children: ReactNode }) {
  return (
    <div className={held ? TABLE_HOLD : undefined} aria-busy={held ? true : undefined}>
      {children}
    </div>
  );
}

export function useField(name: string, wait = FIND_WAIT_MS) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const stored = (params.get(name) ?? "").slice(0, FIND_LIMIT);
  const [draft, setDraft] = useState(stored);
  const pending = useRef<string | null>(null);
  const timer = useRef<number | null>(null);
  const route = useRef({ pathname, params, router, stored, name });

  useEffect(() => {
    route.current = { pathname, params, router, stored, name };
  }, [pathname, params, router, stored, name]);

  useEffect(() => {
    if (pending.current !== null) return;
    setDraft(stored);
  }, [stored]);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  function flush() {
    timer.current = null;
    const text = pending.current;
    if (text === null) return;
    const current = route.current;
    if (text === current.stored || (text.trim() === "" && current.stored === "")) {
      pending.current = null;
      return;
    }
    pending.current = null;
    current.router.replace(hrefWithParams(current.pathname, current.params, { [current.name]: text }), { scroll: false });
  }

  function setValue(next: string) {
    const text = next.slice(0, FIND_LIMIT);
    setDraft(text);
    const current = route.current;
    if (text === current.stored || (text.trim() === "" && current.stored === "")) {
      pending.current = null;
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
      return;
    }
    pending.current = text;
    if (wait <= 0) {
      flush();
      return;
    }
    if (timer.current !== null) return;
    timer.current = window.setTimeout(flush, wait);
  }

  return [draft, setValue, stored, searchHeld(draft, stored, wait)] as const;
}

export type FieldFilter = {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
};

export function TableTools({
  query,
  onQuery,
  filters,
}: {
  query: string;
  onQuery: (value: string) => void;
  filters: FieldFilter[];
}) {
  const [open, setOpen] = useState(false);
  const shown = filters.filter((filter) => filter.options.length > 0);
  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={SEARCH}
            placeholder={SEARCH}
            value={query}
            maxLength={FIND_LIMIT}
            className={query === "" ? "pl-8" : "pr-8 pl-8"}
            onChange={(event) => onQuery(event.target.value)}
          />
          {query === "" ? null : (
            <button
              type="button"
              aria-label={CLEAR}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => onQuery("")}
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        {shown.length > 0 ? (
          <Button type="button" variant="outline" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
            <Filter className="size-4" />
            {FILTERS}
          </Button>
        ) : null}
      </div>
      {open && shown.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {shown.map((filter) => (
            <label key={filter.id} className="flex min-w-40 flex-col gap-1 text-xs text-muted-foreground">
              {filter.label}
              <SelectField
                label={filter.label}
                value={filter.value}
                onValueChange={filter.onChange}
                options={[
                  { value: "", label: ALL },
                  ...filter.options.map((option) => ({
                    value: option,
                    label: filter.id === COUNTRY ? <CountryMark code={option} /> : option,
                  })),
                ]}
              />
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
