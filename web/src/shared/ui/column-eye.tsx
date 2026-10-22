"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { hideColumn, showColumn } from "@/shared/lib/mask";

export function useColumnMask() {
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  function toggle(column: string) {
    setHidden((current) => ({ ...current, [column]: !current[column] }));
  }
  function isHidden(column: string) {
    return hidden[column] === true;
  }
  return { isHidden, toggle };
}

export function ColumnEye({ column, hidden, onToggle }: { column: string; hidden: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={hidden}
      aria-label={hidden ? showColumn(column) : hideColumn(column)}
      onClick={onToggle}
      className="rounded p-0.5 text-white/40 transition-colors hover:text-white"
    >
      {hidden ? <EyeOff className="size-3.5" aria-hidden /> : <Eye className="size-3.5" aria-hidden />}
    </button>
  );
}
