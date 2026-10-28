import { pathMarker } from "@/entities/observation/model";
import { EXAMPLE_PROBES, EXAMPLE_SITE } from "@/fsd/pages/home/examples";
import { COLUMN_METHOD, COLUMN_STATUS, COLUMN_TIME, COLUMN_USER_AGENT } from "@/shared/lib/columns";
import { Badge } from "@/shared/ui/badge";
import { CountryMark } from "@/shared/ui/country-mark";
import { FIELD_COUNTRY, FIELD_PATH } from "@/widgets/table-tools/query";

export function ProbeHistory() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
        <caption className="sr-only">
          Example probe requests for {EXAMPLE_SITE}
        </caption>
        <thead>
          <tr className="border-b border-border text-xs tracking-[0.08em] text-muted-foreground uppercase">
            <th className="py-2 pr-4 font-medium">{COLUMN_TIME}</th>
            <th className="py-2 pr-4 font-medium">{FIELD_COUNTRY}</th>
            <th className="py-2 pr-4 font-medium">{COLUMN_USER_AGENT}</th>
            <th className="py-2 pr-4 font-medium">{COLUMN_METHOD}</th>
            <th className="py-2 pr-4 font-medium">{COLUMN_STATUS}</th>
            <th className="py-2 font-medium">{FIELD_PATH}</th>
          </tr>
        </thead>
        <tbody>
          {EXAMPLE_PROBES.map((row) => {
            const marker = pathMarker(row.path);
            return (
              <tr key={`${row.ts}-${row.path}`} className="border-b border-border align-top">
                <td className="py-3 pr-4 font-mono text-xs whitespace-nowrap">{row.ts}</td>
                <td className="py-3 pr-4">
                  <CountryMark code={row.country} />
                </td>
                <td className="max-w-xs py-3 pr-4 font-mono text-xs">{row.ua}</td>
                <td className="py-3 pr-4 font-mono text-xs">{row.method}</td>
                <td className="py-3 pr-4 font-mono text-xs">{row.status}</td>
                <td className="py-3">
                  {marker ? (
                    <Badge variant="destructive" className="mr-2">
                      {marker.label}
                    </Badge>
                  ) : null}
                  <span className="font-mono text-xs">{row.path}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
