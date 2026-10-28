import type { ReactNode } from "react";

const stroke = "currentColor";

function Frame({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 640 150" className="h-36 w-full text-foreground" aria-hidden="true">
      {children}
    </svg>
  );
}

function sketch(slug: string) {
  switch (slug) {
    case "notice":
      return (
        <Frame>
          {[36, 58, 80, 102].map((y, index) => (
            <line key={y} x1="36" x2={index === 3 ? 250 : 300} y1={y} y2={y} stroke={stroke} strokeOpacity={index === 3 ? 1 : 0.35} className={index === 3 ? "text-primary" : undefined} />
          ))}
          <circle cx="520" cy="80" r="22" fill="none" stroke={stroke} strokeDasharray="3 4" className="blink text-primary" />
        </Frame>
      );
    case "stop":
      return (
        <Frame>
          <line x1="28" x2="612" y1="75" y2="75" stroke={stroke} className="dash text-primary" />
          <rect x="250" y="42" width="140" height="66" fill="none" stroke={stroke} />
          <path d="M430 48 V102 M470 48 V102" fill="none" stroke={stroke} strokeOpacity="0.45" />
        </Frame>
      );
    case "collectors":
      return (
        <Frame>
          {["OpenResty", "Daemon", "Coolify", "Apache", "DNS"].map((name, index) => (
            <g key={name}>
              <rect
                x={28 + index * 122}
                y="36"
                width="104"
                height="48"
                rx="6"
                fill={index < 3 ? "currentColor" : "none"}
                fillOpacity={index < 3 ? 0.85 : 0}
                stroke={stroke}
                strokeDasharray={index < 3 ? undefined : "4 4"}
                className={index < 3 ? "text-primary" : "text-muted-foreground"}
              />
              <text x={80 + index * 122} y="108" fill={stroke} fontSize="12" textAnchor="middle">
                {name}
              </text>
            </g>
          ))}
        </Frame>
      );
    case "query":
      return (
        <Frame>
          <rect x="36" y="52" width="220" height="18" fill="currentColor" className="text-primary" />
          <rect x="270" y="52" width="280" height="18" fill="currentColor" fillOpacity="0.18" />
          <text x="286" y="67" fill="currentColor" fontSize="14" className="blink">
            ?
          </text>
        </Frame>
      );
    case "names":
      return (
        <Frame>
          <rect x="70" y="36" width="220" height="80" fill="none" stroke={stroke} />
          <rect x="390" y="58" width="140" height="28" fill="none" stroke={stroke} strokeDasharray="4 4" className="blink text-primary" />
        </Frame>
      );
    case "silence":
      return (
        <Frame>
          <polyline points="30,80 120,80 150,40 180,110 210,70 250,80 610,80" fill="none" stroke={stroke} className="dash text-primary" />
        </Frame>
      );
    case "brief":
      return (
        <Frame>
          {[0, 1, 2, 3, 4].map((index) => (
            <line key={index} x1="36" x2={180 - index * 12} y1={36 + index * 20} y2={36 + index * 20} stroke={stroke} strokeOpacity="0.4" />
          ))}
          <rect x="360" y="36" width="220" height="80" fill="none" stroke={stroke} className="text-primary" />
        </Frame>
      );
    case "share":
      return (
        <Frame>
          <rect x="48" y="40" width="180" height="70" fill="none" stroke={stroke} />
          <line x1="228" x2="430" y1="75" y2="75" stroke={stroke} strokeDasharray="4 6" className="dash" />
        </Frame>
      );
    case "return":
      return (
        <Frame>
          <line x1="80" x2="560" y1="78" y2="78" stroke={stroke} strokeOpacity="0.35" />
          <circle cx="180" cy="78" r="8" fill="currentColor" fillOpacity="0.35" />
          <circle cx="460" cy="78" r="10" fill="currentColor" className="blink text-primary" />
        </Frame>
      );
    default:
      return (
        <Frame>
          {[3, 6, 4].map((count, column) => (
            <g key={column}>
              {Array.from({ length: count }, (_, row) => (
                <line
                  key={row}
                  x1={90 + column * 180}
                  x2={210 + column * 180}
                  y1={110 - row * 16}
                  y2={110 - row * 16}
                  stroke={stroke}
                  className="text-primary"
                  strokeOpacity={0.4 + row * 0.15}
                />
              ))}
            </g>
          ))}
        </Frame>
      );
  }
}

export function PainSketch({ slug }: { slug: string }) {
  return <figure className="rise mt-12 border border-border bg-card/40 p-6">{sketch(slug)}</figure>;
}
