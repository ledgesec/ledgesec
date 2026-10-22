export const BOARD_TITLE = "Overview";
export const BOARD_DETAIL = "A sample of the admin cabinet. The request is recorded and goes through.";
export const BOARD_OBSERVE = "Observation";
export const BOARD_THROUGH = "Request continues";

export const SAMPLE_CARDS = [
  { label: "Requests", value: "1,284", note: "24 hours" },
  { label: "Probes", value: "37", note: "marked paths" },
  { label: "Edges", value: "2", note: "Europe and New York" },
  { label: "Sites", value: "8", note: "from the Host header" },
  { label: "RPS", value: "0.42", note: "last minute" },
  { label: "Kept", value: "3 years", note: "then the row drops" },
] as const;

export const SAMPLE_PATHS = ["/.env", "/.htaccess", "/.git/config", "/wp-login.php", "/dump.sql"] as const;

export const MAP_LINKS = [
  ["US", "DE"],
  ["BR", "NG"],
  ["DE", "RU"],
  ["IN", "VN"],
  ["CN", "RU"],
] as const;

export const MAP_LABELS = ["US", "BR", "NG", "DE", "RU", "CN", "IN", "VN"] as const;

const FORBIDDEN = ["incident", "mttd", "mttr", "vulnerabilit", "blocked", "cve", "endpoint"];

export function boardText() {
  return [BOARD_TITLE, BOARD_DETAIL, BOARD_OBSERVE, BOARD_THROUGH, ...SAMPLE_CARDS.flatMap((card) => [card.label, card.note])]
    .join(" ")
    .toLowerCase();
}

export function boardStaysInsideObservation() {
  const text = boardText();
  return FORBIDDEN.every((word) => !text.includes(word));
}
