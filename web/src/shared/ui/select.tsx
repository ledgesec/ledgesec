"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "cn";

export type SelectChoice = { value: string; label: ReactNode };

export function SelectField({
  value,
  onValueChange,
  options,
  label,
  placeholder,
  name,
  disabled,
  invalid,
  describedBy,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectChoice[];
  label: string;
  placeholder?: string;
  name?: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
}) {
  const selected = options.some((option) => option.value === value) ? value : null;
  return (
    <SelectPrimitive.Root
      name={name}
      items={options}
      value={selected}
      disabled={disabled}
      modal={false}
      onValueChange={(next) => onValueChange(next ?? "")}
    >
      <SelectPrimitive.Trigger
        aria-label={label}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn(
          "flex h-8 w-full min-w-36 items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-popup-open:border-cyber-cyan dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} className="truncate" />
        <SelectPrimitive.Icon className="text-muted-foreground">
          <ChevronDown className="size-4" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner sideOffset={6} className="z-50">
          <SelectPrimitive.Popup className="max-h-60 min-w-[var(--anchor-width)] overflow-y-auto rounded-lg border border-cyber-cyan/20 bg-cyber-navy p-1 text-sm text-slate-50 shadow-xl outline-none">
            <SelectPrimitive.List className="outline-none">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value || placeholder || label}
                  value={option.value}
                  className="relative flex cursor-default items-center gap-2 rounded-md py-1.5 pr-2 pl-7 text-slate-50 outline-none select-none data-highlighted:bg-cyber-cyan/15 data-disabled:opacity-50"
                >
                  <SelectPrimitive.ItemIndicator className="absolute left-2 flex items-center text-cyber-cyan">
                    <Check className="size-3.5" />
                  </SelectPrimitive.ItemIndicator>
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.List>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
