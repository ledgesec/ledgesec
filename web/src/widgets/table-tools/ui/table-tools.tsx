"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter, Search } from "lucide-react";
import { CountryMark } from "@/shared/ui/country-mark";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { SelectField } from "@/shared/ui/select";
import { ALL, COUNTRY, FILTERS, FIND_LIMIT, FIND_WAIT_MS, SEARCH, hrefWithParams } from "@/widgets/table-tools/query";

export function useField(name: string, wait = FIND_WAIT_MS) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const stored = (params.get(name) ?? "").slice(0, FIND_LIMIT);
  const [draft, setDraft] = useState(stored);
  const pending = useRef<string | null>(null);

  useEffect(() => {
    if (pending.current !== null) return;
    setDraft(stored);
  }, [stored]);

  useEffect(() => {
    const text = pending.current;
    if (text === null) return;
    if (text === stored || (text.trim() === "" && stored === "")) {
      pending.current = null;
      return;
    }
    const timer = window.setTimeout(() => {
      pending.current = null;
      router.replace(hrefWithParams(pathname, params, { [name]: text }), { scroll: false });
    }, wait);
    return () => window.clearTimeout(timer);
  }, [draft, name, params, pathname, router, stored, wait]);

  function setValue(next: string) {
    const text = next.slice(0, FIND_LIMIT);
    pending.current = text;
    setDraft(text);
  }

  return [draft, setValue] as const;
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
