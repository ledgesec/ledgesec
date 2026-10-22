import { pathMarker } from "@/entities/observation/model";
import { COUNTRIES, project } from "@/widgets/world-map/places";
import {
  BOARD_DETAIL,
  BOARD_OBSERVE,
  BOARD_THROUGH,
  BOARD_TITLE,
  MAP_LABELS,
  MAP_LINKS,
  SAMPLE_CARDS,
  SAMPLE_PATHS,
} from "@/fsd/pages/home/overview";

const WIDTH = 1000;
const HEIGHT = 520;
const LABEL_SHIFT: Record<string, [number, number]> = {
  US: [14, -8],
  BR: [14, 22],
  NG: [14, 4],
  DE: [14, -12],
  RU: [14, -16],
  CN: [14, 6],
  IN: [-52, 22],
  VN: [14, 20],
};

function pointOf(code: string) {
  const place = COUNTRIES.find((country) => country.code === code);
  if (!place) return null;
  return { ...place, ...project(place.lat, place.lon, WIDTH, HEIGHT) };
}

function arc(from: { x: number; y: number }, to: { x: number; y: number }) {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const lift = length * 0.28;
  return `M ${from.x} ${from.y} Q ${midX - (dy / length) * lift} ${midY + (dx / length) * lift} ${to.x} ${to.y}`;
}

export function OverviewBoard() {
  const labeled = MAP_LABELS.map(pointOf).filter((place) => place !== null);
  const byCode = new Map(labeled.map((place) => [place.code, place]));
  const links = MAP_LINKS.flatMap(([from, to]) => {
    const start = byCode.get(from);
    const end = byCode.get(to);
    return start && end ? [{ id: `${from}-${to}`, d: arc(start, end) }] : [];
  });
  const probes = SAMPLE_PATHS.flatMap((path) => {
    const marker = pathMarker(path);
    return marker ? [{ path, label: marker.label }] : [];
  });

  return (
    <section className="mt-10 rounded-2xl border border-white/10 bg-[#070b14] p-4 text-white shadow-2xl sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{BOARD_TITLE}</h2>
          <p className="mt-1 text-sm text-white/55">{BOARD_DETAIL}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-cyber-red/40 bg-cyber-red/10 px-3 py-1 text-xs text-cyber-red">
            {BOARD_OBSERVE}
          </span>
          <span className="rounded-full border border-cyber-green/40 bg-cyber-green/10 px-3 py-1 text-xs text-cyber-green">
            {BOARD_THROUGH}
          </span>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {SAMPLE_CARDS.map((card) => (
          <article key={card.label} className="rounded-xl border border-white/10 bg-[#101826] px-4 py-3">
            <p className="text-xs text-white/50">{card.label}</p>
            <p className="mt-2 font-mono text-3xl tracking-tight">{card.value}</p>
            <p className="mt-2 text-xs text-cyber-cyan">{card.note}</p>
          </article>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(16rem,0.85fr)_minmax(0,1.4fr)]">
        <section className="rounded-xl border border-white/10 bg-[#101826] p-4">
          <h3 className="text-sm font-medium">Probes</h3>
          <p className="mt-1 text-xs text-white/45">Paths the cabinet marks. The request still continues.</p>
          <ul className="mt-4 space-y-2">
            {probes.map((probe) => (
              <li key={probe.path} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
                <span>
                  <span className="mr-2 inline-block size-2 rounded-full bg-cyber-red" />
                  <span className="text-sm">{probe.label}</span>
                  <span className="mt-0.5 block pl-4 font-mono text-xs text-white/40">{probe.path}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-white/10 bg-[#0c1422] p-4">
          <h3 className="text-sm font-medium">Countries</h3>
          <p className="mt-1 text-xs text-white/45">Sample marks. A live map is on the admin overview.</p>
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Sample country map" className="mt-3 h-auto w-full">
            <rect width={WIDTH} height={HEIGHT} fill="#071018" />
            {[160, 320, 500, 680, 840].map((x) => (
              <line key={`x-${x}`} x1={x} y1={0} x2={x} y2={HEIGHT} stroke="#1e90a8" strokeOpacity="0.18" />
            ))}
            {[100, 200, 310, 420].map((y) => (
              <line key={`y-${y}`} x1={0} y1={y} x2={WIDTH} y2={y} stroke="#1e90a8" strokeOpacity="0.18" />
            ))}
            {COUNTRIES.map((place) => {
              const point = project(place.lat, place.lon, WIDTH, HEIGHT);
              return <circle key={place.code} cx={point.x} cy={point.y} r={2.2} fill="#7ef9ff" fillOpacity="0.28" />;
            })}
            {links.map((link) => (
              <path key={link.id} d={link.d} fill="none" stroke="#39e7ff" strokeWidth="1.6" strokeOpacity="0.85" />
            ))}
            {labeled.map((place) => {
              const shift = LABEL_SHIFT[place.code] ?? [12, -10];
              return (
                <g key={place.code}>
                  <circle cx={place.x} cy={place.y} r={7} fill="#ff4d8d" />
                  <circle cx={place.x} cy={place.y} r={14} fill="#ff4d8d" fillOpacity="0.25" />
                  <text x={place.x + shift[0]} y={place.y + shift[1]} fill="#d7f7ff" fontSize="18">
                    {place.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </section>
      </div>
    </section>
  );
}
