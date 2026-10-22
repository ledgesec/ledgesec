import { LAND } from "@/widgets/world-map/land";
import { formatRps } from "@/widgets/world-map/places";

const WIDTH = 1000;
const HEIGHT = 500;

export function WorldMap({ countries }: { countries: { code: string; requests: number }[] }) {
  const counts = new Map(countries.map((country) => [country.code, country.requests]));
  const max = Math.max(1, ...counts.values());
  const lines = [30, 60, 90, 120, 150];
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="World map" className="h-auto w-full">
      <defs>
        <filter id="country-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width={WIDTH} height={HEIGHT} className="fill-cyber-black" />
      {lines.map((step) => (
        <g key={step} className="stroke-cyber-cyan/10">
          <line x1={(step / 180) * WIDTH} y1={0} x2={(step / 180) * WIDTH} y2={HEIGHT} />
          <line x1={0} y1={(step / 180) * HEIGHT} x2={WIDTH} y2={(step / 180) * HEIGHT} />
        </g>
      ))}
      {LAND.map((place) => {
        const requests = place.code === "" ? 0 : (counts.get(place.code) ?? 0);
        return (
          <path
            key={place.name}
            d={place.d}
            fill="#00f0ff"
            fillOpacity={requests === 0 ? 0.16 : 0.4 + 0.6 * (requests / max)}
            stroke="#9cfbff"
            strokeOpacity={requests === 0 ? 0.28 : 0.95}
            strokeWidth={0.6}
            filter={requests === 0 ? undefined : "url(#country-glow)"}
          >
            <title>{`${place.name} ${requests}`}</title>
          </path>
        );
      })}
    </svg>
  );
}

export function DomainRates({
  rps,
  domains,
}: {
  rps: number;
  domains: { name: string; requests: number; rps: number }[];
}) {
  return (
    <div>
      <p className="text-xs tracking-[0.08em] text-muted-foreground uppercase">Requests per second</p>
      <p className="mt-2 font-mono text-5xl text-cyber-cyan">{formatRps(rps)}</p>
      <p className="mt-1 text-xs text-muted-foreground">Last 60 seconds, every domain on the hosts.</p>
      {domains.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No requests in the last minute.</p>
      ) : (
        <ul className="mt-6 divide-y divide-cyber-cyan/10">
          {domains.map((domain) => (
            <li key={domain.name} className="flex items-center justify-between gap-3 py-2">
              <span className="truncate font-mono text-sm">{domain.name}</span>
              <span className="font-mono text-sm text-cyber-cyan">{formatRps(domain.rps)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
