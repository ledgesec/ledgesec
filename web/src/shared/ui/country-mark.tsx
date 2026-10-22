import * as flags from "country-flag-icons/react/3x2";
import type { ComponentType, SVGProps } from "react";
import { FindText } from "@/shared/ui/find-text";
import { countryName } from "@/widgets/world-map/places";

const FLAG = flags as unknown as Record<string, ComponentType<SVGProps<SVGSVGElement>>>;

export function CountryMark({ code, find = "" }: { code: string; find?: string }) {
  const mark = code.trim().toUpperCase();
  const name = countryName(mark) || mark;
  const Flag = FLAG[mark];
  return (
    <span className="inline-flex items-center gap-1.5" title={name}>
      {Flag ? (
        <Flag role="img" aria-label={name} className="h-3.5 w-5 shrink-0 rounded-[2px] ring-1 ring-white/15" />
      ) : null}
      <span className="font-mono text-xs">{find.trim() === "" ? mark : <FindText text={mark} query={find} />}</span>
    </span>
  );
}
