export const DIAGRAM_HOME = "home";
export const DIAGRAM_ABOUT = "about";
export const DIAGRAM_PRODUCT = "product";
export const DIAGRAM_PRICING = "pricing";
export const DIAGRAM_DOCS = "docs";
export const DIAGRAM_NOTE = "note";
export const DIAGRAM_FUTURE = "future";

export const SITE_DIAGRAMS = [
  { name: DIAGRAM_HOME, alt: "The request continues, and a shorter copy of the line splits off to be kept." },
  { name: DIAGRAM_ABOUT, alt: "Lines from a log you already have are copied into a separate journal." },
  { name: DIAGRAM_PRODUCT, alt: "A request is written down as a few separate fields, with gaps where the rest is left out." },
  { name: DIAGRAM_PRICING, alt: "The same journal stands alone, and again with one extra piece set on top." },
  { name: DIAGRAM_DOCS, alt: "The request passes through the application, and a line is read only after that." },
  { name: DIAGRAM_NOTE, alt: "A stack of journal lines, with a mark on one of them." },
  { name: DIAGRAM_FUTURE, alt: "The journal is already here, and the next piece is only an outline." },
] as const;

export type SiteDiagramName = (typeof SITE_DIAGRAMS)[number]["name"];

export function diagramAlt(name: SiteDiagramName) {
  return SITE_DIAGRAMS.find((item) => item.name === name)?.alt ?? "";
}
