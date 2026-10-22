export const RECORDING = "Recording";
export const LIVE = "LIVE";

export const PULSE_REQUESTS = "Requests";
export const PULSE_PROBES = "Probes";
export const PULSE_RPS = "RPS";

const FORBIDDEN = ["cpu", "eps", "mttd", "mttr", "incident", "vulnerabilit", "blocked"];

export function compactCount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return String(Math.round(value));
}

export function pulseCells(requests: number, probes: number, rps: string) {
  return [
    { label: PULSE_REQUESTS, value: compactCount(requests) },
    { label: PULSE_PROBES, value: compactCount(probes) },
    { label: PULSE_RPS, value: rps },
  ];
}

export function pulseStaysInsideObservation() {
  const text = [RECORDING, LIVE, PULSE_REQUESTS, PULSE_PROBES, PULSE_RPS].join(" ").toLowerCase();
  return FORBIDDEN.every((word) => !text.includes(word));
}
