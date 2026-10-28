import {
  DIAGRAM_ABOUT,
  DIAGRAM_DOCS,
  DIAGRAM_FUTURE,
  DIAGRAM_HOME,
  DIAGRAM_NOTE,
  DIAGRAM_PRICING,
  DIAGRAM_PRODUCT,
  diagramAlt,
  type SiteDiagramName,
} from "@/fsd/pages/site/diagrams";
import { PAGE_AFTER } from "@/fsd/pages/site/space";

const LINE = "var(--foreground)";
const MARK = "var(--primary)";
const EDGE = "var(--border)";

function Ground() {
  return <rect width="1280" height="720" fill="var(--card)" />;
}

function Home() {
  return (
    <>
      <rect x="640" y="318" width="36" height="170" fill={MARK} />
      <rect x="640" y="470" width="380" height="32" fill={MARK} />
      <rect x="80" y="292" width="1120" height="44" fill={LINE} />
    </>
  );
}

function About() {
  return (
    <>
      <rect x="120" y="210" width="280" height="44" fill={LINE} />
      <rect x="120" y="300" width="280" height="44" fill={LINE} />
      <rect x="120" y="390" width="280" height="44" fill={LINE} />
      <rect x="400" y="314" width="300" height="16" fill={MARK} />
      <rect x="700" y="160" width="440" height="400" fill="none" stroke={EDGE} strokeWidth="4" />
      <rect x="760" y="230" width="320" height="40" fill={LINE} />
      <rect x="760" y="320" width="320" height="40" fill={LINE} />
      <rect x="760" y="410" width="320" height="40" fill={LINE} />
    </>
  );
}

function Product() {
  return (
    <>
      <rect x="120" y="150" width="1040" height="28" fill={LINE} opacity="0.22" />
      {[140, 420, 700, 980].map((x) => (
        <rect key={x} x={x} y="280" width="200" height="88" fill={LINE} />
      ))}
      <rect x="220" y="480" width="160" height="36" fill={LINE} opacity="0.18" />
      <rect x="440" y="480" width="160" height="36" fill={LINE} opacity="0.18" />
    </>
  );
}

function Pricing() {
  return (
    <>
      <rect x="80" y="170" width="500" height="400" fill="none" stroke={EDGE} strokeWidth="4" />
      <rect x="140" y="250" width="380" height="40" fill={LINE} />
      <rect x="140" y="330" width="380" height="40" fill={LINE} />
      <rect x="140" y="410" width="380" height="40" fill={LINE} />
      <rect x="700" y="170" width="500" height="400" fill="none" stroke={EDGE} strokeWidth="4" />
      <rect x="760" y="250" width="380" height="40" fill={LINE} />
      <rect x="760" y="330" width="380" height="40" fill={LINE} />
      <rect x="760" y="410" width="380" height="40" fill={LINE} />
      <rect x="820" y="110" width="260" height="52" fill={MARK} />
    </>
  );
}

function Docs() {
  return (
    <>
      <circle cx="150" cy="330" r="36" fill={LINE} />
      <rect x="430" y="200" width="280" height="260" fill="none" stroke={EDGE} strokeWidth="4" />
      <rect x="860" y="330" width="28" height="180" fill={MARK} />
      <rect x="860" y="500" width="240" height="28" fill={MARK} />
      <rect x="860" y="548" width="180" height="28" fill={MARK} />
      <rect x="210" y="308" width="930" height="44" fill={LINE} />
    </>
  );
}

function Note() {
  return (
    <>
      {[180, 270, 360, 450, 540].map((y) => (
        <rect key={y} x="360" y={y} width="560" height="44" fill={LINE} />
      ))}
      <rect x="360" y="360" width="44" height="44" fill={MARK} />
    </>
  );
}

function Future() {
  return (
    <>
      <rect x="100" y="160" width="480" height="400" fill="none" stroke={EDGE} strokeWidth="4" />
      <rect x="160" y="250" width="360" height="40" fill={LINE} />
      <rect x="160" y="330" width="360" height="40" fill={LINE} />
      <rect x="160" y="410" width="360" height="40" fill={LINE} />
      <rect x="700" y="160" width="480" height="400" fill="none" stroke={MARK} strokeWidth="4" strokeDasharray="16 14" />
    </>
  );
}

const DRAWINGS = {
  [DIAGRAM_HOME]: Home,
  [DIAGRAM_ABOUT]: About,
  [DIAGRAM_PRODUCT]: Product,
  [DIAGRAM_PRICING]: Pricing,
  [DIAGRAM_DOCS]: Docs,
  [DIAGRAM_NOTE]: Note,
  [DIAGRAM_FUTURE]: Future,
} as const;

export function SiteDiagram({ name }: { name: SiteDiagramName }) {
  const Drawing = DRAWINGS[name];
  return (
    <figure className={PAGE_AFTER}>
      <svg viewBox="0 0 1280 720" role="img" aria-label={diagramAlt(name)} className="h-auto w-full border border-border">
        <Ground />
        <Drawing />
      </svg>
    </figure>
  );
}
