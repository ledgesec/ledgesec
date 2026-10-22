"use client";

import { useEffect, useState } from "react";
import { Filter, Search } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { ALL, FILTERS, FIND_LIMIT, FIND_WAIT_MS, SEARCH } from "@/widgets/table-tools/query";

export type FieldFilter = {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
};

export function useHeld(value: string, wait = FIND_WAIT_MS) {
  const [held, setHeld] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setHeld(value), wait);
    return () => window.clearTimeout(timer);
  }, [value, wait]);
  return held;
}

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
            className="pl-8"
            onChange={(event) => onQuery(event.target.value)}
          />
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
            <label key={filter.id} className="flex flex-col gap-1 text-xs text-muted-foreground">
              {filter.label}
              <select
                aria-label={filter.label}
                value={filter.value}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm text-foreground"
                onChange={(event) => filter.onChange(event.target.value)}
              >
                <option value="">{ALL}</option>
                {filter.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
